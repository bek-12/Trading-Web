import { useState, useEffect } from 'react';
import { fmtMoney } from '../store';

// ─── Violation type config ────────────────────────────────────────────────────
function getConfig(violationType, meta) {
  const maxRisk = meta ? fmtMoney(meta.maxRiskPerTrade) : '$6';

  switch (violationType) {
    case 'OVERSIZED_POSITION':
      return {
        label: 'Oversized Position',
        color: 'var(--amber)',
        description: `You risked more than your maximum of ${maxRisk} per trade.`,
        task: `Write the following sentence 10 times in the box below:\n\n"I will never risk more than ${maxRisk} per trade. Oversized positions destroyed my previous accounts."`,
        validate(text) {
          const target = `I will never risk more than ${maxRisk} per trade. Oversized positions destroyed my previous accounts.`;
          // Count lines that match (case-insensitive, trimmed)
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const matching = lines.filter(l =>
            l.toLowerCase().includes('i will never risk more than') &&
            l.toLowerCase().includes('oversized positions destroyed my previous accounts')
          );
          return { done: matching.length >= 10, progress: `${Math.min(matching.length, 10)}/10 lines written` };
        },
      };

    case 'STOP_LOSS_MOVED':
      return {
        label: 'Stop Loss Moved',
        color: 'var(--red)',
        description: 'You moved your stop loss after entering the trade.',
        task: 'Read this rule, then type it exactly from memory:\n\n"A stop loss is a promise to myself. Moving it is lying to myself. It has blown 3 accounts before this one. I will not move my stop loss. Ever."',
        target: 'A stop loss is a promise to myself. Moving it is lying to myself. It has blown 3 accounts before this one. I will not move my stop loss. Ever.',
        validate(text) {
          const target = 'A stop loss is a promise to myself. Moving it is lying to myself. It has blown 3 accounts before this one. I will not move my stop loss. Ever.';
          const clean = text.trim().replace(/\s+/g, ' ');
          const done = clean === target;
          return {
            done,
            progress: done ? '✓ Exact match' : `${Math.round((clean.length / target.length) * 100)}% — must match exactly`,
          };
        },
      };

    case 'REVENGE_TRADE':
      return {
        label: 'Revenge Trade',
        color: 'var(--red)',
        description: 'You took a revenge trade.',
        task: 'Answer all 3 questions honestly. Each answer must be at least 2 sentences.\n\n1. Why did I take this revenge trade?\n2. What was I feeling when I took it?\n3. What will I do differently next time?',
        validate(text) {
          // Split by question markers or double newlines
          const answers = text.split(/\n\s*\n/).filter(s => s.trim().length > 0);
          // Count sentences (periods, exclamation, question marks followed by space or end)
          function sentenceCount(s) {
            return (s.match(/[.!?](\s|$)/g) || []).length + (s.match(/\n/g) || []).length;
          }
          const q1 = answers[0] || '';
          const q2 = answers[1] || '';
          const q3 = answers[2] || '';
          const s1 = sentenceCount(q1) >= 2;
          const s2 = sentenceCount(q2) >= 2;
          const s3 = sentenceCount(q3) >= 2;
          const done = s1 && s2 && s3;
          const count = [s1, s2, s3].filter(Boolean).length;
          return { done, progress: `${count}/3 answers complete (2+ sentences each)` };
        },
      };

    case 'TWO_LOSS_RULE_BROKEN':
      return {
        label: '2-Loss Rule Broken',
        color: 'var(--red)',
        description: 'You logged a trade after already losing 2 in a row today.',
        task: 'You broke the 2-loss rule. Write your honest answer:\n\nWhy did you keep trading?',
        validate(text) {
          const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          return { done: words >= 50, progress: `${words}/50 words minimum` };
        },
      };

    default:
      return {
        label: 'Rule Violation',
        color: 'var(--red)',
        description: 'A trading rule was broken.',
        task: 'Acknowledge this violation by writing what happened and what you will do differently.',
        validate(text) {
          const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          return { done: words >= 20, progress: `${words}/20 words minimum` };
        },
      };
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export default function PunishmentModal({ trade, violationType, meta, onDismiss }) {
  const config = getConfig(violationType, meta);
  const [text, setText] = useState('');
  const [validation, setValidation] = useState({ done: false, progress: '' });

  useEffect(() => {
    setValidation(config.validate(text));
  }, [text]);

  // Block ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') e.preventDefault();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleDismiss() {
    if (!validation.done) return;
    // Pass punishment record back to parent — parent updates via API
    onDismiss({
      violationType,
      punishmentText: text,
      completedAt: new Date().toISOString(),
    });
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(20, 0, 0, 0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      // Prevent click-outside dismiss
      onClick={e => e.stopPropagation()}
    >
      <div style={{
        background: 'var(--surface)',
        border: `2px solid ${config.color}`,
        borderRadius: 12,
        width: '100%',
        maxWidth: 580,
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: 32,
        boxShadow: `0 0 60px rgba(239,68,68,0.3)`,
      }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 6, padding: '4px 12px', marginBottom: 14,
          }}>
            <span style={{ color: 'var(--red)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ⛔ Rule Violation — Accountability Required
            </span>
          </div>

          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: config.color }}>
            {config.label}
          </h2>

          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>
            {config.description}
          </p>

          {trade && (
            <div style={{
              marginTop: 12, padding: '10px 14px',
              background: 'var(--surface2)', borderRadius: 6,
              fontSize: 12, color: 'var(--text-muted)',
              display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
              <span>Trade: <strong style={{ color: 'var(--text)' }}>{trade.pair} {trade.direction}</strong></span>
              <span>Risk: <strong style={{ color: 'var(--red)' }}>{fmtMoney(trade.riskAmount)}</strong></span>
              <span>P&L: <strong style={{ color: (trade.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {(trade.pnl || 0) >= 0 ? '+' : ''}{fmtMoney(trade.pnl || 0)}
              </strong></span>
            </div>
          )}
        </div>

        <div style={{ height: 1, background: 'rgba(239,68,68,0.2)', marginBottom: 24 }} />

        {/* Task */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10,
          }}>
            Your Punishment Task
          </div>
          <div style={{
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 8, padding: '14px 16px',
            fontSize: 14, lineHeight: 1.7, color: 'var(--text)',
            whiteSpace: 'pre-wrap',
          }}>
            {config.task}
          </div>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: 20 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write here..."
            style={{
              minHeight: violationType === 'REVENGE_TRADE' ? 180 : 140,
              borderColor: validation.done ? 'var(--green)' : 'var(--border)',
              transition: 'border-color 0.2s',
            }}
            autoFocus
          />
        </div>

        {/* Progress */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20,
        }}>
          <div style={{
            fontSize: 13, fontWeight: 700,
            color: validation.done ? 'var(--green)' : 'var(--text-muted)',
          }}>
            {validation.done ? '✓ Task complete' : validation.progress}
          </div>

          {/* Progress bar */}
          {!validation.done && (
            <div style={{ width: 120, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: config.color,
                width: (() => {
                  const prog = validation.progress;
                  const match = prog.match(/(\d+)\/(\d+)/);
                  if (match) return `${Math.min(100, (parseInt(match[1]) / parseInt(match[2])) * 100)}%`;
                  const pctMatch = prog.match(/(\d+)%/);
                  if (pctMatch) return `${Math.min(100, parseInt(pctMatch[1]))}%`;
                  return '0%';
                })(),
                transition: 'width 0.3s ease',
              }} />
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          disabled={!validation.done}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 800,
            fontSize: 15,
            cursor: validation.done ? 'pointer' : 'not-allowed',
            background: validation.done ? 'var(--green)' : 'var(--surface2)',
            color: validation.done ? '#fff' : 'var(--text-muted)',
            transition: 'all 0.2s',
            letterSpacing: '0.02em',
          }}
        >
          {validation.done ? 'I understand. I am accountable.' : 'Complete the task above to continue'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 12 }}>
          This modal cannot be dismissed until the task is complete. Your response is saved permanently.
        </p>
      </div>
    </div>
  );
}
