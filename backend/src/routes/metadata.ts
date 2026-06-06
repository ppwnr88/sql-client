import { Router, Request, Response } from 'express';
import {
  DatabaseConfig,
  DatabaseType,
  listMetadata,
  MetadataResource,
} from '../services/database';

const router = Router();
const VALID_DB_TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];
const VALID_RESOURCES: MetadataResource[] = ['schemas', 'tables', 'columns'];

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { connection, resource, schema, table } = req.body as {
    connection?: Partial<DatabaseConfig>;
    resource?: string;
    schema?: string;
    table?: string;
  };

  if (!connection) {
    res.status(400).json({ error: 'connection is required' });
    return;
  }
  if (!connection.type || !VALID_DB_TYPES.includes(connection.type as DatabaseType)) {
    res.status(400).json({ error: `Database type must be one of: ${VALID_DB_TYPES.join(', ')}` });
    return;
  }
  if (!connection.host || !connection.user || !connection.database) {
    res.status(400).json({ error: 'connection must include host, user, and database' });
    return;
  }
  if (!resource || !VALID_RESOURCES.includes(resource as MetadataResource)) {
    res.status(400).json({ error: `resource must be one of: ${VALID_RESOURCES.join(', ')}` });
    return;
  }
  if (connection.type !== 'mysql' && resource !== 'schemas' && !schema) {
    res.status(400).json({ error: 'schema is required for this resource' });
    return;
  }
  if (resource === 'columns' && !table) {
    res.status(400).json({ error: 'table is required for columns' });
    return;
  }

  const config: DatabaseConfig = {
    type: connection.type as DatabaseType,
    host: connection.host,
    port: connection.port ?? defaultPort(connection.type as DatabaseType),
    user: connection.user,
    password: connection.password ?? '',
    database: connection.database,
  };

  try {
    const items = await listMetadata(config, resource as MetadataResource, schema, table);
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load metadata' });
  }
});

function defaultPort(type: DatabaseType): number {
  if (type === 'mysql') return 3306;
  if (type === 'postgresql') return 5432;
  return 1433;
}

export default router;
