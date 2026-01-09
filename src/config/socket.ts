import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Notification } from '@prisma/client';
import { SocketUser, AuthenticatedSocket } from '../../types';

let io: Server;

export const initSocket = (server: HttpServer) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });


    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as SocketUser;
            (socket as AuthenticatedSocket).user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const user = (socket as AuthenticatedSocket).user;
        if (user) {
            console.log(`User connected to socket: ${user.name} (${socket.id})`);
            socket.join(user.id);
        }

        socket.on('disconnect', () => {
            console.log(`User disconnected: ${user?.name || 'Unknown'}`);
        });

        // Room management for real-time task updates
        socket.on('join_task', (taskId: string) => {
            if (user) {
                console.log(`User ${user.name} joining task room: ${taskId}`);
                socket.join(taskId);
            }
        });

        socket.on('leave_task', (taskId: string) => {
            if (user) {
                console.log(`User ${user.name} leaving task room: ${taskId}`);
                socket.leave(taskId);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized');
    }
    return io;
};


export const emitNotification = (userId: string, notification: Notification) => {
    if (io) {
        console.log(`Emitting notification to user ${userId}:`, notification.title);
        io.to(userId).emit('new_notification', notification);
    } else {
        console.error('Cannot emit notification: Socket.io not initialized');
    }
};
