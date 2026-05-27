import { useState } from 'react';
import {
  getAccounts, saveAccount, deleteAccount,
  calcAccountMeta, generateId, fmtMoney,
  setActiveAccountId, getActiveAccountId,
  getAccountCurrentBalance,
} from '../store';
import { useAccount } from '../AccountContext';

const STATUS_OPTIONS = ['Active', 'Phase 1', 'Phase 2', 'Funded', 'Blown'];

const EMPTY_FORM = {
  name: '',
  broker: '',
  startingBalance: '',
  overallDrawdown: '',
  dailyDrawdown: '',
  phase1Target: '',
  phase2Target: '',
  status: 'Phase 1',
  notes: '',
};

const EXAMPLE_PREFILL = {
  name: 'FundedNext 6K Phase 1',
  broker: 'FundedNext',
  startingBalance: '6000',
  overallDrawdown: '600',
  dailyDrawdown: '300',
  phase1Target: '480',
  phase2Target: '250',
  status: 'Phase 1',
  notes: '',
};

function MetaRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || 'var(--text)' }}>{value}</span>
    </div>
  );
}

function AccountForm({ initial, onSave, onCancel, isFirst }) {
  const [form, setForm] = useState(initial || (isFirst ? EXAMPLE_PREFILL : EMPTY_FORM));

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const account = {
      id: initial?.id || generateId(),
      name: form.name.trim(),
      broker: form.broker.trim(),
      startingBalance: parseFloat(form.startingBalance) || 0,
      overallDrawdown: parseFloat(form.overallDrawdown) || 0,
      dailyDrawdown: parseFloat(form.dailyDrawdown) || 0,
      phase1Target: parseFloat(form.phase1Target) || 0,
      phase2Target: parseFloat(form.phase2Target) || 0,
      status: form.status,
      notes: form.notes.trim(),
      createdAt: initial?.createdAt || new Date().toISOString(),
    };
    saveAccount(account);
    onSave(account);
  }

  // Live preview of calculated values
  const preview = calcAccountMeta({
    startingBalance: parseFloat(form.startingBalance) || 0,
    overallDrawdown: parseFloat(form.overallDrawdown) || 0,
    dailyDrawdown: parseFloat(form.dailyDrawdown) || 0,
    phase1Target: parseFloat(form.phase1Target) || 0,
    phase2Target: parseFloat(form.phase2Target) || 0,
  });

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row form-row-2" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Account Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. FundedNext 6K Phase 1" required />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Broker / Firm</label>
          <input value={form.broker} onChange={e => set('broker', e.target.value)}
            placeholder="e.g. FundedNext" />
        </div>
      </div>

      <div className="form-row form-row-2" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Starting Balance ($) *</label>
          <input type="number" step="0.01" value={form.startingBalance}
            onChange={e => set('startingBalance', e.target.value)} placeholder="6000" required />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Current Balance</label>
          <div style={{
            padding: '8px 12px', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 6,
            fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5,
          }}>
            Auto-calculated from trade P&L
          </div>
        </div>
      </div>

      <div className="form-row form-row-2" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Overall Drawdown Limit ($) *</label>
          <input type="number" step="0.01" value={form.overallDrawdown}
            onChange={e => set('overallDrawdown', e.target.value)} placeholder="600" required />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Daily Drawdown Limit ($) *</label>
          <input type="number" step="0.01" value={form.dailyDrawdown}
            onChange={e => set('dailyDrawdown', e.target.value)} placeholder="300" required />
        </div>
      </div>

      <div className="form-row form-row-2" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Phase 1 Profit Target ($)</label>
          <input type="number" step="0.01" value={form.phase1Target}
            onChange={e => set('phase1Target', e.target.value)} placeholder="480" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Phase 2 Profit Target ($)</label>
          <input type="number" step="0.01" value={form.phase2Target}
            onChange={e => set('phase2Target', e.target.value)} placeholder="250" />
        </div>
      </div>

      <div className="form-row form-row-2" style={{ marginBottom: 14 }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Account Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Notes</label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Any notes about this account..." style={{ minHeight: 60 }} />
      </div>

      {/* Live calculated preview */}
      {(form.overallDrawdown || form.dailyDrawdown) && (
        <div className="card" style={{ background: 'var(--surface2)', marginBottom: 16, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Auto-Calculated Values
          </div>
          <MetaRow label="Account Floor" value={fmtMoney(preview.accountFloor)} color="var(--red)" />
          <MetaRow label="Real Capital (drawdown buffer)" value={fmtMoney(preview.realCapital)} color="var(--accent)" />
          <MetaRow label="Personal Daily Stop (50% of daily limit)" value={fmtMoney(preview.personalDailyStop)} color="var(--amber)" />
          <MetaRow label="Max Risk Per Trade (1%)" value={fmtMoney(preview.maxRiskPerTrade)} color="var(--green)" />
          <MetaRow label="Conservative Risk (0.5%)" value={fmtMoney(preview.conservativeRisk)} color="var(--green)" />
          <MetaRow label="Max Risk Ever (2%)" value={fmtMoney(preview.maxRiskEver)} color="var(--amber)" />
          <MetaRow label="Green Zone limit" value={`≥ ${fmtMoney(preview.greenLimit)}`} color="var(--green)" />
          <MetaRow label="Amber Zone limit" value={`≥ ${fmtMoney(preview.amberLimit)}`} color="var(--amber)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Red Zone</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>
              &lt; {fmtMoney(preview.amberLimit)}
            </span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
          {initial ? 'Save Changes' : 'Create Account'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function StatusBadge({ status }) {
  const map = {
    'Active':  'badge-green',
    'Phase 1': 'badge-blue',
    'Phase 2': 'badge-blue',
    'Funded':  'badge-green',
    'Blown':   'badge-red',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

export default function Accounts() {
  const { accounts, activeAccount, meta, switchAccount, refresh } = useAccount();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const isFirst = accounts.length === 0;

  function handleSaved(account) {
    // Auto-activate if first account
    if (accounts.length === 0 || !getActiveAccountId()) {
      setActiveAccountId(account.id);
    }
    refresh();
    setShowForm(false);
    setEditingAccount(null);
  }

  function handleDelete(id) {
    deleteAccount(id);
    // If we deleted the active account, switch to first remaining
    const remaining = getAccounts();
    if (remaining.length > 0) {
      setActiveAccountId(remaining[0].id);
    }
    refresh();
    setConfirmDelete(null);
  }

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>Accounts</h2>
            <p>Manage your trading accounts. Each account has its own data.</p>
          </div>
          {!showForm && !editingAccount && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>
              + Add Account
            </button>
          )}
        </div>
      </div>

      {/* New account form */}
      {(showForm || isFirst) && !editingAccount && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 640 }}>
          <div className="card-title">
            {isFirst ? '👋 Create Your First Account' : 'New Account'}
          </div>
          {isFirst && (
            <div className="alert alert-blue" style={{ marginBottom: 16 }}>
              Pre-filled with example values — adjust them to match your actual account.
            </div>
          )}
          <AccountForm
            isFirst={isFirst}
            onSave={handleSaved}
            onCancel={isFirst ? null : () => setShowForm(false)}
          />
        </div>
      )}

      {/* Edit form */}
      {editingAccount && (
        <div className="card" style={{ marginBottom: 20, maxWidth: 640 }}>
          <div className="card-title">Edit Account</div>
          <AccountForm
            initial={editingAccount}
            onSave={handleSaved}
            onCancel={() => setEditingAccount(null)}
          />
        </div>
      )}

      {/* Account list */}
      {accounts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {accounts.map(acc => {
            const m = calcAccountMeta(acc);
            const isActive = activeAccount?.id === acc.id;
            const liveBalance = getAccountCurrentBalance(acc.id);
            const phase1Progress = Math.max(0, liveBalance - acc.startingBalance);
            const phase1Pct = m.phase1Target > 0 ? Math.min(100, (phase1Progress / m.phase1Target) * 100) : 0;
            const distanceFromFloor = liveBalance - m.accountFloor;

            return (
              <div
                key={acc.id}
                className="card"
                style={{
                  borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                  borderWidth: isActive ? 2 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800 }}>{acc.name}</h3>
                      <StatusBadge status={acc.status} />
                      {isActive && <span className="badge badge-blue">● ACTIVE</span>}
                    </div>
                    {acc.broker && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{acc.broker}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!isActive && (
                      <button className="btn btn-primary btn-sm" onClick={() => switchAccount(acc.id)}>
                        Switch to this
                      </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingAccount(acc); setShowForm(false); }}>
                      Edit
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', borderColor: 'var(--red-dim)' }}
                      onClick={() => setConfirmDelete(acc.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                {/* Key numbers */}
                <div className="grid grid-4" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="stat-label">Current Balance</div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtMoney(liveBalance)}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>live from trades</div>
                  </div>
                  <div>
                    <div className="stat-label">Account Floor</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--red)' }}>{fmtMoney(m.accountFloor)}</div>
                  </div>
                  <div>
                    <div className="stat-label">Distance from Floor</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: distanceFromFloor > m.dailyDrawdown ? 'var(--green)' : 'var(--amber)' }}>
                      {fmtMoney(distanceFromFloor)}
                    </div>
                  </div>
                  <div>
                    <div className="stat-label">Max Risk / Trade</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--accent)' }}>{fmtMoney(m.maxRiskPerTrade)}</div>
                  </div>
                </div>

                {/* Phase 1 progress */}
                {m.phase1Target > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Phase 1 Progress</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)' }}>
                        {fmtMoney(Math.max(0, phase1Progress))} / {fmtMoney(m.phase1Target)}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${phase1Pct}%`, background: 'var(--accent)' }} />
                    </div>
                  </div>
                )}

                {/* Risk reference */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Conservative: <strong style={{ color: 'var(--green)' }}>{fmtMoney(m.conservativeRisk)}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Standard: <strong style={{ color: 'var(--green)' }}>{fmtMoney(m.maxRiskPerTrade)}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Max ever: <strong style={{ color: 'var(--amber)' }}>{fmtMoney(m.maxRiskEver)}</strong>
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Daily stop: <strong style={{ color: 'var(--amber)' }}>{fmtMoney(-m.personalDailyStop)}</strong>
                  </span>
                </div>

                {acc.notes && (
                  <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {acc.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-title" style={{ color: 'var(--red)' }}>⚠️ Delete Account?</div>
            <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>
              This will permanently delete the account and <strong>all its trades, check-ins, and journal entries</strong>. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDelete(confirmDelete)}>
                Yes, Delete Everything
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
