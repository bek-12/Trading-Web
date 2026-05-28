import { useState } from 'react';

export default function Settings({ onLogout }) {
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
        <p>App preferences and account management</p>
      </div>

      {/* About */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
        <div className="card-title">About TradeOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Version', '2.0.0'],
            ['Storage', 'Neon PostgreSQL — syncs across all devices'],
            ['Mentor', 'Rule-based · No API required'],
            ['Data leaves device', 'Only to your own database'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{label}</span>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Privacy */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
        <div className="card-title">Privacy & Data</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['🔐', 'Authentication', 'Passwords are hashed with bcrypt. JWT tokens expire after 30 days.'],
            ['💾', 'Trade Data', 'All trades, check-ins, and journal entries are stored in your Neon PostgreSQL database and sync across devices.'],
            ['🧠', 'AI Mentor', 'The Mentor is fully rule-based and runs in your browser. No external AI API calls are made.'],
            ['💬', 'Chat History', 'Mentor conversations are stored in your browser\'s localStorage per account. They do not sync across devices.'],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 20, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sign out */}
      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-title">Account</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Signing out will clear your session. Your data remains safely stored in the database and will be available when you sign back in.
        </p>
        {confirmLogout ? (
          <div>
            <div className="alert alert-amber" style={{ marginBottom: 14 }}>
              Are you sure you want to sign out?
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={onLogout}>Yes, Sign Out</button>
              <button className="btn btn-ghost" onClick={() => setConfirmLogout(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost" style={{ borderColor: 'var(--red-dim)', color: 'var(--red)' }} onClick={() => setConfirmLogout(true)}>
            Sign Out
          </button>
        )}
      </div>
    </div>
  );
}
