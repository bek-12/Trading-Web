// ─── store.js ─────────────────────────────────────────────────────────────────
// Pure computation helpers + localStorage only for non-sensitive preferences.
// All actual data (trades, checkins, accounts, journal) now lives in the DB
// and is fetched via API hooks in AccountContext.
//
// Pages that still call these functions pass data arrays directly.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Account meta calculations (pure, no I/O) ────────────────────────────────
export function calcAccountMeta(account) {
  if (!account) return null;
  const {
    startingBalance = 0,
    overallDrawdown = 0,
    dailyDrawdown   = 0,
    phase1Target    = 0,
    phase2Target    = 0,
  } = account;

  const accountFloor      = startingBalance - overallDrawdown;
  const realCapital       = overallDrawdown;
  const personalDailyStop = dailyDrawdown * 0.5;
  const maxRiskPerTrade   = realCapital * 0.01;
  const conservativeRisk  = realCapital * 0.005;
  const maxRiskEver       = realCapital * 0.02;
  const greenLimit        = -(dailyDrawdown * 0.10);
  const amberLimit        = -(dailyDrawdown * 0.20);

  return {
    accountFloor, realCapital, personalDailyStop,
    maxRiskPerTrade, conservativeRisk, maxRiskEver,
    greenLimit, amberLimit,
    phase1Target, phase2Target, startingBalance, overallDrawdown, dailyDrawdown,
  };
}

// ─── Zone calculation (pure) ──────────────────────────────────────────────────
export function getDailyZone(pnl, meta) {
  if (!meta) return 'green';
  if (pnl >= meta.greenLimit) return 'green';
  if (pnl >= meta.amberLimit) return 'amber';
  return 'red';
}

// ─── Data helpers — work on in-memory arrays passed from context ──────────────

export function getTradesForDate(trades, dateStr) {
  return (trades || []).filter(t => t.date === dateStr);
}

export function getDailyPnL(trades, dateStr) {
  return getTradesForDate(trades, dateStr).reduce((sum, t) => sum + (t.pnl || 0), 0);
}

export function getDailyViolations(trades, dateStr) {
  return getTradesForDate(trades, dateStr)
    .filter(t => t.movedSL || t.revengeFlag || t.oversizedPosition || t.twoLossRuleBroken);
}

export function getCheckinForDate(checkins, dateStr) {
  return (checkins || []).find(c => c.date === dateStr) || null;
}

export function getAccountCurrentBalance(account, trades) {
  if (!account) return 0;
  const totalPnL = (trades || []).reduce((sum, t) => sum + (t.pnl || 0), 0);
  return account.startingBalance + totalPnL;
}

export function getCleanStreakDays(trades) {
  if (!trades || !trades.length) return 0;
  const dates = [...new Set(trades.map(t => t.date))].sort().reverse();
  let streak = 0;
  for (const date of dates) {
    if (getDailyViolations(trades, date).length === 0) streak++;
    else break;
  }
  return streak;
}

export function getAccountStats(trades) {
  const t = trades || [];
  const total   = t.length;
  const wins    = t.filter(x => x.result === 'Win').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const rrValues = t
    .filter(x => x.entry && x.stopLoss && x.takeProfit)
    .map(x => {
      const risk   = Math.abs(x.entry - x.stopLoss);
      const reward = Math.abs(x.takeProfit - x.entry);
      return risk > 0 ? reward / risk : 0;
    })
    .filter(r => r > 0);

  const avgRR    = rrValues.length > 0
    ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(2) : '—';
  const totalPnL = t.reduce((sum, x) => sum + (x.pnl || 0), 0);

  const dates = [...new Set(t.map(x => x.date))].sort();
  let maxViolStreak = 0, curViolStreak = 0;
  for (const date of dates) {
    if (getDailyViolations(t, date).length > 0) {
      curViolStreak++;
      maxViolStreak = Math.max(maxViolStreak, curViolStreak);
    } else {
      curViolStreak = 0;
    }
  }

  return { total, wins, winRate, avgRR, totalPnL, maxViolStreak };
}

export function getViolationBreakdown(trades) {
  const t = trades || [];
  const violated = t.filter(x => x.movedSL || x.revengeFlag || x.oversizedPosition || x.twoLossRuleBroken);
  return {
    oversized:            t.filter(x => x.oversizedPosition).length,
    movedSL:              t.filter(x => x.movedSL).length,
    revenge:              t.filter(x => x.revengeFlag).length,
    twoLoss:              t.filter(x => x.twoLossRuleBroken).length,
    total:                violated.length,
    punishmentsCompleted: t.filter(x => x.punishmentCompleted).length,
  };
}

export function getCalendarData(trades, year, month) {
  const result = {};
  (trades || []).forEach(t => {
    if (!t.date) return;
    const d = new Date(t.date + 'T00:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      if (!result[t.date]) result[t.date] = { pnl: 0, trades: 0 };
      result[t.date].pnl    += t.pnl || 0;
      result[t.date].trades += 1;
    }
  });
  return result;
}

// ─── Mentor chat — still localStorage (non-sensitive UI state) ───────────────
export function getMentorChatForAccount(accountId) {
  try {
    const all = JSON.parse(localStorage.getItem('tradeos_mentor_chats') || '{}');
    return all[accountId] || [];
  } catch { return []; }
}

export function saveMentorChat(accountId, messages) {
  try {
    const all = JSON.parse(localStorage.getItem('tradeos_mentor_chats') || '{}');
    all[accountId] = messages;
    localStorage.setItem('tradeos_mentor_chats', JSON.stringify(all));
  } catch {}
}

export function clearMentorChat(accountId) {
  try {
    const all = JSON.parse(localStorage.getItem('tradeos_mentor_chats') || '{}');
    delete all[accountId];
    localStorage.setItem('tradeos_mentor_chats', JSON.stringify(all));
  } catch {}
}

// ─── Utilities ────────────────────────────────────────────────────────────────
export function today() {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function fmtMoney(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getAppSettings() {
  try { return JSON.parse(localStorage.getItem('tradeos_settings') || '{}'); } catch { return {}; }
}
