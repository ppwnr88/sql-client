import request from 'supertest';
import express from 'express';
import testConnectionRouter from './testConnection';

jest.mock('../services/database', () => ({
  testConnection: jest.fn(),
}));

import { testConnection } from '../services/database';
const mockTestConnection = testConnection as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/test-connection', testConnectionRouter);

const validBody = {
  type: 'mysql',
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'test',
};

describe('POST /api/test-connection', () => {
  beforeEach(() => {
    mockTestConnection.mockReset();
  });

  it('returns 400 for an invalid database type', async () => {
    const res = await request(app)
      .post('/api/test-connection')
      .send({ ...validBody, type: 'sqlite' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mysql|postgresql|mssql/);
  });

  it('returns 400 when host is missing', async () => {
    const { host: _h, ...body } = validBody;
    const res = await request(app)
      .post('/api/test-connection')
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/host/i);
  });

  it('returns 400 when user is missing', async () => {
    const { user: _u, ...body } = validBody;
    const res = await request(app)
      .post('/api/test-connection')
      .send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/user/i);
  });

  it('allows database to be omitted for server-level connection checks', async () => {
    mockTestConnection.mockResolvedValueOnce({ success: true, message: 'Connection successful' });
    const { database: _d, ...body } = validBody;
    const res = await request(app)
      .post('/api/test-connection')
      .send(body);
    expect(res.status).toBe(200);
    expect(mockTestConnection).toHaveBeenCalledWith(
      expect.objectContaining({ database: undefined })
    );
  });

  it('returns 200 with success=true when connection succeeds', async () => {
    mockTestConnection.mockResolvedValueOnce({ success: true, message: 'Connection successful' });

    const res = await request(app)
      .post('/api/test-connection')
      .send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Connection successful');
  });

  it('returns 400 with success=false when connection fails', async () => {
    mockTestConnection.mockResolvedValueOnce({ success: false, message: 'ECONNREFUSED' });

    const res = await request(app)
      .post('/api/test-connection')
      .send(validBody);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('ECONNREFUSED');
  });

  it('uses default port 5432 for postgresql when port is omitted', async () => {
    mockTestConnection.mockResolvedValueOnce({ success: true, message: 'OK' });

    await request(app)
      .post('/api/test-connection')
      .send({ type: 'postgresql', host: 'localhost', user: 'postgres', database: 'mydb' });

    expect(mockTestConnection).toHaveBeenCalledWith(
      expect.objectContaining({ port: 5432, type: 'postgresql' })
    );
  });
});
