
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { sendPasswordResetPin, isEmailConfigured } from './email';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

const corsOrigin = process.env.CORS_ORIGIN || true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '10mb' })); // allow chat messages with embedded images/files (base64)

// --- Auth for Chat/Meet/CXO (header X-User-Id) ---
type AuthUser = { id: string; name: string; role: string };
async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.disabled) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    (req as Request & { authUser: AuthUser }).authUser = { id: user.id, name: user.name, role: user.role };
    next();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
function requireCXO(req: Request, res: Response, next: NextFunction) {
  const r = req as Request & { authUser?: AuthUser };
  if (r.authUser?.role !== 'CXO') {
    res.status(403).json({ error: 'CXO only' });
    return;
  }
  next();
}
function param(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

const BCRYPT_ROUNDS = 10;
function isBcryptHash(str: string): boolean {
  return /^\$2[aby]\$\d+\$/.test(str);
}
async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}
async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) return bcrypt.compare(plain, stored);
  return plain === stored;
}

async function managerCanAccessEntity(userId: string, entityId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role === 'CXO') return !!user;
  const biz = await prisma.business.findUnique({ where: { id: entityId } });
  return !!biz && (biz.responsible?.toUpperCase() === user.name.toUpperCase());
}

// --- Routes ---

// Get all businesses
app.get('/api/businesses', async (req: Request, res: Response) => {
    try {
        const businesses = await prisma.business.findMany({
            include: {
                checklists: {
                    include: {
                        tasks: true
                    }
                }
            }
        });
        res.json(businesses);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch businesses' });
    }
});

// Update a business
app.put('/api/businesses/:id', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { status, health, routeProgress, updated } = req.body;

    try {
        const updatedBiz = await prisma.business.update({
            where: { id },
            data: {
                status,
                health,
                routeProgress,
                updatedAt: new Date() // Prisma handles updatedAt automatically but good to be explicit if needed
            },
            include: {
                checklists: {
                    include: { tasks: true }
                }
            }
        });
        res.json(updatedBiz);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update business' });
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

// Login (email normalized to lowercase so lookup works)
app.post('/api/login', async (req: Request, res: Response) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const email = rawEmail.toLowerCase();

    if (!email || !password) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user && (await verifyPassword(password, user.password))) {
            if (user.disabled) {
                res.status(403).json({ error: 'Account disabled' });
                return;
            }
            // Upgrade plain-text password to hash on next update (optional, non-blocking)
            if (!isBcryptHash(user.password)) {
                hashPassword(password).then((hashed) => {
                    prisma.user.update({ where: { id: user.id }, data: { password: hashed } }).catch(() => {});
                }).catch(() => {});
            }
            const { password: _pw, ...rest } = user;
            res.json({
                ...rest,
                lastLogin: user.lastLogin.toISOString(),
                permissions: user.permissions ? JSON.parse(user.permissions) : []
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
});

// --- Password reset via email PIN ---
app.post('/api/auth/request-reset', async (req: Request, res: Response) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const email = rawEmail.toLowerCase();
    if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.json({ ok: true, message: 'If an account exists for this email, you will receive a reset code.' });
            return;
        }
        const pin = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await prisma.passwordResetPin.deleteMany({ where: { email } });
        await prisma.passwordResetPin.create({ data: { email, pin, expiresAt } });
        const sent = await sendPasswordResetPin(email, pin);
        if (sent) {
            res.json({ ok: true, message: 'Check your email for the reset code.' });
        } else {
            res.status(500).json({ error: 'Failed to send email. Configure SMTP (SMTP_USER, SMTP_PASS) in server .env.' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Request failed' });
    }
});

app.post('/api/auth/reset-with-pin', async (req: Request, res: Response) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    if (!email || !pin || !newPassword || newPassword.length < 4) {
        res.status(400).json({ error: 'Email, PIN, and new password (min 4 characters) are required' });
        return;
    }
    try {
        const record = await prisma.passwordResetPin.findFirst({
            where: { email, pin },
            orderBy: { expiresAt: 'desc' }
        });
        if (!record) {
            res.status(400).json({ error: 'Invalid or expired code. Request a new one.' });
            return;
        }
        if (record.expiresAt < new Date()) {
            await prisma.passwordResetPin.delete({ where: { id: record.id } });
            res.status(400).json({ error: 'Code expired. Request a new one.' });
            return;
        }
        const hashed = await hashPassword(newPassword);
        await prisma.user.updateMany({ where: { email }, data: { password: hashed } });
        await prisma.passwordResetPin.delete({ where: { id: record.id } });
        res.json({ ok: true, message: 'Password updated. You can now log in.' });
    } catch (e) {
        res.status(500).json({ error: 'Reset failed' });
    }
});

app.get('/api/auth/email-configured', (_req: Request, res: Response) => {
    res.json({ configured: isEmailConfigured() });
});

// --- User Management ---

// Get CXO user (for Manager to start direct chat)
app.get('/api/users/cxo', async (req: Request, res: Response) => {
    try {
        const cxo = await prisma.user.findFirst({ where: { role: 'CXO', disabled: false } });
        if (!cxo) return res.status(404).json({ error: 'Not found' });
        const { password: _, ...rest } = cxo;
        return res.json({ ...rest, lastLogin: cxo.lastLogin.toISOString(), permissions: [] });
    } catch (e) {
        return res.status(500).json({ error: 'Failed to fetch' });
    }
});

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
        return res.json(safeUsers);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch users' });
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
                permissions: JSON.stringify(Array.isArray(permissions) ? permissions : [])
            }
        });

        const { password, ...rest } = user;
        return res.json({
            ...rest,
            lastLogin: user.lastLogin.toISOString(),
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update user permissions' });
    }
});

