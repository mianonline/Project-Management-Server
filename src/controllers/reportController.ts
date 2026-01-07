import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../types';

const prisma = new PrismaClient();

export const getProductivityReport = async (req: AuthRequest, res: Response) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: {
                        assignedTasks: { where: { status: 'COMPLETED' } },
                        createdTasks: true
                    }
                }
            }
        });

        const productivity = users.map(user => ({
            name: user.name,
            completedTasks: user._count.assignedTasks,
            createdTasks: user._count.createdTasks,
            score: user._count.assignedTasks * 10
        }));

        res.json({ productivity });
    } catch (error) {
        res.status(500).json({ message: 'Error generating report' });
    }
};

export const getTaskPerformance = async (req: AuthRequest, res: Response) => {
    try {
        const total = await prisma.task.count();
        const byStatus = await prisma.task.groupBy({
            by: ['status'],
            _count: { _all: true }
        });

        const byPriority = await prisma.task.groupBy({
            by: ['priority'],
            _count: { _all: true }
        });

        res.json({
            total,
            byStatus,
            byPriority
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating task report' });
    }
};
