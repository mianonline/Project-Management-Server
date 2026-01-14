import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../types';

const prisma = new PrismaClient();

export const getBudgetOverview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const where = role === 'MANAGER' ? {} : { team: { members: { some: { userId } } } };

    const projects = await prisma.project.findMany({
      where,
      select: {
        id: true,
        name: true,
        budget: true,
        spent: true,
        status: true,
      },
    });

    const totalBudget = projects.reduce((acc, p) => acc + p.budget, 0);
    const totalSpent = projects.reduce((acc, p) => acc + p.spent, 0);

    res.json({
      overview: {
        totalBudget,
        totalSpent,
        remaining: totalBudget - totalSpent,
      },
      projects,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching budget' });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { budget, spent } = req.body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        budget: budget ? parseFloat(budget) : undefined,
        spent: spent ? parseFloat(spent) : undefined,
      },
    });

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Error updating budget' });
  }
};
