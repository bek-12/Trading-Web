// ─── Storage Keys ─────────────────────────────────────────────────────────────
const KEYS = {
  ACCOUNTS:       'tradeos_accounts',
  ACTIVE_ACCOUNT: 'tradeos_active_account',
  TRADES:         'tradeos_trades',
  CHECKINS:       'tradeos_checkins',
  JOURNAL:        'tradeos_journal',
  MENTOR_CHATS:   'tradeos_mentor_chats',
  SETTINGS:       'tradeos_settings',
};

// ─── Generic helpers ──────────────────────────────────────────────────────────
export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export function getAccounts() {
  return load(KEYS.ACCOUNTS, []);
}

export function saveAccount(account) {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  persist(KEYS.ACCOUNTS, accounts);
  return accounts;
}

export function deleteAccount(id) {
  const accounts = getAccounts().filter(a => a.id !== id);
  persist(KEYS.ACCOUNTS, accounts);
  // Clean up linked data
  persist(KEYS.TRADES,   getTrades().filter(t => t.accountId !== id));
  persist(KEYS.CHECKINS, getCheckins().filter(c => c.accountId !== id));
  persist(KEYS.JOURNAL,  getJournalEntries().filter(j => j.accountId !== id));
  return accounts;
}

export function getActiveAccountId() {
  return load(KEYS.ACTIVE_ACCOUNT, null);
}

export function setActiveAccountId(id) {
  persist(KEYS.ACTIVE_ACCOUNT, id);
}

export function getActiveAccount() {
  const id = getActiveAccountId();
  const accounts = getAccounts();
  if (!id) return accounts[0] || null;
  return accounts.find(a => a.id === id) || accounts[0] || null;
}

// ─── Derived account calculations ─────────────────────────────────────────────
// All risk/zone values are computed from the account config — no hardcoding.
export function calcAccountMeta(account) {
  if (!account) return null;
  const {
    startingBalance = 0,
    overallDrawdown = 0,
    dailyDrawdown = 0,
    phase1Target = 0,
    phase2Target = 0,
  } = account;

  const accountFloor      = startingBalance - overallDrawdown;
  const realCapital       = overallDrawdown;                        // the capital you can actually lose
  const personalDailyStop = dailyDrawdown * 0.5;                   // 50% of firm daily limit
  const maxRiskPerTrade   = realCapital * 0.01;                     // 1%
  const conservativeRisk  = realCapital * 0.005;                    // 0.5%
  const maxRiskEver       = realCapital * 0.02;                     // 2%

  // Zone thresholds (based on daily drawdown)
  const greenLimit = -(dailyDrawdown * 0.10);   // 0 to -10%
  const amberLimit = -(dailyDrawdown * 0.20);   // -10% to -20%
  // red = worse than -20%

  return {
    accountFloor,
    realCapital,
    personalDailyStop,
    maxRiskPerTrade,
    conservativeRisk,
    maxRiskEver,
    greenLimit,
    amberLimit,
    phase1Target,
    phase2Target,
    startingBalance,
    overallDrawdown,
    dailyDrawdown,
  };
}

// ─── Trades ───────────────────────────────────────────────────────────────────
export function getTrades() {
  return load(KEYS.TRADES, []);
}

export function getTradesByAccount(accountId) {
  return getTrades().filter(t => t.accountId === accountId);
}

export function saveTrade(trade) {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === trade.id);
  if (idx >= 0) {
    // Stop loss is locked — never overwrite it
    trades[idx] = { ...trade, stopLoss: trades[idx].stopLoss };
  } else {
    trades.push(trade);
  }
  persist(KEYS.TRADES, trades);
  return trades;
}

export function getTradesForDate(accountId, dateStr) {
  return getTradesByAccount(accountId).filter(t => t.date === dateStr);
}

// ─── Check-ins ────────────────────────────────────────────────────────────────
export function getCheckins() {
  return load(KEYS.CHECKINS, []);
}

export function getCheckinsByAccount(accountId) {
  return getCheckins().filter(c => c.accountId === accountId);
}

export function saveCheckin(checkin) {
  const checkins = getCheckins();
  const idx = checkins.findIndex(
    c => c.accountId === checkin.accountId && c.date === checkin.date
  );
  if (idx >= 0) {
    checkins[idx] = checkin;
  } else {
    checkins.push(checkin);
  }
  persist(KEYS.CHECKINS, checkins);
  return checkins;
}

export function getCheckinForDate(accountId, dateStr) {
  return getCheckins().find(
    c => c.accountId === accountId && c.date === dateStr
  ) || null;
}

// ─── Journal ──────────────────────────────────────────────────────────────────
export function getJournalEntries() {
  return load(KEYS.JOURNAL, []);
}

export function getJournalByAccount(accountId) {
  return getJournalEntries().filter(j => j.accountId === accountId);
}

export function saveJournalEntry(entry) {
  const entries = getJournalEntries();
  const idx = entries.findIndex(
    e => e.accountId === entry.accountId && e.date === entry.date
  );
  if (idx >= 0) {
    entries[idx] = entry;
  } else {
    entries.push(entry);
  }
  persist(KEYS.JOURNAL, entries);
  return entries;
}

