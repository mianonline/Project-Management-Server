import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();


export const createProject = async (req: AuthRequest, res: Response) => {
    try {
        const { name, description, startDate, endDate } = req.body;

        if (!name || !startDate || !endDate) {
            return res.status(400).json({ error: "Required fields missing" });
        }

        const project = await prisma.project.create({
            data: {
                name,
                description,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                managerId: req.user!.id
            }
        });

        res.status(201).json({
            message: "Project created successfully",
            project
        });

    } catch (error) {
        console.error("Create Project Error:", error);
        res.status(500).json({ error: "Server error" });
    }
};

export const getProjects = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const role = req.user!.role;

        const where = role === 'MANAGER'
            ? {}
            : { teamMembers: { some: { userId } } };

        const projects = await prisma.project.findMany({
            where,
            include: {
                manager: { select: { id: true, name: true } },
                teamMembers: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                _count: { select: { tasks: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });

        res.json({ projects });
    } catch (error) {
        console.error('Get projects error:', error);
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
                teamMembers: { include: { user: { select: { id: true, name: true, avatar: true } } } },
                tasks: {
                    include: {
                        assignedTo: { select: { id: true, name: true, avatar: true } }
                    }
                }
            }
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
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
            }
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
