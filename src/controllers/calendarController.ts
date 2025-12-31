import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const createEvent = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, type, startTime, endTime, projectId, attendees } = req.body;

        const creatorId = req.user!.id;
        const attendeeIds = [...new Set([...(attendees || []), creatorId])];

        const event = await prisma.calendarEvent.create({
            data: {
                title,
                description,
                type,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                projectId,
                attendees: {
                    create: attendeeIds.map((userId: string) => ({
                        userId
                    }))
                }
            },
            include: {
                attendees: { include: { user: { select: { id: true, name: true } } } },
                project: { select: { name: true } }
            }
        });

        res.status(201).json({ event });
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ message: 'Error creating event' });
    }
};

export const getEvents = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.id;
        const { start, end } = req.query;

        const where: any = {
            OR: [
                { attendees: { some: { userId } } },
                { project: { team: { members: { some: { userId } } } } }
            ]
        };

        if (start && end) {
            where.startTime = {
                gte: new Date(start as string),
                lte: new Date(end as string)
            };
        }

        const events = await prisma.calendarEvent.findMany({
            where,
            include: {
                attendees: { include: { user: { select: { id: true, name: true } } } },
                project: { select: { name: true } }
            },
            orderBy: { startTime: 'asc' }
        });

        res.json({ events });
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ message: 'Error fetching events' });
    }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.calendarEvent.delete({ where: { id } });
        res.json({ message: 'Event deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting event' });
    }
};
