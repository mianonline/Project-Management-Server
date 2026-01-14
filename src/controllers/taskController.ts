import { Request, Response } from 'express';
import { PrismaClient, Prisma, TaskStatus, TaskPriority } from '@prisma/client';
import { AuthRequest, PrismaError } from '../../types';
import { getIO } from '../config/socket';

const prisma = new PrismaClient();

const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

// Add a subtask
export const addSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Subtask title is required' });
    }

    const existingSubtask = await prisma.subtask.findFirst({
      where: {
        taskId,
        title: {
          equals: title,
          mode: 'insensitive',
        },
      },
    });

    if (existingSubtask) {
      return res.status(409).json({ message: 'A subtask with this name already exists' });
    }

    const subtask = await prisma.subtask.create({
      data: {
        title,
        taskId,
        completed: false,
      },
    });

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.to(taskId).emit('subtask_added', subtask);
    }

    res.status(201).json(subtask);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Error adding subtask', error: errorMessage });
  }
};

// Toggle subtask completion
export const toggleSubtask = async (req: AuthRequest, res: Response) => {
  try {
    const { subtaskId } = req.params;

    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
    });

    if (!subtask) {
      return res.status(404).json({ message: 'Subtask not found' });
    }

    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        completed: !subtask.completed,
      },
    });

    // Emit real-time update
    const io = getIO();
    if (io) {
      io.to(updatedSubtask.taskId).emit('subtask_updated', updatedSubtask);
    }

    res.json(updatedSubtask);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ message: 'Error toggling subtask', error: errorMessage });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { name, projectId, assigneeId, description, status, priority, dueDate, budget, label } =
      req.body;
    let { sectionId } = req.body;
    const createdById = req.user!.id;

    if (!name || !projectId) {
      return res.status(400).json({
        message: 'Task name and Project ID are required',
        received: { name, projectId },
      });
    }

    if (!isValidObjectId(projectId)) {
      return res.status(400).json({ message: 'Invalid Project ID format' });
    }

    const existingTask = await prisma.task.findFirst({
      where: {
        projectId,
        name: {
          equals: name,
          mode: 'insensitive',
        },
      },
    });

    if (existingTask) {
      return res.status(409).json({
        message: 'A task with this name already exists in this project',
      });
    }

    if (sectionId && !isValidObjectId(sectionId)) {
      sectionId = undefined;
    }

    if (!sectionId) {
      const firstSection = await prisma.section.findFirst({
        where: { projectId },
        orderBy: { order: 'asc' },
      });

      if (firstSection) {
        sectionId = firstSection.id;
      } else {
        const newSection = await prisma.section.create({
          data: {
            title: 'To Do',
            projectId,
            order: 0,
          },
        });
        sectionId = newSection.id;
      }
    }

    const newTask = await prisma.task.create({
      data: {
        name,
        description: description || null,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        projectId,
        sectionId,
        assignedToId: assigneeId && isValidObjectId(assigneeId) ? assigneeId : null,
        createdById,
        budget: budget ? parseFloat(budget) : 0,
        label: label || [],
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
        section: true,
      },
    });

    await Promise.all([updateProjectProgress(projectId), updateProjectSpentBudget(projectId)]);

    res.status(201).json(newTask);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      error instanceof Error && 'code' in error ? (error as PrismaError).code : 'UNKNOWN_ERROR';
    res.status(500).json({
      message: 'Error creating task',
      error: errorMessage,
      code: errorCode,
    });
  }
};

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: 'Authentication context missing' });
    }

    const { projectId, status, priority, assigneeId } = req.query;
    const where: Prisma.TaskWhereInput = {};

    if (projectId && typeof projectId === 'string' && isValidObjectId(projectId)) {
      where.projectId = projectId;

      if (role !== 'MANAGER') {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { teamId: true },
        });

        if (!project || !project.teamId) {
          return res.status(403).json({ message: 'Project not found or team access error' });
        }

        const isMember = await prisma.teamMember.findUnique({
          where: {
            userId_teamId: {
              userId,
              teamId: project.teamId,
            },
          },
        });

        if (!isMember) {
          return res.status(403).json({ message: "You don't have access to this project" });
        }
      }
    } else if (role !== 'MANAGER') {
      const userTeams = await prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
      });
      const teamIds = userTeams.map((t) => t.teamId);

      const userProjects = await prisma.project.findMany({
        where: { teamId: { in: teamIds } },
        select: { id: true },
      });
      const projectIds = userProjects.map((p) => p.id);

      where.OR = [
        { assignedToId: userId },
        { createdById: userId },
        { projectId: { in: projectIds } },
      ];
    }

    if (status && typeof status === 'string') where.status = status as TaskStatus;
    if (priority && typeof priority === 'string') where.priority = priority as TaskPriority;
    if (assigneeId && typeof assigneeId === 'string' && isValidObjectId(assigneeId)) {
      where.assignedToId = assigneeId;
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        createdBy: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        section: { select: { id: true, title: true } },
        subtasks: { orderBy: { createdAt: 'asc' } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const tasksWithCounts = await Promise.all(
      tasks.map(async (task) => {
        const commentsWithAttachments = await prisma.comment.findMany({
          where: {
            taskId: task.id,
            attachments: { isEmpty: false },
          },
          select: { id: true },
        });

        return {
          ...task,
          comments: task._count?.comments || 0,
          attachments: commentsWithAttachments.length,
        };
      })
    );

    return res.json({ tasks: tasksWithCounts });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      error instanceof Error && 'code' in error ? (error as PrismaError).code : undefined;
    const errorMeta =
      error instanceof Error && 'meta' in error ? (error as PrismaError).meta : undefined;
    res.status(500).json({
      error: 'Failed to load tasks',
      message: errorMessage,
      prismaCode: errorCode,
      prismaMeta: errorMeta,
    });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
        section: { select: { id: true, title: true } },
        subtasks: { orderBy: { createdAt: 'asc' } },
        _count: { select: { comments: true } },
      },
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const taskWithCount = {
      ...task,
      comments: task._count?.comments || 0,
    };

    res.json({ task: taskWithCount });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching task' });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const oldTask = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
    const { name, description, status, priority, dueDate, assigneeId, sectionId, order, budget } =
      req.body;

    const task = await prisma.task.update({
      where: { id },
      data: {
        name,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        assignedToId: assigneeId,
        sectionId,
        order,
        budget: budget !== undefined ? parseFloat(budget) : undefined,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
      },
    });

    if (oldTask) {
      await Promise.all([
        updateProjectProgress(oldTask.projectId),
        updateProjectSpentBudget(oldTask.projectId),
      ]);
    }

    res.json({ task });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task' });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const task = await prisma.task.delete({
      where: { id },
    });

    await Promise.all([
      updateProjectProgress(task.projectId),
      updateProjectSpentBudget(task.projectId),
    ]);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task' });
  }
};

const updateProjectProgress = async (projectId: string) => {
  try {
    const totalTasks = await prisma.task.count({ where: { projectId } });
    const completedTasks = await prisma.task.count({
      where: { projectId, status: 'COMPLETED' },
    });

    const progress = totalTasks === 0 ? 0 : (completedTasks / totalTasks) * 100;

    await prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });
  } catch (error) {
    console.error('Error updating project progress:', error);
  }
};

const updateProjectSpentBudget = async (projectId: string) => {
  try {
    const result = await prisma.task.aggregate({
      where: { projectId },
      _sum: {
        budget: true,
      },
    });

    const totalSpent = result._sum.budget || 0;

    await prisma.project.update({
      where: { id: projectId },
      data: { spent: totalSpent },
    });
  } catch (error) {
    console.error('Error updating project spent budget:', error);
  }
};
