import { useState, useEffect, useRef } from 'react';
import { useAccount } from '../AccountContext';
import {
  today, getMentorChatForAccount, saveMentorChat, clearMentorChat,
  getCheckinForDate, getTradesForDate, getDailyPnL, getDailyZone,
  getDailyViolations, getCleanStreakDays, fmtMoney, generateId,
  saveJournalEntry, getJournalForDate, getAccountCurrentBalance,
} from '../store';
import {
  revengeTradeResponse,
  analyzeDayResponse,
  preTradeResult,
  freeTextResponse,
  bookCheckInSummary,
  PRE_TRADE_QUESTIONS,
  BOOK_QUESTIONS,
} from '../mentorEngine';

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isSystem = msg.role === 'system'; // zone/verdict cards

  if (isSystem) {
    const borderColor =
      msg.color === 'red' ? 'var(--red)' :
      msg.color === 'amber' ? 'var(--amber)' :
      msg.color === 'green' ? 'var(--green)' :
      'var(--border)';
    const bg =
      msg.color === 'red' ? 'rgba(239,68,68,0.07)' :
      msg.color === 'amber' ? 'rgba(245,158,11,0.07)' :
      msg.color === 'green' ? 'rgba(34,197,94,0.07)' :
      'var(--surface2)';

    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 4, paddingLeft: 40 }}>
          TradeOS Mentor
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-dim)', border: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
          }}>🧠</div>
          <div style={{
            flex: 1, background: bg,
            border: `1px solid ${borderColor}`,
            borderLeft: `4px solid ${borderColor}`,
            borderRadius: '0 12px 12px 12px',
            padding: '14px 16px',
            fontSize: 14, lineHeight: 1.7,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            color: 'var(--text)',
          }}>
            {msg.content}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 40 }}>{msg.time}</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 16,
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent-dim)', border: '2px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
        }}>🧠</div>
      )}
      <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {!isUser && (
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 4, paddingLeft: 4 }}>
            TradeOS Mentor
          </div>
        )}
        <div style={{
          background: isUser ? 'var(--accent)' : 'var(--surface2)',
          border: isUser ? 'none' : '1px solid var(--border)',
          borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          padding: '12px 16px',
          color: isUser ? '#fff' : 'var(--text)',
          fontSize: 14, lineHeight: 1.65,
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {msg.content}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 4, paddingRight: 4 }}>
          {msg.time}
        </div>
      </div>
    </div>
  );
}

