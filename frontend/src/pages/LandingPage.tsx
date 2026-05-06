import React from 'react';

export function LandingPage(): React.ReactElement {
  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-container">
          <div className="hero-center">
            <span className="hero-badge">Free · Browser based · No installation</span>
            <h1 className="hero-h1">
              SQL Editor Online ฟรี<br />
              <span className="hero-h1-sub">ใช้งานได้ทันทีในเบราว์เซอร์</span>
            </h1>
            <p className="hero-desc">
              เขียนและรัน SQL ออนไลน์ฟรี รองรับ MySQL, PostgreSQL และ Microsoft SQL Server
            </p>
            <p className="hero-desc-en">
              Write, run and debug SQL queries instantly in your browser.
            </p>
            <div className="hero-actions hero-actions-center">
              <a href="/editor" className="btn-hero-primary btn-hero-large">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
                Start Using SQL Editor
              </a>
              <a href="/connections" className="btn-hero-ghost">
                Manage connections →
              </a>
            </div>
          </div>
        </div>
      </section>

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
              <h3>Run SQL instantly</h3>
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
              <h3>Query history</h3>
              <p>เก็บประวัติ query ล่าสุดไว้ในเบราว์เซอร์ เรียกใช้ซ้ำได้ง่าย</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
                  <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
                </svg>
              </div>
              <h3>Saved connections</h3>
              <p>บันทึก connection config ในเบราว์เซอร์ ไม่ต้องกรอกซ้ำ</p>
            </div>
          </div>
        </div>
      </section>

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

      <section className="landing-section">
        <div className="landing-container">
          <h2 className="section-h2">SQL Examples</h2>
          <p className="section-sub">ลองรัน query เหล่านี้ได้เลย เปิด editor แล้ว paste ได้ทันที</p>
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
            <p className="footer-copy">Free SQL Editor Online รองรับ MySQL, PostgreSQL และ MSSQL</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
