import React, { useMemo } from 'react';
import { buildGMDecisionQueue } from '../../core/gmDecisionQueue.js';

const SEVERITY_STYLES = {
  critical: { label: 'Critical', color: 'var(--danger, #FF453A)', background: 'rgba(255,69,58,.12)' },
  high: { label: 'High', color: 'var(--warning, #FF9F0A)', background: 'rgba(255,159,10,.12)' },
  medium: { label: 'Medium', color: '#FFD60A', background: 'rgba(255,214,10,.12)' },
};

function isDepthChartDestination(destination) {
  return destination?.view === 'Depth Chart';
}

function routeFor(destination) {
  if (destination?.view === 'Contract Center') return 'Contract Center';
  return isDepthChartDestination(destination) ? 'Team:Roster / Depth' : 'Team:Injuries';
}

export default function GMDecisionCenter({ league, onNavigate }) {
  const team = useMemo(
    () => (league?.teams ?? []).find((entry) => String(entry?.id) === String(league?.userTeamId)),
    [league?.teams, league?.userTeamId],
  );
  const queue = useMemo(() => buildGMDecisionQueue({
    roster: team?.roster,
    team,
    league,
    seasonStatsByPlayerId: league?.seasonStatsByPlayerId,
  }), [league, team]);
  const items = queue.items.slice(0, 3);

  if (items.length === 0) return null;

  return (
    <section
      aria-labelledby="gm-decisions-heading"
      data-testid="gm-decision-center"
      style={{ margin: '4px 12px', border: '1px solid var(--hairline-strong)', borderRadius: 'var(--radius-md)', background: 'var(--surface-strong)', overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--hairline)' }}>
        <h2 id="gm-decisions-heading" style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 900 }}>GM Decisions</h2>
        {/* TODO: Enable when the expanded multi-category decision queue has an existing destination. */}
        <button type="button" className="btn btn-sm" disabled>View All</button>
      </div>
      <div>
        {items.map((item, index) => {
          const severity = SEVERITY_STYLES[item.severity] ?? SEVERITY_STYLES.medium;
          const depthChart = isDepthChartDestination(item.destination);
          const contract = item.category === 'contract';
          return (
            <article
              key={item.id}
              data-testid="gm-decision-item"
              style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: index < items.length - 1 ? '1px solid var(--hairline)' : 0 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <span
                    aria-label={`${severity.label} severity`}
                    style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 999, color: severity.color, background: severity.background, fontSize: 'var(--text-xs)', fontWeight: 900 }}
                  >
                    {item.severity === 'critical' ? '⚠ ' : ''}{severity.label}
                  </span>
                  <div style={{ marginTop: 5, fontSize: 'var(--text-sm)', fontWeight: 800 }}>{item.title}</div>
                  {item.primaryReason ? <div style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>• {item.primaryReason}</div> : null}
                </div>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => onNavigate?.(routeFor(item.destination))}
                  style={{ flex: '0 0 auto' }}
                >
                  {contract ? 'Review Contract' : depthChart ? 'Review Depth Chart' : 'Review'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
