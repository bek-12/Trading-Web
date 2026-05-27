import { useState } from 'react';
import { useAccount } from '../AccountContext';
import { getTradesByAccount, formatDate, fmtMoney } from '../store';

const VIOLATION_LABELS = {
  oversizedPosition:  { label: 'Oversized Position', short: 'OVERSIZE' },
  movedSL:            { label: 'Moved Stop Loss',    short: 'MOVED SL' },
  revengeFlag:        { label: 'Revenge Trade',      short: 'REVENGE'  },
  twoLossRuleBroken:  { label: '2-Loss Rule Broken', short: '2-LOSS'   },
};

function getViolationTypes(trade) {
  const types = [];
  if (trade.twoLossRuleBroken)  types.push('twoLossRuleBroken');
  if (trade.oversizedPosition)  types.push('oversizedPosition');
  if (trade.movedSL)            types.push('movedSL');
  if (trade.revengeFlag)        types.push('revengeFlag');
  return types;
}

function ViolationDetail({ trade }) {
  const [expanded, setExpanded] = useState(false);
  const types = getViolationTypes(trade);
  if (types.length === 0) return null;

  const hasPunishment = trade.punishmentCompleted && trade.punishmentRecord;

  return (
    <div style={{
      background: 'rgba(239,68,68,0.06)',
      border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 6,
      padding: '10px 14px',
      marginTop: 8,
    }}>
      {/* Violation badges */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {types.map(type => (
          <span key={type} className="violation-flag">
            🚩 {VIOLATION_LABELS[type]?.label || type}
          </span>
        ))}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700,
          background: hasPunishment ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
          border: `1px solid ${hasPunishment ? 'rgba(34,197,94,0.4)' : 'rgba(245,158,11,0.4)'}`,
          color: hasPunishment ? 'var(--green)' : 'var(--amber)',
        }}>
          {hasPunishment ? '✓ Punishment completed' : '⏳ Punishment pending'}
        </span>
      </div>

      {/* Expand punishment text */}
      {hasPunishment && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 11, padding: '3px 8px' }}
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? '▲ Hide response' : '▼ View punishment response'}
        </button>
      )}

      {expanded && hasPunishment && (
        <div style={{
          marginTop: 10, padding: '10px 12px',
          background: 'var(--surface2)', borderRadius: 6,
          fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.7,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          borderLeft: '3px solid var(--green)',
        }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Punishment Response — {new Date(trade.punishmentRecord.completedAt).toLocaleString()}
          </div>
          {trade.punishmentRecord.punishmentText}
        </div>
      )}
    </div>
  );
}

