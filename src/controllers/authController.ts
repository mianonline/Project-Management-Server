import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password, name, role } = req.body;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role || 'MEMBER',
            },
        });

        // Generate token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET as any,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any }
        );

        res.status(201).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                role: user.role,
                hasPassword: !!user.password,
            },
        });
    } catch (error) {
        console.error(error);
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
                                name: true
                            }
                        }
                    }
                }
            }
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
            process.env.JWT_SECRET as any,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any }
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
            },
        });
    } catch (error) {
        console.error(error);
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
                teamMemberships: {
                    select: {
                        team: {
                            select: {
                                name: true
                            }
                        }
                    }
                },
                password: true
            },
        });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({
            ...user,
            hasPassword: !!user.password,
            password: undefined
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { email, name, photoURL } = req.body;


        let user = await prisma.user.findUnique({
            where: { email },
            include: {
                teamMemberships: {
                    include: {
                        team: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            }
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
                                    name: true
                                }
                            }
                        }
                    }
                }
            });
        }

        if (!user) {
            res.status(500).json({ message: 'Error creating user' });
            return;
        }

        // Generate token for both new and existing users
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            process.env.JWT_SECRET as any,
            { expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any }
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
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};



// get all users for Team Members 
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
                                name: true
                            }
                        }
                    }
                }
            }
        });
        res.json({ users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching users" });
    }
};

// Edit Profile 
export const editProfile = async (req: AuthRequest, res: Response) => {
    try {
        const { name, avatar } = req.body;
        const user = await prisma.user.update({
            where: { id: req.user?.id },
            data: { name, avatar },
        });
        res.json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating profile" });
    }
};

// Change Password
export const changePassword = async (req: AuthRequest, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new passwords are required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user || !user.password) {
            return res.status(404).json({ message: "User not found or using social login" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        // Create and Emit Notification
        const notification = await prisma.notification.create({
            data: {
                userId: userId as string,
                type: "SECURITY_UPDATE",
                title: "Password Changed",
                message: "Your password was successfully updated.",
                data: { timestamp: new Date() }
            }
        });

        const { emitNotification } = require('../config/socket');
        emitNotification(userId, notification);

        res.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error changing password" });
    }
};