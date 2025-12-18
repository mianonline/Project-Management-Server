import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ notifications });
    } catch (error) {
        console.error("Get notifications error:", error);
        res.status(500).json({ message: "Error fetching notifications" });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        const updatedNotification = await prisma.notification.update({
            where: { id },
            data: { isRead: true }
        });

        res.json({ notification: updatedNotification });
    } catch (error) {
        console.error("Mark as read error:", error);
        res.status(500).json({ message: "Error updating notification" });
    }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        await prisma.notification.delete({
            where: { id }
        });

        res.json({ message: "Notification deleted" });
    } catch (error) {
        console.error("Delete notification error:", error);
        res.status(500).json({ message: "Error deleting notification" });
    }
};
