
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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

// Login (Simple mock for now, returns user if email matches)
app.post('/api/login', async (req: Request, res: Response) => {
    const { email, password } = req.body;
    // In a real app, compare hashed passwords
    try {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (user && user.password === password) {
            // Return user without password
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
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
        res.json({
            ...rest,
            lastLogin: user.lastLogin.toISOString(),
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user permissions' });
    }
});

// Update User Credentials (email and/or password)
app.put('/api/users/:id/credentials', async (req: Request, res: Response) => {
    const { id } = req.params as { id: string };
    const { email, password } = req.body;

    try {
        const data: { email?: string; password?: string } = {};
        if (typeof email === 'string' && email.trim()) data.email = email.trim();
        if (typeof password === 'string' && password) data.password = password;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Provide email or password to update' });
        }

        const user = await prisma.user.update({
            where: { id },
            data
        });

        const { password: _, ...rest } = user;
        res.json({
            ...rest,
            lastLogin: user.lastLogin.toISOString(),
            permissions: user.permissions ? JSON.parse(user.permissions) : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update credentials' });
    }
});

// Reset credentials by email (so CXO can set manager password; login uses email)
app.post('/api/users/reset-credentials', async (req: Request, res: Response) => {
    const { email, newEmail, newPassword } = req.body;

    try {
        const currentEmail = typeof email === 'string' ? email.trim() : '';
        if (!currentEmail) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await prisma.user.findUnique({ where: { email: currentEmail } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const data: { email?: string; password?: string } = {};
        if (typeof newEmail === 'string' && newEmail.trim()) data.email = newEmail.trim();
        if (typeof newPassword === 'string' && newPassword) data.password = newPassword;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: 'Provide newEmail or newPassword to update' });
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data
        });

        const { password: _, ...rest } = updated;
        res.json({
            ...rest,
            lastLogin: updated.lastLogin.toISOString(),
            permissions: updated.permissions ? JSON.parse(updated.permissions) : []
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update credentials' });
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
    console.log(`Server is running on port ${port}`);
});
