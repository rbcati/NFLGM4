import React from 'react';

const labelStyle = { color: 'var(--text-subtle)', fontSize: 'var(--text-xs)', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' };

function money(value) {
  if (value == null) return null;
  const amount = Math.abs(Number(value)) >= 1000 ? Number(value) / 1e6 : Number(value);
  return `$${amount.toFixed(amount % 1 ? 1 : 0)}M`;
}

export default function PlayerDecisionCard({ presentation, onNavigate }) {
  if (!presentation?.identity) return null;
  const { role, availability, performance, development, contract, rosterValue, replacement, recommendation } = presentation;
  return (
    <section
      className="card-enter"
      data-testid="player-decision-card"
      aria-labelledby="player-decision-heading"
      style={{ border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', background: 'linear-gradient(145deg, rgba(10,132,255,.10), var(--surface-strong))', minWidth: 0 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <div style={labelStyle}>Decision summary</div>
          <h3 id="player-decision-heading" style={{ margin: '3px 0 0', fontSize: 'var(--text-lg)', overflowWrap: 'anywhere' }}>{role.label}</h3>
          <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 3 }}>
            {[role.archetype, availability.label].filter(Boolean).join(' · ')}
          </div>
        </div>
        {recommendation ? (
          <div style={{ minWidth: 'min(100%, 230px)', flex: '1 1 230px', maxWidth: 420 }} data-testid="player-decision-recommendation">
            <div style={labelStyle}>GM consideration</div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 900, marginTop: 3 }}>{recommendation.action}</div>
            <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
              {recommendation.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        ) : null}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12, marginTop: 16 }}>
        {performance.available && <div data-testid="player-decision-performance"><div style={labelStyle}>Performance</div>{performance.metrics.slice(0, 4).map((metric) => <div key={metric.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'var(--text-sm)', marginTop: 4 }}><span style={{ color: 'var(--text-muted)' }}>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>}
        <div data-testid="player-decision-development"><div style={labelStyle}>Development</div><strong style={{ display: 'block', marginTop: 4 }}>{development.label}</strong><div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 3 }}>{development.detail}</div></div>
        {contract.available && <div data-testid="player-decision-contract"><div style={labelStyle}>Contract outlook</div><strong style={{ display: 'block', marginTop: 4 }}>{contract.label}</strong><div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 3 }}>{contract.yearsRemaining != null ? `${contract.yearsRemaining} year${contract.yearsRemaining === 1 ? '' : 's'} remaining` : 'Term unavailable'}{money(contract.capHit) ? ` · ${money(contract.capHit)} cap/salary` : ''}</div></div>}
        {(rosterValue || replacement) && <div data-testid="player-decision-value"><div style={labelStyle}>Team value</div>{rosterValue && <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Roster value </span><strong>{rosterValue.label}</strong></div>}{replacement && <div style={{ marginTop: 4 }}><span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Replacement </span><strong>{replacement.label}</strong></div>}</div>}
      </div>
      {onNavigate && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }} aria-label="Player decision actions">
          <button className="btn" onClick={() => onNavigate('Depth Chart')}>Open depth chart</button>
          <button className="btn" onClick={() => onNavigate('Trade Center')}>Trade workspace</button>
          <button className="btn" onClick={() => onNavigate('Contract Center')}>Contract center</button>
        </div>
      )}
    </section>
  );
}
