import { useState } from 'react';
import { useAccount } from '../AccountContext';
import { today, formatDate } from '../store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const MOOD_LABELS = { 1: '😤 Revenge', 2: '😟 Anxious', 3: '😐 Neutral', 4: '🙂 Focused', 5: '😎 Calm' };

export default function Journal() {
  const { activeAccount, checkins, journalEntries, saveJournalEntry } = useAccount();
  const dateStr = today();

  if (!activeAccount) return <div className="alert alert-red">No account selected.</div>;

  const existing = journalEntries?.find(e => e.date === dateStr);
  const [text, setText] = useState(existing?.text ?? '');
  const [saved, setSaved] = useState(!!existing);
  const [saving, setSaving] = useState(false);
  const [viewDate, setViewDate] = useState(dateStr);

  const entries = [...(journalEntries || [])].sort((a, b) => b.date.localeCompare(a.date));
  const sortedCheckins = [...(checkins || [])].sort((a, b) => a.date.localeCompare(b.date));
  const moodData = sortedCheckins.slice(-30).map(c => ({ date: c.date, mood: c.mood, word: c.moodWord }));

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await saveJournalEntry({ accountId: activeAccount.id, date: dateStr, text: text.trim() });
      setSaved(true);
    } catch {}
    finally { setSaving(false); }
  }

  const viewEntry = entries.find(e => e.date === viewDate);

  return (
    <div>
      <div className="page-header"><h2>Journal</h2><p>{activeAccount.name} — daily reflections and mood history</p></div>
      <div className="grid grid-2" style={{ gap: 20, alignItems: 'start' }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title">Today's Entry — {formatDate(dateStr)}</div>
            <textarea style={{ minHeight: 180 }} placeholder="How did today go? What did you learn? What will you do differently tomorrow?" value={text} onChange={e => { setText(e.target.value); setSaved(false); }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{text.length} chars</span>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!text.trim() || saving}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Entry'}</button>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Past Entries</div>
            {entries.length === 0 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No journal entries yet.</div> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map(e => (
                  <button key={e.date} className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start', textAlign: 'left', background: viewDate === e.date ? 'var(--surface2)' : 'transparent', borderColor: viewDate === e.date ? 'var(--accent)' : 'var(--border)' }} onClick={() => setViewDate(e.date)}>
                    <span style={{ fontWeight: 700, marginRight: 8 }}>{formatDate(e.date)}</span>
                    <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.text?.slice(0, 60)}{e.text?.length > 60 ? '…' : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          {viewEntry && viewDate !== dateStr && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title">{formatDate(viewDate)}</div>
              <div style={{ color: 'var(--text-dim)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontSize: 14 }}>{viewEntry.text}</div>
            </div>
          )}
          <div className="card">
            <div className="card-title">Mood History (last 30 days)</div>
            {moodData.length < 2 ? <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Complete more daily check-ins to see your mood trend.</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={moodData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={d => { const p = d.split('-'); return `${p[1]}/${p[2]}`; }} />
                  <YAxis domain={[1, 5]} ticks={[1,2,3,4,5]} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => MOOD_LABELS[v]?.split(' ')[0] || v} />
                  <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }} labelFormatter={d => formatDate(d)} formatter={(val) => [MOOD_LABELS[val], 'Mood']} />
                  <Line type="monotone" dataKey="mood" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
            {sortedCheckins.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Check-Ins</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[...sortedCheckins].reverse().slice(0, 7).map(c => (
                    <div key={c.date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(c.date)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{MOOD_LABELS[c.mood]}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>"{c.moodWord}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
