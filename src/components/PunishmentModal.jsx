import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { fmtMoney } from '../store';

// ─── Violation config ─────────────────────────────────────────────────────────
export function getViolationConfig(violationType, meta) {
  const maxRisk = meta ? fmtMoney(meta.maxRiskPerTrade) : '$6';

  switch (violationType) {
    case 'OVERSIZED_POSITION':
      return {
        title: '⛔ You risked more than your maximum',
        badge: 'OVERSIZED POSITION',
        rule: `Your max risk per trade is ${maxRisk} (1% of real capital). Oversized positions are how funded accounts get blown.`,
        taskDescription: `Write the following sentence exactly 10 times — one per line:\n\n"I will never risk more than my max per trade. Oversized positions destroyed my previous accounts."`,
        type: 'repeat10',
        targetSentence: 'I will never risk more than my max per trade. Oversized positions destroyed my previous accounts.',
        validate(text) {
          const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          const matching = lines.filter(l =>
            l.toLowerCase().includes('i will never risk more than my max per trade') &&
            l.toLowerCase().includes('oversized positions destroyed my previous accounts')
          );
          const count = Math.min(matching.length, 10);
          return { done: count >= 10, progress: `${count} / 10 lines written` };
        },
      };

    case 'STOP_LOSS_MOVED':
      return {
        title: '⛔ You moved your stop loss',
        badge: 'STOP LOSS MOVED',
        rule: 'Stop loss is placed before entry and NEVER moved. This rule alone has blown 3 of your previous accounts.',
        taskDescription: 'Type this rule from memory — exactly, character for character:\n\n"A stop loss is a promise to myself. Moving it is lying to myself. It has blown 3 accounts before this one. I will not move my stop loss. Ever."',
        type: 'exact',
        targetSentence: 'A stop loss is a promise to myself. Moving it is lying to myself. It has blown 3 accounts before this one. I will not move my stop loss. Ever.',
        validate(text) {
          const target = 'A stop loss is a promise to myself. Moving it is lying to myself. It has blown 3 accounts before this one. I will not move my stop loss. Ever.';
          const clean = text.trim().replace(/\s+/g, ' ');
          const done = clean === target;
          const pct = Math.min(99, Math.round((clean.length / target.length) * 100));
          return { done, progress: done ? '✓ Exact match' : `${pct}% — must match exactly` };
        },
      };

    case 'REVENGE_TRADE':
      return {
        title: '⛔ You took a revenge trade',
        badge: 'REVENGE TRADE',
        rule: 'Revenge trading is the #1 account killer. Every time you feel the urge to "get it back", that is the exact moment to close the platform.',
        taskDescription: 'Answer all 3 questions. Each answer must be at least 20 words.',
        type: 'three_questions',
        questions: [
          'Why did I take this revenge trade?',
          'What was I feeling when I took it?',
          'What will I do differently next time?',
        ],
        validate(answers) {
          const counts = answers.map(a => a.trim().split(/\s+/).filter(w => w.length > 0).length);
          const done = counts.every(c => c >= 20);
          return {
            done,
            counts,
            progress: counts.map((c, i) => `Q${i+1}: ${c}/20 words`).join(' · '),
          };
        },
      };

    case 'TWO_LOSS_RULE_BROKEN':
      return {
        title: '⛔ You broke the 2-loss rule',
        badge: '2-LOSS RULE BROKEN',
        rule: 'After 2 consecutive losses, you agreed to stop trading and message your mentor. You kept going anyway.',
        taskDescription: 'Answer honestly — minimum 30 words:\n\nWhy did you keep trading after 2 losses?',
        type: 'freetext',
        minWords: 30,
        validate(text) {
          const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          return { done: words >= 30, progress: `${words} / 30 words minimum` };
        },
      };

    default:
      return {
        title: '⛔ Rule Violation',
        badge: 'VIOLATION',
        rule: 'A trading rule was broken.',
        taskDescription: 'Describe what happened and what you will do differently. Minimum 20 words.',
        type: 'freetext',
        minWords: 20,
        validate(text) {
          const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
          return { done: words >= 20, progress: `${words} / 20 words minimum` };
        },
      };
  }
}

