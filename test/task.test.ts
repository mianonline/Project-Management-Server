// @ts-nocheck
import request from 'supertest';
import { expect } from 'chai';
import app from '../src/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Task API', () => {
  let managerToken = '';
  let projectId = '';
  let taskId = '';

  before(async () => {
    // Clean up
    try {
      await prisma.comment.deleteMany();
      await prisma.task.deleteMany();
      await prisma.project.deleteMany();
      await prisma.teamMember.deleteMany();
      await prisma.team.deleteMany();
      await prisma.user.deleteMany();
    } catch (e) {
      console.log(e);
    }

    // Create Manager User
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);

    await prisma.user.create({
      data: {
        email: 'manager@test.com',
        name: 'Manager',
        password: hashedPassword,
        role: 'MANAGER',
      },
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'manager@test.com', password: 'password123' });
    managerToken = loginRes.body.token;

    // Create Project
    const projectRes = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Task Project',
        description: 'For testing tasks',
        budget: 1000,
      });
    projectId = projectRes.body.project.id;
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('should create a new task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Test Task',
        projectId: projectId,
        priority: 'HIGH',
        budget: 100,
      });

    expect(res.status).to.equal(201);
    expect(res.body).to.have.property('name', 'Test Task');
    expect(res.body).to.have.property('projectId', projectId);
    taskId = res.body.id;
  });

  it('should update task status', async () => {
    const res = await request(app)
      .put(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: 'COMPLETED',
      });

    expect(res.status).to.equal(200);
    expect(res.body.task).to.have.property('status', 'COMPLETED');
  });

  it('should get tasks for project', async () => {
    const res = await request(app)
      .get(`/api/tasks?projectId=${projectId}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).to.equal(200);
    expect(res.body.tasks).to.be.an('array');
    expect(res.body.tasks[0]).to.have.property('id', taskId);
  });
});
