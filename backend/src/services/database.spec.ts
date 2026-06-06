/**
 * jest.mock() calls are hoisted to the top of the file by Babel/ts-jest,
 * so they run BEFORE any const/let initializations. All mock state must
 * therefore be set up inside the factory or via jest.fn() placeholders that
 * we configure in beforeEach.
 */

// ─── mysql2/promise mock ──────────────────────────────────────────────────────
jest.mock('mysql2/promise', () => {
  const mockEnd = jest.fn().mockResolvedValue(undefined);
  const mockExecute = jest.fn();
  const mockPing = jest.fn().mockResolvedValue(undefined);
  return {
    createConnection: jest.fn().mockResolvedValue({
      execute: mockExecute,
      ping: mockPing,
      end: mockEnd,
    }),
    __mockEnd: mockEnd,
    __mockExecute: mockExecute,
    __mockPing: mockPing,
  };
});

// ─── pg mock ─────────────────────────────────────────────────────────────────
jest.mock('pg', () => {
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockQuery = jest.fn();
  const mockEnd = jest.fn().mockResolvedValue(undefined);
  return {
    Client: jest.fn().mockImplementation(() => ({
      connect: mockConnect,
      query: mockQuery,
      end: mockEnd,
    })),
    __mockConnect: mockConnect,
    __mockQuery: mockQuery,
    __mockEnd: mockEnd,
  };
});

// ─── mssql mock ───────────────────────────────────────────────────────────────
jest.mock('mssql', () => {
  const mockConnect = jest.fn().mockResolvedValue(undefined);
  const mockQuery = jest.fn();
  const mockClose = jest.fn().mockResolvedValue(undefined);
  const request = {
    query: mockQuery,
    input: jest.fn(),
  };
  request.input.mockReturnValue(request);
  const mockRequest = jest.fn().mockReturnValue(request);
  const MockConnectionPool = jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    request: mockRequest,
    close: mockClose,
  }));
  return {
    ConnectionPool: MockConnectionPool,
    NVarChar: 'NVarChar',
    connect: jest.fn().mockResolvedValue({
      request: mockRequest,
      close: mockClose,
    }),
    __mockConnect: mockConnect,
    __mockQuery: mockQuery,
    __mockClose: mockClose,
    __mockRequest: mockRequest,
    __mockInput: request.input,
  };
});

import { runQuery, testConnection, listMetadata, DatabaseConfig } from './database';
import * as mysqlMod from 'mysql2/promise';
import * as pgMod from 'pg';
import * as mssqlMod from 'mssql';

// Pull out the private mock handles attached to the module
/* eslint-disable @typescript-eslint/no-explicit-any */
const mysql = mysqlMod as any;
const pg = pgMod as any;
const mssql = mssqlMod as any;

function cfg(type: 'mysql' | 'postgresql' | 'mssql'): DatabaseConfig {
  return { type, host: 'localhost', port: 3306, user: 'root', password: '', database: 'test' };
}

