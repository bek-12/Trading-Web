import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../AccountContext';
import {
  today, getCheckinForDate, getTradesForDate,
  getDailyPnL, getDailyZone, formatDate, fmtMoney,
} from '../store';
import PunishmentModal from '../components/PunishmentModal';

const CHECKLIST_QUESTIONS = [
  { id: 'q1', text: 'Is this your setup — not an attempt to recover a loss?', yesLabel: 'My Setup ✓', noLabel: 'Recovery ✗', warnOnNo: true, warnMsg: '⚠️ You may be chasing a loss. Seriously consider sitting this one out.' },
  { id: 'q2', text: 'Do you know your exact stop loss price before entering?', yesLabel: 'Yes ✓', noLabel: 'No ✗', warnOnNo: true, warnMsg: '🚫 You must know your stop loss before entering any trade.' },
  { id: 'q3', text: 'Are you within your green zone for today?', yesLabel: 'Yes ✓', noLabel: 'No ✗', warnOnNo: true, warnMsg: '⚠️ You are outside the green zone. Proceed with extreme caution.' },
  { id: 'q4', text: 'Have you lost 2 trades in a row today?', yesLabel: 'Yes', noLabel: 'No ✓', blockOnYes: true },
];

function consecutiveLossesAtEnd(trades) {
  let count = 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    if (trades[i].result === 'Loss') count++;
    else break;
  }
  return count;
}