// ─── Pre-trade interactive flow ───────────────────────────────────────────────
function PreTradeFlow({ ctx, onDone }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});

  function answer(val) {
    const q = PRE_TRADE_QUESTIONS[step];
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);

    if (step < PRE_TRADE_QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      // All answered — compute result
      const result = preTradeResult(newAnswers, ctx);
      onDone(result);
    }
  }

  const q = PRE_TRADE_QUESTIONS[step];

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginBottom: 16,
    }}>
      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Pre-Trade Check · Question {step + 1} of {PRE_TRADE_QUESTIONS.length}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: 'var(--text)' }}>
        {q.text}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, borderColor: 'var(--green)', color: 'var(--green)' }}
          onClick={() => answer('yes')}
        >
          ✓ Yes
        </button>
        <button
          className="btn btn-ghost"
          style={{ flex: 1, borderColor: 'var(--red)', color: 'var(--red)' }}
          onClick={() => answer('no')}
        >
          ✗ No
        </button>
      </div>
      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
        {PRE_TRADE_QUESTIONS.map((_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--border)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Book check-in interactive flow ──────────────────────────────────────────
function BookFlow({ ctx, onDone }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState('');

  function next() {
    const q = BOOK_QUESTIONS[step];
    const newAnswers = { ...answers, [q.id]: current.trim() };
    setAnswers(newAnswers);
    setCurrent('');

    if (step < BOOK_QUESTIONS.length - 1) {
      setStep(s => s + 1);
    } else {
      onDone(newAnswers);
    }
  }

  const q = BOOK_QUESTIONS[step];

  return (
    <div style={{
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 16, marginBottom: 16,
    }}>
      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        📖 Trading in the Zone · Reflection {step + 1} of {BOOK_QUESTIONS.length}
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: 'var(--text)' }}>
        {q.text}
      </div>
      <textarea
        value={current}
        onChange={e => setCurrent(e.target.value)}
        placeholder="Write your honest answer here..."
        style={{ minHeight: 80, marginBottom: 10 }}
        autoFocus
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={next}
          disabled={!current.trim()}
        >
          {step < BOOK_QUESTIONS.length - 1 ? 'Next →' : 'Save & Finish'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            // Skip with empty
            const q2 = BOOK_QUESTIONS[step];
            const newAnswers = { ...answers, [q2.id]: '' };
            setAnswers(newAnswers);
            setCurrent('');
            if (step < BOOK_QUESTIONS.length - 1) setStep(s => s + 1);
            else onDone(newAnswers);
          }}
        >
          Skip
        </button>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
        {BOOK_QUESTIONS.map((_, i) => (
          <div key={i} style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i < step ? 'var(--green)' : i === step ? 'var(--accent)' : 'var(--border)',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Mentor page ─────────────────────────────────────────────────────────
export default function Mentor() {
  const { activeAccount, meta } = useAccount();
  const dateStr = today();
  const accountId = activeAccount?.id || '__no_account__';

  const [messages, setMessages] = useState(() => getMentorChatForAccount(accountId));
  const [input, setInput] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeFlow, setActiveFlow] = useState(null); // 'pretrade' | 'book' | null

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Live context — re-read on every render so it's always fresh
  const checkin     = activeAccount ? getCheckinForDate(activeAccount.id, dateStr) : null;
  const todayTrades = activeAccount ? getTradesForDate(activeAccount.id, dateStr) : [];
  const dailyPnL    = activeAccount ? getDailyPnL(activeAccount.id, dateStr) : 0;
  const zone        = getDailyZone(dailyPnL, meta);
  const violations  = activeAccount ? getDailyViolations(activeAccount.id, dateStr) : [];
  const streak      = activeAccount ? getCleanStreakDays(activeAccount.id) : 0;

  const ctx = { account: activeAccount, meta, checkin, todayTrades, dailyPnL, zone, violations, streak };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeFlow]);

  useEffect(() => {
    saveMentorChat(accountId, messages);
  }, [messages, accountId]);

  function timestamp() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function addUserMsg(text) {
    const msg = { id: generateId(), role: 'user', content: text, time: timestamp() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }

  function addMentorMsg(content, color) {
    const msg = {
      id: generateId(),
      role: color ? 'system' : 'assistant',
      content,
      color,
      time: timestamp(),
    };
    setMessages(prev => [...prev, msg]);
  }

  // ── Quick actions ────────────────────────────────────────────────────────────
  function handleRevenge() {
    setActiveFlow(null);
    addUserMsg('😤 I want to revenge trade');
    const resp = revengeTradeResponse(ctx);
    addMentorMsg(resp.content, resp.type === 'block' ? 'red' : 'amber');
  }

  function handleAnalyzeDay() {
    setActiveFlow(null);
    addUserMsg('📊 Analyze my day');
    const resp = analyzeDayResponse(ctx);
    addMentorMsg(resp.content, zone === 'red' ? 'red' : zone === 'amber' ? 'amber' : 'green');
  }

  function handlePreTrade() {
    setActiveFlow(null);
    addUserMsg('🧠 Pre-trade check');
    // preTradeResult handles all hard blocks (zone, streak, mood) at the end of the flow
    setActiveFlow('pretrade');
  }

  function handlePreTradeDone(result) {
    setActiveFlow(null);
    addMentorMsg(result.reason, result.color);
  }

  function handleBookCheckin() {
    setActiveFlow(null);
    addUserMsg('📖 Book check-in');
    setActiveFlow('book');
  }

  function handleBookDone(answers) {
    setActiveFlow(null);

    // Save to journal
    if (activeAccount) {
      const existing = getJournalForDate(activeAccount.id, dateStr);
      const bookSection = BOOK_QUESTIONS
        .map(q => `${q.text}\n${answers[q.id] || '(skipped)'}`)
        .join('\n\n');
      const newText = existing?.text
        ? existing.text + '\n\n─── Book Check-In ───\n' + bookSection
        : '─── Book Check-In ───\n' + bookSection;

      saveJournalEntry({
        id: existing?.id || (activeAccount.id + '_journal_' + dateStr),
        accountId: activeAccount.id,
        date: dateStr,
        text: newText,
        timestamp: new Date().toISOString(),
      });
    }

    const summary = bookCheckInSummary(answers, ctx);
    addMentorMsg(summary, 'green');
  }

  // ── Free text send ───────────────────────────────────────────────────────────
  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    setActiveFlow(null);
    addUserMsg(trimmed);
    setInput('');

    // Check for book keywords before general engine
    if (/mark.?douglas|trading.?in.?the.?zone|\bthe.?zone\b|\bbook\b|\breading\b/.test(trimmed.toLowerCase())) {
      addMentorMsg(freeTextResponse(trimmed, ctx));
      return;
    }

    const resp = freeTextResponse(trimmed, ctx);
    addMentorMsg(resp);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    clearMentorChat(accountId);
    setMessages([]);
    setActiveFlow(null);
    setShowClearConfirm(false);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, flexShrink: 0, flexWrap: 'wrap', gap: 10,
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Mentor</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {activeAccount ? activeAccount.name : 'No account'} · Rule-based accountability coach
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Live zone pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 20, padding: '4px 12px', fontSize: 12,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
              background: zone === 'green' ? 'var(--green)' : zone === 'amber' ? 'var(--amber)' : 'var(--red)',
            }} />
            <span style={{ color: 'var(--text-muted)' }}>
              {zone.toUpperCase()} · {dailyPnL >= 0 ? '+' : ''}{fmtMoney(dailyPnL)} · {streak}d streak
            </span>
          </div>
          {messages.length > 0 && (
            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--text-muted)' }}
              onClick={() => setShowClearConfirm(true)}>
              Clear chat
            </button>
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="mentor-chat-window" style={{
        flex: 1, overflowY: 'auto',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '20px 20px 8px',
        marginBottom: 12,
      }}>
        {/* Empty state */}
        {messages.length === 0 && !activeFlow && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>
              TradeOS Mentor
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 380, margin: '0 auto', marginBottom: 16 }}>
              Your rule-based accountability coach. Every response is built from your real account data — no generic advice.
            </div>
            {/* Context snapshot */}
            <div style={{
              display: 'inline-flex', flexDirection: 'column', gap: 6,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 20px', textAlign: 'left', fontSize: 12,
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-dim)', marginBottom: 4 }}>Live Context</div>
              <div>Zone: <strong style={{ color: zone === 'green' ? 'var(--green)' : zone === 'amber' ? 'var(--amber)' : 'var(--red)' }}>{zone.toUpperCase()}</strong></div>
              <div>P&L today: <strong style={{ color: dailyPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>{dailyPnL >= 0 ? '+' : ''}{fmtMoney(dailyPnL)}</strong></div>
              <div>Trades today: <strong>{todayTrades.length}</strong></div>
              <div>Clean streak: <strong style={{ color: 'var(--accent)' }}>{streak}d</strong></div>
              <div>Check-in: <strong>{checkin ? `✅ "${checkin.moodWord}" (${checkin.mood}/5)` : '❌ Not done'}</strong></div>
              {activeAccount && <div>Real capital above floor: <strong>{fmtMoney(getAccountCurrentBalance(activeAccount.id) - (meta?.accountFloor || 0))}</strong></div>}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {/* Interactive flows */}
        {activeFlow === 'pretrade' && (
          <PreTradeFlow ctx={ctx} onDone={handlePreTradeDone} />
        )}
        {activeFlow === 'book' && (
          <BookFlow ctx={ctx} onDone={handleBookDone} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      <div className="mentor-quick-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
          onClick={handleAnalyzeDay} disabled={!!activeFlow}>
          📊 Analyze my day
        </button>
        <button className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, borderColor: 'var(--red-dim)', color: 'var(--red)' }}
          onClick={handleRevenge} disabled={!!activeFlow}>
          😤 Revenge trade urge
        </button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
          onClick={handleBookCheckin} disabled={!!activeFlow}>
          📖 Book check-in
        </button>
        <button className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, borderColor: 'var(--accent-dim)', color: 'var(--accent)' }}
          onClick={handlePreTrade} disabled={!!activeFlow}>
          🧠 Pre-trade check
        </button>
        {activeFlow && (
          <button className="btn btn-ghost btn-sm"
            style={{ fontSize: 12, color: 'var(--text-muted)' }}
            onClick={() => setActiveFlow(null)}>
            ✕ Cancel
          </button>
        )}
      </div>

      {/* Input row */}
      <div className="mentor-input-bar" style={{
        display: 'flex', gap: 10, flexShrink: 0,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 12px',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type anything — how you're feeling, what you're thinking about trading..."
          disabled={!!activeFlow}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            resize: 'none', minHeight: 44, maxHeight: 120,
            padding: '4px 0', fontSize: 14, lineHeight: 1.5,
            color: 'var(--text)', outline: 'none',
            opacity: activeFlow ? 0.4 : 1,
          }}
          rows={1}
        />
        <button
          className="btn btn-primary"
          onClick={handleSend}
          disabled={!!activeFlow || !input.trim()}
          style={{ alignSelf: 'flex-end', flexShrink: 0, minWidth: 72 }}
        >
          Send
        </button>
      </div>

      {/* Clear confirmation */}
      {showClearConfirm && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 380 }}>
            <div className="modal-title">Clear Chat History?</div>
            <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>
              This will permanently delete all messages in this conversation. Your trade data and journal are not affected.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleClearChat}>
                Yes, Clear Chat
              </button>
              <button className="btn btn-ghost" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
