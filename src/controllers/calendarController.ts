import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthRequest } from '../../types';
import { emitNotification } from '../config/socket';

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
            userId,
          })),
        },
      },
      include: {
        attendees: { include: { user: { select: { id: true, name: true } } } },
        project: { select: { name: true } },
      },
    });

    let usersToNotify: string[] = [];

    if (projectId) {
      const projectWithTeam = await prisma.project.findFirst({
        where: { id: projectId },
        include: {
          team: {
            include: {
              members: {
                select: { userId: true },
              },
            },
          },
        },
      });

      if (projectWithTeam?.team?.members) {
        usersToNotify = projectWithTeam.team.members.map((m) => m.userId);
      }
    }

    usersToNotify = [...new Set([...usersToNotify, ...attendeeIds])];

    const recipients = usersToNotify.filter((id) => id !== creatorId);

    if (recipients.length > 0) {
      const eventDate = new Date(startTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const notificationsPromises = recipients.map(async (userId) => {
        const notification = await prisma.notification.create({
          data: {
            userId,
            title: 'New Project Event',
            message: `A new event "${title}" has been scheduled for project "${event?.project?.name || 'Unknown'}" on ${eventDate}`,
            type: 'EVENT',
            isRead: false,
          },
        });

        emitNotification(userId, notification);
        return notification;
      });

      await Promise.all(notificationsPromises);
    }

    res.status(201).json({ event });
  } catch (error) {
    res.status(500).json({ message: 'Error creating event' });
  }
};

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { start, end, projectId } = req.query;

    const where: Prisma.CalendarEventWhereInput = {
      OR: [
        { attendees: { some: { userId } } },
        { project: { team: { members: { some: { userId } } } } },
      ],
    };

    if (projectId && projectId !== 'all') {
      where.projectId = projectId as string;
    }

    if (start && end) {
      where.startTime = {
        gte: new Date(start as string),
        lte: new Date(end as string),
      };
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      include: {
        attendees: { include: { user: { select: { id: true, name: true } } } },
        project: { select: { name: true } },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ events });
  } catch (error) {
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
