import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();


export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        const { name, projectId, sectionId, assignedToId } = req.body;
        const createdById = req.user!.id;

        if (!name || !projectId || !sectionId) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        const newTask = await prisma.task.create({
            data: {
                name,
                projectId,
                sectionId,
                assignedToId,
                createdById,
            },
            include: { assignedTo: true }
        });

        res.status(201).json(newTask);
    } catch (error) {
        console.error("Create Task Error:", error);
        res.status(500).json({ message: 'Error creating task', error });
    }
};



export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        const { projectId, status, priority, assigneeId } = req.query;
        const userId = req.user!.id;
        const role = req.user!.role;

        const where: any = {};

        // Filter by query params
        if (projectId) where.projectId = projectId;
        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assigneeId) where.assigneeId = assigneeId as string;

        // Role based access
        if (role !== 'MANAGER' && !where.assigneeId) {
            // If not manager and not specifically filtering by assignee, show tasks related to user
            where.OR = [
                { assigneeId: userId },
                { createdById: userId },
                { project: { teamMembers: { some: { userId } } } } // Or tasks in projects they are part of
            ];
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                createdBy: { select: { id: true, name: true } },
                project: { select: { id: true, name: true } },
                section: { select: { id: true, title: true } } // Include section info
            },
            orderBy: { order: 'asc' } // Order by Kanban order usually
        });

        res.json({ tasks });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({ message: 'Error fetching tasks' });
    }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                project: { select: { id: true, name: true } },
                section: { select: { id: true, title: true } },
                comments: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                attachments: true
            }
        });

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        res.json({ task });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching task' });
    }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, status, priority, dueDate, assigneeId, sectionId, order } = req.body;

        const task = await prisma.task.update({
            where: { id },
            data: {
                name,
                description,
                status,
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                assigneeId,
                sectionId,
                order
            },
            include: {
                assignee: { select: { id: true, name: true, avatar: true } },
                project: { select: { id: true, name: true } }
            }
        });

        // Update project progress
        await updateProjectProgress(task.projectId);

        res.json({ task });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({ message: 'Error updating task' });
    }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        const task = await prisma.task.delete({
            where: { id }
        });

        // Update project progress
        await updateProjectProgress(task.projectId);

        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task' });
    }
};

// Helper to update project progress
const updateProjectProgress = async (projectId: string) => {
    try {
        const totalTasks = await prisma.task.count({ where: { projectId } });
        const completedTasks = await prisma.task.count({
            where: { projectId, status: 'COMPLETED' }
        });

        const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

        await prisma.project.update({
            where: { id: projectId },
            data: { progress }
        });
    } catch (error) {
        console.error('Error updating project progress:', error);
    }
};


