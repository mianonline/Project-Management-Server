import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();


const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export const createTask = async (req: AuthRequest, res: Response) => {
    try {
        console.log("Create Task - Received Body:", JSON.stringify(req.body, null, 2));
        const { name, projectId, assigneeId, description, status, priority, dueDate, budget } = req.body;
        let { sectionId } = req.body;
        const createdById = req.user!.id;

        if (!name || !projectId) {
            console.warn("Create Task - Validation Failed: Missing name or projectId");
            return res.status(400).json({
                message: "Task name and Project ID are required",
                received: { name, projectId }
            });
        }

        if (!isValidObjectId(projectId)) {
            console.warn(`Create Task - Invalid Project ID format: ${projectId}`);
            return res.status(400).json({ message: "Invalid Project ID format" });
        }

        if (sectionId && !isValidObjectId(sectionId)) {
            console.warn(`Create Task - Invalid Section ID format: ${sectionId}`);
            sectionId = undefined; // Fallback to default logic
        }

        // If no sectionId provided, find the default section or create one
        if (!sectionId) {
            console.log("Create Task - Finding/Creating default section for project:", projectId);
            const firstSection = await prisma.section.findFirst({
                where: { projectId },
                orderBy: { order: 'asc' }
            });

            if (firstSection) {
                sectionId = firstSection.id;
            } else {
                const newSection = await prisma.section.create({
                    data: {
                        title: 'To Do',
                        projectId,
                        order: 0
                    }
                });
                sectionId = newSection.id;
            }
        }

        const newTask = await prisma.task.create({
            data: {
                name,
                description: description || null,
                status: status || 'TODO',
                priority: priority || 'MEDIUM',
                dueDate: dueDate ? new Date(dueDate) : null,
                projectId,
                sectionId,
                assignedToId: (assigneeId && isValidObjectId(assigneeId)) ? assigneeId : null,
                createdById,
                budget: budget ? parseFloat(budget) : 0,
            },
            include: {
                assignedTo: { select: { id: true, name: true, avatar: true } },
                project: { select: { id: true, name: true } },
                section: { select: { id: true, title: true } }
            }
        });

        console.log("Create Task - Success:", newTask.id);

        // Update project progress and budget consumption
        await Promise.all([
            updateProjectProgress(projectId),
            updateProjectSpentBudget(projectId)
        ]);

        res.status(201).json(newTask);
    } catch (error: any) {
        console.error("Create Task - Critical Error:", error);
        res.status(500).json({
            message: 'Error creating task',
            error: error.message || error,
            code: error.code || 'UNKNOWN_ERROR'
        });
    }
};



export const getTasks = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;

        console.log(`[DEBUG] Get Tasks - User: ${userId} (${role}) Query:`, JSON.stringify(req.query));

        if (!userId) {
            return res.status(401).json({ message: "Authentication context missing" });
        }

        const { projectId, status, priority, assigneeId } = req.query;
        const where: any = {};

        // 1. Basic Filters
        if (projectId && typeof projectId === 'string' && isValidObjectId(projectId)) {
            where.projectId = projectId;
        }

        if (status) where.status = status;
        if (priority) where.priority = priority;

        if (assigneeId && typeof assigneeId === 'string' && isValidObjectId(assigneeId)) {
            where.assignedToId = assigneeId;
        }

        // 2. Permission Based Filter
        if (role !== 'MANAGER') {
            where.OR = [
                { assignedToId: userId },
                { createdById: userId }
            ];

            // If a specific project is requested, ensure member has team access
            if (projectId && typeof projectId === 'string' && isValidObjectId(projectId)) {
                where.project = {
                    team: { members: { some: { userId } } }
                };
            }
        }

        console.log("[DEBUG] Get Tasks - Prisma Where:", JSON.stringify(where, null, 2));

        try {
            const tasks = await prisma.task.findMany({
                where,
                include: {
                    assignedTo: { select: { id: true, name: true, avatar: true } },
                    createdBy: { select: { id: true, name: true } },
                    project: { select: { id: true, name: true } },
                    section: { select: { id: true, title: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            console.log(`[DEBUG] Get Tasks - Found ${tasks.length} tasks`);
            return res.json({ tasks });
        } catch (innerError: any) {
            console.error("[DEBUG] Get Tasks - Relational Fetch Failed, attempting fallback:", innerError.message);

            // Fallback: Fetch without relations to pinpoint if it's a relation/orphan issue
            const basicTasks = await prisma.task.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            });

            return res.json({
                tasks: basicTasks,
                warning: "Relational data omitted due to internal error",
                details: innerError.message
            });
        }
    } catch (error: any) {
        console.error('[DEBUG] Get Tasks - Fatal Error:', error);
        res.status(500).json({
            error: "Failed to load tasks",
            message: error.message || String(error),
            prismaCode: error.code,
            prismaMeta: error.meta
        });
    }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                assignedTo: { select: { id: true, name: true, avatar: true } },
                project: { select: { id: true, name: true } },
                section: { select: { id: true, title: true } }
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
        const oldTask = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
        const { name, description, status, priority, dueDate, assigneeId, sectionId, order, budget } = req.body;

        const task = await prisma.task.update({
            where: { id },
            data: {
                name,
                description,
                status,
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                assignedToId: assigneeId,
                sectionId,
                order,
                budget: budget !== undefined ? parseFloat(budget) : undefined
            },
            include: {
                assignedTo: { select: { id: true, name: true, avatar: true } },
                project: { select: { id: true, name: true } }
            }
        });

        // Update project progress and budget consumption
        if (oldTask) {
            await Promise.all([
                updateProjectProgress(oldTask.projectId),
                updateProjectSpentBudget(oldTask.projectId)
            ]);
        }

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


        await Promise.all([
            updateProjectProgress(task.projectId),
            updateProjectSpentBudget(task.projectId)
        ]);

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

// Helper to update project spent budget
const updateProjectSpentBudget = async (projectId: string) => {
    try {
        const result = await prisma.task.aggregate({
            where: { projectId },
            _sum: {
                budget: true
            }
        });

        const totalSpent = result._sum.budget || 0;

        await prisma.project.update({
            where: { id: projectId },
            data: { spent: totalSpent }
        });
        console.log(`[DEBUG] Updated Project ${projectId} spent budget to: ${totalSpent}`);
    } catch (error) {
        console.error('Error updating project spent budget:', error);
    }
};


