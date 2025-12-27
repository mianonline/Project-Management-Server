import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

export const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;
        const { content } = req.body;
        const authorId = req.user!.id;

        if (!content) {
            return res.status(400).json({ message: "Comment content is required" });
        }

        if (!isValidObjectId(taskId)) {
            return res.status(400).json({ message: "Invalid Task ID format" });
        }

        // Check if task exists
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const comment: any = await prisma.comment.create({
            data: {
                content,
                taskId,
                authorId,
                attachments: (req.body as any).attachments || []
            } as any,
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            }
        });

        res.status(201).json(comment);
    } catch (error: any) {
        console.error("Create Comment - Error:", error);
        res.status(500).json({ message: "Error creating comment", error: error.message });
    }
};

export const getCommentsByTaskId = async (req: AuthRequest, res: Response) => {
    try {
        const { taskId } = req.params;

        if (!isValidObjectId(taskId)) {
            return res.status(400).json({ message: "Invalid Task ID format" });
        }

        const comments = await prisma.comment.findMany({
            where: { taskId },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ comments });
    } catch (error: any) {
        console.error("Get Comments - Error:", error);
        res.status(500).json({ message: "Error fetching comments", error: error.message });
    }
};

export const deleteComment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.id;

        const comment = await prisma.comment.findUnique({
            where: { id }
        });

        if (!comment) {
            return res.status(404).json({ message: "Comment not found" });
        }

        if (comment.authorId !== userId) {
            return res.status(403).json({ message: "Unauthorized to delete this comment" });
        }

        await prisma.comment.delete({
            where: { id }
        });

        res.json({ message: "Comment deleted successfully" });
    } catch (error: any) {
        console.error("Delete Comment - Error:", error);
        res.status(500).json({ message: "Error deleting comment", error: error.message });
    }
};
