import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getKPIs = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const role = req.user!.role;
        const { projectId } = req.query;

        // Define filter based on role (Managers see all, Members see assigned/created)
        const taskFilter: any = role === 'MANAGER'
            ? {}
            : {
                AND: [
                    { OR: [{ assignedToId: userId }, { createdById: userId }] },
                    { project: { team: { members: { some: { userId } } } } }
                ]
            };

        // Apply projectId filter if provided
        if (projectId && typeof projectId === 'string' && projectId !== 'all') {
            taskFilter.projectId = projectId;
        }

        const [totalTasks, completedTasks, inProgressTasks, canceledTasks] = await Promise.all([
            prisma.task.count({ where: taskFilter }),
            prisma.task.count({ where: { ...taskFilter, status: 'COMPLETED' } }),
            prisma.task.count({ where: { ...taskFilter, status: 'IN_PROGRESS' } }),
            prisma.task.count({ where: { ...taskFilter, status: 'CANCELED' } }),
        ]);

        const projectQuery: any = role === 'MANAGER'
            ? { status: 'active' }
            : {
                status: 'active',
                AND: [
                    { team: { members: { some: { userId } } } },
                    { tasks: { some: { OR: [{ assignedToId: userId }, { createdById: userId }] } } }
                ]
            };

        if (projectId && typeof projectId === 'string' && projectId !== 'all') {
            projectQuery.id = projectId;
        }

        const activeProjects = await prisma.project.count({
            where: projectQuery
        });

        res.json({
            tasks: {
                total: totalTasks,
                completed: completedTasks,
                inProgress: inProgressTasks,
                canceled: canceledTasks,
            },
            projects: {
                active: activeProjects,
            }
        });
    } catch (error) {
        console.error('Get KPIs error:', error);
        res.status(500).json({ message: 'Error fetching KPIs' });
    }
};

export const getRecentActivity = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const role = req.user!.role;
        const { projectId } = req.query;

        const taskFilter: any = role === 'MANAGER'
            ? {}
            : {
                AND: [
                    { OR: [{ assignedToId: userId }, { createdById: userId }] },
                    { project: { team: { members: { some: { userId } } } } }
                ]
            };

        if (projectId && typeof projectId === 'string' && projectId !== 'all') {
            taskFilter.projectId = projectId;
        }

        const recentTasks = await prisma.task.findMany({
            where: taskFilter,
            orderBy: { updatedAt: 'desc' },
            take: 5,
            include: {
                project: { select: { name: true } },
                assignedTo: { select: { name: true, avatar: true } }
            }
        });

        res.json({ recentActivity: recentTasks });
    } catch (error) {
        console.error('Get recent activity error:', error);
        res.status(500).json({ message: 'Error fetching recent activity' });
    }
};

export const getProjectStats = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const role = req.user!.role;

        const projectFilter: any = role === 'MANAGER'
            ? {}
            : {
                AND: [
                    { team: { members: { some: { userId } } } },
                    { tasks: { some: { OR: [{ assignedToId: userId }, { createdById: userId }] } } }
                ]
            };

        const projects = await prisma.project.findMany({
            where: projectFilter,
            select: {
                id: true,
                name: true,
                status: true,
                progress: true,
                endDate: true,
                _count: {
                    select: { tasks: true }
                }
            },
            orderBy: { updatedAt: 'desc' },
            take: 5
        });

        res.json({ projectStats: projects });
    } catch (error) {
        console.error('Get project stats error:', error);
        res.status(500).json({ message: 'Error fetching project stats' });
    }
};
