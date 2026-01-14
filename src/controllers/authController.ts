import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../../types';
import crypto from 'crypto';
import { mailTransport } from '../services/EmailTemplate/mail';
import {
  forgotPasswordEmailTemplate,
  welcomeEmailTemplate,
} from '../services/EmailTemplate/emailTemplate';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    let { name, password } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    let generatedPassword = '';
    if (!password) {
      generatedPassword = crypto.randomBytes(5).toString('hex');
      password = generatedPassword;
    }

    if (!name) {
      name = email.split('@')[0];
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: role || 'MEMBER',
      },
    });

    if (generatedPassword) {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: 'Welcome to DEFCON - Your Account Credentials',
        html: welcomeEmailTemplate(user.name, user.email, generatedPassword),
      };
      await mailTransport.sendMail(mailOptions);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    res.status(201).json({
      token: generatedPassword ? undefined : token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        hasPassword: !!user.password,
        hasSeenWelcome: user.hasSeenWelcome,
      },
      message: generatedPassword
        ? 'Account created and password sent to email'
        : 'Registration successful',
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMemberships: {
          include: {
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }
    if (!user.password) {
      res.status(400).json({ message: 'Please sign in with Google' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        teamMemberships: user.teamMemberships,
        hasPassword: !!user.password,
        hasSeenWelcome: user.hasSeenWelcome,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        createdAt: true,
        hasSeenWelcome: true,
        teamMemberships: {
          select: {
            team: {
              select: {
                name: true,
              },
            },
          },
        },
        password: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      ...user,
      hasPassword: !!user.password,
      password: undefined,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { email, name, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required for Google authentication.' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMemberships: {
          include: {
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: photoURL,
        },
        include: {
          teamMemberships: {
            include: {
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    }

    if (!user) {
      res.status(500).json({ message: 'Error creating user' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        teamMemberships: user.teamMemberships || [],
        hasPassword: !!user.password,
        hasSeenWelcome: user.hasSeenWelcome,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
export const githubAuth = async (req: Request, res: Response) => {
  try {
    const { email, name, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required for GitHub authentication.' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        teamMemberships: {
          include: {
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatar: photoURL,
        },
        include: {
          teamMemberships: {
            include: {
              team: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });
    }

    if (!user) {
      res.status(500).json({ message: 'Error creating user' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        teamMemberships: user.teamMemberships || [],
        hasPassword: !!user.password,
        hasSeenWelcome: user.hasSeenWelcome,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        teamMemberships: {
          select: {
            team: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

export const editProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { name, avatar } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user?.id },
      data: { name, avatar },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile' });
  }
};

// Change Password
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new passwords are required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      return res.status(404).json({ message: 'User not found or using social login' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    const notification = await prisma.notification.create({
      data: {
        userId: userId as string,
        type: 'SECURITY_UPDATE',
        title: 'Password Changed',
        message: 'Your password was successfully updated.',
        data: { timestamp: new Date() },
      },
    });

    const { emitNotification } = require('../config/socket');
    emitNotification(userId, notification);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password' });
  }
};

// Forgot Password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    if (!user.password) {
      return res
        .status(400)
        .json({ message: 'This account uses social login. Please sign in with Google/Github.' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordExpires = new Date(Date.now() + 3600000);

    await prisma.user.update({
      where: { email },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires,
      },
    });

    const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: forgotPasswordEmailTemplate(resetLink, user.name),
    };

    await mailTransport.sendMail(mailOptions);

    res.json({ message: 'Password reset link sent to your email' });
  } catch (error: unknown) {
    res.status(500).json({
      message: 'Error sending reset link',
    });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.project.deleteMany({
      where: { managerId: userId },
    });
    await prisma.task.updateMany({
      where: { assignedToId: userId },
      data: { assignedToId: null },
    });

    await prisma.task.deleteMany({
      where: { createdById: userId },
    });
    await prisma.comment.deleteMany({
      where: { authorId: userId },
    });

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ message: 'Account deleted successfully' });
  } catch (error: unknown) {
    console.error('[Delete Account] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error deleting account';
    res.status(500).json({ message: errorMessage });
  }
};
export const completeWelcome = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    await prisma.user.update({
      where: { id: userId },
      data: { hasSeenWelcome: true },
    });
    res.status(200).json({ message: 'Welcome completed' });
  } catch (error) {
    res.status(500).json({ message: 'Error completing welcome' });
  }
};
