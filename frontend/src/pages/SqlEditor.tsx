import React, { useState, useCallback, useEffect, useRef } from 'react';
import { listDatabases, runQuery, QueryResult } from '../services/api';
import { useConnections } from '../hooks/useConnections';
import { ResultTable } from '../components/ResultTable';
import { QueryHistory, HistoryEntry, loadHistory, appendHistory, clearHistory } from '../components/QueryHistory';
import { DatabaseExplorer } from '../components/DatabaseExplorer';

type ExportFormat = 'csv' | 'json' | 'xml' | 'txt' | 'sql';

function getCellString(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeCsv(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''");
}

function toCSV(result: QueryResult): string {
  const header = result.columns.map(escapeCsv).join(',');
  const rows = result.rows.map((row) =>
    result.columns.map((col) => escapeCsv(getCellString(row[col]))).join(',')
  );
  return [header, ...rows].join('\r\n');
}

function toTSV(result: QueryResult): string {
  const header = result.columns.join('\t');
  const rows = result.rows.map((row) =>
    result.columns.map((col) => getCellString(row[col]).replace(/\t/g, ' ')).join('\t')
  );
  return [header, ...rows].join('\r\n');
}

function toJSON(result: QueryResult): string {
  return JSON.stringify(
    result.rows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const col of result.columns) obj[col] = row[col] ?? null;
      return obj;
    }),
    null,
    2
  );
}

function toXML(result: QueryResult): string {
  const rows = result.rows
    .map((row) => {
      const fields = result.columns
        .map((col) => `    <${col}>${escapeXml(getCellString(row[col]))}</${col}>`)
        .join('\n');
      return `  <row>\n${fields}\n  </row>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<resultset>\n${rows}\n</resultset>`;
}

function toSQL(result: QueryResult): string {
  if (result.rows.length === 0) return '-- No rows';
  const cols = result.columns.map((c) => `\`${c}\``).join(', ');
  return result.rows
    .map((row) => {
      const vals = result.columns
        .map((col) => {
          const v = row[col];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number' || typeof v === 'boolean') return String(v);
          return `'${escapeSqlString(getCellString(v))}'`;
        })
        .join(', ');
      return `INSERT INTO \`table\` (${cols}) VALUES (${vals});`;
    })
    .join('\n');
}

function convertResult(result: QueryResult, format: ExportFormat): string {
  switch (format) {
    case 'csv': return toCSV(result);
    case 'txt': return toTSV(result);
    case 'json': return toJSON(result);
    case 'xml': return toXML(result);
    case 'sql': return toSQL(result);
  }
}

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'csv': return 'text/csv';
    case 'json': return 'application/json';
    case 'xml': return 'application/xml';
    case 'txt': return 'text/plain';
    case 'sql': return 'text/plain';
  }
}

function downloadFile(content: string, format: ExportFormat): void {
  const blob = new Blob([content], { type: getMimeType(format) });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `query_result.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function quoteIdentifier(name: string, type: 'mysql' | 'postgresql' | 'mssql'): string {
  if (type === 'mysql') return `\`${name.replace(/`/g, '``')}\``;
  if (type === 'mssql') {
    const escaped = name.replace(/\]/g, ']]');
    return `[${escaped}]`;
  }
  return `"${name.replace(/"/g, '""')}"`;
}

