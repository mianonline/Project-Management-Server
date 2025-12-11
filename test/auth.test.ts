// @ts-nocheck
import dotenv from 'dotenv';
dotenv.config();
import request from 'supertest';
import { expect } from 'chai';
import app from '../src/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth API', () => {
    before(async () => {
        // Clean up database before tests
        try {
            await prisma.user.deleteMany();
        } catch (e) {
            console.log('DB cleanup failed', e);
        }
    });

    after(async () => {
        await prisma.$disconnect();
    });

    let token = '';

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Test User',
                email: 'test@example.com',
                password: 'password123',
                role: 'MEMBER'
            });

        expect(res.status).to.equal(201);
        expect(res.body).to.have.property('token');
        expect(res.body.user).to.have.property('email', 'test@example.com');
        token = res.body.token;
    });

    it('should login the registered user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'password123'
            });

        expect(res.status).to.equal(200);
        expect(res.body).to.have.property('token');
    });

    it('should not login with incorrect password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });

        expect(res.status).to.equal(400);
    });
});