// Update User Credentials (email and/or password)
app.put('/api/users/:id/credentials', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { email, password } = req.body;

    try {
        const data: { email?: string; password?: string } = {};
        if (typeof email === 'string' && email.trim()) data.email = email.trim();
        if (typeof password === 'string' && password) data.password = await hashPassword(password);

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Provide email or password to update' });
        }

        const user = await prisma.user.update({
            where: { id },
            data
        });

        const { password: _, ...rest } = user;
        return res.json({
            ...rest,
            lastLogin: user.lastLogin.toISOString(),
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update credentials' });
    }
});

// Reset credentials by email — CXO only (managers cannot reset password)
app.post('/api/users/reset-credentials', requireAuth, requireCXO, async (req: Request, res: Response) => {
    const r = req as Request & { authUser: AuthUser };
    const { email, newEmail, newPassword } = req.body;

    try {
        const currentEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!currentEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email: currentEmail } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (user.role === 'CXO') {
            return res.status(400).json({ error: 'Cannot reset CXO credentials via this endpoint' });
        }

        const data: { email?: string; password?: string } = {};
        if (typeof newEmail === 'string' && newEmail.trim()) data.email = newEmail.trim().toLowerCase();
        if (typeof newPassword === 'string' && newPassword) data.password = await hashPassword(newPassword);

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Provide newEmail or newPassword to update' });
        }

        const beforeJson = JSON.stringify({ email: user.email });
        const updated = await prisma.user.update({
            where: { id: user.id },
            data
        });
        await prisma.auditLog.create({
            data: {
                actorUserId: r.authUser.id,
                actionType: 'RESET_CREDENTIALS',
                targetType: 'User',
                targetId: user.id,
                beforeJson,
                afterJson: JSON.stringify({ email: updated.email }),
            },
        });

        const { password: _, ...rest } = updated;
        return res.json({
            ...rest,
            lastLogin: updated.lastLogin.toISOString(),
            permissions: updated.permissions ? JSON.parse(updated.permissions) : []
        });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update credentials' });
    }
});