export function SqlEditor(): React.ReactElement {
  const { connections } = useConnections();
  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [databases, setDatabases] = useState<string[]>([]);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [copyFormat, setCopyFormat] = useState<ExportFormat>('csv');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [copyLabel, setCopyLabel] = useState('Copy');
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [explorerMobileOpen, setExplorerMobileOpen] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestedDatabaseRef = useRef<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!selectedConnId && connections.length > 0) {
      setSelectedConnId(connections[0].id);
    }
  }, [connections, selectedConnId]);

  const selectedConn = connections.find((c) => c.id === selectedConnId);

  useEffect(() => {
    if (!selectedConn) {
      setSelectedDatabase('');
      setDatabases([]);
      setDatabaseError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingDatabases(true);
    setDatabaseError(null);
    setDatabases([]);
    const requestedDatabase = requestedDatabaseRef.current;
    setSelectedDatabase(requestedDatabase ?? selectedConn.database ?? '');

    void listDatabases({
      type: selectedConn.type,
      host: selectedConn.host,
      port: selectedConn.port,
      user: selectedConn.user,
      password: selectedConn.password,
      database: selectedConn.database,
    })
      .then((databaseNames) => {
        if (cancelled) return;
        setDatabases(databaseNames);
        setSelectedDatabase((current) => {
          if (current && databaseNames.includes(current)) return current;
          return databaseNames[0] ?? '';
        });
        requestedDatabaseRef.current = null;
      })
      .catch((err) => {
        if (cancelled) return;
        setDatabaseError(err instanceof Error ? err.message : 'Failed to load databases');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDatabases(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedConn]);

  function handleExplorerSelectDatabase(connectionId: string, database: string): void {
    requestedDatabaseRef.current = database;
    setSelectedConnId(connectionId);
    setSelectedDatabase(database);
    setExplorerMobileOpen(false);
  }

  function handleInsertIdentifier(
    connection: { type: 'mysql' | 'postgresql' | 'mssql' },
    parts: string[]
  ): void {
    const identifier = parts.map((part) => quoteIdentifier(part, connection.type)).join('.');
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? sql.length;
    const end = textarea?.selectionEnd ?? sql.length;
    setSql((current) => `${current.slice(0, start)}${identifier}${current.slice(end)}`);
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + identifier.length, start + identifier.length);
    });
    setExplorerMobileOpen(false);
  }

  const handleRun = useCallback(async (): Promise<void> => {
    if (!selectedConn) {
      setError('Please select a connection first');
      return;
    }
    if (!selectedDatabase) {
      setError('Please select a database first');
      return;
    }
    if (!sql.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const queryResult = await runQuery(
        {
          type: selectedConn.type,
          host: selectedConn.host,
          port: selectedConn.port,
          user: selectedConn.user,
          password: selectedConn.password,
          database: selectedDatabase,
        },
        sql
      );
      setResult(queryResult);
      appendHistory({
        sql,
        connectionName: selectedConn.name,
        executedAt: new Date().toISOString(),
        duration: queryResult.duration,
        rowCount: queryResult.rowCount,
        error: false,
      });
      setHistory(loadHistory());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Query failed';
      setError(message);
      appendHistory({
        sql,
        connectionName: selectedConn.name,
        executedAt: new Date().toISOString(),
        error: true,
      });
      setHistory(loadHistory());
    } finally {
      setIsRunning(false);
    }
  }, [selectedConn, selectedDatabase, sql]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleRun();
    }
  }

  function handleHistorySelect(historySql: string): void {
    setSql(historySql);
    setShowHistory(false);
  }

  function handleClearHistory(): void {
    clearHistory();
    setHistory([]);
  }

  function handleCopy(): void {
    if (!result) return;
    const text = convertResult(result, copyFormat);
    void navigator.clipboard.writeText(text).then(() => {
      setCopyLabel('Copied!');
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopyLabel('Copy'), 2000);
    });
  }

  function handleExport(): void {
    if (!result) return;
    const content = convertResult(result, exportFormat);
    downloadFile(content, exportFormat);
  }

  function dbTypeLabel(type: string): string {
    switch (type) {
      case 'mysql': return 'MySQL';
      case 'postgresql': return 'PostgreSQL';
      case 'mssql': return 'MSSQL';
      default: return type;
    }
  }

  return (
    <div className="editor-layout">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-row">
          <div className="editor-toolbar-status" title="Database connection">
            <span className="editor-toolbar-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
              </svg>
            </span>
            {connections.length === 0 ? (
              <span className="editor-no-conn">
                No connections configured — add one in Connections
              </span>
            ) : (
              <select
                className="form-select editor-conn-select"
                value={selectedConnId}
                onChange={(e) => {
                  requestedDatabaseRef.current = null;
                  setSelectedConnId(e.target.value);
                }}
              >
                <option value="">Select connection...</option>
                {connections.map((conn) => (
                  <option key={conn.id} value={conn.id}>
                    {conn.name} ({dbTypeLabel(conn.type)})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="editor-toolbar-status editor-database-status" title="Database">
            <span className="editor-toolbar-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
                <path d="M7 4v16" />
              </svg>
            </span>
            <select
              className="form-select editor-db-select"
              value={selectedDatabase}
              onChange={(e) => setSelectedDatabase(e.target.value)}
              disabled={!selectedConn || isLoadingDatabases || databases.length === 0}
            >
              <option value="">
                {isLoadingDatabases
                  ? 'Loading databases...'
                  : databaseError
                    ? 'Could not load databases'
                    : 'Select database...'}
              </option>
              {databases.map((databaseName) => (
                <option key={databaseName} value={databaseName}>
                  {databaseName}
                </option>
              ))}
            </select>
          </div>

          <button
            className="btn btn-primary editor-run-btn"
            onClick={() => void handleRun()}
            disabled={isRunning || !selectedConnId || !selectedDatabase}
            title="Run query (Ctrl+Enter)"
          >
            {isRunning ? (
              <span className="spinner" />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
            {isRunning ? 'Running...' : 'Run'}
          </button>

          <span className="editor-shortcut-hint">Ctrl+Enter</span>

          <button
            className="btn btn-ghost btn-sm editor-history-btn"
            onClick={() => setShowHistory((v) => !v)}
            title="Toggle history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            History
          </button>

          <button
            className="btn btn-ghost btn-sm editor-explorer-btn"
            onClick={() => {
              if (window.matchMedia('(max-width: 767px)').matches) setExplorerMobileOpen(true);
              else setExplorerCollapsed((value) => !value);
            }}
            title="Toggle database explorer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
            </svg>
            Explorer
          </button>
        </div>
      </div>

      {/* Body: textarea + results + optional history panel */}
      <div className="editor-body">
        <DatabaseExplorer
          connections={connections}
          activeConnectionId={selectedConnId}
          activeDatabase={selectedDatabase}
          collapsed={explorerCollapsed}
          mobileOpen={explorerMobileOpen}
          onCollapse={() => {
            setExplorerCollapsed(true);
            setExplorerMobileOpen(false);
          }}
          onCloseMobile={() => setExplorerMobileOpen(false)}
          onSelectDatabase={handleExplorerSelectDatabase}
          onInsertIdentifier={handleInsertIdentifier}
        />
        <div className="editor-main">
          <div className="editor-pane">
            <textarea
              ref={textareaRef}
              className="sql-textarea"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"-- Write your SQL query here\n-- Press Ctrl+Enter to run\nSELECT * FROM users LIMIT 10;"}
              rows={6}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="result-pane">
            {error && (
              <div className="result-error-wrap">
                <div className="alert alert-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{error}</span>
                </div>
              </div>
            )}

            {result && (
              <>
                <div className="result-header">
                  <span>
                    {result.rowCount} row{result.rowCount !== 1 ? 's' : ''} &nbsp;·&nbsp; {result.duration}ms
                  </span>
                  <span style={{ marginRight: 'auto' }}>{result.columns.length} column{result.columns.length !== 1 ? 's' : ''}</span>

                  {/* Copy controls */}
                  <div className="result-action-group">
                    <select
                      className="result-format-select"
                      value={copyFormat}
                      onChange={(e) => setCopyFormat(e.target.value as ExportFormat)}
                      title="Copy format"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="txt">TXT</option>
                      <option value="sql">SQL</option>
                    </select>
                    <button
                      className={`result-action-btn${copyLabel !== 'Copy' ? ' copied' : ''}`}
                      onClick={handleCopy}
                      title={`Copy as ${copyFormat.toUpperCase()}`}
                    >
                      {copyLabel !== 'Copy' ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      )}
                      {copyLabel}
                    </button>
                  </div>

                  {/* Export controls */}
                  <div className="result-action-group">
                    <select
                      className="result-format-select"
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
                      title="Export format"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                      <option value="xml">XML</option>
                      <option value="txt">TXT</option>
                      <option value="sql">SQL</option>
                    </select>
                    <button
                      className="result-action-btn"
                      onClick={handleExport}
                      title={`Export as ${exportFormat.toUpperCase()}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export
                    </button>
                  </div>
                </div>
                <ResultTable result={result} />
              </>
            )}

            {!error && !result && !isRunning && (
              <div className="result-empty">
                <span>Run a query to see results</span>
              </div>
            )}

            {isRunning && (
              <div className="result-empty">
                <span className="spinner spinner-dark" style={{ marginRight: '8px' }} />
                <span>Executing query...</span>
              </div>
            )}
          </div>
        </div>

        {/* History: desktop inline panel, mobile overlay */}
        {showHistory && (
          <>
            <div
              className="history-overlay-backdrop"
              onClick={() => setShowHistory(false)}
            />
            <div className="history-sidebar">
              <QueryHistory
                entries={history}
                onSelect={handleHistorySelect}
                onClear={handleClearHistory}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
