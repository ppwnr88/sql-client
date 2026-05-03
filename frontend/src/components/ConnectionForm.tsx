import React, { useState } from 'react';
import { ConnectionConfig } from '../services/api';

type ConnectionFormData = Omit<ConnectionConfig, 'id'>;

interface ConnectionFormProps {
  initial?: Partial<ConnectionFormData>;
  onSubmit: (data: ConnectionFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

const DEFAULT_PORTS: Record<string, number> = {
  mysql: 3306,
  postgresql: 5432,
  mssql: 1433,
};

export function ConnectionForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Save',
  isLoading = false,
}: ConnectionFormProps): React.ReactElement {
  const [form, setForm] = useState<ConnectionFormData>({
    name: initial?.name ?? '',
    type: initial?.type ?? 'mysql',
    host: initial?.host ?? 'localhost',
    port: initial?.port ?? DEFAULT_PORTS[initial?.type ?? 'mysql'],
    user: initial?.user ?? '',
    password: initial?.password ?? '',
    database: initial?.database ?? '',
  });

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>): void {
    const type = e.target.value as ConnectionConfig['type'];
    setForm((prev) => ({ ...prev, type, port: DEFAULT_PORTS[type] }));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value, 10) || 0 : value,
    }));
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Connection Name</label>
        <input
          className="form-input"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Production DB"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Database Type</label>
        <select className="form-select" name="type" value={form.type} onChange={handleTypeChange}>
          <option value="mysql">MySQL</option>
          <option value="postgresql">PostgreSQL</option>
          <option value="mssql">Microsoft SQL Server</option>
        </select>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Host</label>
          <input
            className="form-input"
            name="host"
            value={form.host}
            onChange={handleChange}
            placeholder="localhost"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Port</label>
          <input
            className="form-input"
            name="port"
            type="number"
            value={form.port}
            onChange={handleChange}
            min={1}
            max={65535}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            className="form-input"
            name="user"
            value={form.user}
            onChange={handleChange}
            placeholder="root"
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            className="form-input"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="(optional)"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Default Database (Optional)</label>
        <input
          className="form-input"
          name="database"
          value={form.database}
          onChange={handleChange}
          placeholder="Select later in SQL Editor"
        />
      </div>

      <div className="modal-footer" style={{ padding: '16px 0 0', marginTop: '4px' }}>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? <span className="spinner" /> : null}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
