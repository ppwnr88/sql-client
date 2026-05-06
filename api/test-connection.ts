import type { VercelRequest, VercelResponse } from '@vercel/node';
import { testConnection, DatabaseConfig, DatabaseType } from './_lib/database';

const VALID_DB_TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];

function getDefaultPort(type: DatabaseType): number {
  switch (type) {
    case 'mysql': return 3306;
    case 'postgresql': return 5432;
    case 'mssql': return 1433;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
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

  if (!host || !user) {
    res.status(400).json({ error: 'host and user are required' });
    return;
  }

  const dbConfig: DatabaseConfig = {
    type: type as DatabaseType,
    host,
    port: port ?? getDefaultPort(type as DatabaseType),
    user,
    password: password ?? '',
    database: database || undefined,
  };

  const result = await testConnection(dbConfig);

  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(400).json({ success: false, error: result.message });
  }
}
