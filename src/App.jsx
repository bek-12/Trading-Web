import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { AccountProvider, useAccount } from './AccountContext';
import { useAuth } from './hooks/useAuth';
import Dashboard from './pages/Dashboard';
import TradeLog from './pages/TradeLog';
import Journal from './pages/Journal';
import Rules from './pages/Rules';
import CheckIn from './pages/CheckIn';
import NewTrade from './pages/NewTrade';
import Accounts from './pages/Accounts';
import Mentor from './pages/Mentor';
import Settings from './pages/Settings';
import Login from './pages/Login';

// ─── Account Switcher ─────────────────────────────────────────────────────────
function AccountSwitcher() {
  const { accounts, activeAccount, switchAccount } = useAccount();
  if (accounts.length === 0) return null;
  return (
    <div style={{ padding: '0 12px 16px', borderBottom: '1px solid var(--border)', marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        Active Account
      </div>
      <select
        value={activeAccount?.id || ''}
        onChange={e => switchAccount(e.target.value)}
        style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 6, padding: '7px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
      >
        {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      {activeAccount && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
          {activeAccount.broker && `${activeAccount.broker} · `}{activeAccount.status}
        </div>
      )}
    </div>
  );
}

const NAV_LINKS = [
  { to: '/', end: true, label: 'Dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { to: '/checkin', label: 'Daily Check-In', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg> },
  { to: '/new-trade', label: 'Log Trade', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> },
  { to: '/trades', label: 'Trade Log', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  { to: '/journal', label: 'Journal', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { to: '/accounts', label: 'Accounts', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg> },
  { to: '/mentor', label: 'AI Mentor', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
  { to: '/rules', label: 'Rules', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
];

const SETTINGS_LINK = {
  to: '/settings', label: 'Settings',
  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
};

function SidebarContent({ onNavClick, onLogout, username }) {
  return (
    <>
      <div className="sidebar-logo">
        <h1>Trade<span>OS</span></h1>
        <p>Personal Trading Journal</p>
      </div>
      <AccountSwitcher />
      {NAV_LINKS.map(link => (
        <NavLink key={link.to} to={link.to} end={link.end}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onNavClick}>
          {link.icon}{link.label}
        </NavLink>
      ))}
      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <NavLink to={SETTINGS_LINK.to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={onNavClick}>
          {SETTINGS_LINK.icon}{SETTINGS_LINK.label}
        </NavLink>
        {username && (
          <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>@{username}</span>
            <button onClick={onLogout} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>
              Sign out
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function MobileTopBar({ onHamburger }) {
  const { activeAccount } = useAccount();
  return (
    <div className="mobile-topbar">
      <button className="hamburger-btn" onClick={onHamburger} aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="22" height="22">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>
          Trade<span style={{ color: 'var(--accent)' }}>OS</span>
        </span>
        {activeAccount && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{activeAccount.name}</span>}
      </div>
    </div>
  );
}

function MobileDrawer({ open, onClose, onLogout, username }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <div className={`drawer-overlay ${open ? 'drawer-overlay--open' : ''}`} onClick={onClose} />
      <nav className={`mobile-drawer ${open ? 'mobile-drawer--open' : ''}`}>
        <button className="drawer-close-btn" onClick={onClose} aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <SidebarContent onNavClick={onClose} onLogout={onLogout} username={username} />
      </nav>
    </>
  );
}

function FAB() {
  const navigate = useNavigate();
  const location = useLocation();
  if (location.pathname === '/new-trade') return null;
  return (
    <button className="fab" onClick={() => navigate('/new-trade')} aria-label="Log trade">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  );
}

function AppShell({ user, onLogout }) {
  const { accounts } = useAccount();
  const noAccounts = accounts.length === 0;
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <SidebarContent onLogout={onLogout} username={user?.username} />
      </nav>
      <MobileTopBar onHamburger={() => setDrawerOpen(true)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onLogout={onLogout} username={user?.username} />
      <main className="main-content">
        <Routes>
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/settings" element={<Settings onLogout={onLogout} />} />
          <Route path="/mentor" element={<Mentor />} />
          <Route path="/" element={noAccounts ? <OnboardingPrompt /> : <Dashboard />} />
          <Route path="/checkin" element={noAccounts ? <OnboardingPrompt /> : <CheckIn />} />
          <Route path="/new-trade" element={noAccounts ? <OnboardingPrompt /> : <NewTrade />} />
          <Route path="/trades" element={noAccounts ? <OnboardingPrompt /> : <TradeLog />} />
          <Route path="/journal" element={noAccounts ? <OnboardingPrompt /> : <Journal />} />
        </Routes>
      </main>
      <FAB />
    </div>
  );
}

function OnboardingPrompt() {
  const navigate = useNavigate();
  return (
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Welcome to TradeOS 👋</h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
          Set up your first trading account to get started.
        </p>
      </div>
      <div className="alert alert-blue" style={{ marginBottom: 24 }}>
        📋 Create an account to get started. We'll pre-fill it with example values.
      </div>
      <button className="btn btn-primary" onClick={() => navigate('/accounts')}>
        Set Up My First Account →
      </button>
    </div>
  );
}

export default function App() {
  const { user, login, register, logout } = useAuth();

  async function handleAuth(mode, username, password) {
    if (mode === 'login') {
      const u = await login(username, password);
      if (!u) throw new Error('Invalid username or password');
    } else {
      const u = await register(username, password);
      if (!u) throw new Error('Registration failed');
    }
  }

  if (!user) {
    return (
      <BrowserRouter>
        <Login onAuth={handleAuth} />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AccountProvider user={user}>
        <AppShell user={user} onLogout={logout} />
      </AccountProvider>
    </BrowserRouter>
  );
}
