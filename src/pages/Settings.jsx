import { useState } from 'react';
import { persist, load } from '../store';

export default function Settings() {
  const [cleared, setCleared] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  function handleClearAllData() {
    // Clear all TradeOS keys from localStorage
    const keys = Object.keys(localStorage).filter(k => k.startsWith('tradeos_'));
    keys.forEach(k => localStorage.removeItem(k));
    setConfirmClear(false);
    setCleared(true);
    // Reload to reset app state
    setTimeout(() => window.location.reload(), 1200);
  }

  return (
    <div>
      <div className="page-header">
        <h2>Settings</h2>
        <p>App preferences and data management</p>
      </div>

      {/* About */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
        <div className="card-title">About TradeOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Version</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>1.0.0</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Mentor</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>Rule-based · No API required</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Storage</span>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Browser localStorage only</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Data leaves device</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>Never</span>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="card" style={{ maxWidth: 560, marginBottom: 20 }}>
        <div className="card-title">Privacy & Data</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['💾', 'Trade Data', 'All trades, check-ins, and journal entries are stored locally in your browser\'s localStorage. Nothing is sent to any server.'],
            ['🧠', 'AI Mentor', 'The Mentor is fully rule-based and runs entirely in your browser. It reads your local account data to generate responses. No external API calls are made.'],
            ['💬', 'Chat History', 'Mentor conversations are stored locally per account. You can clear them from the Mentor page at any time.'],
            ['🔒', 'No Accounts', 'TradeOS has no user accounts, no login, and no cloud sync. Your data is yours and stays on your device.'],
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

      {/* Danger zone */}
      <div className="card" style={{ maxWidth: 560, borderColor: 'var(--red-dim)' }}>
        <div className="card-title" style={{ color: 'var(--red)' }}>Danger Zone</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
          Permanently delete all TradeOS data from this browser — accounts, trades, check-ins, journal entries, and chat history. This cannot be undone.
        </p>

        {cleared ? (
          <div className="alert alert-green">All data cleared. Reloading...</div>
        ) : confirmClear ? (
          <div>
            <div className="alert alert-red" style={{ marginBottom: 14 }}>
              <strong>Are you absolutely sure?</strong> This will delete everything. There is no undo.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleClearAllData}>
                Yes, Delete Everything
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            className="btn btn-ghost"
            style={{ borderColor: 'var(--red-dim)', color: 'var(--red)' }}
            onClick={() => setConfirmClear(true)}
          >
            Clear All Data
          </button>
        )}
      </div>
    </div>
  );
}
