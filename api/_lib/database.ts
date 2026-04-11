import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import sql from 'mssql';

export type DatabaseType = 'mysql' | 'postgresql' | 'mssql';

export interface DatabaseConfig {
  type: DatabaseType;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
}

export async function runQuery(config: DatabaseConfig, sqlQuery: string): Promise<QueryResult> {
  const start = Date.now();

  switch (config.type) {
    case 'mysql':
      return runMysqlQuery(config, sqlQuery, start);
    case 'postgresql':
      return runPostgresQuery(config, sqlQuery, start);
    case 'mssql':
      return runMssqlQuery(config, sqlQuery, start);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

async function runMysqlQuery(
  config: DatabaseConfig,
  sqlQuery: string,
  start: number
): Promise<QueryResult> {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: 10000,
  });

  try {
    const [rows, fields] = await connection.execute(sqlQuery);
    const duration = Date.now() - start;

    if (Array.isArray(rows) && fields) {
      const columns = fields.map((f) => f.name);
      const normalizedRows = (rows as Record<string, unknown>[]).map((row) => {
        const normalized: Record<string, unknown> = {};
        for (const col of columns) {
          normalized[col] = row[col] ?? null;
        }
        return normalized;
      });
      return { columns, rows: normalizedRows, rowCount: normalizedRows.length, duration };
    }

    const resultHeader = rows as mysql.ResultSetHeader;
    return {
      columns: ['affectedRows', 'insertId'],
      rows: [{ affectedRows: resultHeader.affectedRows, insertId: resultHeader.insertId }],
      rowCount: resultHeader.affectedRows,
      duration,
    };
  } finally {
    await connection.end();
  }
}

async function runPostgresQuery(
  config: DatabaseConfig,
  sqlQuery: string,
  start: number
): Promise<QueryResult> {
  const client = new PgClient({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 10000,
  });

  await client.connect();

  try {
    const result = await client.query(sqlQuery);
    const duration = Date.now() - start;

    if (result.fields && result.fields.length > 0) {
      const columns = result.fields.map((f) => f.name);
      return {
        columns,
        rows: result.rows as Record<string, unknown>[],
        rowCount: result.rowCount ?? result.rows.length,
        duration,
      };
    }

    return {
      columns: ['affectedRows'],
      rows: [{ affectedRows: result.rowCount ?? 0 }],
      rowCount: result.rowCount ?? 0,
      duration,
    };
  } finally {
    await client.end();
  }
}

async function runMssqlQuery(
  config: DatabaseConfig,
  sqlQuery: string,
  start: number
): Promise<QueryResult> {
  const pool = await sql.connect({
    server: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    connectionTimeout: 10000,
  });

  try {
    const result = await pool.request().query(sqlQuery);
    const duration = Date.now() - start;

    if (result.recordset && result.recordset.length > 0) {
      const columns = Object.keys(result.recordset[0]);
      return {
        columns,
        rows: result.recordset as Record<string, unknown>[],
        rowCount: result.recordset.length,
        duration,
      };
    }

    return {
      columns: ['rowsAffected'],
      rows: [{ rowsAffected: result.rowsAffected[0] ?? 0 }],
      rowCount: result.rowsAffected[0] ?? 0,
      duration,
    };
  } finally {
    await pool.close();
  }
}

export async function testConnection(
  config: DatabaseConfig
): Promise<{ success: boolean; message: string }> {
  try {
    switch (config.type) {
      case 'mysql': {
        const connection = await mysql.createConnection({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          connectTimeout: 10000,
        });
        await connection.ping();
        await connection.end();
        break;
      }
      case 'postgresql': {
        const client = new PgClient({
          host: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          connectionTimeoutMillis: 10000,
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        break;
      }
      case 'mssql': {
        const pool = await sql.connect({
          server: config.host,
          port: config.port,
          user: config.user,
          password: config.password,
          database: config.database,
          options: {
            encrypt: false,
            trustServerCertificate: true,
          },
          connectionTimeout: 10000,
        });
        await pool.request().query('SELECT 1');
        await pool.close();
        break;
      }
      default:
        throw new Error(`Unsupported database type: ${config.type}`);
    }
    return { success: true, message: 'Connection successful' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown connection error';
    return { success: false, message };
  }
}
