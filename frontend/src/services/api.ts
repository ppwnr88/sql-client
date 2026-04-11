import axios, { AxiosError } from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  token: string;
  expiresIn: number;
}

export interface ConnectionConfig {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql' | 'mssql';
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

export interface ApiError {
  error: string;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as ApiError | undefined;
    return data?.error ?? err.message;
  }
  return 'An unexpected error occurred';
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const { data } = await client.post<LoginResponse>('/api/auth/login', { username, password });
    return data;
  } catch (err) {
    throw new Error(extractErrorMessage(err));
  }
}

export async function runQuery(
  connection: Omit<ConnectionConfig, 'id' | 'name'>,
  sql: string
): Promise<QueryResult> {
  try {
    const { data } = await client.post<QueryResult>('/api/query', { connection, sql });
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
