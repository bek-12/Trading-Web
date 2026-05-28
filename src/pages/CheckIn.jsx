import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../AccountContext';
import { today, getCheckinForDate, formatDate, fmtMoney } from '../store';

const MOOD_LABELS = {
  1: '😤 Revenge Mode', 2: '😟 Anxious', 3: '😐 Neutral',
  4: '🙂 Focused', 5: '😎 Calm & Sharp',
};

export default function CheckIn() {
  const navigate = useNavigate();
  const { activeAccount, meta, checkins, addCheckin, refresh } = useAccount();
  const dateStr = today();

  if (!activeAccount || !meta) {
    return (
      <div className="alert alert-red" style={{ maxWidth: 500 }}>
        <strong>No account selected.</strong>
        <div style={{ marginTop: 12 }}><button className="btn btn-primary btn-sm" onClick={() => navigate('/accounts')}>Go to Accounts →</button></div>
      </div>
    );
  }

  const existing = getCheckinForDate(checkins, dateStr);

  const [balance, setBalance] = useState(existing?.balance ?? '');
  const [mood, setMood] = useState(existing?.mood ?? 3);
  const [moodWord, setMoodWord] = useState(existing?.moodWord ?? '');
  const [understand, setUnderstand] = useState('');
  const [saved, setSaved] = useState(!!existing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const balanceNum = balance !== '' ? parseFloat(balance) : null;
  const realCapitalRemaining = balanceNum !== null ? balanceNum - meta.accountFloor : null;
  const realCapitalPct = realCapitalRemaining !== null && meta.realCapital > 0
    ? ((realCapitalRemaining / meta.realCapital) * 100).toFixed(1) : null;

  const isHighRisk = mood <= 2;
  const canProceed = !isHighRisk || understand.trim().toUpperCase() === 'I UNDERSTAND';

  async function handleSave(e) {
    e.preventDefault();
    if (!balance || !moodWord.trim() || !canProceed) return;
    setSaving(true);
    setError('');
    try {
      await addCheckin({
        accountId: activeAccount.id,
        date: dateStr,
        balance: parseFloat(balance),
        mood,
        moodWord: moodWord.trim(),
        realCapitalRemaining,
        realCapitalPct,
      });
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Failed to save check-in');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Daily Check-In</h2>
        <p>{formatDate(dateStr)} · {activeAccount.name}</p>
      </div>

      {saved && (
        <div className="alert alert-green" style={{ marginBottom: 20 }}>
          ✅ Check-in complete for today. You're cleared to trade.
          <button className="btn btn-primary btn-sm" style={{ marginLeft: 16 }} onClick={() => navigate('/new-trade')}>Log a Trade →</button>
        </div>
      )}

      <div className="card" style={{ maxWidth: 560 }}>
        <div className="card-title">Today's Check-In</div>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label>Current Broker Balance ($)</label>
            <input type="number" step="0.01" placeholder={`e.g. ${activeAccount.startingBalance?.toFixed(2) || '6000.00'}`}
              value={balance} onChange={e => { setBalance(e.target.value); setSaved(false); }} required />
          </div>

          {balanceNum !== null && (
            <div className="card" style={{ background: 'var(--surface2)', marginBottom: 16, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Capital Above Floor</span>
                <span style={{ fontWeight: 800, color: realCapitalRemaining >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(realCapitalRemaining)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Capital % Intact</span>
                <span style={{ fontWeight: 800, color: realCapitalPct >= 50 ? 'var(--green)' : realCapitalPct >= 20 ? 'var(--amber)' : 'var(--red)' }}>{realCapitalPct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, realCapitalPct))}%`, background: realCapitalPct >= 50 ? 'var(--green)' : realCapitalPct >= 20 ? 'var(--amber)' : 'var(--red)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Floor: {fmtMoney(meta.accountFloor)}</span>
                <span>Start: {fmtMoney(activeAccount.startingBalance)}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Emotional State — {MOOD_LABELS[mood]}</label>
            <div className="slider-wrap">
              <input type="range" min="1" max="5" step="1" value={mood}
                onChange={e => setMood(parseInt(e.target.value))}
                style={{ background: `linear-gradient(to right, ${mood <= 2 ? 'var(--red)' : mood === 3 ? 'var(--amber)' : 'var(--green)'} ${(mood-1)*25}%, var(--surface2) ${(mood-1)*25}%)` }} />
              <div className="mood-labels"><span>1 — Revenge</span><span>3 — Neutral</span><span>5 — Focused</span></div>
            </div>
          </div>

          {isHighRisk && (
            <div className="alert alert-red" style={{ marginBottom: 16 }}>
              <strong>⚠️ HIGH RISK MENTAL STATE</strong><br />
              Consider making today a no-trade day.
              <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                <label style={{ color: '#fca5a5' }}>Type "I UNDERSTAND" to proceed anyway</label>
                <input type="text" placeholder="I UNDERSTAND" value={understand} onChange={e => setUnderstand(e.target.value)} style={{ borderColor: 'var(--red)' }} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>One word describing how you feel today</label>
            <input type="text" placeholder="e.g. Sharp, Tired, Confident..." value={moodWord} onChange={e => setMoodWord(e.target.value)} maxLength={20} required />
          </div>

          {error && <div className="alert alert-red" style={{ marginBottom: 12 }}>{error}</div>}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 4 }}
            disabled={!canProceed || !balance || !moodWord.trim() || saving}>
            {saving ? 'Saving…' : saved ? 'Update Check-In' : 'Complete Check-In'}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 16 }}>
        <div className="card-title">Today's Risk Reference — {activeAccount.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            ['Conservative Risk (0.5%)', fmtMoney(meta.conservativeRisk), 'var(--green)'],
            ['Standard Risk (1%)', fmtMoney(meta.maxRiskPerTrade), 'var(--green)'],
            ['Max Risk Ever (2%)', fmtMoney(meta.maxRiskEver), 'var(--amber)'],
            ['Personal Daily Stop', fmtMoney(-meta.personalDailyStop), 'var(--amber)'],
            ['Green Zone limit', `≥ ${fmtMoney(meta.greenLimit)}`, 'var(--green)'],
            ['Amber Zone limit', `≥ ${fmtMoney(meta.amberLimit)}`, 'var(--amber)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
