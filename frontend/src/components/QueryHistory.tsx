import React from 'react';

export interface HistoryEntry {
  id: string;
  sql: string;
  connectionName: string;
  executedAt: string;
  duration?: number;
  rowCount?: number;
  error?: boolean;
}

const HISTORY_KEY = 'sql_client_history';
const MAX_HISTORY = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function appendHistory(entry: Omit<HistoryEntry, 'id'>): void {
  const history = loadHistory();
  const newEntry: HistoryEntry = { ...entry, id: `hist_${Date.now()}` };
  const next = [newEntry, ...history].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

interface QueryHistoryProps {
  entries: HistoryEntry[];
  onSelect: (sql: string) => void;
  onClear: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function QueryHistory({
  entries,
  onSelect,
  onClear,
}: QueryHistoryProps): React.ReactElement {
  return (
    <div className="history-sidebar">
      <div className="history-header">
        <h3>History</h3>
        {entries.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={onClear} title="Clear history">
            Clear
          </button>
        )}
      </div>
      <div className="history-list">
        {entries.length === 0 ? (
          <div className="history-empty">No queries yet</div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="history-item"
              onClick={() => onSelect(entry.sql)}
              title={entry.sql}
            >
              <div className="history-item-sql">{entry.sql}</div>
              <div className="history-item-meta">
                <span>{entry.connectionName}</span>
                <span>{formatTime(entry.executedAt)}</span>
              </div>
              {entry.duration !== undefined && (
                <div className="history-item-meta" style={{ marginTop: '2px' }}>
                  <span style={{ color: entry.error ? '#cf222e' : '#1a7f37' }}>
                    {entry.error ? 'Error' : `${entry.rowCount ?? 0} rows`}
                  </span>
                  <span>{entry.duration}ms</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
