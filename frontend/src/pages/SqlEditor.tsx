import React, { useState, useCallback, useEffect } from 'react';
import { runQuery, QueryResult } from '../services/api';
import { useConnections } from '../hooks/useConnections';
import { ResultTable } from '../components/ResultTable';
import { QueryHistory, HistoryEntry, loadHistory, appendHistory, clearHistory } from '../components/QueryHistory';

export function SqlEditor(): React.ReactElement {
  const { connections } = useConnections();
  const [selectedConnId, setSelectedConnId] = useState<string>('');
  const [sql, setSql] = useState('');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(true);

  useEffect(() => {
    if (!selectedConnId && connections.length > 0) {
      setSelectedConnId(connections[0].id);
    }
  }, [connections, selectedConnId]);

  const selectedConn = connections.find((c) => c.id === selectedConnId);

  const handleRun = useCallback(async (): Promise<void> => {
    if (!selectedConn) {
      setError('Please select a connection first');
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
          database: selectedConn.database,
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
  }, [selectedConn, sql]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>): void {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleRun();
    }
  }

  function handleHistorySelect(historySql: string): void {
    setSql(historySql);
  }

  function handleClearHistory(): void {
    clearHistory();
    setHistory([]);
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
    <div className="editor-layout" style={{ height: '100vh', overflow: 'hidden' }}>
      <div className="editor-toolbar">
        {connections.length === 0 ? (
          <span style={{ fontSize: '13px', color: 'var(--main-muted)' }}>
            No connections configured — add one in Connections
          </span>
        ) : (
          <select
            className="form-select"
            value={selectedConnId}
            onChange={(e) => setSelectedConnId(e.target.value)}
            style={{ minWidth: '200px', width: 'auto' }}
          >
            <option value="">Select connection...</option>
            {connections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({dbTypeLabel(conn.type)})
              </option>
            ))}
          </select>
        )}

        <button
          className="btn btn-primary"
          onClick={() => void handleRun()}
          disabled={isRunning || !selectedConnId}
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

        <span style={{ fontSize: '12px', color: 'var(--main-muted)' }}>
          Ctrl+Enter to run
        </span>

        <div style={{ marginLeft: 'auto' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowHistory((v) => !v)}
            title="Toggle history"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            History
          </button>
        </div>
      </div>

      <div className="editor-body">
        <div className="editor-main">
          <div className="editor-pane">
            <textarea
              className="sql-textarea"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="-- Write your SQL query here&#10;-- Press Ctrl+Enter to run&#10;SELECT * FROM users LIMIT 10;"
              rows={10}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>

          <div className="result-pane">
            {error && (
              <div style={{ padding: '12px 16px' }}>
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
                  <span>{result.columns.length} column{result.columns.length !== 1 ? 's' : ''}</span>
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

        {showHistory && (
          <QueryHistory
            entries={history}
            onSelect={handleHistorySelect}
            onClear={handleClearHistory}
          />
        )}
      </div>
    </div>
  );
}
