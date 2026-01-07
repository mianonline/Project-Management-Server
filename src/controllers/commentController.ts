import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../types';
import { emitNotification } from '../config/socket';

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

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        managerId: true,
                        team: {
                            include: {
                                members: {
                                    select: { userId: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const comment = await prisma.comment.create({
            data: {
                content,
                taskId,
                authorId,
                attachments: Array.isArray(req.body.attachments) ? req.body.attachments : []
            },
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

        const teamMembers = task.project?.team?.members.map(m => m.userId) || [];
        const managerId = task.project?.managerId;

        const recipients = new Set([...teamMembers]);
        if (managerId) recipients.add(managerId);

        for (const recipientId of recipients) {
            if (recipientId !== authorId) {
                try {
                    const notification = await prisma.notification.create({
                        data: {
                            userId: recipientId,
                            type: "NEW_COMMENT",
                            title: "New Comment on Task",
                            message: `${comment.author.name} commented on "${task.name}"`,
                            data: {
                                taskId: task.id,
                                commentId: comment.id,
                                commenterName: comment.author.name,
                                commenterAvatar: comment.author.avatar
                            }
                        }
                    });
                    emitNotification(recipientId, notification);

                    const { getIO } = require('../config/socket');
                    const io = getIO();
                    if (io) {
                        io.to(recipientId).emit('new_comment', {
                            taskId: task.id,
                            comment: comment
                        });
                    }
                } catch (notifyErr) {
                    console.error(`Failed to create/emit notification for user ${recipientId}:`, notifyErr);
                }
            }
        }

        res.status(201).json(comment);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: "Error creating comment", error: errorMessage });
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: "Error fetching comments", error: errorMessage });
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
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: "Error deleting comment", error: errorMessage });
    }
};
