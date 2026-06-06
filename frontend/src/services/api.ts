import axios, { AxiosError } from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(error)
);

export interface ConnectionConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'mssql';
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

export interface ApiError {
  error: string;
}

export interface SchemaMetadata {
  name: string;
}

export interface TableMetadata {
  name: string;
  schema: string;
}

export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  primaryKey: boolean;
  ordinalPosition: number;
}

export type MetadataResource = 'schemas' | 'tables' | 'columns';
export type MetadataItem = SchemaMetadata | TableMetadata | ColumnMetadata;

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiError | undefined;
    return data?.error ?? err.message;
  }
  return 'An unexpected error occurred';
}

export async function runQuery(
  connection: Omit<ConnectionConfig, 'id' | 'name'>,
  sql: string,
  maxRows: number
): Promise<QueryResult> {
  try {
    const { data } = await client.post<QueryResult>('/api/query', { connection, sql, maxRows });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function testConnection(
  connection: Omit<ConnectionConfig, 'id' | 'name'>
): Promise<{ success: boolean; message: string }> {
  try {
    const { data } = await client.post<{ success: boolean; message: string }>(
      '/api/test-connection',
      connection
    );
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function listDatabases(
  connection: Omit<ConnectionConfig, 'id' | 'name'>
): Promise<string[]> {
  try {
    const { data } = await client.post<{ databases: string[] }>('/api/databases', connection);
    return data.databases;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function listMetadata<T extends MetadataItem>(
  connection: Omit<ConnectionConfig, 'id' | 'name'>,
  resource: MetadataResource,
  schema?: string,
  table?: string
): Promise<T[]> {
  try {
    const { data } = await client.post<{ items: T[] }>('/api/metadata', {
      connection,
      resource,
      schema,
      table,
    });
    return data.items;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}
