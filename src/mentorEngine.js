// ─── TradeOS Mentor — Rule-Based Response Engine ──────────────────────────────
// Every response injects at least one real data point. No external API.

import { fmtMoney, getAccountCurrentBalance } from './store';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function zoneColor(zone) {
  return zone === 'green' ? '🟢' : zone === 'amber' ? '🟡' : '🔴';
}

function capitalRemaining(account, meta) {
  // Use live balance computed from trades, not the stored field
  const cur = account?.id ? getAccountCurrentBalance(account.id) : (account?.startingBalance || 0);
  return cur - (meta?.accountFloor || 0);
}

function lossesToday(todayTrades) {
  return todayTrades.filter(t => t.result === 'Loss').length;
}

function consecutiveLossesAtEnd(todayTrades) {
  let count = 0;
  for (let i = todayTrades.length - 1; i >= 0; i--) {
    if (todayTrades[i].result === 'Loss') count++;
    else break;
  }
  return count;
}

// ─── QUICK ACTION: Revenge trade ─────────────────────────────────────────────
export function revengeTradeResponse(ctx) {
  const { account, meta, todayTrades, dailyPnL, zone, streak } = ctx;
  const consec = consecutiveLossesAtEnd(todayTrades);
  const capLeft = capitalRemaining(account, meta);

  if (consec >= 2) {
    return {
      type: 'block',
      content: `🚫 STOP. RIGHT NOW.\n\nYou've had ${consec} losses in a row today. You agreed — before you ever opened the platform — that 2 losses means you're done for the day. That rule exists because of what happens next when you break it.\n\nYou've blown 3 accounts. Every single one ended the same way: a loss, then the urge to recover, then a bigger loss, then panic. You're at step 2 right now.\n\nReal capital remaining: ${fmtMoney(capLeft)}\nToday's P&L: ${dailyPnL >= 0 ? '+' : ''}${fmtMoney(dailyPnL)}\n\nClose the platform. Message your mentor. Come back tomorrow.\n\nIs this your setup — or are you trying to recover?`,
    };
  }

  if (dailyPnL < 0) {
    return {
      type: 'warning',
      content: `⚠️ I hear you. And I need you to hear me.\n\nYou're down ${fmtMoney(Math.abs(dailyPnL))} today. That's real. It stings. But here's what's also real: you still have ${fmtMoney(capLeft)} above your floor. That's your account. That's what you're protecting.\n\nThe urge you're feeling right now — that pull to "get it back" — that's not trading. That's gambling. And it's the exact pattern that killed your last 3 accounts.\n\nYou're in the ${zone.toUpperCase()} zone ${zoneColor(zone)}. ${zone === 'green' ? "You're still safe. Don't change that." : zone === 'amber' ? 'You are approaching your daily limit. One more bad trade and you hit red.' : 'You are already in the red zone. Any more trading today is a rule violation.'}\n\nBefore you do anything: close the chart. Step away for 10 minutes. Then ask yourself honestly:\n\nIs this your setup — or are you trying to recover?`,
    };
  }

  // P&L is flat or positive but they still feel the urge
  return {
    type: 'warning',
    content: `You're actually ${dailyPnL > 0 ? `up ${fmtMoney(dailyPnL)}` : 'flat'} today — so what's driving this urge?\n\nSomething is off. Maybe a trade that didn't go your way even if it wasn't a loss. Maybe boredom. Maybe you feel like you "should" be doing more.\n\nNone of those are reasons to trade. Your clean streak is ${streak} day${streak !== 1 ? 's' : ''}. Don't break it chasing a feeling.\n\nReal capital remaining: ${fmtMoney(capLeft)}\n\nIs this your setup — or are you trying to recover?`,
  };
}