export default function TradeLog() {
  const { activeAccount } = useAccount();

  if (!activeAccount) {
    return <div className="alert alert-red">No account selected.</div>;
  }

  const allTrades = getTradesByAccount(activeAccount.id)
    .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  const [filterDate, setFilterDate] = useState('');
  const [filterResult, setFilterResult] = useState('');
  const [filterViolation, setFilterViolation] = useState('');
  const [search, setSearch] = useState('');
  const [expandedRows, setExpandedRows] = useState({});

  function toggleRow(id) {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  }

  const filtered = allTrades.filter(t => {
    if (filterDate && t.date !== filterDate) return false;
    if (filterResult && t.result !== filterResult) return false;
    if (filterViolation === 'moved_sl'   && !t.movedSL)           return false;
    if (filterViolation === 'revenge'    && !t.revengeFlag)        return false;
    if (filterViolation === 'oversized'  && !t.oversizedPosition)  return false;
    if (filterViolation === 'two_loss'   && !t.twoLossRuleBroken)  return false;
    if (filterViolation === 'any'        && !t.hasViolation && !t.movedSL && !t.revengeFlag && !t.oversizedPosition && !t.twoLossRuleBroken) return false;
    if (filterViolation === 'pending'    && (t.punishmentCompleted || !t.hasViolation)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.pair?.toLowerCase().includes(q) && !t.notes?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPnL = filtered.reduce((s, t) => s + (t.pnl || 0), 0);
  const wins = filtered.filter(t => t.result === 'Win').length;
  const winRate = filtered.length > 0 ? Math.round((wins / filtered.length) * 100) : 0;
  const violationCount = filtered.filter(t => t.hasViolation || t.movedSL || t.revengeFlag || t.oversizedPosition || t.twoLossRuleBroken).length;

  return (
    <div>
      <div className="page-header">
        <h2>Trade Log</h2>
        <p>{activeAccount.name} — violations are permanently flagged and cannot be deleted</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label>Search</label>
            <input type="text" placeholder="Pair or notes..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label>Date</label>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          <div>
            <label>Result</label>
            <select value={filterResult} onChange={e => setFilterResult(e.target.value)}>
              <option value="">All Results</option>
              <option value="Win">Win</option>
              <option value="Loss">Loss</option>
              <option value="Breakeven">Breakeven</option>
            </select>
          </div>
          <div>
            <label>Violations</label>
            <select value={filterViolation} onChange={e => setFilterViolation(e.target.value)}>
              <option value="">All Trades</option>
              <option value="any">Any Violation</option>
              <option value="pending">Punishment Pending</option>
              <option value="oversized">Oversized Position</option>
              <option value="moved_sl">Moved Stop Loss</option>
              <option value="revenge">Revenge Trade</option>
              <option value="two_loss">2-Loss Rule Broken</option>
            </select>
          </div>
        </div>
        {(filterDate || filterResult || filterViolation || search) && (
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}
            onClick={() => { setFilterDate(''); setFilterResult(''); setFilterViolation(''); setSearch(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['Showing', filtered.length, null],
          ['P&L', (totalPnL >= 0 ? '+' : '') + fmtMoney(totalPnL), totalPnL >= 0 ? 'var(--green)' : 'var(--red)'],
          ['Win Rate', `${winRate}%`, winRate >= 50 ? 'var(--green)' : 'var(--red)'],
          ['Violations', violationCount, violationCount > 0 ? 'var(--red)' : 'var(--green)'],
        ].map(([label, value, color]) => (
          <div key={label} className="card" style={{ padding: '12px 20px', flex: 1, minWidth: 110 }}>
            <div className="stat-label">{label}</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: color || 'var(--text)', marginTop: 4 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="card table-desktop">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            No trades found.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Pair</th><th>Dir</th><th>Entry</th>
                  <th>SL 🔒</th><th>TP</th><th>Risk</th><th>P&L</th>
                  <th>Result</th><th>Violations</th><th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const violTypes = getViolationTypes(t);
                  const hasViol = violTypes.length > 0;
                  const isExpanded = expandedRows[t.id];
                  return (
                    <>
                      <tr key={t.id}
                        style={{ background: hasViol ? 'rgba(239,68,68,0.04)' : undefined, cursor: hasViol ? 'pointer' : 'default' }}
                        onClick={() => hasViol && toggleRow(t.id)}
                      >
                        <td style={{ whiteSpace: 'nowrap' }}>{formatDate(t.date)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--text)' }}>{t.pair}</td>
                        <td><span style={{ color: t.direction === 'Buy' ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{t.direction === 'Buy' ? '↑' : '↓'} {t.direction}</span></td>
                        <td>{t.entry}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{t.stopLoss}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{t.takeProfit || '—'}</td>
                        <td style={{ color: hasViol && t.oversizedPosition ? 'var(--red)' : undefined, fontWeight: t.oversizedPosition ? 700 : 400 }}>
                          {fmtMoney(t.riskAmount)}{t.oversizedPosition && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠️</span>}
                        </td>
                        <td style={{ fontWeight: 700, color: (t.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {(t.pnl || 0) >= 0 ? '+' : ''}{fmtMoney(t.pnl || 0)}
                        </td>
                        <td><span className={`badge badge-${t.result === 'Win' ? 'green' : t.result === 'Loss' ? 'red' : 'blue'}`}>{t.result}</span></td>
                        <td>
                          {hasViol ? (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                              {violTypes.map(type => <span key={type} className="violation-flag" style={{ fontSize: 10 }}>🚩 {VIOLATION_LABELS[type]?.short}</span>)}
                              <span style={{ fontSize: 10, color: t.punishmentCompleted ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>{t.punishmentCompleted ? '✓' : '⏳'}</span>
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{isExpanded ? '▲' : '▼'}</span>
                            </div>
                          ) : <span style={{ color: 'var(--green)', fontSize: 12 }}>✓ Clean</span>}
                        </td>
                        <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>{t.notes || '—'}</td>
                      </tr>
                      {hasViol && isExpanded && (
                        <tr key={`${t.id}-detail`}>
                          <td colSpan={11} style={{ padding: '0 12px 12px', background: 'rgba(239,68,68,0.03)' }}>
                            <ViolationDetail trade={t} />
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile card list */}
      <div className="table-mobile">
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>No trades found.</div>
        ) : (
          filtered.map(t => {
            const violTypes = getViolationTypes(t);
            const hasViol = violTypes.length > 0;
            const isExpanded = expandedRows[t.id];
            return (
              <div key={t.id}
                className={`trade-card ${hasViol ? 'trade-card--violation' : ''}`}
                onClick={() => hasViol && toggleRow(t.id)}
              >
                {/* Row 1: pair + direction + result + P&L */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{t.pair}</span>
                    <span style={{ color: t.direction === 'Buy' ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 13 }}>
                      {t.direction === 'Buy' ? '↑' : '↓'} {t.direction}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 16, color: (t.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {(t.pnl || 0) >= 0 ? '+' : ''}{fmtMoney(t.pnl || 0)}
                    </span>
                    <span className={`badge badge-${t.result === 'Win' ? 'green' : t.result === 'Loss' ? 'red' : 'blue'}`}>{t.result}</span>
                  </div>
                </div>
                {/* Row 2: date + risk */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: hasViol || t.notes ? 8 : 0 }}>
                  <span>{formatDate(t.date)}</span>
                  <span>Risk: <strong style={{ color: t.oversizedPosition ? 'var(--red)' : 'var(--text-dim)' }}>{fmtMoney(t.riskAmount)}{t.oversizedPosition ? ' ⚠️' : ''}</strong></span>
                </div>
                {/* Violations */}
                {hasViol && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    {violTypes.map(type => <span key={type} className="violation-flag" style={{ fontSize: 10 }}>🚩 {VIOLATION_LABELS[type]?.short}</span>)}
                    <span style={{ fontSize: 10, color: t.punishmentCompleted ? 'var(--green)' : 'var(--amber)', fontWeight: 700 }}>
                      {t.punishmentCompleted ? '✓ Done' : '⏳ Pending'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{isExpanded ? '▲ hide' : '▼ details'}</span>
                  </div>
                )}
                {/* Notes */}
                {t.notes && !isExpanded && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes}</div>
                )}
                {/* Expanded violation detail */}
                {hasViol && isExpanded && <ViolationDetail trade={t} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