// Create User (Manager)
app.post('/api/users', async (req: Request, res: Response) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const avatar = typeof req.body?.avatar === 'string' ? req.body.avatar : undefined;
    const permissionsInput = req.body?.permissions;

    if (!name || name.length < 2) {
        res.status(400).json({ error: 'Name must be at least 2 characters' });
        return;
    }
    if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        res.status(400).json({ error: 'Valid email is required' });
        return;
    }
    if (!password || password.length < 4) {
        res.status(400).json({ error: 'Password must be at least 4 characters' });
        return;
    }

    const email = rawEmail.toLowerCase();

    try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const permissionsJson = JSON.stringify(
            Array.isArray(permissionsInput) ? permissionsInput : []
        );

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: await hashPassword(password),
                role: 'Manager',
                avatar: avatar || `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`,
                permissions: permissionsJson
            }
        });
        const { password: _, ...rest } = newUser;
        res.json({
            ...rest,
            lastLogin: newUser.lastLogin.toISOString(),
            permissions: newUser.permissions ? JSON.parse(newUser.permissions) : []
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

// ========== CHAT (MVP) ==========
// GET /api/chat/threads — list threads for current user (RBAC), with lastMessage for preview
app.get('/api/chat/threads', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const uid = r.authUser!.id;
    const memberships = await prisma.chatThreadMember.findMany({
      where: { userId: uid },
      include: { thread: true },
    });
    const threadIds = memberships.map((m) => m.threadId);
    const threads = await prisma.chatThread.findMany({
      where: { id: { in: threadIds } },
      include: { members: true },
      orderBy: { createdAt: 'desc' },
    });
    let result = threads;
    if (r.authUser!.role === 'Manager') {
      const allowed = await Promise.all(
        threads.map(async (t) => {
          if (t.type === 'DIRECT' || t.type === 'GROUP') return true;
          if (!t.entityId) return false;
          return managerCanAccessEntity(uid, t.entityId);
        })
      );
      result = threads.filter((_, i) => allowed[i]);
    }
    // Attach last message per thread for WhatsApp-style preview
    if (result.length > 0) {
      const ids = result.map((t) => t.id);
      const latestMessages = await prisma.chatMessage.findMany({
        where: { threadId: { in: ids } },
        orderBy: { createdAt: 'desc' },
      });
      const lastByThread = new Map<string, { body: string; createdAt: Date; senderUserId: string | null }>();
      for (const msg of latestMessages) {
        if (!lastByThread.has(msg.threadId)) lastByThread.set(msg.threadId, { body: msg.body, createdAt: msg.createdAt, senderUserId: msg.senderUserId });
      }
      const withLast = result.map((t) => {
        const last = lastByThread.get(t.id);
        return last ? { ...t, lastMessage: last } : t;
      });
      return res.json(withLast);
    }
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

// POST /api/chat/threads — create direct, entity, or group thread
app.post('/api/chat/threads', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const { type, entityId, otherUserId, memberIds, name, avatar } = req.body as {
      type: 'DIRECT' | 'ENTITY' | 'GROUP'; entityId?: string; otherUserId?: string; memberIds?: string[];
      name?: string; avatar?: string;
    };
    const uid = r.authUser!.id;
    if (type === 'GROUP' && Array.isArray(memberIds) && memberIds.length > 0) {
      if (r.authUser!.role !== 'CXO') return res.status(403).json({ error: 'Only CXO can create groups' });
      const allIds = [uid, ...memberIds.filter((id: string) => id && id !== uid)];
      const unique = [...new Set(allIds)];
      const thread = await prisma.chatThread.create({
        data: {
          type: 'GROUP',
          entityId: null,
          name: typeof name === 'string' ? name.trim() || null : null,
          avatar: typeof avatar === 'string' ? avatar.trim() || null : null,
          members: { create: unique.map((userId) => ({ userId })) },
        },
        include: { members: true },
      });
      return res.json(thread);
    }
    if (type === 'ENTITY' && entityId) {
      const can = await managerCanAccessEntity(uid, entityId);
      if (!can) return res.status(403).json({ error: 'Forbidden' });
      let thread = await prisma.chatThread.findFirst({ where: { type: 'ENTITY', entityId } });
      if (thread) {
        const isMember = await prisma.chatThreadMember.findUnique({ where: { threadId_userId: { threadId: thread.id, userId: uid } } });
        if (!isMember) {
          await prisma.chatThreadMember.create({ data: { threadId: thread.id, userId: uid } });
        }
        return res.json(thread);
      }
      thread = await prisma.chatThread.create({
        data: {
          type: 'ENTITY',
          entityId,
          members: { create: [{ userId: uid }] },
        },
      });
      const cxo = await prisma.user.findFirst({ where: { role: 'CXO' } });
      if (cxo) {
        await prisma.chatThreadMember.create({ data: { threadId: thread.id, userId: cxo.id } });
      }
      const managerName = (await prisma.user.findUnique({ where: { id: uid } }))?.name;
      const biz = await prisma.business.findUnique({ where: { id: entityId } });
      if (biz && biz.responsible && managerName && biz.responsible.toUpperCase() === managerName.toUpperCase()) {
        const otherManagers = await prisma.user.findMany({ where: { role: 'Manager', name: biz.responsible } });
        for (const m of otherManagers) {
          if (m.id !== uid) {
            try {
              await prisma.chatThreadMember.create({ data: { threadId: thread.id, userId: m.id } });
            } catch (_) {}
          }
        }
      }
      return res.json(thread);
    }
    if (type === 'DIRECT' && otherUserId) {
      const allDirect = await prisma.chatThread.findMany({
        where: { type: 'DIRECT' },
        include: { members: true },
      });
      const existing = allDirect.find(
        (t) => t.members.length === 2 && t.members.some((m) => m.userId === uid) && t.members.some((m) => m.userId === otherUserId)
      );
      if (existing) return res.json(existing);
      const newThread = await prisma.chatThread.create({
        data: {
          type: 'DIRECT',
          members: { create: [{ userId: uid }, { userId: otherUserId }] },
        },
        include: { members: true },
      });
      return res.json(newThread);
    }
    return res.status(400).json({ error: 'Invalid type or missing entityId/otherUserId' });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to create thread' });
  }
});

// GET /api/chat/threads/:id/messages
app.get('/api/chat/threads/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const id = param(req, 'id');
    const uid = r.authUser!.id;
    const member = await prisma.chatThreadMember.findUnique({ where: { threadId_userId: { threadId: id, userId: uid } } });
    if (!member) return res.status(403).json({ error: 'Forbidden' });
    const thread = await prisma.chatThread.findUnique({ where: { id: member.threadId } });
    if (!thread) return res.status(403).json({ error: 'Forbidden' });
    if (thread.type === 'ENTITY' && thread.entityId) {
      const can = await managerCanAccessEntity(uid, thread.entityId);
      if (!can) return res.status(403).json({ error: 'Forbidden' });
    }
    const messages = await prisma.chatMessage.findMany({ where: { threadId: id }, orderBy: { createdAt: 'asc' } });
    return res.json(messages);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/chat/threads/:id/messages
app.post('/api/chat/threads/:id/messages', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const id = param(req, 'id');
    const { body, messageType, replyToMessageId, replyToBody } = req.body as {
      body?: string; messageType?: string; replyToMessageId?: string; replyToBody?: string;
    };
    const uid = r.authUser!.id;
    const member = await prisma.chatThreadMember.findUnique({ where: { threadId_userId: { threadId: id, userId: uid } } });
    if (!member) return res.status(403).json({ error: 'Forbidden' });
    const thread = await prisma.chatThread.findUnique({ where: { id: member.threadId } });
    if (!thread) return res.status(403).json({ error: 'Forbidden' });
    if (thread.type === 'ENTITY' && thread.entityId) {
      const can = await managerCanAccessEntity(uid, thread.entityId);
      if (!can) return res.status(403).json({ error: 'Forbidden' });
    }
    const msg = await prisma.chatMessage.create({
      data: {
        threadId: id,
        senderUserId: uid,
        body: typeof body === 'string' ? body : '',
        messageType: messageType === 'SYSTEM' ? 'SYSTEM' : 'USER',
        replyToMessageId: typeof replyToMessageId === 'string' && replyToMessageId ? replyToMessageId : undefined,
        replyToBody: typeof replyToBody === 'string' ? replyToBody : undefined,
      },
    });
    return res.json(msg);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

// PATCH /api/chat/threads/:id/read — mark thread as read (updates current user's lastReadAt)
app.patch('/api/chat/threads/:id/read', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const id = param(req, 'id');
    const uid = r.authUser!.id;
    const member = await prisma.chatThreadMember.findUnique({ where: { threadId_userId: { threadId: id, userId: uid } } });
    if (!member) return res.status(403).json({ error: 'Forbidden' });
    await prisma.chatThreadMember.update({
      where: { threadId_userId: { threadId: id, userId: uid } },
      data: { lastReadAt: new Date() },
    });
    const updated = await prisma.chatThread.findUnique({ where: { id }, include: { members: true } });
    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to mark read' });
  }
});

// POST /api/chat/threads/:id/members — add participants to group (CXO only)
app.post('/api/chat/threads/:id/members', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  if (r.authUser!.role !== 'CXO') return res.status(403).json({ error: 'Only CXO can add participants' });
  try {
    const id = param(req, 'id');
    const { userIds } = req.body as { userIds?: string[] };
    if (!Array.isArray(userIds) || userIds.length === 0) return res.status(400).json({ error: 'userIds array required' });
    const thread = await prisma.chatThread.findUnique({ where: { id }, include: { members: true } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.type !== 'GROUP') return res.status(400).json({ error: 'Not a group thread' });
    const existingIds = new Set(thread.members.map((m) => m.userId));
    const toAdd = userIds.filter((userId) => userId && !existingIds.has(userId));
    for (const userId of toAdd) {
      try {
        await prisma.chatThreadMember.create({ data: { threadId: id, userId } });
      } catch (_) {}
    }
    const updated = await prisma.chatThread.findUnique({ where: { id }, include: { members: true } });
    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to add participants' });
  }
});

// PATCH /api/chat/threads/:id — update group name/avatar (CXO only, GROUP only)
app.patch('/api/chat/threads/:id', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  if (r.authUser!.role !== 'CXO') return res.status(403).json({ error: 'Only CXO can edit groups' });
  try {
    const id = param(req, 'id');
    const thread = await prisma.chatThread.findUnique({ where: { id } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.type !== 'GROUP') return res.status(400).json({ error: 'Not a group thread' });
    const { name, avatar } = req.body as { name?: string; avatar?: string };
    const data: { name?: string | null; avatar?: string | null } = {};
    if (name !== undefined) data.name = typeof name === 'string' ? name : null;
    if (avatar !== undefined) data.avatar = typeof avatar === 'string' ? avatar : null;
    const updated = await prisma.chatThread.update({ where: { id }, data });
    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to update group' });
  }
});

// DELETE /api/chat/threads/:id/members/:userId — remove participant from group (CXO only)
app.delete('/api/chat/threads/:id/members/:userId', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  if (r.authUser!.role !== 'CXO') return res.status(403).json({ error: 'Only CXO can remove participants' });
  try {
    const id = param(req, 'id');
    const userId = param(req, 'userId');
    const thread = await prisma.chatThread.findUnique({ where: { id }, include: { members: true } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.type !== 'GROUP') return res.status(400).json({ error: 'Not a group thread' });
    await prisma.chatThreadMember.deleteMany({ where: { threadId: id, userId } });
    const updated = await prisma.chatThread.findUnique({ where: { id }, include: { members: true } });
    return res.json(updated);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// POST /api/chat/threads/:id/leave — leave thread (remove current user). If group has no members left, delete thread.
app.post('/api/chat/threads/:id/leave', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const id = param(req, 'id');
    const uid = r.authUser!.id;
    const member = await prisma.chatThreadMember.findUnique({ where: { threadId_userId: { threadId: id, userId: uid } } });
    if (!member) return res.status(403).json({ error: 'Not a member' });
    const thread = await prisma.chatThread.findUnique({ where: { id }, include: { members: true } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    await prisma.chatThreadMember.deleteMany({ where: { threadId: id, userId: uid } });
    const remaining = await prisma.chatThreadMember.count({ where: { threadId: id } });
    if (remaining === 0) await prisma.chatThread.delete({ where: { id } });
    return res.json({ left: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to leave' });
  }
});

// DELETE /api/chat/threads/:id — delete group entirely (CXO only, GROUP only)
app.delete('/api/chat/threads/:id', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  if (r.authUser!.role !== 'CXO') return res.status(403).json({ error: 'Only CXO can delete groups' });
  try {
    const id = param(req, 'id');
    const thread = await prisma.chatThread.findUnique({ where: { id } });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });
    if (thread.type !== 'GROUP') return res.status(400).json({ error: 'Only groups can be deleted' });
    await prisma.chatThread.delete({ where: { id } });
    return res.json({ deleted: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ========== MEETINGS (MVP) ==========
// POST /api/entities/:entityId/meetings/start
app.post('/api/entities/:entityId/meetings/start', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const entityId = param(req, 'entityId');
    const uid = r.authUser!.id;
    const can = await managerCanAccessEntity(uid, entityId);
    if (!can) return res.status(403).json({ error: 'Forbidden' });
    let thread = await prisma.chatThread.findFirst({ where: { type: 'ENTITY', entityId } });
    if (!thread) {
      thread = await prisma.chatThread.create({
        data: { type: 'ENTITY', entityId, members: { create: [{ userId: uid }] } },
      });
      const cxo = await prisma.user.findFirst({ where: { role: 'CXO' } });
      if (cxo) await prisma.chatThreadMember.create({ data: { threadId: thread.id, userId: cxo.id } });
    }
    const meetLink = typeof req.body?.meetLink === 'string' ? req.body.meetLink.trim() || null : null;
    const meeting = await prisma.meeting.create({
      data: { entityId, threadId: thread.id, createdByUserId: uid, meetLink, startTime: new Date() },
    });
    await prisma.chatMessage.create({
      data: {
        threadId: thread.id,
        senderUserId: null,
        body: meetLink ? `Instant meet started — Join: ${meetLink}` : 'Instant meet started',
        messageType: 'SYSTEM',
      },
    });
    return res.json(meeting);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to start meeting' });
  }
});

// POST /api/entities/:entityId/meetings/:meetingId/end
app.post('/api/entities/:entityId/meetings/:meetingId/end', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const entityId = param(req, 'entityId');
    const meetingId = param(req, 'meetingId');
    const uid = r.authUser!.id;
    const can = await managerCanAccessEntity(uid, entityId);
    if (!can) return res.status(403).json({ error: 'Forbidden' });
    const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, entityId } });
    if (!meeting || meeting.endTime) return res.status(404).json({ error: 'Meeting not found or already ended' });
    const endTime = new Date();
    const durationMinutes = Math.ceil((endTime.getTime() - meeting.startTime.getTime()) / 60000);
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { endTime, durationMinutes },
    });
    await prisma.chatMessage.create({
      data: {
        threadId: meeting.threadId,
        senderUserId: null,
        body: `Meeting ended — Duration: ${durationMinutes} minutes`,
        messageType: 'SYSTEM',
      },
    });
    return res.json({ endTime, durationMinutes });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to end meeting' });
  }
});