// ─── QUICK ACTION: Analyze my day ────────────────────────────────────────────
export function analyzeDayResponse(ctx) {
  const { account, meta, todayTrades, dailyPnL, zone, violations, streak, checkin } = ctx;
  const capLeft = capitalRemaining(account, meta);
  const wins = todayTrades.filter(t => t.result === 'Win').length;
  const losses = todayTrades.filter(t => t.result === 'Loss').length;
  const movedSLTrades = violations.filter(t => t.movedSL);
  const revengeTrades = violations.filter(t => t.revengeFlag);

  let lines = [];

  // Header
  lines.push(`📊 DAY ANALYSIS — ${account?.name || 'Your Account'}`);
  lines.push('');

  // Zone status
  lines.push(`Zone: ${zoneColor(zone)} ${zone.toUpperCase()}`);
  lines.push(`P&L: ${dailyPnL >= 0 ? '+' : ''}${fmtMoney(dailyPnL)}`);
  lines.push(`Trades: ${todayTrades.length} (${wins}W / ${losses}L)`);
  lines.push(`Real capital above floor: ${fmtMoney(capLeft)}`);
  lines.push('');

  // Check-in status
  if (checkin) {
    lines.push(`Check-in: ✅ Completed — "${checkin.moodWord}" (${checkin.mood}/5)`);
  } else {
    lines.push(`Check-in: ❌ Not completed today`);
  }
  lines.push('');

  // Violations
  if (violations.length === 0) {
    lines.push(`Rule violations: ✅ None — clean day`);
  } else {
    lines.push(`Rule violations: 🚩 ${violations.length} flagged`);
    if (movedSLTrades.length > 0) lines.push(`  • Moved stop loss: ${movedSLTrades.length} trade${movedSLTrades.length > 1 ? 's' : ''}`);
    if (revengeTrades.length > 0) lines.push(`  • Revenge trades: ${revengeTrades.length}`);
  }
  lines.push('');

  // Streak
  lines.push(`Clean streak: ${streak} day${streak !== 1 ? 's' : ''} ${streak >= 5 ? '🔥' : streak >= 3 ? '✅' : streak === 0 ? '— reset today' : ''}`);
  lines.push('');

  // Recommendation
  lines.push('─────────────────');
  if (violations.length > 0) {
    lines.push(`⚠️ RECOMMENDATION: You broke rules today. Before tomorrow, write down exactly what triggered each violation. Not what happened in the market — what happened in your head. That's the work.`);
  } else if (zone === 'red') {
    lines.push(`🔴 RECOMMENDATION: You're in the red zone. Stop trading for today. Protect what's left. ${fmtMoney(capLeft)} above floor is still worth protecting.`);
  } else if (zone === 'amber') {
    lines.push(`🟡 RECOMMENDATION: You're in the amber zone. You have ${fmtMoney(Math.abs(dailyPnL - (meta?.amberLimit || 0)))} before hitting red. Consider calling it a day.`);
  } else if (todayTrades.length === 0) {
    lines.push(`✅ RECOMMENDATION: No trades yet. If you're waiting for your setup, that's discipline. Don't force it.`);
  } else if (dailyPnL > 0 && violations.length === 0) {
    lines.push(`✅ RECOMMENDATION: Green day, clean execution. This is exactly what you're building toward. Consider whether you've hit your daily target — if so, close the platform and protect the win.`);
  } else {
    lines.push(`✅ RECOMMENDATION: You're in the green zone with no violations. Stay disciplined. Only take your setup.`);
  }

  return { type: 'analysis', content: lines.join('\n') };
}

// ─── QUICK ACTION: Pre-trade check (interactive) ─────────────────────────────
// Returns the first question. The interactive flow is handled in the component.
export const PRE_TRADE_QUESTIONS = [
  { id: 'q1', text: 'Is this your setup — not an attempt to recover a loss?' },
  { id: 'q2', text: 'Do you know your exact stop loss price right now, before entering?' },
  { id: 'q3', text: 'Is your risk within your limit for this account?' },
  { id: 'q4', text: 'Are you in the green zone today (daily loss under your personal stop)?' },
];

