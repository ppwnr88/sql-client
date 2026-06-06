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
  database?: string;
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  returnedRowCount: number;
  totalRowCount: number;
  truncated: boolean;
  duration: number;
}

export type MetadataResource = 'schemas' | 'tables' | 'columns';
export interface SchemaMetadata { name: string; }
export interface TableMetadata { name: string; schema: string; }
export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  ordinalPosition: number;
}
export type MetadataResult = SchemaMetadata[] | TableMetadata[] | ColumnMetadata[];

export async function runQuery(config: DatabaseConfig, sqlQuery: string, maxRows = 200): Promise<QueryResult> {
  const start = Date.now();

  switch (config.type) {
    case 'mysql':
      return runMysqlQuery(config, sqlQuery, start, maxRows);
    case 'postgresql':
      return runPostgresQuery(config, sqlQuery, start, maxRows);
    case 'mssql':
      return runMssqlQuery(config, sqlQuery, start, maxRows);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

async function runMysqlQuery(
  config: DatabaseConfig,
  sqlQuery: string,
  start: number,
  maxRows: number
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
      return limitedQueryResult(columns, normalizedRows, duration, maxRows);
    }

    const resultHeader = rows as mysql.ResultSetHeader;
    return {
      columns: ['affectedRows', 'insertId'],
      rows: [{ affectedRows: resultHeader.affectedRows, insertId: resultHeader.insertId }],
      rowCount: resultHeader.affectedRows,
      returnedRowCount: 1,
      totalRowCount: resultHeader.affectedRows,
      truncated: false,
      duration,
    };
  } finally {
    await connection.end();
  }
}

async function runPostgresQuery(
  config: DatabaseConfig,
  sqlQuery: string,
  start: number,
  maxRows: number
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
      return limitedQueryResult(columns, result.rows as Record<string, unknown>[], duration, maxRows);
    }

    return {
      columns: ['affectedRows'],
      rows: [{ affectedRows: result.rowCount ?? 0 }],
      rowCount: result.rowCount ?? 0,
      returnedRowCount: 1,
      totalRowCount: result.rowCount ?? 0,
      truncated: false,
      duration,
    };
  } finally {
    await client.end();
  }
}

