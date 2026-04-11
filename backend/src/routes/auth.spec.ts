import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRouter from './auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const SECRET = 'test-jwt-secret';

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.AUTH_USERNAME = 'admin';
    process.env.AUTH_PASSWORD = 'admin123';
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.AUTH_USERNAME;
    delete process.env.AUTH_PASSWORD;
    delete process.env.JWT_SECRET;
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'admin123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 500 when JWT_SECRET is not set', async () => {
    delete process.env.JWT_SECRET;
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/JWT_SECRET/i);
  });

  it('returns 401 when username is wrong', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'wrong', password: 'admin123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 401 when password is wrong', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it('returns 200 with a valid JWT for correct plain-text credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.expiresIn).toBe(28800);
    const payload = jwt.verify(res.body.token, SECRET) as { userId: string };
    expect(payload.userId).toBe('admin');
  });

  it('returns 200 for correct credentials when password is bcrypt-hashed', async () => {
    const hash = await bcrypt.hash('secret', 10);
    process.env.AUTH_PASSWORD = hash;
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'secret' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 for wrong password against a bcrypt-hashed stored password', async () => {
    const hash = await bcrypt.hash('secret', 10);
    process.env.AUTH_PASSWORD = hash;
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});
