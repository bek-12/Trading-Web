export default function Rules() {
  const rules = [
    {
      icon: '💰',
      title: 'Never risk more than $6 per trade',
      detail: 'Maximum risk per trade is $6. Acceptable range: $3–$12. Anything outside this range is a violation.',
      severity: 'red',
    },
    {
      icon: '🔒',
      title: 'Stop loss is placed and NEVER moved',
      detail: 'Once your stop loss is set, it does not move. Not for any reason. Moving a stop loss is a permanent violation that will be flagged on every trade forever.',
      severity: 'red',
    },
    {
      icon: '📉',
      title: 'Personal daily red line: -$60',
      detail: 'If you lose $60 in a single day, you are done trading for that day. No exceptions. Green zone: $0 to -$30. Amber zone: -$30 to -$60. Red zone: -$60+.',
      severity: 'red',
    },
    {
      icon: '✋',
      title: '2 losses in a row = stop and message mentor',
      detail: 'After 2 consecutive losses, you must stop trading and message your mentor before taking any further trades that day. The app will block you from logging a 3rd trade.',
      severity: 'amber',
    },
    {
      icon: '🚫',
      title: 'Revenge trading = close platform immediately',
      detail: 'If you catch yourself revenge trading, close the platform immediately. Revenge trades are permanently flagged and visible in your log forever.',
      severity: 'red',
    },
    {
      icon: '📋',
      title: 'Daily check-in required before first trade',
      detail: 'You must complete the daily check-in (balance, emotional state, mood word) before logging any trade. If your emotional state is 1 or 2, consider a no-trade day.',
      severity: 'amber',
    },
  ];

  const principles = [
    'The market will always be there tomorrow.',
    'Protect the capital first. Profits follow discipline.',
    'A trade not taken is never a loss.',
    'Your edge only works if you follow it consistently.',
    'One bad day can erase a week of good trading.',
    'Discipline is the only edge that compounds.',
  ];

  return (
    <div>
      <div className="page-header">
        <h2>Trading Rules</h2>
        <p>Read-only. These rules are non-negotiable.</p>
      </div>

      <div className="alert alert-blue" style={{ marginBottom: 24 }}>
        📌 These rules exist to protect your capital and your psychology. They are not suggestions.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {rules.map((rule, i) => (
          <div
            key={i}
            className="card"
            style={{
              borderLeft: `4px solid ${rule.severity === 'red' ? 'var(--red)' : 'var(--amber)'}`,
              display: 'flex',
              gap: 16,
              alignItems: 'flex-start',
            }}
          >
            <div style={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{rule.icon}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6, color: 'var(--text)' }}>
                {rule.title}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.6 }}>
                {rule.detail}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
              <span className={`badge badge-${rule.severity}`}>
                {rule.severity === 'red' ? 'CRITICAL' : 'IMPORTANT'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title">Trader's Principles</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {principles.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: i < principles.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 16, lineHeight: 1.4 }}>{i + 1}.</span>
              <span style={{ color: 'var(--text-dim)', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>"{p}"</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24, padding: '16px 20px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius)' }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--accent)' }}>Zone Reference</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="zone-dot" style={{ background: 'var(--green)', width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 13 }}><strong style={{ color: 'var(--green)' }}>Green Zone</strong> — Daily loss $0 to -$30</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="zone-dot" style={{ background: 'var(--amber)', width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 13 }}><strong style={{ color: 'var(--amber)' }}>Amber Zone</strong> — Daily loss -$30 to -$60</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="zone-dot" style={{ background: 'var(--red)', width: 12, height: 12, borderRadius: '50%', display: 'inline-block' }} />
            <span style={{ fontSize: 13 }}><strong style={{ color: 'var(--red)' }}>Red Zone</strong> — Daily loss -$60+ (stop trading)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
