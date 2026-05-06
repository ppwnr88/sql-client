import { Router, Request, Response } from 'express';
import { listDatabases, DatabaseConfig, DatabaseType } from '../services/database';

const router = Router();

const VALID_DB_TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];

interface DatabasesBody {
  type?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as DatabasesBody;
  const { type, host, port, user, password, database } = body;

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

  try {
    const databases = await listDatabases(dbConfig);
    res.json({ databases });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list databases';
    res.status(500).json({ error: message });
  }
});

function getDefaultPort(type: DatabaseType): number {
  switch (type) {
    case 'mysql':
      return 3306;
    case 'postgresql':
      return 5432;
    case 'mssql':
      return 1433;
  }
}

export default router;
