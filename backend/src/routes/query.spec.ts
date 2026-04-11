import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from '../middleware/auth';
import queryRouter from './query';

// Mock the database service to avoid real DB connections
jest.mock('../services/database', () => ({
  runQuery: jest.fn(),
}));

import { runQuery } from '../services/database';
const mockRunQuery = runQuery as jest.Mock;

const SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api/query', authMiddleware, queryRouter);

function authHeader(): string {
  const token = jwt.sign({ userId: 'admin' }, SECRET);
  return `Bearer ${token}`;
}

const validBody = {
  connection: { type: 'mysql', host: 'localhost', port: 3306, user: 'root', password: '', database: 'test' },
  sql: 'SELECT 1',
};

describe('POST /api/query', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/query').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 400 when connection is missing', async () => {
    const res = await request(app)
      .post('/api/query')
      .set('Authorization', authHeader())
      .send({ sql: 'SELECT 1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/connection/i);
  });

  it('returns 400 when sql is missing', async () => {
    const res = await request(app)
      .post('/api/query')
      .set('Authorization', authHeader())
      .send({ connection: validBody.connection });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sql/i);
  });

  it('returns 400 when sql is empty string', async () => {
    const res = await request(app)
      .post('/api/query')
      .set('Authorization', authHeader())
      .send({ connection: validBody.connection, sql: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sql/i);
  });

  it('returns 400 for an invalid database type', async () => {
    const res = await request(app)
      .post('/api/query')
      .set('Authorization', authHeader())
      .send({ connection: { ...validBody.connection, type: 'oracle' }, sql: 'SELECT 1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mysql|postgresql|mssql/);
  });

  it('returns 400 when host is missing', async () => {
    const res = await request(app)
      .post('/api/query')
      .set('Authorization', authHeader())
      .send({ connection: { type: 'mysql', user: 'root', database: 'test' }, sql: 'SELECT 1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/host/i);
  });

  it('returns 200 with query results on success', async () => {
    const fakeResult = { columns: ['id'], rows: [{ id: 1 }], rowCount: 1, duration: 5 };
    mockRunQuery.mockResolvedValueOnce(fakeResult);

    const res = await request(app)
      .post('/api/query')
      .set('Authorization', authHeader())
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeResult);
    expect(mockRunQuery).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'mysql', host: 'localhost', database: 'test' }),
      'SELECT 1'
    );
  });

  it('uses default port when port is omitted', async () => {
    const fakeResult = { columns: [], rows: [], rowCount: 0, duration: 3 };
    mockRunQuery.mockResolvedValueOnce(fakeResult);

    const body = {
      connection: { type: 'postgresql', host: 'localhost', user: 'root', database: 'test' },
      sql: 'SELECT 1',
    };
    await request(app).post('/api/query').set('Authorization', authHeader()).send(body);

    expect(mockRunQuery).toHaveBeenCalledWith(
      expect.objectContaining({ port: 5432 }),
      'SELECT 1'
    );
  });

  it('returns 500 when runQuery throws', async () => {
    mockRunQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app)
      .post('/api/query')
      .set('Authorization', authHeader())
      .send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Connection refused');
  });
});
