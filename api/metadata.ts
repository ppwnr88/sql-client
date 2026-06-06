import type { VercelRequest, VercelResponse } from '@vercel/node';
import { DatabaseConfig, DatabaseType, listMetadata, MetadataResource } from './_lib/database';

const TYPES: DatabaseType[] = ['mysql', 'postgresql', 'mssql'];
const RESOURCES: MetadataResource[] = ['schemas', 'tables', 'columns'];

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return void res.status(204).end();
  if (req.method !== 'POST') return void res.status(405).json({ error: 'Method not allowed' });

  const { connection, resource, schema, table } = req.body as {
    connection?: Partial<DatabaseConfig>;
    resource?: string;
    schema?: string;
    table?: string;
  };
  if (!connection) return void res.status(400).json({ error: 'connection is required' });
  if (!connection.type || !TYPES.includes(connection.type as DatabaseType)) {
    return void res.status(400).json({ error: `Database type must be one of: ${TYPES.join(', ')}` });
  }
  if (!connection.host || !connection.user || !connection.database) {
    return void res.status(400).json({ error: 'connection must include host, user, and database' });
  }
  if (!resource || !RESOURCES.includes(resource as MetadataResource)) {
    return void res.status(400).json({ error: `resource must be one of: ${RESOURCES.join(', ')}` });
  }
  if (connection.type !== 'mysql' && resource !== 'schemas' && !schema) {
    return void res.status(400).json({ error: 'schema is required for this resource' });
  }
  if (resource === 'columns' && !table) {
    return void res.status(400).json({ error: 'table is required for columns' });
  }

  const ports: Record<DatabaseType, number> = { mysql: 3306, postgresql: 5432, mssql: 1433 };
  const config: DatabaseConfig = {
    type: connection.type as DatabaseType,
    host: connection.host,
    port: connection.port ?? ports[connection.type as DatabaseType],
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
}