// ─── Three-question task (Revenge trade) ─────────────────────────────────────
function ThreeQuestionTask({ config, onValidChange }) {
  const [answers, setAnswers] = useState(['', '', '']);

  function setAnswer(i, val) {
    const next = [...answers];
    next[i] = val;
    setAnswers(next);
    const result = config.validate(next);
    onValidChange(result.done, next.join('\n\n---\n\n'), result);
  }

  const result = config.validate(answers);

  return (
    <div>
      {config.questions.map((q, i) => {
        const wordCount = answers[i].trim().split(/\s+/).filter(w => w.length > 0).length;
        const ok = wordCount >= 20;
        return (
          <div key={i} style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--text)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>{i + 1}. {q}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: ok ? 'var(--green)' : 'var(--text-muted)' }}>
                {wordCount} / 20 words {ok ? '✓' : ''}
              </span>
            </div>
            <textarea
              value={answers[i]}
              onChange={e => setAnswer(i, e.target.value)}
              placeholder="Write your honest answer here..."
              style={{
                minHeight: 80,
                borderColor: ok ? 'var(--green)' : answers[i].length > 0 ? 'var(--amber)' : 'var(--border)',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function PunishmentModal({ trade, violationType, meta, onDismiss }) {
  const config = getViolationConfig(violationType, meta);
  const [text, setText] = useState('');
  const [validation, setValidation] = useState({ done: false, progress: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Reset when violationType changes (queue processing)
  useEffect(() => {
    setText('');
    setValidation({ done: false, progress: '' });
    setSubmitting(false);
    setSubmitError('');
  }, [violationType]);

  // Validate single-textarea types
  useEffect(() => {
    if (config.type !== 'three_questions') {
      setValidation(config.validate(text));
    }
  }, [text, violationType]);

  // Block ESC key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') e.preventDefault(); };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  function handleThreeQChange(done, combinedText, result) {
    setText(combinedText);
    setValidation({ done, progress: result.progress });
  }

  async function handleDismiss() {
    if (!validation.done || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      // onDismiss is async — wait for DB save before closing
      await onDismiss({
        violationType,
        punishmentText: text,
        completedAt: new Date().toISOString(),
      });
      // onDismiss resolves → modal unmounts automatically (parent removes it from queue)
    } catch (err) {
      setSubmitError('Failed to save. Please try again.');
      setSubmitting(false);
    }
  }

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(80, 0, 0, 0.97)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div style={{
        background: '#0f0a0a',
        border: '2px solid rgba(239,68,68,0.6)',
        borderRadius: 12,
        width: '100%',
        maxWidth: 600,
        padding: '28px 28px 24px',
        boxShadow: '0 0 80px rgba(239,68,68,0.4)',
        position: 'relative',
        margin: 'auto',
      }}>

        {/* Violation badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)',
          borderRadius: 4, padding: '3px 10px', marginBottom: 12,
        }}>
          <span style={{ color: '#ff6b6b', fontSize: 11, fontWeight: 800, letterSpacing: '0.1em' }}>
            {config.badge}
          </span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#ff4444', marginBottom: 10 }}>
          {config.title}
        </h2>

        {/* Rule broken */}
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 6, padding: '10px 14px', marginBottom: 16,
          fontSize: 13, color: '#fca5a5', lineHeight: 1.6,
        }}>
          {config.rule}
        </div>

        {/* Trade info */}
        {trade && (
          <div style={{
            display: 'flex', gap: 16, flexWrap: 'wrap',
            padding: '8px 12px', background: 'rgba(255,255,255,0.04)',
            borderRadius: 6, marginBottom: 20, fontSize: 12, color: '#94a3b8',
          }}>
            <span>Trade: <strong style={{ color: '#e2e8f0' }}>{trade.pair} {trade.direction}</strong></span>
            <span>Risk: <strong style={{ color: '#ff6b6b' }}>{fmtMoney(trade.riskAmount)}</strong></span>
            <span>P&L: <strong style={{ color: (trade.pnl || 0) >= 0 ? '#4ade80' : '#f87171' }}>
              {(trade.pnl || 0) >= 0 ? '+' : ''}{fmtMoney(trade.pnl || 0)}
            </strong></span>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(239,68,68,0.2)', marginBottom: 20 }} />

        {/* Task label */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 10 }}>
          Your Accountability Task
        </div>

        {/* Task description */}
        <div style={{
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 8, padding: '12px 14px', marginBottom: 16,
          fontSize: 13, lineHeight: 1.7, color: '#e2e8f0', whiteSpace: 'pre-wrap',
        }}>
          {config.taskDescription}
        </div>

        {/* Input area */}
        {config.type === 'three_questions' ? (
          <ThreeQuestionTask config={config} onValidChange={handleThreeQChange} />
        ) : (
          <div style={{ marginBottom: 16 }}>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Write here..."
              autoFocus
              style={{
                minHeight: config.type === 'exact' ? 100 : 130,
                borderColor: validation.done ? '#22c55e' : '#2a2f3d',
                background: '#1e2330',
                color: '#e2e8f0',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
        )}

        {/* Progress */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16,
        }}>
          <span style={{
            fontSize: 13, fontWeight: 700,
            color: validation.done ? '#22c55e' : '#64748b',
          }}>
            {validation.done ? '✓ Task complete — you may continue' : validation.progress}
          </span>
          {!validation.done && (
            <div style={{ width: 100, height: 4, background: '#1e2330', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: '#ef4444',
                width: (() => {
                  const p = validation.progress || '';
                  const m = p.match(/(\d+)\s*\/\s*(\d+)/);
                  if (m) return `${Math.min(100, (parseInt(m[1]) / parseInt(m[2])) * 100)}%`;
                  const pct = p.match(/(\d+)%/);
                  if (pct) return `${Math.min(100, parseInt(pct[1]))}%`;
                  return '0%';
                })(),
                transition: 'width 0.3s',
              }} />
            </div>
          )}
        </div>

        {/* Save error */}
        {submitError && (
          <div style={{
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 6, padding: '8px 12px', marginBottom: 12,
            fontSize: 13, color: '#fca5a5',
          }}>
            ⚠️ {submitError}
          </div>
        )}

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          disabled={!validation.done || submitting}
          style={{
            width: '100%', padding: '14px',
            borderRadius: 8, border: 'none',
            fontWeight: 800, fontSize: 15,
            cursor: (validation.done && !submitting) ? 'pointer' : 'not-allowed',
            background: submitting ? '#166534' : validation.done ? '#22c55e' : '#1e2330',
            color: validation.done ? '#fff' : '#475569',
            transition: 'all 0.2s',
            letterSpacing: '0.02em',
          }}
        >
          {submitting
            ? 'Saving to database…'
            : validation.done
              ? 'I am accountable. Continue.'
              : 'Complete the task above to continue'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 10 }}>
          This cannot be dismissed until the task is complete. Your response is saved permanently.
        </p>
      </div>
    </div>
  );

  // Render into document.body so it's truly fullscreen above everything
  return createPortal(modal, document.body);
}
