import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../../types';

const prisma = new PrismaClient();

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, startDate, endDate, budget, teamId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate
      ? new Date(endDate)
      : new Date(new Date().setMonth(new Date().getMonth() + 1));
    const initialBudget = budget ? parseFloat(budget) : 0;

    const project = await prisma.project.create({
      data: {
        name,
        description: description || '',
        startDate: start,
        endDate: end,
        budget: initialBudget,
        managerId: req.user!.id,
        status: 'active',
        spent: 0,
        teamId: teamId,
      },
    });

    res.status(201).json({
      message: 'Project created successfully',
      project,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    const where: Prisma.ProjectWhereInput =
      role === 'MANAGER'
        ? {}
        : {
            team: { members: { some: { userId } } },
          };

    const projects = await prisma.project.findMany({
      where,
      include: {
        manager: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ projects });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching projects' });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true, name: true, avatar: true } },
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatar: true } },
              },
            },
          },
        },
        tasks: {
          include: {
            assignedTo: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (req.user?.role === 'MEMBER') {
      const isTeamMember = await prisma.teamMember.findFirst({
        where: { userId: req.user.id, teamId: project.teamId as string },
      });

      if (!isTeamMember) {
        return res.status(403).json({ message: "You don't have access to this project" });
      }
    }

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching project' });
  }
};

export const updateProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, status, startDate, endDate, budget } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        status,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        budget: budget ? parseFloat(budget) : undefined,
      },
    });

    res.json({ project });
  } catch (error) {
    res.status(500).json({ message: 'Error updating project' });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting project' });
  }
};
