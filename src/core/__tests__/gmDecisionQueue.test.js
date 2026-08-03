import { describe, expect, it, vi } from 'vitest';
import { buildAvailabilityDecisionQueue, createAvailabilityDecisionQueueBuilder } from '../gmDecisionQueue.js';

const player = (id, overrides = {}) => ({
  id, name: `Player ${id}`, pos: 'QB', teamId: 10, status: 'active', age: 26, ovr: 76,
  contract: { yearsRemaining: 2 }, depthChart: { rowKey: 'QB', order: 2, role: 'backup' },
  injury: { type: 'Knee', weeksRemaining: 2 }, ...overrides,
});
const build = (roster, overrides = {}) => buildAvailabilityDecisionQueue({
  roster, team: { id: 10, depthChart: { QB: roster.filter(Boolean).map((p) => p.id) } },
  league: { players: roster.filter((p) => p && typeof p === 'object'), draftClass: [] }, ...overrides,
});

describe('buildAvailabilityDecisionQueue', () => {
  it('includes unavailable starters/backups and excludes healthy or foreign players', () => {
    const starter = player(1, { depthChart: { rowKey: 'QB', order: 1, role: 'starter' } });
    const backup = player(2);
    const healthy = player(3, { injury: null });
    const foreign = player(4, { teamId: 11 });
    const result = build([starter, backup, healthy, foreign]);
    expect(result.items.map((item) => item.subject.playerId)).toEqual([1, 2]);
    expect(result.items[0]).toMatchObject({ severity: 'high', destination: { view: 'Depth Chart', playerId: 1 } });
    expect(result.items[1]).toMatchObject({ destination: { view: 'Injuries', playerId: 2 } });
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      { playerId: 3, reason: 'Healthy player' },
      { playerId: 4, reason: 'Player not owned by supplied team' },
    ]));
  });

  it.each([
    ['free agent', { status: 'free_agent', teamId: null }],
    ['draft prospect', { status: 'draft_eligible', draftEligible: true }],
    ['retired player', { status: 'retired', retired: true }],
  ])('excludes %s', (_label, fields) => {
    expect(build([player(1, fields)]).items).toEqual([]);
  });

  it('requires confirmed missing replacement for critical and a healthy backup prevents it', () => {
    const starter = player(1, { depthChart: { rowKey: 'QB', order: 1, role: 'starter' } });
    expect(build([starter]).items[0].severity).toBe('critical');
    expect(build([starter, player(2, { injury: null })]).items[0].severity).toBe('high');
    const missingDepth = build([starter], { team: { id: 10 }, league: { players: [starter] } });
    expect(missingDepth.items[0].severity).toBe('high');
    expect(missingDepth.diagnostics).toContainEqual({ playerId: 1, reason: 'Unsupported depth data for critical classification' });
  });

  it('does not invent starter status when role data is missing', () => {
    const incomplete = player(1, { depthChart: null, depthOrder: null, ovr: 1 });
    const result = build([incomplete]);
    expect(result.items[0]).toMatchObject({ severity: 'high', destination: { view: 'Injuries' } });
    expect(result.items[0].reasons).not.toContain('Recorded starter role');
  });

  it('uses authoritative High replacement difficulty to raise a backup to high', () => {
    const backup = player(1);
    const result = build([backup]);
    expect(result.items[0].severity).toBe('high');
    expect(result.items[0].reasons).toContain('High replacement difficulty');
  });

  it('renders recorded duration, omits missing duration, and preserves recorded zero without calling it missing', () => {
    const duration = build([player(1)]).items[0].reasons;
    expect(duration).toContain('Recorded absence: 2 weeks');
    const noDuration = build([player(2, { injury: { type: 'Knee', weeksRemaining: null } })]).items[0].reasons;
    expect(noDuration.join(' ')).not.toMatch(/0 week/);
    const zero = build([player(3, { injury: { type: 'Knee', weeksRemaining: 0 } })]).items[0];
    expect(zero.availableData.injuryDuration).toBe(true);
    expect(new Set(zero.reasons).size).toBe(zero.reasons.length);
  });

  it('orders by severity, role, replacement, then stable canonical ID independent of input order', () => {
    const rows = [player('20'), player(3), player('11')];
    const first = build(rows).items.map((item) => item.subject.playerId);
    const second = build([...rows].reverse()).items.map((item) => item.subject.playerId);
    expect(first).toEqual([3, '11', '20']);
    expect(second).toEqual(first);
  });

  it('deduplicates canonical IDs and presentation calls', () => {
    const presentation = vi.fn(({ player: input }) => ({
      identity: { statusKey: 'active_roster', position: input.pos }, role: { label: 'Backup' },
      availability: { available: false, detail: 'Knee' }, replacement: { label: 'Medium' },
    }));
    const builder = createAvailabilityDecisionQueueBuilder({ buildPresentation: presentation });
    const original = player(1);
    const result = builder({ roster: [original, { ...original }], team: { id: 10 }, league: { players: [original] } });
    expect(result.items).toHaveLength(1);
    expect(presentation).toHaveBeenCalledTimes(1);
    expect(result.diagnostics).toContainEqual({ playerId: 1, reason: 'Duplicate roster reference' });
  });

  it('prefilters healthy players before presentation construction', () => {
    const presentation = vi.fn();
    const builder = createAvailabilityDecisionQueueBuilder({ buildPresentation: presentation });
    builder({ roster: [player(1, { injury: null })], team: { id: 10 }, league: {} });
    expect(presentation).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'injured_reserve', injury: null }], [{ onIR: true, injury: null }],
    [{ injuryWeeksRemaining: 3, injury: null }], [{ injury: { type: 'Knee', weeksRemaining: null } }],
    [{ injury: { status: 'Out', weeksRemaining: '' } }],
  ])('handles legacy/partial unavailable shape %j', (fields) => {
    expect(build([player(1, fields)]).items).toHaveLength(1);
  });

  it('is pure, deterministic, and safely handles stale/partial inputs', () => {
    const roster = [player(1)];
    const team = { id: 10, depthChart: { QB: [1] } };
    const league = { players: roster };
    const stats = { 1: { passYd: 0 } };
    const snapshot = structuredClone({ roster, team, league, stats });
    const input = { roster, team, league, seasonStatsByPlayerId: stats };
    expect(buildAvailabilityDecisionQueue(input)).toEqual(buildAvailabilityDecisionQueue(input));
    expect({ roster, team, league, stats }).toEqual(snapshot);
    expect(buildAvailabilityDecisionQueue({ roster: [999], team, league })).toMatchObject({ items: [] });
    expect(buildAvailabilityDecisionQueue({ roster: [], team, league }).items).toEqual([]);
    expect(buildAvailabilityDecisionQueue({ roster: null, team: null, league: null }).diagnostics).not.toEqual([]);
  });
});
