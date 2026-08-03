import { describe, expect, it, vi } from 'vitest';
import { buildContractDecisionQueue, buildGMDecisionQueue, createContractDecisionQueueBuilder } from '../gmDecisionQueue.js';

const player = (id, overrides = {}) => ({
  id, name: `Player ${id}`, pos: 'QB', teamId: 10, status: 'active', age: 26, ovr: 76,
  potential: 77, morale: 68, schemeFit: 65, contract: { yearsRemaining: 1, baseAnnual: 5 },
  depthChart: { rowKey: 'QB', order: 1, role: 'starter' }, ...overrides,
});
const build = (roster, overrides = {}) => buildContractDecisionQueue({
  roster, team: { id: 10, roster, capRoom: 80 }, league: { phase: 'regular', week: 8, players: roster.filter((p) => p && typeof p === 'object'), draftClass: [] }, ...overrides,
});

describe('buildContractDecisionQueue', () => {
  it('includes expiring starters and backups but excludes unsupported membership/status/data', () => {
    const starter = player(1);
    const backup = player(2, { ovr: 68, depthChart: { order: 2, role: 'backup' } });
    const multi = player(3, { contract: { yearsRemaining: 3 } });
    const noContract = player(4, { contract: null });
    const foreign = player(5, { teamId: 11 });
    const freeAgent = player(6, { status: 'free_agent', teamId: null });
    const prospect = player(7, { isProspect: true });
    const retired = player(8, { retired: true });
    const result = build([starter, backup, multi, noContract, foreign, freeAgent, prospect, retired, 999]);
    expect(result.items.map((item) => item.subject.playerId)).toEqual(expect.arrayContaining([1, 2]));
    expect(result.items).toHaveLength(2);
    expect(result.items.find((item) => item.subject.playerId === 1).severity).toBe('high');
    expect(result.items.find((item) => item.subject.playerId === 2).severity).toBe('high');
    expect(result.diagnostics.map((row) => row.reason)).toEqual(expect.arrayContaining(['No current contract decision', 'No contract data', 'Player not owned by supplied team', 'Excluded player status', 'Unresolved player ID']));
  });

  it('never turns missing or blank terms into expiration and handles unsupported phases honestly', () => {
    expect(build([player(1, { contract: { yearsRemaining: '' } })]).items).toEqual([]);
    expect(build([player(1, { contract: { yearsRemaining: null } })]).diagnostics).toContainEqual({ playerId: 1, reason: 'Missing contract term' });
    expect(build([player(1)], { league: { phase: 'game_day', players: [player(1)] } })).toEqual({ items: [], diagnostics: [{ playerId: null, reason: 'Unsupported contract phase' }] });
  });

  it('maps canonical recommendations and explicit severity without cap or market copy', () => {
    const presentations = {
      1: { identity: { position: 'QB' }, contract: { recommendation: 'cornerstone_priority', roleImportance: 'core_starter', replacementDifficulty: 'high', negotiationRisk: 'high' } },
      2: { identity: { position: 'WR' }, contract: { recommendation: 'keep_if_price_is_right', roleImportance: 'rotation', replacementDifficulty: 'medium', negotiationRisk: 'medium' } },
      3: { identity: { position: 'CB' }, contract: { recommendation: 'likely_to_walk', roleImportance: 'depth', replacementDifficulty: 'low', negotiationRisk: 'low' } },
      4: { identity: { position: 'EDGE' }, contract: { recommendation: 'franchise_tag_candidate', roleImportance: 'starter', replacementDifficulty: 'high', negotiationRisk: 'high' } },
    };
    const builder = createContractDecisionQueueBuilder({ buildPresentation: ({ player: p }) => presentations[p.id] });
    const roster = [player(1), player(2), player(3), player(4)];
    const result = builder({ roster, team: { id: 10 }, league: { phase: 'regular', players: roster } });
    expect(result.items.map((item) => item.severity)).toEqual(['critical', 'high', 'medium', 'medium']);
    expect(result.items.map((item) => item.title)).toEqual(expect.arrayContaining([
      'Extension decision due for QB', 'WR enters contract decision window', 'Let-walk decision needed for CB', 'Tag or extension review required for EDGE',
    ]));
    expect(result.items[0].primaryReason).toBe('Contract expires after this season');
    expect(JSON.stringify(result)).not.toMatch(/cap claim|market value/i);
  });

  it('deduplicates, prefilters, orders independently of input order, and remains pure', () => {
    const calls = vi.fn(({ player: p }) => ({ identity: { position: p.pos }, contract: { recommendation: 'keep_if_price_is_right', roleImportance: p.ovr > 70 ? 'starter' : 'depth', replacementDifficulty: 'low', negotiationRisk: 'low' } }));
    const builder = createContractDecisionQueueBuilder({ buildPresentation: calls });
    const eligible = player('2');
    const later = player('10', { contract: { yearsRemaining: 3 } });
    const roster = Object.freeze([Object.freeze(eligible), eligible, Object.freeze(later)]);
    const args = { roster, team: Object.freeze({ id: 10 }), league: Object.freeze({ phase: 'regular', players: roster }) };
    const first = builder(args);
    const second = builder({ ...args, roster: [...roster].reverse() });
    expect(first.items.map((item) => item.subject.playerId)).toEqual(second.items.map((item) => item.subject.playerId));
    expect(first.diagnostics).toContainEqual({ playerId: '2', reason: 'Duplicate roster reference' });
    expect(calls).toHaveBeenCalledTimes(2);
    expect(roster).toHaveLength(3);
  });

  it('combines categories deterministically and keeps same-player distinct decisions', () => {
    const injured = player(1, { injury: { type: 'Knee', weeksRemaining: 3 } });
    const result = buildGMDecisionQueue({ roster: [injured], team: { id: 10, roster: [injured] }, league: { phase: 'regular', players: [injured] } });
    expect(result.items.map((item) => item.category)).toEqual(['contract', 'availability']);
    expect(new Set(result.items.map((item) => item.id)).size).toBe(result.items.length);
  });
});
