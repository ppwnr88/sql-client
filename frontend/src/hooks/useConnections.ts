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

interface UseConnectionsReturn {
  connections: ConnectionConfig[];
  addConnection: (conn: Omit<ConnectionConfig, 'id'>) => ConnectionConfig;
  updateConnection: (id: string, updates: Partial<Omit<ConnectionConfig, 'id'>>) => void;
  deleteConnection: (id: string) => void;
  importConnections: (incoming: Omit<ConnectionConfig, 'id'>[]) => void;
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

  const exportConnections = useCallback((): void => {
    const payload = {
      connections: connections.map(({ id: _id, ...rest }) => rest),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sql-client-connections.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [connections]);

  return {
    connections,
    addConnection,
    updateConnection,
    deleteConnection,
    importConnections,
    exportConnections,
  };
}