// ─────────────────────────────────────────────────────────────────────────────
describe('runQuery', () => {
  describe('mysql', () => {
    it('returns columns/rows for a SELECT result', async () => {
      const fields = [{ name: 'id' }, { name: 'name' }];
      const rows = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
      mysql.__mockExecute.mockResolvedValueOnce([rows, fields]);

      const result = await runQuery(cfg('mysql'), 'SELECT id, name FROM users');

      expect(result.columns).toEqual(['id', 'name']);
      expect(result.rows).toHaveLength(2);
      expect(result.rowCount).toBe(2);
      expect(result.truncated).toBe(false);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mysql.__mockEnd).toHaveBeenCalled();
    });

    it('returns affectedRows/insertId for a non-SELECT statement', async () => {
      const resultHeader = { affectedRows: 3, insertId: 0 };
      mysql.__mockExecute.mockResolvedValueOnce([resultHeader, undefined]);

      const result = await runQuery(cfg('mysql'), 'DELETE FROM users WHERE id > 5');

      expect(result.columns).toEqual(['affectedRows', 'insertId']);
      expect(result.rows[0].affectedRows).toBe(3);
      expect(result.rowCount).toBe(3);
      expect(result.truncated).toBe(false);
    });

    it('limits SELECT response rows and reports truncation metadata', async () => {
      const fields = [{ name: 'id' }];
      mysql.__mockExecute.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }, { id: 3 }], fields]);

      const result = await runQuery(cfg('mysql'), 'SELECT id FROM users', 2);

      expect(result.rows).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.returnedRowCount).toBe(2);
      expect(result.totalRowCount).toBe(3);
      expect(result.truncated).toBe(true);
    });

    it('closes connection even when execute throws', async () => {
      mysql.__mockExecute.mockRejectedValueOnce(new Error('syntax error'));

      await expect(runQuery(cfg('mysql'), 'INVALID SQL')).rejects.toThrow('syntax error');
      expect(mysql.__mockEnd).toHaveBeenCalled();
    });
  });

  describe('postgresql', () => {
    it('returns columns/rows for a SELECT result', async () => {
      pg.__mockQuery.mockResolvedValueOnce({
        fields: [{ name: 'id' }, { name: 'email' }],
        rows: [{ id: 1, email: 'a@b.com' }],
        rowCount: 1,
      });

      const result = await runQuery(cfg('postgresql'), 'SELECT id, email FROM users');

      expect(result.columns).toEqual(['id', 'email']);
      expect(result.rows).toHaveLength(1);
      expect(result.rowCount).toBe(1);
      expect(pg.__mockEnd).toHaveBeenCalled();
    });

    it('returns affectedRows for a non-SELECT statement', async () => {
      pg.__mockQuery.mockResolvedValueOnce({ fields: [], rows: [], rowCount: 5 });

      const result = await runQuery(cfg('postgresql'), 'DELETE FROM logs');

      expect(result.columns).toEqual(['affectedRows']);
      expect(result.rows[0].affectedRows).toBe(5);
      expect(result.rowCount).toBe(5);
    });

    it('ends client connection even when query throws', async () => {
      pg.__mockQuery.mockRejectedValueOnce(new Error('pg error'));

      await expect(runQuery(cfg('postgresql'), 'BAD')).rejects.toThrow('pg error');
      expect(pg.__mockEnd).toHaveBeenCalled();
    });
  });

  describe('mssql', () => {
    it('returns columns/rows when recordset has data', async () => {
      mssql.__mockQuery.mockResolvedValueOnce({
        recordset: [{ id: 1, val: 'x' }],
        rowsAffected: [1],
      });

      const result = await runQuery(cfg('mssql'), 'SELECT id, val FROM t');

      expect(result.columns).toEqual(['id', 'val']);
      expect(result.rows).toHaveLength(1);
      expect(result.rowCount).toBe(1);
      expect(mssql.__mockClose).toHaveBeenCalled();
    });

    it('returns rowsAffected for a non-SELECT statement', async () => {
      mssql.__mockQuery.mockResolvedValueOnce({ recordset: undefined, rowsAffected: [7] });

      const result = await runQuery(cfg('mssql'), 'UPDATE t SET val=1');

      expect(result.columns).toEqual(['rowsAffected']);
      expect(result.rows[0].rowsAffected).toBe(7);
    });

    it('closes pool even when query throws', async () => {
      mssql.__mockQuery.mockRejectedValueOnce(new Error('mssql error'));

      await expect(runQuery(cfg('mssql'), 'BAD')).rejects.toThrow('mssql error');
      expect(mssql.__mockClose).toHaveBeenCalled();
    });
  });

  it('throws for unsupported database type', async () => {
    const badCfg = { ...cfg('mysql'), type: 'oracle' as never };
    await expect(runQuery(badCfg, 'SELECT 1')).rejects.toThrow(/unsupported database type/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('testConnection', () => {
  describe('mysql', () => {
    it('returns success=true on successful ping', async () => {
      const result = await testConnection(cfg('mysql'));
      expect(result.success).toBe(true);
      expect(result.message).toBe('Connection successful');
      expect(mysql.__mockPing).toHaveBeenCalled();
    });

    it('returns success=false when createConnection throws', async () => {
      (mysql.createConnection as jest.Mock).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await testConnection(cfg('mysql'));
      expect(result.success).toBe(false);
      expect(result.message).toBe('ECONNREFUSED');
    });
  });

  describe('postgresql', () => {
    it('returns success=true on successful SELECT 1', async () => {
      pg.__mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
      const result = await testConnection(cfg('postgresql'));
      expect(result.success).toBe(true);
    });

    it('returns success=false when connect throws', async () => {
      pg.__mockConnect.mockRejectedValueOnce(new Error('auth failed'));
      const result = await testConnection(cfg('postgresql'));
      expect(result.success).toBe(false);
      expect(result.message).toBe('auth failed');
    });
  });

  describe('mssql', () => {
    it('returns success=true on successful query', async () => {
      mssql.__mockQuery.mockResolvedValueOnce({ recordset: [] });
      const result = await testConnection(cfg('mssql'));
      expect(result.success).toBe(true);
    });

    it('returns success=false when connect throws', async () => {
      mssql.__mockConnect.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await testConnection(cfg('mssql'));
      expect(result.success).toBe(false);
      expect(result.message).toBe('Connection failed');
    });
  });

  it('returns success=false for unsupported type', async () => {
    const result = await testConnection({ ...cfg('mysql'), type: 'oracle' as never });
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/unsupported database type/i);
  });
});

describe('listMetadata', () => {
  it('normalizes MySQL columns and uses parameterized filters', async () => {
    mysql.__mockExecute.mockResolvedValueOnce([[
      { name: 'id', dataType: 'int', nullable: 'NO', primaryKey: 1, ordinalPosition: 1 },
    ]]);

    const result = await listMetadata(cfg('mysql'), 'columns', undefined, 'users');

    expect(result).toEqual([{
      name: 'id', dataType: 'int', nullable: false, primaryKey: true, ordinalPosition: 1,
    }]);
    expect(mysql.__mockExecute).toHaveBeenCalledWith(expect.stringContaining('table_name = ?'), ['test', 'users']);
  });

  it('filters PostgreSQL tables by schema with a parameter', async () => {
    pg.__mockQuery.mockResolvedValueOnce({ rows: [{ name: 'users', schema: 'public' }] });

    const result = await listMetadata(cfg('postgresql'), 'tables', 'public');

    expect(result).toEqual([{ name: 'users', schema: 'public' }]);
    expect(pg.__mockQuery).toHaveBeenCalledWith(expect.stringContaining('table_schema = $1'), ['public']);
  });

  it('uses MSSQL request inputs for column filters', async () => {
    mssql.__mockQuery.mockResolvedValueOnce({
      recordset: [{ name: 'id', dataType: 'int', nullable: false, primaryKey: 1, ordinalPosition: 1 }],
    });

    const result = await listMetadata(cfg('mssql'), 'columns', 'dbo', 'users');

    expect(result).toHaveLength(1);
    expect(mssql.__mockInput).toHaveBeenCalledWith('schema', expect.anything(), 'dbo');
    expect(mssql.__mockInput).toHaveBeenCalledWith('table', expect.anything(), 'users');
  });
});
