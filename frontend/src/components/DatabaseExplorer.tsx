import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ColumnMetadata,
  ConnectionConfig,
  listDatabases,
  listMetadata,
  SchemaMetadata,
  TableMetadata,
} from '../services/api';

interface DatabaseExplorerProps {
  connections: ConnectionConfig[];
  activeConnectionId: string;
  activeDatabase: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onCollapse: () => void;
  onCloseMobile: () => void;
  onSelectDatabase: (connectionId: string, database: string) => void;
  onInsertIdentifier: (connection: ConnectionConfig, parts: string[]) => void;
}

interface TreeRowProps {
  label: React.ReactNode;
  level: number;
  icon: string;
  expandable?: boolean;
  expanded?: boolean;
  active?: boolean;
  muted?: boolean;
  title?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
}

function TreeRow({
  label, level, icon, expandable, expanded, active, muted, title, onClick, onDoubleClick,
}: TreeRowProps): React.ReactElement {
  return (
    <button
      type="button"
      className={`db-tree-row${active ? ' active' : ''}${muted ? ' muted' : ''}`}
      style={{ paddingLeft: `${8 + level * 16}px` }}
      title={title}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      <span className="db-tree-caret">{expandable ? (expanded ? '⌄' : '›') : ''}</span>
      <span className="db-tree-icon" aria-hidden="true">{icon}</span>
      <span className="db-tree-label">{label}</span>
    </button>
  );
}

function connectionConfig(connection: ConnectionConfig, database?: string) {
  return {
    type: connection.type,
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    database,
  };
}

