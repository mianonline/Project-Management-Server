import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../types';


const prisma = new PrismaClient();


export const createSection = async (req: AuthRequest, res: Response) => {
    try {
        const { title, projectId } = req.body;
        const createdById = req.user!.id;

        // Required fields validation
        if (!title || !projectId) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        // Optional: check if Project exists
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) return res.status(404).json({ message: "Project not found" });

        // Create Section
        const newSection = await prisma.section.create({
            data: {
                title,
                projectId,

            },
            include: {
                project: { select: { id: true, name: true } }
            }
        });

        res.status(201).json({ section: newSection });
    } catch (error) {
        console.error("Create Section Error:", error);
        res.status(500).json({ message: "Error creating section", error });
    }
};