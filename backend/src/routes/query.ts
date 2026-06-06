import { Router, Request, Response } from 'express';
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
  maxRows?: number;
  offset?: number;
}

const VALID_DB_TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as QueryRequestBody;
  const { connection, sql, maxRows = 200, offset = 0 } = body;

  if (!connection) {
    res.status(400).json({ error: 'Connection configuration is required' });
    return;
  }

  if (!sql || sql.trim() === '') {
    res.status(400).json({ error: 'SQL query is required' });
    return;
  }
  if (!Number.isInteger(maxRows) || maxRows < 1 || maxRows > 10000) {
    res.status(400).json({ error: 'maxRows must be an integer between 1 and 10000' });
    return;
  }
  if (!Number.isInteger(offset) || offset < 0) {
    res.status(400).json({ error: 'offset must be a non-negative integer' });
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
    const result = await runQuery(dbConfig, sql, maxRows, offset);
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
