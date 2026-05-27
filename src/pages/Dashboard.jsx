import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../AccountContext';
import {
  today, getCheckinForDate, getTradesForDate,
  getDailyPnL, getDailyZone, getDailyViolations,
  getCleanStreakDays, getAccountStats, getCalendarData,
  getViolationBreakdown, getAccountCurrentBalance, formatDate, fmtMoney,
} from '../store';

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="progress-bar" style={{ marginTop: 8 }}>
      <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function CalendarHeatmap({ accountId }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const data = getCalendarData(accountId, year, month);
  const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, dateStr, ...data[dateStr] });
  }

  function cellColor(cell) {
    if (!cell || !cell.trades) return 'var(--surface2)';
    if (cell.pnl > 0) return `rgba(34,197,94,${Math.min(0.9, 0.3 + cell.pnl / 50)})`;
    if (cell.pnl < 0) return `rgba(239,68,68,${Math.min(0.9, 0.3 + Math.abs(cell.pnl) / 50)})`;
    return 'rgba(59,130,246,0.4)';
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="card-title" style={{ marginBottom: 0 }}>P&L Calendar</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, minWidth: 130, textAlign: 'center' }}>{monthName}</span>
          <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>{d}</div>
        ))}
      </div>

      <div className="heatmap-grid">
        {cells.map((cell, i) => (
          <div key={i} className="heatmap-cell"
            style={{ background: cell ? cellColor(cell) : 'transparent', minHeight: 36, borderRadius: 4 }}>
            {cell && (
              <>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '4px 0 0 5px', fontWeight: 600 }}>{cell.day}</div>
                {cell.trades > 0 && (
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', padding: '0 0 0 5px' }}>
                    {cell.pnl >= 0 ? '+' : ''}${cell.pnl?.toFixed(0)}
                  </div>
                )}
                <div className="heatmap-tooltip">
                  {formatDate(cell.dateStr)}<br />
                  {cell.trades ? `${cell.trades} trade${cell.trades > 1 ? 's' : ''} · P&L: ${cell.pnl >= 0 ? '+' : ''}${fmtMoney(cell.pnl)}` : 'No trades'}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-muted)' }}>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(34,197,94,0.6)', borderRadius: 2, marginRight: 4 }} />Profit</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(239,68,68,0.6)', borderRadius: 2, marginRight: 4 }} />Loss</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'rgba(59,130,246,0.4)', borderRadius: 2, marginRight: 4 }} />Breakeven</span>
        <span><span style={{ display: 'inline-block', width: 10, height: 10, background: 'var(--surface2)', borderRadius: 2, marginRight: 4 }} />No trade</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeAccount, meta } = useAccount();
  const dateStr = today();

  if (!activeAccount || !meta) {
    return (
      <div style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Welcome to TradeOS</h2>
        <div className="alert alert-blue" style={{ marginBottom: 16 }}>
          Set up your first account to get started.
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/accounts')}>
          Set Up Account →
        </button>
      </div>
    );
  }

  const checkin = getCheckinForDate(activeAccount.id, dateStr);
  const dailyPnL = getDailyPnL(activeAccount.id, dateStr);
  const zone = getDailyZone(dailyPnL, meta);
  const violations = getDailyViolations(activeAccount.id, dateStr);
  const streak = getCleanStreakDays(activeAccount.id);
  const stats = getAccountStats(activeAccount.id);
  const todayTrades = getTradesForDate(activeAccount.id, dateStr);
  const violBreakdown = getViolationBreakdown(activeAccount.id);

  // currentBalance is always live: startingBalance + sum of all trade P&L
  const currentBalance = getAccountCurrentBalance(activeAccount.id);
  const distanceFromFloor = currentBalance - meta.accountFloor;
  // Phase 1 progress = profit above starting balance only (0 while in drawdown)
  const phase1Progress = Math.max(0, currentBalance - activeAccount.startingBalance);
  const floorPct = meta.realCapital > 0
    ? Math.min(100, (distanceFromFloor / meta.realCapital) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2>Dashboard</h2>
            <p>{formatDate(dateStr)} · {activeAccount.name}</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {!checkin && (
              <button className="btn btn-danger btn-sm" onClick={() => navigate('/checkin')}>
                ⚠️ Check-In Required
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/new-trade')}>
              + Log Trade
            </button>
          </div>
        </div>
      </div>

      {!checkin && (
        <div className="alert alert-red" style={{ marginBottom: 20 }}>
          <strong>🚫 No check-in today.</strong> Complete your daily check-in before trading.
        </div>
      )}

      {/* ── Account Overview ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Account Overview — {activeAccount.name}</div>
        <div className="grid grid-2" style={{ gap: 24 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Current Balance</span>
              <span style={{ fontWeight: 800, fontSize: 18 }}>{fmtMoney(currentBalance)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>All-time P&L</span>
              <span style={{ fontWeight: 700, color: stats.totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {stats.totalPnL >= 0 ? '+' : ''}{fmtMoney(stats.totalPnL)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Distance from Floor</span>
              <span style={{ fontWeight: 700, color: distanceFromFloor > meta.dailyDrawdown ? 'var(--green)' : distanceFromFloor > 0 ? 'var(--amber)' : 'var(--red)' }}>
                {fmtMoney(distanceFromFloor)}
              </span>
            </div>
            <ProgressBar
              value={distanceFromFloor}
              max={meta.realCapital}
              color={floorPct > 50 ? 'var(--green)' : floorPct > 20 ? 'var(--amber)' : 'var(--red)'}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
              <span>Floor: {fmtMoney(meta.accountFloor)}</span>
              <span>Buffer: {fmtMoney(meta.realCapital)}</span>
            </div>
          </div>

          <div>
            {meta.phase1Target > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Phase 1 Target</span>
                  <span style={{ fontWeight: 700, color: 'var(--accent)' }}>
                    {fmtMoney(phase1Progress)} / {fmtMoney(meta.phase1Target)}
                  </span>
                </div>
                <ProgressBar value={phase1Progress} max={meta.phase1Target} color="var(--accent)" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, marginBottom: 14 }}>
                  {phase1Progress <= 0
                    ? `Still in drawdown — ${fmtMoney(Math.abs(stats.totalPnL))} below start`
                    : meta.phase1Target - phase1Progress > 0
                      ? `${fmtMoney(meta.phase1Target - phase1Progress)} remaining`
                      : '🎯 Phase 1 complete!'}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Max Risk / Trade</div>
                <div style={{ fontWeight: 800, color: 'var(--accent)' }}>{fmtMoney(meta.maxRiskPerTrade)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Daily Stop</div>
                <div style={{ fontWeight: 800, color: 'var(--amber)' }}>{fmtMoney(-meta.personalDailyStop)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Starting Balance</div>
                <div style={{ fontWeight: 800 }}>{fmtMoney(activeAccount.startingBalance)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Today's Summary ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Today's Summary</div>
          <span className={`badge badge-${zone}`}>
            <span className="zone-dot" style={{ background: zone === 'green' ? 'var(--green)' : zone === 'amber' ? 'var(--amber)' : 'var(--red)' }} />
            {zone.toUpperCase()} ZONE
          </span>
        </div>

        <div className="grid grid-4">
          <div>
            <div className="stat-label">Trades</div>
            <div className="stat-value">{todayTrades.length}</div>
          </div>
          <div>
            <div className="stat-label">P&L</div>
            <div className="stat-value" style={{ color: dailyPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {dailyPnL >= 0 ? '+' : ''}{fmtMoney(dailyPnL)}
            </div>
          </div>
          <div>
            <div className="stat-label">Violations</div>
            <div className="stat-value" style={{ color: violations.length > 0 ? 'var(--red)' : 'var(--green)' }}>
              {violations.length}
            </div>
          </div>
          <div>
            <div className="stat-label">Clean Streak</div>
            <div className="stat-value" style={{ color: 'var(--accent)' }}>{streak}d</div>
          </div>
        </div>

        {/* Zone reference */}
        <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12 }}>
            <span className="zone-dot" style={{ background: 'var(--green)', width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />
            Green ≥ {fmtMoney(meta.greenLimit)}
          </span>
          <span style={{ fontSize: 12 }}>
            <span className="zone-dot" style={{ background: 'var(--amber)', width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />
            Amber ≥ {fmtMoney(meta.amberLimit)}
          </span>
          <span style={{ fontSize: 12 }}>
            <span className="zone-dot" style={{ background: 'var(--red)', width: 8, height: 8, borderRadius: '50%', display: 'inline-block', marginRight: 4 }} />
            Red &lt; {fmtMoney(meta.amberLimit)}
          </span>
        </div>

        {violations.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Today's Violations</div>
            {violations.map(t => (
              <div key={t.id} style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>{t.pair} {t.direction}</span>
                {t.movedSL && <span className="violation-flag">🚩 Moved SL</span>}
                {t.revengeFlag && <span className="violation-flag">🚩 Revenge</span>}
                {t.oversizedPosition && <span className="violation-flag">🚩 Oversized</span>}
                {t.twoLossRuleBroken && <span className="violation-flag">🚩 2-Loss Rule</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── All-time stats ── */}
      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="stat-label">Total Trades</div>
          <div className="stat-value" style={{ marginTop: 6 }}>{stats.total}</div>
        </div>
        <div className="card">
          <div className="stat-label">Win Rate</div>
          <div className="stat-value" style={{ marginTop: 6, color: stats.winRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
            {stats.winRate}%
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Avg R:R</div>
          <div className="stat-value" style={{ marginTop: 6, color: 'var(--accent)' }}>{stats.avgRR}</div>
        </div>
        <div className="card">
          <div className="stat-label">Violation Streak</div>
          <div className="stat-value" style={{ marginTop: 6, color: stats.maxViolStreak > 0 ? 'var(--red)' : 'var(--green)' }}>
            {stats.maxViolStreak}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>consecutive days</div>
        </div>
      </div>

      {/* ── Violation breakdown ── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>All-Time Violation Breakdown</div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Total: <strong style={{ color: violBreakdown.total > 0 ? 'var(--red)' : 'var(--green)' }}>{violBreakdown.total}</strong>
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Punishments done: <strong style={{ color: 'var(--green)' }}>{violBreakdown.punishmentsCompleted}</strong>
            </span>
          </div>
        </div>
        <div className="grid grid-4">
          {[
            ['Oversized Position', violBreakdown.oversized, '⚠️'],
            ['Moved Stop Loss',    violBreakdown.movedSL,   '🔒'],
            ['Revenge Trade',      violBreakdown.revenge,   '😤'],
            ['2-Loss Rule Broken', violBreakdown.twoLoss,   '✋'],
          ].map(([label, count, icon]) => (
            <div key={label} style={{
              padding: '14px 16px',
              background: count > 0 ? 'rgba(239,68,68,0.06)' : 'var(--surface2)',
              border: `1px solid ${count > 0 ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: count > 0 ? 'var(--red)' : 'var(--text-muted)', lineHeight: 1 }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
        {violBreakdown.total > 0 && violBreakdown.punishmentsCompleted < violBreakdown.total && (
          <div className="alert alert-amber" style={{ marginTop: 14 }}>
            ⏳ {violBreakdown.total - violBreakdown.punishmentsCompleted} punishment{violBreakdown.total - violBreakdown.punishmentsCompleted !== 1 ? 's' : ''} pending — check the Trade Log.
          </div>
        )}
        {violBreakdown.total > 0 && violBreakdown.punishmentsCompleted === violBreakdown.total && (
          <div className="alert alert-green" style={{ marginTop: 14 }}>
            ✓ All {violBreakdown.total} violation{violBreakdown.total !== 1 ? 's' : ''} have been acknowledged.
          </div>
        )}
      </div>

      {/* ── Calendar ── */}
      <CalendarHeatmap accountId={activeAccount.id} />
    </div>
  );
}
