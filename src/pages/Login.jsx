import { useState } from 'react';

export default function Login({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onAuth(mode, username.trim(), password);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px' }}>
            Trade<span style={{ color: 'var(--accent)' }}>OS</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 6, fontSize: 14 }}>
            Personal Trading Journal
          </p>
        </div>

        <div className="card">
          {/* Tab switcher */}
          <div style={{ display: 'flex', marginBottom: 24, background: 'var(--surface2)', borderRadius: 8, padding: 4 }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '8px', borderRadius: 6, fontWeight: 700,
                  fontSize: 13, border: 'none', cursor: 'pointer',
                  background: mode === m ? 'var(--accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                placeholder="your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                minLength={3}
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder={mode === 'register' ? 'min 6 characters' : 'your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="alert alert-red" style={{ marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading
                ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
                : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
          Your data is stored securely in the cloud and syncs across all your devices.
        </p>
      </div>
    </div>
  );
}
