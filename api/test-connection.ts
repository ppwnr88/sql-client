import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { testConnection, DatabaseConfig, DatabaseType } from './_lib/database';

const VALID_DB_TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];

function getDefaultPort(type: DatabaseType): number {
  switch (type) {
    case 'mysql': return 3306;
    case 'postgresql': return 5432;
    case 'mssql': return 1433;
  }
}

function verifyToken(authHeader: string | undefined, secret: string): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  try {
    jwt.verify(authHeader.slice(7), secret);
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    res.status(500).json({ error: 'JWT_SECRET not configured' });
    return;
  }

  if (!verifyToken(req.headers.authorization, jwtSecret)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { type, host, port, user, password, database } = req.body as {
    type?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };

  if (!type || !VALID_DB_TYPES.includes(type as DatabaseType)) {
    res.status(400).json({ error: `Database type must be one of: ${VALID_DB_TYPES.join(', ')}` });
    return;
  }

  if (!host || !user || !database) {
    res.status(400).json({ error: 'host, user, and database are required' });
    return;
  }

  const dbConfig: DatabaseConfig = {
    type: type as DatabaseType,
    host,
    port: port ?? getDefaultPort(type as DatabaseType),
    user,
    password: password ?? '',
    database,
  };

  const result = await testConnection(dbConfig);

  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(400).json({ success: false, error: result.message });
  }
}
