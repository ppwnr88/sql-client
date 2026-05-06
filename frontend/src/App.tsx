import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { ConnectionManager } from './pages/ConnectionManager';
import { LandingPage } from './pages/LandingPage';
import { SqlEditor } from './pages/SqlEditor';

function DatabaseIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function EditorIcon(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function AppLayout(): React.ReactElement {
  return (
    <div className="app-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
          </svg>
          SQL Client
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/editor"
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <EditorIcon />
            SQL Editor
          </NavLink>
          <NavLink
            to="/connections"
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          >
            <DatabaseIcon />
            Connections
          </NavLink>
        </nav>

      </aside>

      {/* Mobile top header */}
      <header className="mobile-header">
        <div className="mobile-header-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
          </svg>
          SQL Client
        </div>
      </header>

      {/* Page content */}
      <div className="app-content">
        <Routes>
          <Route path="/editor" element={<SqlEditor />} />
          <Route path="/connections" element={<ConnectionManager />} />
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="*" element={<Navigate to="/editor" replace />} />
        </Routes>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-tab-bar">
        <NavLink
          to="/editor"
          className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}
        >
          <EditorIcon />
          <span>SQL Editor</span>
        </NavLink>
        <NavLink
          to="/connections"
          className={({ isActive }) => `bottom-tab${isActive ? ' active' : ''}`}
        >
          <DatabaseIcon />
          <span>Connections</span>
        </NavLink>
      </nav>
    </div>
  );
}

export default function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LandingPage />} />
        <Route path="*" element={<AppLayout />} />
      </Routes>
    </BrowserRouter>
  );
}
