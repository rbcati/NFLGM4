import { describe, expect, it } from 'vitest';
import { buildPlayerDecisionPresentation } from '../playerDecisionPresentation.js';

const starter = {
  id: 1, name: 'Jordan Longname', pos: 'QB', age: 25, ovr: 84, potential: 88, teamId: 10,
  status: 'active', depthChart: { order: 1, role: 'starter' }, progressionDelta: 2,
  ratings: { awareness: 80, throwAccuracy: 82, throwPower: 80 },
  contract: { yearsRemaining: 1, baseAnnual: 18 },
};
const team = { id: 10, abbr: 'POR', capRoom: 40, wins: 7, losses: 2 };
const league = { phase: 'regular', week: 10, players: [starter, { id: 2, pos: 'QB', teamId: 10, status: 'active', ovr: 68 }] };

describe('buildPlayerDecisionPresentation', () => {
  it('builds a deterministic starter decision from canonical role and re-sign evaluation', () => {
    const input = { player: starter, team, league, seasonStats: { passAtt: 120, passComp: 80, passYd: 1050, passTD: 8, interceptions: 2 } };
    const first = buildPlayerDecisionPresentation(input);
    expect(first).toEqual(buildPlayerDecisionPresentation(input));
    expect(first.role.label).toBe('Starter');
    expect(first.performance.metrics.map((metric) => metric.value)).toContain(1050);
    expect(first.development.label).toBe('Rising');
    expect(first.replacement.label).toBe('High');
    expect(first.recommendation.reasons.length).toBeGreaterThanOrEqual(2);
    expect(new Set(first.recommendation.reasons).size).toBe(first.recommendation.reasons.length);
  });

  it.each([
    ['backup', { ...starter, depthChart: { order: 2 }, contract: { years: 3 } }, 'Backup'],
    ['free agent', { ...starter, teamId: null, status: 'free_agent', contract: null }, 'Free agent'],
    ['draft prospect', { ...starter, teamId: null, status: 'draft_eligible', contract: null }, 'Draft prospect'],
    ['retired player', { ...starter, status: 'retired', retired: true, contract: null }, 'Retired'],
    ['legacy role', { ...starter, depthChart: null, depthOrder: 1 }, 'Starter'],
  ])('handles %s identity/role', (_label, player, expected) => {
    expect(buildPlayerDecisionPresentation({ player, league }).role.label).toBe(expected);
  });

  it('reports injury availability and omits an unavailable jersey number', () => {
    const result = buildPlayerDecisionPresentation({ player: { ...starter, jerseyNumber: undefined, injury: { name: 'Hamstring', weeksRemaining: 3 } }, team, league });
    expect(result.identity.jerseyNumber).toBeNull();
    expect(result.availability).toMatchObject({ available: false, label: 'Unavailable · 3w' });
    expect(result.recommendation.action).toBe('Monitor injury recovery');
  });

  it.each([
    ['RB', { rushAtt: 20, rushYd: 100, rushTD: 0, recYd: 12 }, 'Yards / carry'],
    ['WR', { receptions: 0, recYd: 0, recTD: 0, targets: 1 }, 'Receptions'],
    ['LB', { tackles: 10, sacks: 0, interceptions: 0 }, 'Tackles'],
    ['K', { fgMade: 0, fgAttempts: 1, longestFG: 0 }, 'Field goals'],
  ])('formats %s stats and preserves legitimate zeros', (pos, seasonStats, metric) => {
    const result = buildPlayerDecisionPresentation({ player: { ...starter, pos }, seasonStats });
    expect(result.performance.available).toBe(true);
    expect(result.performance.metrics.some((row) => row.label === metric)).toBe(true);
  });

  it('distinguishes missing stats from zero values and ignores missing fields', () => {
    expect(buildPlayerDecisionPresentation({ player: starter }).performance).toMatchObject({ available: false, metrics: [] });
    const zero = buildPlayerDecisionPresentation({ player: starter, seasonStats: { passAtt: 1, passYd: 0, passTD: 0 } });
    expect(zero.performance.metrics.find((metric) => metric.label === 'Passing yards').value).toBe(0);
  });

  it.each([
    [[{ ovr: 70 }, { ovr: 74 }], 'Rising'],
    [[{ overall: 70 }, { overall: 70 }], 'Stable'],
    [[{ ovr: 74 }, { ovr: 70 }], 'Declining'],
    [[], 'Insufficient history'],
  ])('classifies recorded development history', (ratingHistory, label) => {
    expect(buildPlayerDecisionPresentation({ player: { ...starter, progressionDelta: undefined, ratingHistory } }).development.label).toBe(label);
  });

  it('handles no-contract and legacy contract shapes honestly', () => {
    expect(buildPlayerDecisionPresentation({ player: { ...starter, contract: null } }).contract.label).toBe('No contract data');
    const legacy = buildPlayerDecisionPresentation({ player: { ...starter, contract: { years: 2, salary: 6 } } });
    expect(legacy.contract).toMatchObject({ yearsRemaining: 2, capHit: 6, available: true });
  });

  it('does not evaluate replacement or recommend actions without team inputs', () => {
    const result = buildPlayerDecisionPresentation({ player: starter, league });
    expect(result.replacement).toBeNull();
    expect(result.recommendation).toBeNull();
    expect(result.omittedReasons).toContain('Replacement evaluation unavailable');
  });
});