export function preTradeResult(answers, ctx) {
  const { account, meta, checkin, dailyPnL, zone, todayTrades } = ctx;
  const capLeft = capitalRemaining(account, meta);
  const consec = consecutiveLossesAtEnd(todayTrades);

  // Hard blocks
  if (checkin && checkin.mood <= 2) {
    return {
      verdict: 'NO-GO',
      color: 'red',
      reason: `🚫 AUTO NO-GO — Emotional state\n\nYour check-in showed a ${checkin.mood}/5 emotional state ("${checkin.moodWord}"). That's a high-risk mental state. No checklist answers can override this.\n\nReal capital remaining: ${fmtMoney(capLeft)}\n\nClose the platform. Come back when you're at a 3 or above.`,
    };
  }

  if (consec >= 2) {
    return {
      verdict: 'NO-GO',
      color: 'red',
      reason: `🚫 AUTO NO-GO — 2 losses in a row\n\nYou've had ${consec} consecutive losses today. Your rule is clear: 2 losses = stop and message your mentor. This trade is blocked.\n\nToday's P&L: ${dailyPnL >= 0 ? '+' : ''}${fmtMoney(dailyPnL)}`,
    };
  }

  if (zone === 'red') {
    return {
      verdict: 'NO-GO',
      color: 'red',
      reason: `🚫 AUTO NO-GO — Red zone\n\nYou're in the red zone. P&L today: ${fmtMoney(dailyPnL)}. You've hit your daily limit. No more trades today.\n\nReal capital remaining: ${fmtMoney(capLeft)} — protect it.`,
    };
  }

  // Count no answers
  const noCount = Object.values(answers).filter(a => a === 'no').length;
  const allYes = noCount === 0;

  if (answers['q1'] === 'no') {
    return {
      verdict: 'NO-GO',
      color: 'red',
      reason: `🚫 NO-GO — Recovery trade detected\n\nYou answered "no" to the first question. That means this trade is about recovering a loss, not executing your edge. That's the definition of revenge trading.\n\nYou've blown 3 accounts doing exactly this. Walk away.\n\nIs this your setup — or are you trying to recover?`,
    };
  }

  if (answers['q2'] === 'no') {
    return {
      verdict: 'NO-GO',
      color: 'red',
      reason: `🚫 NO-GO — No stop loss defined\n\nYou don't know your stop loss price. Rule #1: stop loss is placed before entry, and it NEVER moves. You cannot enter a trade without knowing your exact exit.\n\nGo define your stop loss first. Then come back.`,
    };
  }

  if (noCount >= 2) {
    return {
      verdict: 'NO-GO',
      color: 'amber',
      reason: `⚠️ NO-GO — Multiple concerns\n\nYou answered "no" to ${noCount} questions. Too many red flags to proceed safely.\n\nCurrent zone: ${zone.toUpperCase()} ${zoneColor(zone)}\nReal capital remaining: ${fmtMoney(capLeft)}\n\nWait for a cleaner setup.`,
    };
  }

  if (noCount === 1) {
    return {
      verdict: 'CAUTION',
      color: 'amber',
      reason: `🟡 PROCEED WITH CAUTION\n\nOne concern flagged. Make sure you're fully aware of it before entering.\n\nZone: ${zone.toUpperCase()} ${zoneColor(zone)} · P&L: ${dailyPnL >= 0 ? '+' : ''}${fmtMoney(dailyPnL)}\nMax risk: ${fmtMoney(meta?.maxRiskPerTrade)}\n\nIs this your setup — or are you trying to recover?`,
    };
  }

  return {
    verdict: 'GO',
    color: 'green',
    reason: `✅ GO — All checks passed\n\nYou've answered all questions honestly. You're in the ${zone.toUpperCase()} zone ${zoneColor(zone)}.\n\nRemember:\n• Max risk: ${fmtMoney(meta?.maxRiskPerTrade)}\n• Stop loss goes in BEFORE entry and NEVER moves\n• If this trade loses, that's ${consecutiveLossesAtEnd(todayTrades) + 1 >= 2 ? '2 in a row — you stop after this' : 'one loss — stay disciplined'}\n\nTrade your plan. Not your emotions.`,
  };
}

// ─── QUICK ACTION: Book check-in ─────────────────────────────────────────────
export const BOOK_QUESTIONS = [
  { id: 'bq1', text: 'What concept from your reading stood out most recently?' },
  { id: 'bq2', text: 'Did you see any of your old patterns show up today — in your thinking or your trading?' },
  { id: 'bq3', text: 'What would the fully disciplined trader from the book have done differently today?' },
];

export function bookCheckInSummary(answers, ctx) {
  const { account, streak, dailyPnL, zone } = ctx;
  const hasContent = Object.values(answers).some(a => a.trim().length > 0);

  if (!hasContent) {
    return `Nothing saved — you didn't write anything yet.`;
  }

  return `📖 Book check-in saved to your journal.\n\nThis is the work that separates traders who survive from those who don't. Mark Douglas isn't teaching you setups — he's teaching you to see yourself clearly.\n\nYou're on a ${streak}-day clean streak. Today's zone: ${zone.toUpperCase()} ${zoneColor(zone)}. P&L: ${dailyPnL >= 0 ? '+' : ''}${fmtMoney(dailyPnL)}.\n\nKeep reading. Keep reflecting. The edge is in here, not in the chart.`;
}

