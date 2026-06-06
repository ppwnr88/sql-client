import request from 'supertest';
import express from 'express';
import queryRouter from './query';

// Mock the database service to avoid real DB connections
jest.mock('../services/database', () => ({
  runQuery: jest.fn(),
}));

import { runQuery } from '../services/database';
const mockRunQuery = runQuery as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/query', queryRouter);

const validBody = {
  connection: { type: 'mysql', host: 'localhost', port: 3306, user: 'root', password: '', database: 'test' },
  sql: 'SELECT 1',
};

describe('POST /api/query', () => {
  beforeEach(() => {
    mockRunQuery.mockReset();
  });

  it('returns 400 when connection is missing', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ sql: 'SELECT 1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/connection/i);
  });

  it('returns 400 when sql is missing', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ connection: validBody.connection });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sql/i);
  });

  it('returns 400 when sql is empty string', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ connection: validBody.connection, sql: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sql/i);
  });

  it('returns 400 for an invalid database type', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ connection: { ...validBody.connection, type: 'oracle' }, sql: 'SELECT 1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mysql|postgresql|mssql/);
  });

  it('returns 400 when host is missing', async () => {
    const res = await request(app)
      .post('/api/query')
      .send({ connection: { type: 'mysql', user: 'root', database: 'test' }, sql: 'SELECT 1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/host/i);
  });

  it('returns 200 with query results on success', async () => {
    const fakeResult = { columns: ['id'], rows: [{ id: 1 }], rowCount: 1, duration: 5 };
    mockRunQuery.mockResolvedValueOnce(fakeResult);

    const res = await request(app)
      .post('/api/query')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(fakeResult);
    expect(mockRunQuery).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'mysql', host: 'localhost', database: 'test' }),
      'SELECT 1',
      200
    );
  });

  it('uses default port when port is omitted', async () => {
    const fakeResult = { columns: [], rows: [], rowCount: 0, duration: 3 };
    mockRunQuery.mockResolvedValueOnce(fakeResult);

    const body = {
      connection: { type: 'postgresql', host: 'localhost', user: 'root', database: 'test' },
      sql: 'SELECT 1',
    };
    await request(app).post('/api/query').send(body);

    expect(mockRunQuery).toHaveBeenCalledWith(
      expect.objectContaining({ port: 5432 }),
      'SELECT 1',
      200
    );
  });

  it('passes a custom maxRows value to the database service', async () => {
    mockRunQuery.mockResolvedValueOnce({ columns: [], rows: [], rowCount: 0, duration: 1 });
    await request(app).post('/api/query').send({ ...validBody, maxRows: 500 });
    expect(mockRunQuery).toHaveBeenCalledWith(expect.anything(), 'SELECT 1', 500);
  });

  it.each([0, 10001, 1.5, '200'])('rejects invalid maxRows value %p', async (maxRows) => {
    const response = await request(app).post('/api/query').send({ ...validBody, maxRows });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/maxRows/i);
  });

  it('returns 500 when runQuery throws', async () => {
    mockRunQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app)
      .post('/api/query')
      .send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Connection refused');
  });
});
