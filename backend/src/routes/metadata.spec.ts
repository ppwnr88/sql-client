import request from 'supertest';
import express from 'express';
import metadataRouter from './metadata';

jest.mock('../services/database', () => ({
  listMetadata: jest.fn(),
}));

import { listMetadata } from '../services/database';
const mockListMetadata = listMetadata as jest.Mock;

const app = express();
app.use(express.json());
app.use('/api/metadata', metadataRouter);

const connection = {
  type: 'postgresql',
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '',
  database: 'app',
};

describe('POST /api/metadata', () => {
  beforeEach(() => mockListMetadata.mockReset());

  it('requires a valid connection and resource', async () => {
    const missingConnection = await request(app).post('/api/metadata').send({ resource: 'schemas' });
    expect(missingConnection.status).toBe(400);

    const badResource = await request(app).post('/api/metadata').send({ connection, resource: 'views' });
    expect(badResource.status).toBe(400);
  });

  it('requires schema for PostgreSQL tables and table for columns', async () => {
    const tables = await request(app).post('/api/metadata').send({ connection, resource: 'tables' });
    expect(tables.status).toBe(400);
    expect(tables.body.error).toMatch(/schema/i);

    const columns = await request(app).post('/api/metadata').send({
      connection: { ...connection, type: 'mysql' },
      resource: 'columns',
    });
    expect(columns.status).toBe(400);
    expect(columns.body.error).toMatch(/table/i);
  });

  it('returns metadata items', async () => {
    mockListMetadata.mockResolvedValueOnce([{ name: 'users', schema: 'public' }]);
    const response = await request(app).post('/api/metadata').send({
      connection,
      resource: 'tables',
      schema: 'public',
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([{ name: 'users', schema: 'public' }]);
    expect(mockListMetadata).toHaveBeenCalledWith(
      expect.objectContaining({ database: 'app' }), 'tables', 'public', undefined
    );
  });

  it('returns service errors', async () => {
    mockListMetadata.mockRejectedValueOnce(new Error('permission denied'));
    const response = await request(app).post('/api/metadata').send({
      connection,
      resource: 'schemas',
    });
    expect(response.status).toBe(500);
    expect(response.body.error).toBe('permission denied');
  });
});
