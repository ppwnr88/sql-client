import { useState, useCallback } from 'react';
import { ConnectionConfig } from '../services/api';

const STORAGE_KEY = 'sql_client_connections';

function loadConnections(): ConnectionConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ConnectionConfig[];
  } catch {
    return [];
  }
}

function saveConnections(connections: ConnectionConfig[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

function generateId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function downloadConnections(connections: ConnectionConfig[], filename: string): void {
  const payload = {
    connections: connections.map(({ id: _id, ...rest }) => rest),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface UseConnectionsReturn {
  connections: ConnectionConfig[];
  addConnection: (conn: Omit<ConnectionConfig, 'id'>) => ConnectionConfig;
  updateConnection: (id: string, updates: Partial<Omit<ConnectionConfig, 'id'>>) => void;
  deleteConnection: (id: string) => void;
  importConnections: (incoming: Omit<ConnectionConfig, 'id'>[]) => void;
  exportConnection: (id: string) => void;
  exportConnections: () => void;
}

export function useConnections(): UseConnectionsReturn {
  const [connections, setConnections] = useState<ConnectionConfig[]>(loadConnections);

  const addConnection = useCallback((conn: Omit<ConnectionConfig, 'id'>): ConnectionConfig => {
    const newConn: ConnectionConfig = { ...conn, id: generateId() };
    setConnections((prev) => {
      const next = [...prev, newConn];
      saveConnections(next);
      return next;
    });
    return newConn;
  }, []);

  const updateConnection = useCallback(
    (id: string, updates: Partial<Omit<ConnectionConfig, 'id'>>): void => {
      setConnections((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
        saveConnections(next);
        return next;
      });
    },
    []
  );

  const deleteConnection = useCallback((id: string): void => {
    setConnections((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveConnections(next);
      return next;
    });
  }, []);

  const importConnections = useCallback(
    (incoming: Omit<ConnectionConfig, 'id'>[]): void => {
      setConnections((prev) => {
        const newConns: ConnectionConfig[] = incoming.map((c) => ({ ...c, id: generateId() }));
        const next = [...prev, ...newConns];
        saveConnections(next);
        return next;
      });
    },
    []
  );

  const exportConnection = useCallback((id: string): void => {
    const connection = connections.find((conn) => conn.id === id);
    if (!connection) return;

    const safeName = connection.name
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'connection';
    downloadConnections([connection], `sql-client-${safeName}.json`);
  }, [connections]);

  const exportConnections = useCallback((): void => {
    downloadConnections(connections, 'sql-client-connections.json');
  }, [connections]);

  return {
    connections,
    addConnection,
    updateConnection,
    deleteConnection,
    importConnections,
    exportConnection,
    exportConnections,
  };
}