async function runMssqlQuery(
  config: DatabaseConfig,
  sqlQuery: string,
  start: number,
  maxRows: number
): Promise<QueryResult> {
  const pool = new sql.ConnectionPool({
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
    await pool.connect();
    const result = await pool.request().query(sqlQuery);
    const duration = Date.now() - start;

    if (result.recordset && result.recordset.length > 0) {
      const columns = Object.keys(result.recordset[0]);
      return limitedQueryResult(columns, result.recordset as Record<string, unknown>[], duration, maxRows);
    }

    return {
      columns: ['rowsAffected'],
      rows: [{ rowsAffected: result.rowsAffected[0] ?? 0 }],
      rowCount: result.rowsAffected[0] ?? 0,
      returnedRowCount: 1,
      totalRowCount: result.rowsAffected[0] ?? 0,
      truncated: false,
      duration,
    };
  } finally {
    await pool.close();
  }
}

function limitedQueryResult(
  columns: string[],
  rows: Record<string, unknown>[],
  duration: number,
  maxRows: number
): QueryResult {
  const totalRowCount = rows.length;
  const limitedRows = rows.slice(0, maxRows);
  return {
    columns,
    rows: limitedRows,
    rowCount: limitedRows.length,
    returnedRowCount: limitedRows.length,
    totalRowCount,
    truncated: totalRowCount > limitedRows.length,
    duration,
  };
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
          database: config.database || 'postgres',
          connectionTimeoutMillis: 10000,
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        break;
      }
      case 'mssql': {
        const pool = new sql.ConnectionPool({
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
          await pool.connect();
          await pool.request().query('SELECT 1');
        } finally {
          await pool.close();
        }
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

export async function listDatabases(config: DatabaseConfig): Promise<string[]> {
  switch (config.type) {
    case 'mysql':
      return listMysqlDatabases(config);
    case 'postgresql':
      return listPostgresDatabases(config);
    case 'mssql':
      return listMssqlDatabases(config);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}

export async function listMetadata(
  config: DatabaseConfig,
  resource: MetadataResource,
  schema?: string,
  table?: string
): Promise<MetadataResult> {
  if (config.type === 'mysql') {
    const connection = await mysql.createConnection({ ...config, connectTimeout: 10000 });
    try {
      if (resource === 'schemas') return [{ name: config.database ?? '' }].filter((item) => item.name);
      if (resource === 'tables') {
        const [rows] = await connection.execute(
          `SELECT table_name AS name FROM information_schema.tables
           WHERE table_schema = ? AND table_type = 'BASE TABLE' ORDER BY table_name`,
          [config.database ?? '']
        );
        return (rows as Array<{ name: string }>).map((row) => ({ name: row.name, schema: config.database ?? '' }));
      }
      const [rows] = await connection.execute(
        `SELECT column_name AS name, data_type AS dataType, is_nullable AS nullable,
                CASE WHEN column_key = 'PRI' THEN 1 ELSE 0 END AS primaryKey,
                ordinal_position AS ordinalPosition
         FROM information_schema.columns WHERE table_schema = ? AND table_name = ?
         ORDER BY ordinal_position`,
        [config.database ?? '', table ?? '']
      );
      return (rows as Array<Record<string, unknown>>).map(normalizeMetadataColumn);
    } finally {
      await connection.end();
    }
  }

  if (config.type === 'postgresql') {
    const client = new PgClient({ ...config, connectionTimeoutMillis: 10000 });
    await client.connect();
    try {
      if (resource === 'schemas') {
        const result = await client.query<{ name: string }>(
          `SELECT schema_name AS name FROM information_schema.schemata
           WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
             AND schema_name NOT LIKE 'pg_temp_%' AND schema_name NOT LIKE 'pg_toast_temp_%'
           ORDER BY schema_name`
        );
        return result.rows;
      }
      if (resource === 'tables') {
        const result = await client.query<{ name: string; schema: string }>(
          `SELECT table_name AS name, table_schema AS schema FROM information_schema.tables
           WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name`,
          [schema]
        );
        return result.rows;
      }
      const result = await client.query<Record<string, unknown>>(
        `SELECT c.column_name AS name, c.data_type AS "dataType", c.is_nullable AS nullable,
                EXISTS (
                  SELECT 1 FROM information_schema.key_column_usage kcu
                  JOIN information_schema.table_constraints tc
                    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
                  WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND kcu.table_schema = c.table_schema AND kcu.table_name = c.table_name
                    AND kcu.column_name = c.column_name
                ) AS "primaryKey",
                c.ordinal_position AS "ordinalPosition"
         FROM information_schema.columns c
         WHERE c.table_schema = $1 AND c.table_name = $2 ORDER BY c.ordinal_position`,
        [schema, table]
      );
      return result.rows.map(normalizeMetadataColumn);
    } finally {
      await client.end();
    }
  }

  const pool = new sql.ConnectionPool({
    server: config.host, port: config.port, user: config.user, password: config.password,
    database: config.database, options: { encrypt: false, trustServerCertificate: true },
    connectionTimeout: 10000,
  });
  try {
    await pool.connect();
    if (resource === 'schemas') {
      const result = await pool.request().query<{ name: string }>(
        `SELECT name FROM sys.schemas WHERE name NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest')
         AND principal_id IS NOT NULL ORDER BY name`
      );
      return result.recordset;
    }
    const request = pool.request();
    request.input('schema', sql.NVarChar, schema);
    if (resource === 'tables') {
      const result = await request.query<{ name: string; schema: string }>(
        `SELECT t.name AS name, s.name AS schema FROM sys.tables t
         JOIN sys.schemas s ON s.schema_id = t.schema_id WHERE s.name = @schema ORDER BY t.name`
      );
      return result.recordset;
    }
    request.input('table', sql.NVarChar, table);
    const result = await request.query<Record<string, unknown>>(
      `SELECT c.name AS name, ty.name AS dataType, c.is_nullable AS nullable,
              CASE WHEN ic.column_id IS NULL THEN 0 ELSE 1 END AS primaryKey,
              c.column_id AS ordinalPosition
       FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
       JOIN sys.schemas s ON s.schema_id = t.schema_id JOIN sys.types ty ON ty.user_type_id = c.user_type_id
       LEFT JOIN sys.indexes i ON i.object_id = t.object_id AND i.is_primary_key = 1
       LEFT JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.column_id = c.column_id
       WHERE s.name = @schema AND t.name = @table ORDER BY c.column_id`
    );
    return result.recordset.map(normalizeMetadataColumn);
  } finally {
    await pool.close();
  }
}

function normalizeMetadataColumn(row: Record<string, unknown>): ColumnMetadata {
  return {
    name: String(row.name ?? ''),
    dataType: String(row.dataType ?? row.datatype ?? ''),
    nullable: row.nullable === true || row.nullable === 1 || row.nullable === 'YES',
    primaryKey: row.primaryKey === true || row.primaryKey === 1,
    ordinalPosition: Number(row.ordinalPosition ?? 0),
  };
}

async function listMysqlDatabases(config: DatabaseConfig): Promise<string[]> {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    connectTimeout: 10000,
  });

  try {
    const [rows] = await connection.query('SHOW DATABASES');
    return (rows as Array<Record<string, unknown>>)
      .map((row) => String(row.Database ?? row.database ?? Object.values(row)[0] ?? ''))
      .filter(Boolean);
  } finally {
    await connection.end();
  }
}

async function listPostgresDatabases(config: DatabaseConfig): Promise<string[]> {
  const client = new PgClient({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database || 'postgres',
    connectionTimeoutMillis: 10000,
  });

  await client.connect();

  try {
    const result = await client.query<{ datname: string }>(
      "SELECT datname FROM pg_database WHERE datallowconn = true AND datistemplate = false ORDER BY datname"
    );
    return result.rows.map((row) => row.datname);
  } finally {
    await client.end();
  }
}

async function listMssqlDatabases(config: DatabaseConfig): Promise<string[]> {
  const pool = new sql.ConnectionPool({
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
    await pool.connect();
    const result = await pool.request().query<{ name: string }>(
      'SELECT name FROM sys.databases WHERE state = 0 ORDER BY name'
    );
    return result.recordset.map((row) => row.name);
  } finally {
    await pool.close();
  }
}
