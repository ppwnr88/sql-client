import React, { useState, useRef } from 'react';
import { ConnectionConfig, testConnection } from '../services/api';
import { ConnectionForm } from '../components/ConnectionForm';
import { useConnections } from '../hooks/useConnections';

type ModalMode = 'add' | 'edit' | null;

interface ImportPayload {
  connections: Omit<ConnectionConfig, 'id'>[];
}

export function ConnectionManager(): React.ReactElement {
  const {
    connections,
    addConnection,
    updateConnection,
    deleteConnection,
    importConnections,
    exportConnections,
  } = useConnections();

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showSecondaryActions, setShowSecondaryActions] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const editingConn = connections.find((c) => c.id === editingId);

  function openAdd(): void {
    setEditingId(null);
    setModalMode('add');
    setShowSecondaryActions(false);
  }

  function openEdit(id: string): void {
    setEditingId(id);
    setModalMode('edit');
  }

  function closeModal(): void {
    setModalMode(null);
    setEditingId(null);
  }

  function handleFormSubmit(data: Omit<ConnectionConfig, 'id'>): void {
    if (modalMode === 'add') {
      addConnection(data);
    } else if (modalMode === 'edit' && editingId) {
      updateConnection(editingId, data);
    }
    closeModal();
  }

  async function handleTest(conn: ConnectionConfig): Promise<void> {
    setTestingId(conn.id);
    setTestStatus((prev) => {
      const next = { ...prev };
      delete next[conn.id];
      return next;
    });
    try {
      const result = await testConnection({ ...conn });
      setTestStatus((prev) => ({
        ...prev,
        [conn.id]: { ok: result.success, msg: result.message },
      }));
    } catch (err) {
      setTestStatus((prev) => ({
        ...prev,
        [conn.id]: {
          ok: false,
          msg: err instanceof Error ? err.message : 'Connection failed',
        },
      }));
    } finally {
      setTestingId(null);
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as ImportPayload;
        if (!Array.isArray(parsed.connections)) {
          alert('Invalid file format. Expected { "connections": [...] }');
          return;
        }
        importConnections(parsed.connections);
      } catch {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
    setShowSecondaryActions(false);
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
    <div className="main-content">
      <div className="page-header">
        <h1>Connections</h1>

        {/* Desktop header actions */}
        <div className="page-header-actions desktop-actions">
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button className="btn btn-secondary" onClick={() => importRef.current?.click()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import
          </button>
          {connections.length > 0 && (
            <button className="btn btn-secondary" onClick={exportConnections}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export
            </button>
          )}
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Connection
          </button>
        </div>

        {/* Mobile header actions */}
        <div className="page-header-actions mobile-actions">
          <input
            ref={importRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
          <button className="btn btn-ghost btn-icon" onClick={() => setShowSecondaryActions((v) => !v)} title="More actions">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" fill="currentColor" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
              <circle cx="12" cy="19" r="1" fill="currentColor" />
            </svg>
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>
      </div>

      {/* Mobile secondary actions row */}
      {showSecondaryActions && (
        <div className="mobile-secondary-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => importRef.current?.click()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import JSON
          </button>
          {connections.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => { exportConnections(); setShowSecondaryActions(false); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export JSON
            </button>
          )}
        </div>
      )}

      <div className="page-body">
        {connections.length === 0 ? (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
              <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
            </svg>
            <h3>No connections yet</h3>
            <p>Add a database connection to get started</p>
            <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={openAdd}>
              Add Connection
            </button>
          </div>
        ) : (
          <div className="connection-list">
            {connections.map((conn) => (
              <div key={conn.id} className="connection-card">
                <div className="connection-info">
                  <div className={`connection-icon ${conn.type}`}>
                    {conn.type === 'mysql' && 'MY'}
                    {conn.type === 'postgresql' && 'PG'}
                    {conn.type === 'mssql' && 'MS'}
                  </div>
                  <div className="connection-details">
                    <h3>{conn.name}</h3>
                    <span>
                      {dbTypeLabel(conn.type)} · {conn.user}@{conn.host}:{conn.port}
                      {conn.database ? `/${conn.database}` : ''}
                    </span>
                    {testStatus[conn.id] && (
                      <div style={{ marginTop: '4px' }}>
                        <span className={`badge ${testStatus[conn.id].ok ? 'badge-green' : 'badge-red'}`}>
                          {testStatus[conn.id].ok ? 'Connected' : testStatus[conn.id].msg}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="connection-actions">
                  {deleteConfirmId === conn.id ? (
                    <>
                      <span className="delete-confirm-label">Delete?</span>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          deleteConnection(conn.id);
                          setDeleteConfirmId(null);
                        }}
                      >
                        Yes
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleTest(conn)}
                        disabled={testingId === conn.id}
                      >
                        {testingId === conn.id ? (
                          <span className="spinner spinner-dark" style={{ width: '12px', height: '12px' }} />
                        ) : 'Test'}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(conn.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setDeleteConfirmId(conn.id)}
                        style={{ color: 'var(--danger)' }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalMode !== null && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{modalMode === 'add' ? 'New Connection' : 'Edit Connection'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <ConnectionForm
                initial={editingConn}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                submitLabel={modalMode === 'add' ? 'Add Connection' : 'Save Changes'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
