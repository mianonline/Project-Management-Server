import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getKPIs = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const role = req.user!.role;
        const { projectId, year } = req.query;

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

        const [totalTasks, completedTasks, inProgressTasks, canceledTasks, overdueTasks] = await Promise.all([
            prisma.task.count({ where: taskFilter }),
            prisma.task.count({ where: { ...taskFilter, status: 'COMPLETED' } }),
            prisma.task.count({ where: { ...taskFilter, status: 'IN_PROGRESS' } }),
            prisma.task.count({ where: { ...taskFilter, status: 'CANCELED' } }),
            prisma.task.count({
                where: {
                    ...taskFilter,
                    status: { not: 'COMPLETED' },
                    dueDate: { lt: new Date() }
                }
            }),
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

        // NEW: Aggregate budget data
        const budgetStats = await prisma.project.aggregate({
            where: projectQuery,
            _sum: {
                budget: true,
                spent: true
            }
        });

        // Chart data logic
        let chartData: { label: string; value: number }[] = [];
        let initialSpend = 0;

        if (year && typeof year === 'string') {
            const selectedYear = parseInt(year);
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

            const tasksByYear = await prisma.task.findMany({
                where: {
                    ...taskFilter,
                    status: { not: 'CANCELED' },
                    createdAt: {
                        gte: new Date(selectedYear, 0, 1),
                        lt: new Date(selectedYear + 1, 0, 1)
                    }
                },
                select: { createdAt: true, budget: true }
            });

            chartData = months.map((month, i) => {
                const monthTasksCount = tasksByYear.filter(t => t.createdAt.getMonth() === i).length;
                return { label: month, value: monthTasksCount };
            });
        } else {
            // Original daily Current Month logic
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const [tasksThisMonth, initialSpendResult] = await Promise.all([
                prisma.task.findMany({
                    where: {
                        ...taskFilter,
                        status: { not: 'CANCELED' },
                        updatedAt: { gte: startOfMonth }
                    },
                    select: { updatedAt: true, budget: true }
                }),
                prisma.task.aggregate({
                    where: {
                        ...taskFilter,
                        status: { not: 'CANCELED' },
                        updatedAt: { lt: startOfMonth }
                    },
                    _sum: { budget: true }
                })
            ]);

            initialSpend = initialSpendResult._sum.budget || 0;
            const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            chartData = Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayTasks = tasksThisMonth.filter(t => t.updatedAt.getDate() === day);
                const totalDailySpend = dayTasks.reduce((sum, t: any) => sum + (t.budget || 0), 0);
                return {
                    label: day.toString().padStart(2, '0'),
                    value: totalDailySpend
                };
            });
        }

        res.json({
            chartData,
            initialSpend,
            tasks: {
                total: totalTasks,
                completed: completedTasks,
                inProgress: inProgressTasks,
                canceled: canceledTasks,
                overdue: overdueTasks,
            },
            projects: {
                active: activeProjects,
                totalBudget: budgetStats._sum.budget || 0,
                totalSpent: budgetStats._sum.spent || 0
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
                assignedTo: { select: { name: true, avatar: true } },
                subtasks: true
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
