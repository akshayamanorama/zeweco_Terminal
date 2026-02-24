
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { sendPasswordResetPin, isEmailConfigured } from './email';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'avatars');
const LOGOS_DIR = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = (file.mimetype.match(/\/(jpeg|jpg|png|gif|webp)/)?.[1] ?? 'jpg').replace('jpeg', 'jpg');
        cb(null, `${(req.params as { id: string }).id}.${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed'));
    }
});

const logoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
    filename: (req, file, cb) => {
        const ext = (file.mimetype.match(/\/(jpeg|jpg|png|gif|webp)/)?.[1] ?? 'jpg').replace('jpeg', 'jpg');
        cb(null, `${(req.params as { id: string }).id}.${ext}`);
    }
});
const uploadLogo = multer({
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (/^image\/(jpeg|jpg|png|gif|webp)$/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only images (JPEG, PNG, GIF, WebP) are allowed'));
    }
});

const distPath = path.resolve(process.cwd(), '..', 'dist');
const distIndexPath = path.join(distPath, 'index.html');
const isProd = process.env.NODE_ENV === 'production' || fs.existsSync(distIndexPath);

// Allow localhost in dev (for logo upload hitting backend directly); in prod allow app origin
app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (!isProd) return cb(null, true);
        if (origin === 'https://terminal.zeweco.com' || /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
        return cb(null, false);
    }
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Serve built frontend when dist exists (production or same-repo start)
if (fs.existsSync(distIndexPath)) {
    // Force no cache so localhost always shows latest (same as live)
    app.use((req, res, next) => {
        if (req.path === '/' || req.path === '/index.html' || req.path.startsWith('/assets/')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            res.setHeader('Pragma', 'no-cache');
        }
        next();
    });
    app.use(express.static(distPath));
    // Explicit GET / so root always serves the app (avoids "Cannot GET /" on server)
    app.get('/', (_req, res) => res.sendFile(distIndexPath));
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/assets')) return next();
        res.sendFile(distIndexPath);
    });
}

// --- Helpers ---
function formatUpdatedAt(date: Date): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return d.toLocaleDateString();
}

function mapBusinessForFrontend(b: any) {
    const { updatedAt, checklists = [], ...rest } = b;
    return {
        ...rest,
        updated: formatUpdatedAt(updatedAt),
        visible: b.visible !== false,
        checklists: (checklists as any[]).map((c: any) => ({
            id: c.id,
            title: c.title,
            tasks: (c.tasks || []).map((t: any) => ({ id: t.id, text: t.text, completed: t.completed }))
        }))
    };
}

// --- Routes ---

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Get all businesses (ordered by sortOrder for panel and terminal)
app.get('/api/businesses', async (req: Request, res: Response) => {
    try {
        const businesses = await prisma.business.findMany({
            orderBy: { sortOrder: 'asc' },
            include: {
                checklists: {
                    include: {
                        tasks: true
                    }
                }
            }
        });
        res.json(businesses.map(mapBusinessForFrontend));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch businesses' });
    }
});

// Create a business
app.post('/api/businesses', async (req: Request, res: Response) => {
    const { name, code, stage, health, nextMilestone, eta, status, responsible } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Name is required' });
        return;
    }
    const codeStr = (code && String(code).trim()) || name.substring(0, 3).toUpperCase().replace(/\s/g, '');
    try {
        const maxOrder = await prisma.business.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
        const nextOrder = (maxOrder?.sortOrder ?? -1) + 1;
        const business = await prisma.business.create({
            data: {
                name: name.trim(),
                code: codeStr,
                stage: (stage && ['Foundation', 'Design', 'Prototype', 'Launch', 'Traction', 'Scale'].includes(stage)) ? stage : 'Foundation',
                health: (health && ['Green', 'Yellow', 'Red'].includes(health)) ? health : 'Yellow',
                routeProgress: 0,
                nextMilestone: (nextMilestone && String(nextMilestone).trim()) || 'Set first milestone',
                eta: (eta && String(eta).trim()) || '—',
                status: (status && ['On Track', 'At Risk', 'Overdue', 'Stale'].includes(status)) ? status : 'On Track',
                responsible: (responsible && String(responsible).trim()) || null,
                visible: true,
                sortOrder: nextOrder,
            },
            include: {
                checklists: { include: { tasks: true } },
            },
        });
        res.json(mapBusinessForFrontend(business));
    } catch (error) {
        res.status(500).json({ error: 'Failed to create business' });
    }
});

// Update a business
app.put('/api/businesses/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { name, code, stage, health, routeProgress, nextMilestone, eta, status, responsible, visible } = req.body;

    try {
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (code !== undefined) updateData.code = String(code).trim();
        if (stage !== undefined && ['Foundation', 'Design', 'Prototype', 'Launch', 'Traction', 'Scale'].includes(stage)) updateData.stage = stage;
        if (health !== undefined && ['Green', 'Yellow', 'Red'].includes(health)) updateData.health = health;
        if (routeProgress !== undefined) updateData.routeProgress = Number(routeProgress);
        if (nextMilestone !== undefined) updateData.nextMilestone = String(nextMilestone).trim();
        if (eta !== undefined) updateData.eta = String(eta).trim();
        if (status !== undefined && ['On Track', 'At Risk', 'Overdue', 'Stale'].includes(status)) updateData.status = status;
        if (responsible !== undefined) updateData.responsible = responsible === '' || responsible === null ? null : String(responsible).trim();
        if (visible !== undefined) updateData.visible = Boolean(visible);
        if (req.body.sortOrder !== undefined) updateData.sortOrder = Number(req.body.sortOrder);

        const updatedBiz = await prisma.business.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date()
            },
            include: {
                checklists: {
                    include: { tasks: true }
                }
            }
        });
        res.json(mapBusinessForFrontend(updatedBiz));
    } catch (error) {
        res.status(500).json({ error: 'Failed to update business' });
    }
});

// Upload company logo (image file)
app.post('/api/businesses/:id/logo', (req: Request, res: Response, next: () => void) => {
    uploadLogo.single('logo')(req, res, (err: unknown) => {
        if (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            res.status(400).json({ error: message });
            return;
        }
        next();
    });
}, async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as { id: string };
    if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
    }
    try {
        const logoUrl = `/uploads/logos/${req.file.filename}`;
        const business = await prisma.business.update({
            where: { id },
            data: { logo: logoUrl },
            include: { checklists: { include: { tasks: true } } }
        });
        res.json(mapBusinessForFrontend(business));
    } catch (error) {
        console.error('Logo update error:', error);
        const msg = error instanceof Error ? error.message : 'Failed to update logo';
        const safeMsg = process.env.NODE_ENV === 'production'
            ? 'Failed to update logo. Try again or use a smaller image (under 2MB).'
            : msg;
        res.status(500).json({ error: safeMsg });
    }
});

// Delete a business (cascades to checklists and tasks)
app.delete('/api/businesses/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    try {
        await prisma.business.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete business' });
    }
});

// Reorder businesses (order = array of business ids; order on terminal follows this)
app.post('/api/businesses/reorder', async (req: Request, res: Response) => {
    const order = req.body?.order;
    if (!Array.isArray(order) || order.length === 0) {
        res.status(400).json({ error: 'Body must include order: string[]' });
        return;
    }
    try {
        await Promise.all(
            (order as string[]).map((id, index) =>
                prisma.business.update({ where: { id }, data: { sortOrder: index } })
            )
        );
        const businesses = await prisma.business.findMany({
            orderBy: { sortOrder: 'asc' },
            include: { checklists: { include: { tasks: true } } },
        });
        res.json(businesses.map(mapBusinessForFrontend));
    } catch (error) {
        console.error('Reorder failed:', error);
        res.status(500).json({ error: 'Failed to reorder' });
    }
});

// Assign/unassign business to manager - POST for compatibility
app.post('/api/businesses/:id/assign', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const responsible = req.body?.responsible;
    const value = (responsible === '' || responsible === null || responsible === undefined) ? null : String(responsible);
    try {
        const updatedBiz = await prisma.business.update({
            where: { id },
            data: { responsible: value },
            include: { checklists: { include: { tasks: true } } }
        });
        res.json(mapBusinessForFrontend(updatedBiz));
    } catch (error) {
        res.status(500).json({ error: 'Failed to update assignment' });
    }
});

// Update a checklist (e.g. title)
app.put('/api/checklists/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { title } = req.body;
    try {
        const updated = await prisma.checklist.update({
            where: { id },
            data: { title }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update checklist' });
    }
});

// Create a checklist
app.post('/api/businesses/:id/checklists', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { title } = req.body;
    try {
        const newChecklist = await prisma.checklist.create({
            data: {
                title: title || 'New Operations Phase',
                businessId: id,
                tasks: {
                    create: [
                        { text: 'Initial setup task', completed: false }
                    ]
                }
            },
            include: { tasks: true }
        });
        res.json(newChecklist);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create checklist' });
    }
});

// Delete a checklist
app.delete('/api/checklists/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    try {
        await prisma.checklist.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete checklist' });
    }
});


// Helper to update business progress
async function updateBusinessProgress(businessId: string) {
    const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { checklists: { include: { tasks: true } } }
    });

    if (!business) return;

    let totalTasks = 0;
    let completedTasks = 0;

    business.checklists.forEach(cl => {
        cl.tasks.forEach(t => {
            totalTasks++;
            if (t.completed) completedTasks++;
        });
    });

    // Calculate progress (0-12 scale)
    // If no tasks, progress is 0 (or keep existing? Let's say 0 for now)
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 12);

    await prisma.business.update({
        where: { id: businessId },
        data: { routeProgress: progress }
    });
}

// Toggle Task / Update Task
app.put('/api/tasks/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { completed, text } = req.body;

    try {
        const task = await prisma.task.findUnique({ where: { id }, include: { checklist: true } });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                completed: completed !== undefined ? completed : undefined,
                text: text !== undefined ? text : undefined
            }
        });

        // Recalculate progress using checklist.businessId
        // note: task.checklist.businessId is available via include
        // validation: checklist might be null if data corrupted, but schema enforces relation
        if (task.checklist) {
            await updateBusinessProgress(task.checklist.businessId);
        }

        res.json(updatedTask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// Create Task
app.post('/api/checklists/:id/tasks', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { text } = req.body;
    try {
        const newTask = await prisma.task.create({
            data: {
                text: text || 'New Task',
                checklistId: id
            },
            include: { checklist: true }
        });

        await updateBusinessProgress(newTask.checklist.businessId);

        res.json(newTask);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

// Delete Task
app.delete('/api/tasks/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    try {
        const task = await prisma.task.findUnique({ where: { id }, include: { checklist: true } });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }

        await prisma.task.delete({ where: { id } });

        if (task.checklist) {
            await updateBusinessProgress(task.checklist.businessId);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Bootstrap: create or reset CXO login (one-time fix when you forget password)
// Call: POST /api/bootstrap {"secret":"zeweco-2026","email":"akshay@zeweco.com","password":"Zeweco2026"}
app.post('/api/bootstrap', async (req: Request, res: Response) => {
    const { secret, email, password } = req.body;
    if (secret !== 'zeweco-2026' || !email || !password || String(password).length < 4) {
        res.status(400).json({ error: 'Need secret, email, password (min 4 chars)' });
        return;
    }
    try {
        const user = await prisma.user.upsert({
            where: { email: String(email).trim() },
            update: { password: String(password), role: 'CXO' },
            create: { name: 'CXO', email: String(email).trim(), role: 'CXO', password: String(password), permissions: '[]' },
        });
        const { password: _, ...rest } = user;
        res.json({ ok: true, message: 'Login ready', user: rest });
    } catch (e) {
        res.status(500).json({ error: 'Bootstrap failed' });
    }
});

// Reset password (requires secret in body; set RESET_SECRET in env, e.g. RESET_SECRET=your-secret)
app.post('/api/reset-password', async (req: Request, res: Response) => {
    const secret = process.env.RESET_SECRET || 'zeweco-reset-2026';
    const { email, newPassword, resetSecret } = req.body;
    if (resetSecret !== secret) {
        res.status(403).json({ error: 'Invalid reset secret' });
        return;
    }
    if (!email || !newPassword || String(newPassword).length < 4) {
        res.status(400).json({ error: 'Provide email and newPassword (min 4 chars)' });
        return;
    }
    try {
        const r = await prisma.user.updateMany({
            where: { email: String(email).trim() },
            data: { password: String(newPassword) },
        });
        if (r.count === 0) res.status(404).json({ error: 'User not found' });
        else res.json({ ok: true, message: 'Password reset. Try logging in.' });
    } catch (e) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

// --- Password Reset via Email PIN ---

// Request password reset: sends 6-digit PIN to user's email
app.post('/api/auth/request-reset', async (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }
    if (!isEmailConfigured()) {
        res.status(503).json({ error: 'Email is not configured. Set SMTP_USER and SMTP_PASS in server .env' });
        return;
    }
    try {
        const user = await prisma.user.findFirst({ where: { email } });
        // Don't reveal if user exists - always say "sent" for security
        if (!user) {
            res.json({ ok: true, message: 'If this email is registered, you will receive a PIN shortly.' });
            return;
        }
        const pin = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
        await prisma.passwordResetPin.deleteMany({ where: { email } }); // Clear old pins
        await prisma.passwordResetPin.create({ data: { email, pin, expiresAt } });
        const sent = await sendPasswordResetPin(email, pin);
        if (sent) {
            res.json({ ok: true, message: 'Check your email for the reset PIN.' });
            return;
        }
        // Email failed: in development, return PIN so user can still reset without SMTP
        if (process.env.NODE_ENV !== 'production') {
            res.json({ ok: true, pin, message: `Email could not be sent. Use this PIN (dev only): ${pin}` });
            return;
        }
        res.status(500).json({ error: 'Failed to send email. Check SMTP config (SMTP_USER, SMTP_PASS, Gmail App Password).' });
    } catch (e) {
        console.error('[request-reset]', e);
        res.status(500).json({ error: 'Request failed' });
    }
});

// Reset password with PIN from email
app.post('/api/auth/reset-with-pin', async (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!email || !pin || !newPassword || newPassword.length < 4) {
        res.status(400).json({ error: 'Email, PIN, and new password (min 4 chars) are required' });
        return;
    }
    try {
        const record = await prisma.passwordResetPin.findFirst({
            where: { email },
            orderBy: { createdAt: 'desc' },
        });
        if (!record || record.pin !== pin) {
            res.status(400).json({ error: 'Invalid or expired PIN' });
            return;
        }
        if (new Date() > record.expiresAt) {
            await prisma.passwordResetPin.delete({ where: { id: record.id } });
            res.status(400).json({ error: 'PIN expired. Request a new one.' });
            return;
        }
        const r = await prisma.user.updateMany({
            where: { email },
            data: { password: newPassword },
        });
        if (r.count === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        await prisma.passwordResetPin.delete({ where: { id: record.id } });
        res.json({ ok: true, message: 'Password updated. You can now log in.' });
    } catch (e) {
        console.error('[reset-with-pin]', e);
        res.status(500).json({ error: 'Reset failed' });
    }
});

// Check if email reset is available
app.get('/api/auth/email-configured', (_req: Request, res: Response) => {
    res.json({ configured: isEmailConfigured() });
});

// Create new user (sign up) - anyone can create an account
app.post('/api/auth/signup', async (req: Request, res: Response) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!name || name.length < 2) {
        res.status(400).json({ error: 'Name must be at least 2 characters' });
        return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Valid email is required' });
        return;
    }
    if (!password || password.length < 4) {
        res.status(400).json({ error: 'Password must be at least 4 characters' });
        return;
    }
    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password,
                role: 'Manager',
                avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
                permissions: '[]',
            },
        });
        const { password: _, ...userWithoutPassword } = newUser;
        res.json({
            ok: true,
            message: 'Account created. You can now log in.',
            user: {
                ...userWithoutPassword,
                lastLogin: newUser.lastLogin.toISOString(),
                permissions: [],
            },
        });
    } catch (e) {
        console.error('[signup]', e);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Master key: allows login and resets password (for when you forget)
const MASTER_KEY = 'Zeweco2026';

// Login
app.post('/api/login', async (req: Request, res: Response) => {
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;
    const email = typeof rawEmail === 'string' ? rawEmail.trim() : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    if (!email || !password) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    try {
        let user = await prisma.user.findUnique({ where: { email } });

        // Master key: reset password and allow login for CXO emails
        if (password === MASTER_KEY && (email === 'akshaya@zeweco.com' || email === 'akshay@zeweco.com')) {
            user = await prisma.user.upsert({
                where: { email },
                update: { password: MASTER_KEY, role: 'CXO' },
                create: { name: 'CXO', email, role: 'CXO', password: MASTER_KEY, permissions: '[]' },
            });
        } else if (!user || user.password !== password) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }

        const { password: _, ...userWithoutPassword } = user!;
        res.json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});


// --- User Management ---

// Get all users (Managers)
app.get('/api/users', async (req: Request, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            where: { role: 'Manager' }
        });

        const safeUsers = users.map(u => {
            const { password, ...rest } = u;
            return {
                ...rest,
                lastLogin: u.lastLogin.toISOString(),
                permissions: u.permissions ? JSON.parse(u.permissions) : []
            };
        });
        res.json(safeUsers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Upload avatar (multipart)
app.post('/api/users/:id/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
    }
    try {
        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        const user = await prisma.user.update({
            where: { id },
            data: { avatar: avatarUrl }
        });
        const { password: _, ...rest } = user;
        res.json({
            ...rest,
            lastLogin: user.lastLogin.toISOString(),
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update avatar' });
    }
});

// Update User (name, avatar, email, password)
app.put('/api/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { name, avatar, email, password } = req.body;
    try {
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (avatar !== undefined) updateData.avatar = String(avatar).trim();
        if (email !== undefined) {
            const newEmail = String(email).trim();
            updateData.email = newEmail;
            if (!avatar && !req.body.avatar) updateData.avatar = `https://i.pravatar.cc/150?u=${newEmail}`;
        }
        if (password !== undefined && String(password).length > 0) updateData.password = String(password);
        if (Object.keys(updateData).length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }
        const user = await prisma.user.update({
            where: { id },
            data: updateData
        });
        const { password: _, ...rest } = user;
        res.json({
            ...rest,
            lastLogin: user.lastLogin.toISOString(),
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Update User Permissions
app.put('/api/users/:id/permissions', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { permissions } = req.body; // permissions should be string[]

    try {
        const user = await prisma.user.update({
            where: { id },
            data: {
                permissions: JSON.stringify(permissions)
            }
        });

        const { password, ...rest } = user;
        res.json({
            ...rest,
            lastLogin: user.lastLogin.toISOString(),
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user permissions' });
    }
});

// Create User (Manager)
app.post('/api/users', async (req: Request, res: Response) => {
    const { name, email, password, avatar } = req.body;
    try {
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password, // In real app, hash this!
                role: 'Manager',
                avatar: avatar || `https://i.pravatar.cc/150?u=${email}`,
                permissions: "[]"
            }
        });
        const { password: _, ...rest } = newUser;
        res.json({
            ...rest,
            lastLogin: newUser.lastLogin.toISOString(),
            permissions: []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Delete User
app.delete('/api/users/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    try {
        await prisma.user.delete({ where: { id } });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});


app.listen(port, () => {
    console.log(`Server running on port ${port} (${isProd ? 'production' : 'development'})`);
});