// GET /api/entities/:entityId/meetings/history
app.get('/api/entities/:entityId/meetings/history', requireAuth, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const entityId = param(req, 'entityId');
    const uid = r.authUser!.id;
    const can = await managerCanAccessEntity(uid, entityId);
    if (!can) return res.status(403).json({ error: 'Forbidden' });
    const meetings = await prisma.meeting.findMany({
      where: { entityId },
      orderBy: { startTime: 'desc' },
    });
    return res.json(meetings);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// ========== CXO ADMIN (managers only) ==========
// POST /api/cxo/managers/:id/reset-credentials
app.post('/api/cxo/managers/:id/reset-credentials', requireAuth, requireCXO, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const managerId = param(req, 'id');
    const { newEmail, newPassword } = req.body;
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role !== 'Manager') return res.status(404).json({ error: 'Manager not found' });
    const data: { email?: string; password?: string } = {};
    if (typeof newEmail === 'string' && newEmail.trim()) data.email = newEmail.trim().toLowerCase();
    if (typeof newPassword === 'string' && newPassword) data.password = await hashPassword(newPassword);
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Provide newEmail or newPassword' });
    const beforeJson = JSON.stringify({ email: manager.email });
    const updated = await prisma.user.update({ where: { id: managerId }, data });
    await prisma.auditLog.create({
      data: { actorUserId: r.authUser.id, actionType: 'RESET_CREDENTIALS', targetType: 'User', targetId: managerId, beforeJson, afterJson: JSON.stringify({ email: updated.email }) },
    });
    const { password: _, ...rest } = updated;
    return res.json({ ...rest, lastLogin: updated.lastLogin.toISOString(), permissions: updated.permissions ? JSON.parse(updated.permissions) : [] });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to reset credentials' });
  }
});

