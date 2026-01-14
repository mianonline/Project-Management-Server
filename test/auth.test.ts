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
      // Delete in order of dependency to avoid foreign key errors
      await prisma.comment.deleteMany();
      await prisma.task.deleteMany();
      await prisma.project.deleteMany();
      await prisma.teamMember.deleteMany();
      await prisma.team.deleteMany();
      await prisma.user.deleteMany();
    } catch (e) {
      console.log('DB cleanup failed', e);
    }
  });

  after(async () => {
    await prisma.$disconnect();
  });

  let token = '';

  it('should register a new user with email only', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      role: 'MEMBER',
    });

    expect(res.status).to.equal(201);
    expect(res.body).to.not.have.property('token'); // Should not auto-login
    expect(res.body.user).to.have.property('email', 'test@example.com');
    expect(res.body.message).to.include('password sent to email');
  });

  it('should login the registered user', async () => {
    // Create user manually to have a known password
    const password = 'knownPassword123';
    const bcrypt = require('bcryptjs'); // Import locally or at top
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email: 'login@example.com',
        name: 'Login User',
        password: hashedPassword,
        role: 'MEMBER',
      },
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'login@example.com',
      password: password,
    });

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('token');
  });

  it('should not login with incorrect password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).to.equal(400);
  });
});