export default function NewTrade() {
  const navigate = useNavigate();
  const { activeAccount, meta, trades, checkins, addTrade, updateTrade, completePunishment } = useAccount();
  const dateStr = today();

  const [answers, setAnswers] = useState({});
  const [checklistDone, setChecklistDone] = useState(false);
  const [form, setForm] = useState({
    pair: '', direction: 'Buy', entry: '', stopLoss: '',
    takeProfit: '', riskAmount: '', result: 'Win',
    pnl: '', notes: '', movedSL: null, revengeFlag: null,
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // punishmentQueue: array of { trade, violationType }
  const [punishmentQueue, setPunishmentQueue] = useState([]);
  const [savedTrade, setSavedTrade] = useState(null);

  if (!activeAccount || !meta) {
    return (
      <div className="alert alert-red" style={{ maxWidth: 500 }}>
        <strong>No account selected.</strong>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/accounts')}>Go to Accounts →</button>
        </div>
      </div>
    );
  }

  const checkin     = getCheckinForDate(checkins, dateStr);
  const todayTrades = getTradesForDate(trades, dateStr);
  const dailyPnL    = getDailyPnL(trades, dateStr);
  const zone        = getDailyZone(dailyPnL, meta);

  function setAnswer(id, val) { setAnswers(prev => ({ ...prev, [id]: val })); }
  function allAnswered() { return CHECKLIST_QUESTIONS.every(q => answers[q.id] !== undefined); }
  function hasBlocker() { return answers['q4'] === 'yes'; }

  function proceedChecklist() {
    if (!allAnswered()) { setError('Please answer all checklist questions.'); return; }
    if (hasBlocker()) return;
    setError('');
    setChecklistDone(true);
  }

  function handleChange(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  const riskNum = parseFloat(form.riskAmount) || 0;
  const isOversized = riskNum > meta.maxRiskPerTrade;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (isNaN(riskNum) || riskNum <= 0) { setError('Please enter a valid risk amount.'); return; }
    if (form.movedSL === null || form.revengeFlag === null) { setError('Please answer the accountability questions.'); return; }

    const consecLosses = consecutiveLossesAtEnd(todayTrades);
    const twoLossRuleBroken = consecLosses >= 2 && answers['q4'] === 'no';
    const oversizedPosition = riskNum > meta.maxRiskPerTrade;
    const movedSL    = form.movedSL === 'yes';
    const revengeFlag = form.revengeFlag === 'yes';

    const tradeData = {
      accountId: activeAccount.id,
      date: dateStr,
      pair: form.pair,
      direction: form.direction,
      entry: parseFloat(form.entry),
      stopLoss: parseFloat(form.stopLoss),
      takeProfit: parseFloat(form.takeProfit) || null,
      riskAmount: riskNum,
      result: form.result,
      pnl: parseFloat(form.pnl) || 0,
      notes: form.notes,
      movedSL, revengeFlag, oversizedPosition, twoLossRuleBroken,
      hasViolation: oversizedPosition || movedSL || revengeFlag || twoLossRuleBroken,
      punishmentCompleted: false,
    };

    setSaving(true);
    try {
      const savedT = await addTrade(tradeData);
      setSavedTrade(savedT);

      // Build punishment queue — one entry per violation type
      const queue = [];
      if (twoLossRuleBroken) queue.push({ trade: savedT, violationType: 'TWO_LOSS_RULE_BROKEN' });
      if (oversizedPosition) queue.push({ trade: savedT, violationType: 'OVERSIZED_POSITION' });
      if (movedSL)           queue.push({ trade: savedT, violationType: 'STOP_LOSS_MOVED' });
      if (revengeFlag)       queue.push({ trade: savedT, violationType: 'REVENGE_TRADE' });

      if (queue.length > 0) {
        setPunishmentQueue(queue);
        // Don't set saved=true yet — wait for all punishments to complete
      } else {
        setSaved(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to save trade');
    } finally {
      setSaving(false);
    }
  }

  async function handlePunishmentDismiss(punishmentRecord) {
    const current = punishmentQueue[0];
    if (current?.trade?.id) {
      // PATCH — only sends punishment fields, avoids result constraint issues
      await completePunishment(current.trade.id, punishmentRecord);
    }
    const remaining = punishmentQueue.slice(1);
    setPunishmentQueue(remaining);
    if (remaining.length === 0) {
      setSaved(true);
    }
  }

  // ── No check-in guard ────────────────────────────────────────────────────────
  if (!checkin) {
    return (
      <div>
        <div className="page-header"><h2>Log Trade</h2></div>
        <div className="alert alert-red" style={{ maxWidth: 500 }}>
          <strong>🚫 Daily check-in required</strong><br />
          You must complete today's check-in before logging a trade.
          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/checkin')}>
              Go to Check-In →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (saved) {
    const hadViolation = savedTrade?.hasViolation;
    return (
      <div>
        <div className="page-header"><h2>Log Trade</h2></div>
        <div className={`alert ${hadViolation ? 'alert-amber' : 'alert-green'}`} style={{ maxWidth: 500, marginBottom: 20 }}>
          {hadViolation
            ? '⚠️ Trade logged with violations. Punishment completed and recorded.'
            : '✅ Trade logged successfully. Clean execution.'}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={() => {
            setSaved(false); setChecklistDone(false); setAnswers({});
            setSavedTrade(null); setPunishmentQueue([]);
            setForm({ pair:'', direction:'Buy', entry:'', stopLoss:'', takeProfit:'', riskAmount:'', result:'Win', pnl:'', notes:'', movedSL:null, revengeFlag:null });
          }}>
            Log Another Trade
          </button>
          <button className="btn btn-ghost" onClick={() => navigate('/trades')}>View Trade Log</button>
        </div>
      </div>
    );
  }

  // ── Main form ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Punishment modal renders as a portal — always on top, regardless of page state */}
      {punishmentQueue.length > 0 && (
        <PunishmentModal
          trade={punishmentQueue[0].trade}
          violationType={punishmentQueue[0].violationType}
          meta={meta}
          onDismiss={handlePunishmentDismiss}
        />
      )}

      <div>
        <div className="page-header">
          <h2>Log Trade</h2>
          <p>{formatDate(dateStr)} · {activeAccount.name}</p>
        </div>

        {/* Daily status bar */}
        <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Today's P&L </span><span style={{ fontWeight: 800, color: dailyPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>{dailyPnL >= 0 ? '+' : ''}{fmtMoney(dailyPnL)}</span></div>
            <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Zone </span><span className={`badge badge-${zone}`}>{zone.toUpperCase()}</span></div>
            <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Trades today </span><span style={{ fontWeight: 700 }}>{todayTrades.length}</span></div>
            <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Mood </span><span style={{ fontWeight: 700 }}>{checkin.moodWord} ({checkin.mood}/5)</span></div>
            <div><span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Max risk </span><span style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmtMoney(meta.maxRiskPerTrade)}</span></div>
          </div>
        </div>

        {/* Step 1: Checklist */}
        {!checklistDone && (
          <div className="card" style={{ maxWidth: 580 }}>
            <div className="card-title">Pre-Trade Checklist</div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Answer honestly before every trade.</p>
            {CHECKLIST_QUESTIONS.map(q => (
              <div key={q.id} className="checklist-item" style={{ borderColor: answers[q.id] !== undefined ? ((q.blockOnYes && answers[q.id] === 'yes') || (q.warnOnNo && answers[q.id] === 'no') ? 'var(--red)' : 'var(--green)') : 'var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10, color: 'var(--text)' }}>{q.text}</div>
                  <div className="radio-group">
                    <button type="button" className={`radio-btn ${answers[q.id] === 'yes' ? 'selected-yes' : ''}`} onClick={() => setAnswer(q.id, 'yes')}>{q.yesLabel}</button>
                    <button type="button" className={`radio-btn ${answers[q.id] === 'no' ? 'selected-no' : ''}`} onClick={() => setAnswer(q.id, 'no')}>{q.noLabel}</button>
                  </div>
                  {q.warnOnNo && answers[q.id] === 'no' && <div className="alert alert-amber" style={{ marginTop: 10 }}>{q.warnMsg}</div>}
                  {q.blockOnYes && answers[q.id] === 'yes' && <div className="alert alert-red" style={{ marginTop: 10 }}>🚫 <strong>STOP.</strong> You agreed to message your mentor before a 3rd trade.</div>}
                </div>
              </div>
            ))}
            {error && <div className="alert alert-red" style={{ marginBottom: 12 }}>{error}</div>}
            {!hasBlocker() ? (
              <button className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} onClick={proceedChecklist} disabled={!allAnswered()}>
                Proceed to Trade Entry →
              </button>
            ) : (
              <div className="alert alert-red" style={{ marginTop: 12 }}>🚫 <strong>Trade blocked.</strong> Message your mentor before taking another trade today.</div>
            )}
          </div>
        )}

        {/* Step 2: Trade form */}
        {checklistDone && (
          <div className="card" style={{ maxWidth: 580 }}>
            <div className="card-title">Trade Entry</div>
            <form onSubmit={handleSubmit}>
              <div className="form-row form-row-2" style={{ marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Pair / Instrument</label>
                  <input type="text" placeholder="e.g. EUR/USD, NQ, AAPL" value={form.pair} onChange={e => handleChange('pair', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Direction</label>
                  <div className="radio-group">
                    <button type="button" className={`radio-btn ${form.direction === 'Buy' ? 'selected-yes' : ''}`} onClick={() => handleChange('direction', 'Buy')}>Buy ↑</button>
                    <button type="button" className={`radio-btn ${form.direction === 'Sell' ? 'selected-no' : ''}`} onClick={() => handleChange('direction', 'Sell')}>Sell ↓</button>
                  </div>
                </div>
              </div>

              <div className="form-row form-row-3" style={{ marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Entry Price</label>
                  <input type="number" step="any" placeholder="0.00" value={form.entry} onChange={e => handleChange('entry', e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Stop Loss 🔒</label>
                  <input type="number" step="any" placeholder="0.00" value={form.stopLoss} onChange={e => handleChange('stopLoss', e.target.value)} required />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Locked after saving</div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Take Profit</label>
                  <input type="number" step="any" placeholder="0.00" value={form.takeProfit} onChange={e => handleChange('takeProfit', e.target.value)} />
                </div>
              </div>

              <div className="form-row form-row-2" style={{ marginBottom: 16 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>
                    Risk Amount ($)
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6 }}>
                      standard: {fmtMoney(meta.maxRiskPerTrade)}
                    </span>
                  </label>
                  <input
                    type="number" step="0.01" min="0.01"
                    placeholder={fmtMoney(meta.maxRiskPerTrade).replace('$', '')}
                    value={form.riskAmount}
                    onChange={e => handleChange('riskAmount', e.target.value)}
                    required
                    style={{ borderColor: isOversized ? 'var(--red)' : 'var(--border)' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Conservative: {fmtMoney(meta.conservativeRisk)} · Standard: {fmtMoney(meta.maxRiskPerTrade)} · Max ever: {fmtMoney(meta.maxRiskEver)}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Result</label>
                  <div className="radio-group">
                    {['Win', 'Loss', 'Breakeven'].map(r => (
                      <button key={r} type="button"
                        className={`radio-btn ${form.result === r ? (r === 'Win' ? 'selected-yes' : r === 'Loss' ? 'selected-no' : '') : ''}`}
                        style={form.result === r && r === 'Breakeven' ? { background: 'rgba(59,130,246,0.15)', borderColor: 'var(--blue)', color: 'var(--blue)' } : {}}
                        onClick={() => handleChange('result', r)}>{r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {isOversized && (
                <div className="alert alert-red" style={{ marginBottom: 16 }}>
                  <strong>⚠️ You are risking more than your max ({fmtMoney(meta.maxRiskPerTrade)}).</strong><br />
                  This trade will be saved as a <strong>VIOLATION — OVERSIZED_POSITION</strong>. A punishment task will appear immediately after saving.
                </div>
              )}

              <div className="form-group">
                <label>P&L ($)</label>
                <input type="number" step="0.01" placeholder="e.g. 8.50 or -6.00" value={form.pnl} onChange={e => handleChange('pnl', e.target.value)} required />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea placeholder="What happened? What did you see? What would you do differently?" value={form.notes} onChange={e => handleChange('notes', e.target.value)} />
              </div>

              <div className="divider" />
              <div style={{ fontWeight: 700, marginBottom: 12, color: 'var(--text-dim)' }}>Accountability Questions</div>

              <div className="checklist-item" style={{ borderColor: form.movedSL === 'yes' ? 'var(--red)' : form.movedSL === 'no' ? 'var(--green)' : 'var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>Did you move the stop loss?</div>
                  <div className="radio-group">
                    <button type="button" className={`radio-btn ${form.movedSL === 'yes' ? 'selected-no' : ''}`} onClick={() => handleChange('movedSL', 'yes')}>Yes — Flag it 🚩</button>
                    <button type="button" className={`radio-btn ${form.movedSL === 'no' ? 'selected-yes' : ''}`} onClick={() => handleChange('movedSL', 'no')}>No ✓</button>
                  </div>
                  {form.movedSL === 'yes' && <div className="alert alert-red" style={{ marginTop: 10 }}>🚩 Permanently flagged. Punishment task required after saving.</div>}
                </div>
              </div>

              <div className="checklist-item" style={{ borderColor: form.revengeFlag === 'yes' ? 'var(--red)' : form.revengeFlag === 'no' ? 'var(--green)' : 'var(--border)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10 }}>Was this a revenge trade?</div>
                  <div className="radio-group">
                    <button type="button" className={`radio-btn ${form.revengeFlag === 'yes' ? 'selected-no' : ''}`} onClick={() => handleChange('revengeFlag', 'yes')}>Yes — Flag it 🚩</button>
                    <button type="button" className={`radio-btn ${form.revengeFlag === 'no' ? 'selected-yes' : ''}`} onClick={() => handleChange('revengeFlag', 'no')}>No ✓</button>
                  </div>
                  {form.revengeFlag === 'yes' && <div className="alert alert-red" style={{ marginTop: 10 }}>🚩 Permanently flagged. Punishment task required after saving.</div>}
                </div>
              </div>

              {error && <div className="alert alert-red" style={{ margin: '12px 0' }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? 'Saving…' : (isOversized || form.movedSL === 'yes' || form.revengeFlag === 'yes')
                    ? 'Save Trade (Violations Will Be Flagged)'
                    : 'Save Trade'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setChecklistDone(false)}>← Back</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
