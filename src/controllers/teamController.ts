import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const createTeam = async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;

        if (!name) return res.status(400).json({ message: "Team name is required" });

        const existingTeam = await prisma.team.findUnique({ where: { name } });
        if (existingTeam) return res.status(400).json({ message: "Team name already exists" });

        const team = await prisma.team.create({ data: { name } });

        res.status(201).json({ team });

    } catch (error) {
        console.error("Create team error:", error);
        res.status(500).json({ message: "Error creating team" });
    }
};



export const getTeamMembers = async (req: AuthRequest, res: Response) => {
    try {
        const { search } = req.query;

        const whereClause: any = {};
        if (search) {
            whereClause.OR = [
                { name: { contains: String(search), mode: 'insensitive' } },
                { email: { contains: String(search), mode: 'insensitive' } }
            ];
        }

        // Get all users for directory (filtered by search if present)
        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                _count: {
                    select: { assignedTasks: true }
                }
            }
        });

        res.json({ users });
    } catch (error) {
        console.error('Get team error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
};

export const updateMemberRole = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role }
        });

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating member role' });
    }
};
