import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { runQuery, DatabaseConfig, DatabaseType } from '../services/database';

const router = Router();

interface QueryRequestBody {
  connection?: {
    type?: string;
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  sql?: string;
}

const VALID_DB_TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];

router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const body = req.body as QueryRequestBody;
  const { connection, sql } = body;

  if (!connection) {
    res.status(400).json({ error: 'Connection configuration is required' });
    return;
  }

  if (!sql || sql.trim() === '') {
    res.status(400).json({ error: 'SQL query is required' });
    return;
  }

  const { type, host, port, user, password, database } = connection;

  if (!type || !VALID_DB_TYPES.includes(type as DatabaseType)) {
    res.status(400).json({ error: `Database type must be one of: ${VALID_DB_TYPES.join(', ')}` });
    return;
  }

  if (!host || !user || !database) {
    res.status(400).json({ error: 'Connection must include host, user, and selected database' });
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

  try {
    const result = await runQuery(dbConfig, sql);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Query execution failed';
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