// POST /api/cxo/managers/:id/disable
app.post('/api/cxo/managers/:id/disable', requireAuth, requireCXO, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const managerId = param(req, 'id');
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role !== 'Manager') return res.status(404).json({ error: 'Manager not found' });
    await prisma.user.update({ where: { id: managerId }, data: { disabled: true } });
    await prisma.auditLog.create({
      data: { actorUserId: r.authUser.id, actionType: 'DISABLE_MANAGER', targetType: 'User', targetId: managerId },
    });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to disable' });
  }
});

// POST /api/cxo/managers/:id/enable
app.post('/api/cxo/managers/:id/enable', requireAuth, requireCXO, async (req: Request, res: Response) => {
  const r = req as Request & { authUser: AuthUser };
  try {
    const managerId = param(req, 'id');
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role !== 'Manager') return res.status(404).json({ error: 'Manager not found' });
    await prisma.user.update({ where: { id: managerId }, data: { disabled: false } });
    await prisma.auditLog.create({
      data: { actorUserId: r.authUser.id, actionType: 'ENABLE_MANAGER', targetType: 'User', targetId: managerId },
    });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: 'Failed to enable' });
  }
});

// Production: serve frontend static files if present (copy dist/ to server/public after build)
const publicDir = path.join(__dirname, '..', 'public');
const fs = require('fs');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDir, 'index.html')));
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
