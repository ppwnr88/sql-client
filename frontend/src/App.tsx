import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { ConnectionManager } from './pages/ConnectionManager';
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

function LogoutIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

interface ProtectedLayoutProps {
  onLogout: () => void;
  username: string | null;
}

function ProtectedLayout({ onLogout, username }: ProtectedLayoutProps): React.ReactElement {

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

        <div className="sidebar-footer">
          {username && (
            <div className="sidebar-user">
              Signed in as <strong>{username}</strong>
            </div>
          )}
          <button onClick={onLogout} className="sidebar-logout-btn">
            <LogoutIcon />
            Sign out
          </button>
        </div>
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
        {username && <span className="mobile-header-user">{username}</span>}
        <button className="mobile-logout-btn" onClick={onLogout} title="Sign out">
          <LogoutIcon />
        </button>
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
  const auth = useAuth();

  function handleLoginSuccess(): void {
    // auth state updates via useAuth hook after localStorage write
  }

  function handleLogout(): void {
    auth.logout();
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            auth.isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <LoginPage
                onLoginSuccess={handleLoginSuccess}
                login={auth.login}
                isLoading={auth.isLoading}
              />
            )
          }
        />
        <Route
          path="*"
          element={
            auth.isAuthenticated ? (
              <ProtectedLayout onLogout={handleLogout} username={auth.username} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
