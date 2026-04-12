import React, { useState, FormEvent } from 'react';

interface LoginPageProps {
  onLoginSuccess: () => void;
  login: (username: string, password: string) => Promise<void>;
  isLoading: boolean;
}

export function LoginPage({ onLoginSuccess, login, isLoading }: LoginPageProps): React.ReactElement {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      await login(username, password);
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  return (
    <div className="landing-page">

      {/* ═══════════════════════════════════════
          1. HERO — primary CTA to editor
      ═══════════════════════════════════════ */}
      <section className="landing-hero">
        <div className="landing-container">
          <div className="hero-center">
            <span className="hero-badge">Free · No login required · No installation</span>
            <h1 className="hero-h1">
              SQL Editor Online ฟรี<br />
              <span className="hero-h1-sub">ใช้งานได้ทันที ไม่ต้อง Login</span>
            </h1>
            <p className="hero-desc">
              เขียนและรัน SQL ออนไลน์ฟรี รองรับ MySQL, PostgreSQL ไม่ต้องติดตั้ง ไม่ต้องสมัคร
            </p>
            <p className="hero-desc-en">
              Write, run and debug SQL queries instantly in your browser — no signup, no installation needed.
            </p>
            <div className="hero-actions hero-actions-center">
              <a href="/editor" className="btn-hero-primary btn-hero-large">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Start Using SQL Editor
              </a>
              <a href="/editor" className="btn-hero-ghost">
                Try without login →
              </a>
            </div>
            <p className="hero-no-signup">No account needed · Use as guest · Free forever</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          2. FEATURES
      ═══════════════════════════════════════ */}
      <section className="landing-section">
        <div className="landing-container">
          <h2 className="section-h2">Why use our SQL Editor?</h2>
          <p className="section-sub">เครื่องมือเขียน SQL ออนไลน์ที่ง่าย เร็ว และฟรี</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <h3>Run SQL instantly in browser</h3>
              <p>รัน Query ได้ทันทีจากเบราว์เซอร์ ไม่ต้องรอ</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <h3>No installation required</h3>
              <p>ไม่ต้องติดตั้งซอฟต์แวร์ใดๆ เปิดแล้วใช้ได้เลย</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>Fast and lightweight</h3>
              <p>โหลดเร็ว ใช้งานลื่น ทั้งบน desktop และ mobile</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3>Free to use</h3>
              <p>ใช้งานฟรีได้เลย ไม่มีค่าใช้จ่าย ไม่มีแผน paid</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          3. USE CASES
      ═══════════════════════════════════════ */}
      <section className="landing-section landing-section-muted">
        <div className="landing-container">
          <h2 className="section-h2">What can you do with this tool?</h2>
          <p className="section-sub">ใช้ได้หลากหลาย ทั้งนักเรียน นักพัฒนา และ DBA</p>
          <div className="usecases-grid">
            <div className="usecase-item">
              <span className="usecase-num">01</span>
              <div>
                <h3>Practice SQL queries</h3>
                <p>ฝึกเขียน SQL ด้วยตัวเองแบบ interactive พร้อม feedback ทันที</p>
              </div>
            </div>
            <div className="usecase-item">
              <span className="usecase-num">02</span>
              <div>
                <h3>Debug database queries</h3>
                <p>ทดสอบและ debug query ก่อนนำไปใช้ใน production</p>
              </div>
            </div>
            <div className="usecase-item">
              <span className="usecase-num">03</span>
              <div>
                <h3>Learn SQL online</h3>
                <p>เรียน SQL ออนไลน์ฟรี ตั้งแต่เบื้องต้นถึงขั้นสูง</p>
              </div>
            </div>
            <div className="usecase-item">
              <span className="usecase-num">04</span>
              <div>
                <h3>Prepare for interviews</h3>
                <p>เตรียมสอบ SQL สำหรับสัมภาษณ์งาน developer หรือ data analyst</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          4. SQL EXAMPLES
      ═══════════════════════════════════════ */}
      <section className="landing-section">
        <div className="landing-container">
          <h2 className="section-h2">SQL Examples</h2>
          <p className="section-sub">ลองรัน query เหล่านี้ได้เลย — เปิด editor แล้ว paste ได้ทันที</p>
          <div className="examples-grid">
            <div className="example-card">
              <div className="example-card-header">
                <span className="example-label">Basic SELECT</span>
                <a href="/editor" className="btn btn-sm btn-secondary">Try in editor →</a>
              </div>
              <pre className="code-block"><code>{`SELECT * FROM users;`}</code></pre>
              <p className="example-desc">ดึงข้อมูลทั้งหมดจากตาราง users</p>
            </div>
            <div className="example-card">
              <div className="example-card-header">
                <span className="example-label">JOIN Query</span>
                <a href="/editor" className="btn btn-sm btn-secondary">Try in editor →</a>
              </div>
              <pre className="code-block"><code>{`SELECT u.name, o.total\nFROM users u\nJOIN orders o ON u.id = o.user_id;`}</code></pre>
              <p className="example-desc">รวมข้อมูลจากหลายตารางด้วย JOIN</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          5. WHY CREATE AN ACCOUNT
      ═══════════════════════════════════════ */}
      <section className="landing-section landing-section-muted">
        <div className="landing-container">
          <h2 className="section-h2">Why create an account?</h2>
          <p className="section-sub">ใช้งานฟรีได้เลย — account เพิ่มความสะดวก ไม่ใช่ข้อบังคับ</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon feature-icon-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </div>
              <h3>Save your queries</h3>
              <p>บันทึก query ที่ใช้บ่อย เรียกใช้ได้ทันทีในครั้งถัดไป</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <h3>Access history</h3>
              <p>ดู query ที่รันไปแล้วทั้งหมด พร้อม timestamp และผลลัพธ์</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                  <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                </svg>
              </div>
              <h3>Manage connections</h3>
              <p>บันทึก connection config ไม่ต้องกรอกข้อมูลซ้ำทุกครั้ง</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-muted">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" />
                  <circle cx="6" cy="12" r="3" />
                  <circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
              </div>
              <h3>Share queries</h3>
              <p>แชร์ query กับทีม (coming soon)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          6. OPTIONAL LOGIN
      ═══════════════════════════════════════ */}
      <section className="landing-section">
        <div className="landing-container">
          <div className="optional-login-wrap">
            <div className="optional-login-text">
              <span className="optional-badge">Optional</span>
              <h2 className="section-h2 section-h2-left">Login (Optional)</h2>
              <p className="section-sub section-sub-left">
                Login to save your queries and access advanced features.<br />
                <span>ไม่มี account ก็ใช้งาน editor ได้ปกติ</span>
              </p>
              <a href="/editor" className="btn-hero-primary" style={{ display: 'inline-flex', marginTop: '12px' }}>
                Continue as Guest →
              </a>
            </div>

            <div className="optional-login-form">
              <div className="login-card">
                <div className="login-header">
                  <div className="login-logo">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                    </svg>
                    <span>Sign in</span>
                  </div>
                  <p>Save queries &amp; access history</p>
                </div>

                <div className="login-body">
                  {error && (
                    <div className="alert alert-error">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="form-group">
                      <label className="form-label">Username</label>
                      <input
                        className="form-input"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="admin"
                        autoComplete="username"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <input
                        className="form-input"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isLoading}>
                      {isLoading ? <span className="spinner" /> : null}
                      {isLoading ? 'Signing in...' : 'Sign in'}
                    </button>
                  </form>

                  <p className="login-hint">Default: admin / admin123</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          7. FOOTER
      ═══════════════════════════════════════ */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-inner">
            <div className="footer-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
              </svg>
              <span>SQL Client</span>
            </div>
            <nav className="footer-links" aria-label="Footer navigation">
              <a href="/editor" className="footer-link">SQL Editor</a>
              <span className="footer-sep" aria-hidden="true">·</span>
              <a href="https://wannarat.cc/" className="footer-link" target="_blank" rel="noopener noreferrer">wannarat.cc</a>
            </nav>
            <p className="footer-copy">Free SQL Editor Online — รองรับ MySQL &amp; PostgreSQL</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