export function DatabaseExplorer(props: DatabaseExplorerProps): React.ReactElement {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [databases, setDatabases] = useState<Record<string, string[]>>({});
  const [schemas, setSchemas] = useState<Record<string, SchemaMetadata[]>>({});
  const [tables, setTables] = useState<Record<string, TableMetadata[]>>({});
  const [columns, setColumns] = useState<Record<string, ColumnMetadata[]>>({});
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  function toggle(key: string, loader?: () => Promise<void>): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    if (!expanded.has(key) && loader) void loader();
  }

  async function load(key: string, operation: () => Promise<void>): Promise<void> {
    if (loading.has(key)) return;
    setLoading((current) => new Set(current).add(key));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    try {
      await operation();
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [key]: err instanceof Error ? err.message : 'Failed to load metadata',
      }));
    } finally {
      setLoading((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function loadDatabases(connection: ConnectionConfig): Promise<void> {
    const key = `databases:${connection.id}`;
    if (databases[connection.id]) return Promise.resolve();
    return load(key, async () => {
      const items = await listDatabases(connectionConfig(connection, connection.database));
      setDatabases((current) => ({ ...current, [connection.id]: items }));
    });
  }

  function loadSchemas(connection: ConnectionConfig, database: string): Promise<void> {
    const cacheKey = `${connection.id}:${database}`;
    const key = `schemas:${cacheKey}`;
    if (schemas[cacheKey]) return Promise.resolve();
    return load(key, async () => {
      const items = await listMetadata<SchemaMetadata>(
        connectionConfig(connection, database), 'schemas'
      );
      setSchemas((current) => ({ ...current, [cacheKey]: items }));
    });
  }

  function loadTables(connection: ConnectionConfig, database: string, schema?: string): Promise<void> {
    const cacheKey = `${connection.id}:${database}:${schema ?? ''}`;
    const key = `tables:${cacheKey}`;
    if (tables[cacheKey]) return Promise.resolve();
    return load(key, async () => {
      const items = await listMetadata<TableMetadata>(
        connectionConfig(connection, database), 'tables', schema
      );
      setTables((current) => ({ ...current, [cacheKey]: items }));
    });
  }

  function loadColumns(
    connection: ConnectionConfig, database: string, schema: string | undefined, table: string
  ): Promise<void> {
    const cacheKey = `${connection.id}:${database}:${schema ?? ''}:${table}`;
    const key = `columns:${cacheKey}`;
    if (columns[cacheKey]) return Promise.resolve();
    return load(key, async () => {
      const items = await listMetadata<ColumnMetadata>(
        connectionConfig(connection, database), 'columns', schema, table
      );
      setColumns((current) => ({ ...current, [cacheKey]: items }));
    });
  }

  function statusRow(key: string, level: number, retry: () => Promise<void>): React.ReactElement | null {
    if (loading.has(key)) return <TreeRow level={level} icon="…" label="Loading..." muted />;
    if (errors[key]) {
      return (
        <TreeRow
          level={level}
          icon="!"
          label="Load failed · retry"
          title={errors[key]}
          muted
          onClick={() => void retry()}
        />
      );
    }
    return null;
  }

  function renderColumns(
    connection: ConnectionConfig, database: string, schema: string | undefined, table: string, level: number
  ): React.ReactNode {
    const cacheKey = `${connection.id}:${database}:${schema ?? ''}:${table}`;
    const folderKey = `columns:${cacheKey}`;
    const isOpen = expanded.has(folderKey);
    return (
      <>
        <TreeRow
          level={level} icon="▤" label="Columns" expandable expanded={isOpen}
          onClick={() => toggle(folderKey, () => loadColumns(connection, database, schema, table))}
        />
        {isOpen && (
          <>
            {statusRow(folderKey, level + 1, () => loadColumns(connection, database, schema, table))}
            {(columns[cacheKey] ?? []).map((column) => (
              <TreeRow
                key={column.name}
                level={level + 1}
                icon={column.primaryKey ? '◆' : '·'}
                title={`${column.name} ${column.dataType}${column.nullable ? ' NULL' : ' NOT NULL'}`}
                label={(
                  <>
                    <span>{column.name}</span>
                    <span className="db-tree-column-type">{column.dataType}</span>
                    {column.primaryKey && <span className="db-tree-badge">PK</span>}
                  </>
                )}
                onDoubleClick={() => props.onInsertIdentifier(connection, [column.name])}
              />
            ))}
          </>
        )}
      </>
    );
  }

  function renderTables(
    connection: ConnectionConfig, database: string, schema: string | undefined, level: number
  ): React.ReactNode {
    const cacheKey = `${connection.id}:${database}:${schema ?? ''}`;
    const folderKey = `tables:${cacheKey}`;
    const isOpen = expanded.has(folderKey);
    return (
      <>
        <TreeRow
          level={level} icon="▦" label="Tables" expandable expanded={isOpen}
          onClick={() => toggle(folderKey, () => loadTables(connection, database, schema))}
        />
        {isOpen && (
          <>
            {statusRow(folderKey, level + 1, () => loadTables(connection, database, schema))}
            {(tables[cacheKey] ?? []).map((table) => {
              const tableKey = `table:${cacheKey}:${table.name}`;
              const tableOpen = expanded.has(tableKey);
              return (
                <React.Fragment key={`${table.schema}.${table.name}`}>
                  <TreeRow
                    level={level + 1} icon="▦" label={table.name} expandable expanded={tableOpen}
                    onClick={() => toggle(tableKey)}
                    onDoubleClick={() => props.onInsertIdentifier(
                      connection, connection.type === 'mysql' ? [database, table.name] : [table.schema, table.name]
                    )}
                  />
                  {tableOpen && renderColumns(connection, database, schema, table.name, level + 2)}
                </React.Fragment>
              );
            })}
          </>
        )}
      </>
    );
  }

  function renderDatabase(connection: ConnectionConfig, database: string): React.ReactNode {
    const dbKey = `database:${connection.id}:${database}`;
    const dbOpen = expanded.has(dbKey);
    const schemaCacheKey = `${connection.id}:${database}`;
    const schemasKey = `schemas:${schemaCacheKey}`;
    const schemasOpen = expanded.has(schemasKey);
    return (
      <React.Fragment key={database}>
        <TreeRow
          level={2} icon="◉" label={database} expandable expanded={dbOpen}
          active={props.activeConnectionId === connection.id && props.activeDatabase === database}
          onClick={() => {
            props.onSelectDatabase(connection.id, database);
            toggle(dbKey);
          }}
        />
        {dbOpen && (
          connection.type === 'mysql'
            ? renderTables(connection, database, undefined, 3)
            : (
              <>
                <TreeRow
                  level={3} icon="▰" label="Schemas" expandable expanded={schemasOpen}
                  onClick={() => toggle(schemasKey, () => loadSchemas(connection, database))}
                />
                {schemasOpen && (
                  <>
                    {statusRow(schemasKey, 4, () => loadSchemas(connection, database))}
                    {(schemas[schemaCacheKey] ?? []).map((schema) => {
                      const schemaKey = `schema:${schemaCacheKey}:${schema.name}`;
                      const schemaOpen = expanded.has(schemaKey);
                      return (
                        <React.Fragment key={schema.name}>
                          <TreeRow
                            level={4} icon="▰" label={schema.name} expandable expanded={schemaOpen}
                            onClick={() => toggle(schemaKey)}
                          />
                          {schemaOpen && renderTables(connection, database, schema.name, 5)}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </>
            )
        )}
      </React.Fragment>
    );
  }

  if (props.collapsed && !props.mobileOpen) return <></>;

  const explorer = (
    <aside className={`db-explorer${props.mobileOpen ? ' mobile-open' : ''}`}>
        <div className="db-explorer-header">
          <strong>Database Explorer</strong>
          <div>
            <button
              className="db-explorer-icon-btn"
              title="Refresh explorer"
              onClick={() => {
                setExpanded(new Set());
                setDatabases({});
                setSchemas({});
                setTables({});
                setColumns({});
                setErrors({});
              }}
            >↻</button>
            <button className="db-explorer-icon-btn" title="Collapse explorer" onClick={props.onCollapse}>‹</button>
          </div>
        </div>
        <div className="db-explorer-tree">
          {props.connections.length === 0 && <div className="db-explorer-empty">No saved connections</div>}
          {props.connections.map((connection) => {
            const connectionKey = `connection:${connection.id}`;
            const dbFolderKey = `databases:${connection.id}`;
            const connectionOpen = expanded.has(connectionKey);
            const databasesOpen = expanded.has(dbFolderKey);
            return (
              <React.Fragment key={connection.id}>
                <TreeRow
                  level={0} icon="◉" label={connection.name} expandable expanded={connectionOpen}
                  onClick={() => toggle(connectionKey)}
                />
                {connectionOpen && (
                  <>
                    <TreeRow
                      level={1} icon="▰" label="Databases" expandable expanded={databasesOpen}
                      onClick={() => toggle(dbFolderKey, () => loadDatabases(connection))}
                    />
                    {databasesOpen && (
                      <>
                        {statusRow(dbFolderKey, 2, () => loadDatabases(connection))}
                        {(databases[connection.id] ?? []).map((database) => renderDatabase(connection, database))}
                      </>
                    )}
                  </>
                )}
              </React.Fragment>
            );
          })}
        </div>
    </aside>
  );

  if (props.mobileOpen) {
    return (
      <>
        <button className="db-explorer-backdrop" onClick={props.onCloseMobile} aria-label="Close database explorer" />
        {explorer}
      </>
    );
  }

  const sidebar = document.querySelector('.sidebar');
  return (
    <>
      {sidebar ? createPortal(explorer, sidebar) : explorer}
    </>
  );
}