// ─── FREE TEXT keyword engine ─────────────────────────────────────────────────
export function freeTextResponse(text, ctx) {
  const { account, meta, todayTrades, dailyPnL, zone, streak, checkin } = ctx;
  const lower = text.toLowerCase();
  const capLeft = capitalRemaining(account, meta);

  // ── Stop loss move ──
  if (/stop.?loss|move.?sl|adjust.?sl|sl.?move|move.?stop|widen.?stop/.test(lower)) {
    return `🔒 Hard no.\n\nStop loss is placed and NEVER moved. That's not a guideline — it's the rule that separates you from the version of yourself that blew 3 accounts.\n\nEvery time you moved a stop loss in the past, you told yourself it was "just this once" or "the setup is still valid." It wasn't. The market doesn't care about your reasoning.\n\nYour stop loss is your maximum risk. It's already set. Leave it.\n\nReal capital remaining: ${fmtMoney(capLeft)}. That's what you're protecting.`;
  }

  // ── Revenge / recovery ──
  if (/revenge|recover|get.?back|make.?back|recoup|chase/.test(lower)) {
    return `⚠️ Stop. Read this carefully.\n\nThis feeling — the need to recover, to get it back, to make the loss disappear — this is exactly what ended your last 3 accounts. Not bad setups. Not bad luck. This feeling, acted on.\n\nYou're down ${fmtMoney(Math.abs(Math.min(0, dailyPnL)))} today. That's real. But you still have ${fmtMoney(capLeft)} above your floor. That's also real — and it's worth more than whatever you're trying to recover.\n\nThe 3-step cooldown:\n1. Close the platform right now\n2. Go for a walk — minimum 10 minutes\n3. Come back tomorrow with a fresh session\n\nIs this your setup — or are you trying to recover?`;
  }

  // ── Loss / down / negative ──
  if (/\bloss\b|\blost\b|\bdown\b|\bnegative\b|\blosing\b|\bred\b/.test(lower)) {
    const zoneMsg = zone === 'green'
      ? `You're still in the green zone. The loss is within your rules.`
      : zone === 'amber'
      ? `You're in the amber zone. You're approaching your daily limit — be careful.`
      : `You're in the red zone. You've hit your daily limit. Stop trading today.`;

    return `Losses are part of trading. Every professional trader takes losses. The question is never "did I lose?" — it's "did I follow my rules?"\n\nToday's P&L: ${dailyPnL >= 0 ? '+' : ''}${fmtMoney(dailyPnL)}\n${zoneMsg}\nReal capital remaining: ${fmtMoney(capLeft)}\n\n${zone === 'red' ? 'Close the platform. Protect what you have left.' : 'If you followed your rules, this loss is just the cost of doing business. Log it, learn from it, move on.'}\n\nClean streak: ${streak} day${streak !== 1 ? 's' : ''}. ${streak > 0 ? "Don't let a loss make you break your rules too." : 'Reset the streak tomorrow by trading clean.'}`;
  }

  // ── Win / profit / good day ──
  if (/\bwin\b|\bwon\b|\bprofit\b|\bgreen\b|\bgood.?day\b|\bkilled.?it\b|\bnailed\b/.test(lower)) {
    return `✅ Good. Now stay grounded.\n\nToday's P&L: +${fmtMoney(Math.max(0, dailyPnL))}\nZone: ${zone.toUpperCase()} ${zoneColor(zone)}\nClean streak: ${streak} day${streak !== 1 ? 's' : ''}\n\nA winning day is not a signal to trade more. It's not permission to increase size. It's not proof that you've "figured it out."\n\nThe best thing you can do after a good day is close the platform and protect the win. Overconfidence after a green day has ended more accounts than bad setups ever did.\n\nDid you follow your rules today? That's the only question that matters.`;
  }

  // ── Fear / nervous / scared ──
  if (/scared|fear|afraid|nervous|anxious|hesitat|doubt/.test(lower)) {
    return `That fear you're feeling? It's not your enemy. It's your account talking.\n\nHere's the reframe: every trade you take risks at most ${fmtMoney(meta?.maxRiskPerTrade)} — that's 1% of your real capital. That's not a life-changing amount. It's a small, controlled experiment.\n\nFear becomes a problem when it makes you freeze on good setups or, worse, when you override it and take bad ones to "prove" you're not scared.\n\nYour real capital remaining: ${fmtMoney(capLeft)}\nYour zone: ${zone.toUpperCase()} ${zoneColor(zone)}\n\nIf the fear is about a specific trade, run the pre-trade check. If it's general anxiety, that's what your check-in emotional score is for. What did you score today?`;
  }

  // ── Book / Mark Douglas / Zone ──
  if (/mark.?douglas|trading.?in.?the.?zone|\bthe.?zone\b|\bbook\b|\breading\b/.test(lower)) {
    return `📖 Let's do a book check-in.\n\nClick the "📖 Book check-in" button above to work through the reflection questions. I'll save your answers to your journal.\n\nMark Douglas isn't teaching you to predict the market — he's teaching you that you don't need to. The edge comes from consistent execution, not from being right.\n\nYour clean streak is ${streak} day${streak !== 1 ? 's' : ''}. That's the book in action.`;
  }

  // ── Default: zone + streak aware ──
  const zoneAdvice = zone === 'green'
    ? `You're in the green zone today — keep it there.`
    : zone === 'amber'
    ? `You're in the amber zone. Tread carefully.`
    : `You're in the red zone. Consider stopping for today.`;

  return `${zoneAdvice}\n\nP&L today: ${dailyPnL >= 0 ? '+' : ''}${fmtMoney(dailyPnL)} · Real capital above floor: ${fmtMoney(capLeft)} · Clean streak: ${streak}d\n\n${checkin ? `You checked in as "${checkin.moodWord}" (${checkin.mood}/5) today.` : 'No check-in today — consider completing one before trading.'}\n\nIf you have a specific question about a trade, your rules, or what you're feeling right now — ask me directly. I'm here to keep you accountable, not to give you permission.`;
}
