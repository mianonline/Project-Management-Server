import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const createTeam = async (req: AuthRequest, res: Response) => {
    try {
        const { name, memberIds } = req.body; // Expect memberIds array of userIds

        if (!name) return res.status(400).json({ message: "Team name is required" });

        const existingTeam = await prisma.team.findUnique({ where: { name } });
        if (existingTeam) return res.status(400).json({ message: "Team name already exists" });

        // Create team and assign members if provided
        const team = await prisma.team.create({
            data: {
                name,
                members: {
                    create: memberIds && memberIds.length > 0
                        ? memberIds.map((userId: string) => ({ userId }))
                        : []
                }
            },
            include: { members: true }
        });

        res.status(201).json({ team });

    } catch (error) {
        console.error("Create team error:", error);
        res.status(500).json({ message: "Error creating team" });
    }
};


export const getTeam = async (req: AuthRequest, res: Response) => {
    try {
        const { search } = req.query;

        const users = await prisma.team.findMany({
            where: search
                ? {
                    OR: [
                        { name: { contains: String(search), mode: 'insensitive' } },

                    ]
                }
                : {},
            select: {
                id: true,
                name: true,

            }
        });

        res.json({ users });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
};

export const getTeamMembers = async (req: AuthRequest, res: Response) => {
    try {
        const { teamId } = req.query;

        if (!teamId) return res.status(400).json({ message: "Team ID is required" });

        // 1️⃣ TeamMember table se members la lo
        const teamMembers = await prisma.teamMember.findMany({
            where: { teamId: String(teamId) },
            select: { userId: true } // sirf userId chahiye
        });

        // 2️⃣ Agar koi member nahi
        if (teamMembers.length === 0) {
            return res.status(404).json({ message: "No members found for this team" });
        }

        // 3️⃣ User details fetch karo
        const userIds = teamMembers.map(m => m.userId);

        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, avatar: true, role: true }
        });

        res.json({ users });

    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
};




// export const getTeamMembers = async (req: AuthRequest, res: Response) => {
//     try {
//         const { search } = req.query;

//         const whereClause: any = {};
//         if (search) {
//             whereClause.OR = [
//                 { name: { contains: String(search), mode: 'insensitive' } },
//                 { email: { contains: String(search), mode: 'insensitive' } }
//             ];
//         }

//         // Get all users for directory (filtered by search if present)
//         const users = await prisma.user.findMany({
//             where: whereClause,
//             select: {
//                 id: true,
//                 name: true,
//                 email: true,
//                 role: true,
//                 avatar: true,
//                 _count: {
//                     select: { assignedTasks: true }
//                 }
//             }
//         });

//         res.json({ users });
//     } catch (error) {
//         console.error('Get team error:', error);
//         res.status(500).json({ message: 'Error fetching team members' });
//     }
// };

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
