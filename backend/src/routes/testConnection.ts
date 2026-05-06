import { Router, Request, Response } from 'express';
import { testConnection, DatabaseConfig, DatabaseType } from '../services/database';

const router = Router();

const VALID_DB_TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];

interface TestConnectionBody {
  type?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as TestConnectionBody;
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

  const result = await testConnection(dbConfig);

  if (result.success) {
    res.json({ success: true, message: result.message });
  } else {
    res.status(400).json({ success: false, error: result.message });
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