export function getJournalForDate(accountId, dateStr) {
  return getJournalEntries().find(
    e => e.accountId === accountId && e.date === dateStr
  ) || null;
}

// ─── Live current balance — always computed from trades, never stored ─────────
// currentBalance = startingBalance + sum of all P&L for this account
export function getAccountCurrentBalance(accountId) {
  const account = getAccounts().find(a => a.id === accountId);
  if (!account) return 0;
  const totalPnL = getTradesByAccount(accountId)
    .reduce((sum, t) => sum + (t.pnl || 0), 0);
  return account.startingBalance + totalPnL;
}

// ─── Computed helpers (account-scoped) ────────────────────────────────────────
export function getDailyPnL(accountId, dateStr) {
  return getTradesForDate(accountId, dateStr)
    .reduce((sum, t) => sum + (t.pnl || 0), 0);
}

export function getDailyZone(pnl, meta) {
  if (!meta) return 'green';
  if (pnl >= meta.greenLimit) return 'green';
  if (pnl >= meta.amberLimit) return 'amber';
  return 'red';
}

export function getDailyViolations(accountId, dateStr) {
  return getTradesForDate(accountId, dateStr).filter(t => t.movedSL || t.revengeFlag || t.oversizedPosition || t.twoLossRuleBroken);
}

// ─── Punishment completion — stamps the trade record, never deletes ───────────
export function completePunishment(tradeId, punishmentRecord) {
  const trades = getTrades();
  const idx = trades.findIndex(t => t.id === tradeId);
  if (idx < 0) return;
  trades[idx] = {
    ...trades[idx],
    punishmentCompleted: true,
    punishmentRecord: {
      ...punishmentRecord,
      completedAt: new Date().toISOString(),
    },
  };
  persist(KEYS.TRADES, trades);
}

// ─── Violation breakdown for dashboard ───────────────────────────────────────
export function getViolationBreakdown(accountId) {
  const trades = getTradesByAccount(accountId);
  const violated = trades.filter(t => t.movedSL || t.revengeFlag || t.oversizedPosition || t.twoLossRuleBroken);
  return {
    oversized:       trades.filter(t => t.oversizedPosition).length,
    movedSL:         trades.filter(t => t.movedSL).length,
    revenge:         trades.filter(t => t.revengeFlag).length,
    twoLoss:         trades.filter(t => t.twoLossRuleBroken).length,
    total:           violated.length,
    punishmentsCompleted: trades.filter(t => t.punishmentCompleted).length,
  };
}

export function getCleanStreakDays(accountId) {
  const trades = getTradesByAccount(accountId);
  if (!trades.length) return 0;
  const dates = [...new Set(trades.map(t => t.date))].sort().reverse();
  let streak = 0;
  for (const date of dates) {
    if (getDailyViolations(accountId, date).length === 0) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getAccountStats(accountId) {
  const trades = getTradesByAccount(accountId);
  const total  = trades.length;
  const wins   = trades.filter(t => t.result === 'Win').length;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const rrValues = trades
    .filter(t => t.entry && t.stopLoss && t.takeProfit)
    .map(t => {
      const risk   = Math.abs(t.entry - t.stopLoss);
      const reward = Math.abs(t.takeProfit - t.entry);
      return risk > 0 ? reward / risk : 0;
    })
    .filter(r => r > 0);

  const avgRR = rrValues.length > 0
    ? (rrValues.reduce((a, b) => a + b, 0) / rrValues.length).toFixed(2)
    : '—';

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Biggest violation streak
  const dates = [...new Set(trades.map(t => t.date))].sort();
  let maxViolStreak = 0;
  let curViolStreak = 0;
  for (const date of dates) {
    if (getDailyViolations(accountId, date).length > 0) {
      curViolStreak++;
      maxViolStreak = Math.max(maxViolStreak, curViolStreak);
    } else {
      curViolStreak = 0;
    }
  }

  return { total, wins, winRate, avgRR, totalPnL, maxViolStreak };
}

export function getCalendarData(accountId, year, month) {
  const trades = getTradesByAccount(accountId);
  const result = {};
  trades.forEach(t => {
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

// ─── App Settings ─────────────────────────────────────────────────────────────
export function getAppSettings() {
  return load(KEYS.SETTINGS, {});
}

export function saveAppSettings(settings) {
  persist(KEYS.SETTINGS, settings);
}

// ─── Mentor Chat History ──────────────────────────────────────────────────────
export function getMentorChats() {
  return load(KEYS.MENTOR_CHATS, {});
}

export function getMentorChatForAccount(accountId) {
  return getMentorChats()[accountId] || [];
}

export function saveMentorChat(accountId, messages) {
  const all = getMentorChats();
  all[accountId] = messages;
  persist(KEYS.MENTOR_CHATS, all);
}

export function clearMentorChat(accountId) {
  const all = getMentorChats();
  delete all[accountId];
  persist(KEYS.MENTOR_CHATS, all);
}
