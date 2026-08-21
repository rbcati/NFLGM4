import { describe, expect, it } from 'vitest';
import { deriveGameDayAvailability } from '../gameDayAvailability.js';

const player = (id, fields = {}) => ({ id, name: `Player ${id}`, teamId: 1, ...fields });

describe('deriveGameDayAvailability', () => {
  it('keeps the full injury context while deriving a separate eligible roster', () => {
    const roster = [
      player(1, { pos: 'QB', injured: true, depthOrder: 1 }),
      player(2, { pos: 'WR', seasonEndingInjury: true, depthChart: { order: 1 } }),
      player(3, { pos: 'EDGE', injured: true, depthOrder: 1 }),
      player(4, { pos: 'QB', depthOrder: 2 }),
    ];
    const before = structuredClone(roster);

    const facts = deriveGameDayAvailability(roster, { teamId: 1 });

    expect(facts.fullRoster).toHaveLength(4);
    expect(facts.injuredPlayers).toHaveLength(3);
    expect(facts.injuredStarters).toHaveLength(3);
    expect(facts.majorInjuryStress).toBe(true);
    expect(facts.blockingLineupIssue).toBe(true);
    expect(facts.eligiblePlayers.map(({ id }) => id)).toEqual([4]);
    expect(roster).toEqual(before);
    expect(deriveGameDayAvailability(roster, { teamId: 1 })).toEqual(facts);
  });

  it('composes holdout, practice-squad, retirement, and ownership authorities', () => {
    const roster = [
      player(1),
      player(2, { holdout: { active: true } }),
      player(3, { status: 'practice_squad' }),
      player(4, { status: 'ps' }),
      player(5, { onPracticeSquad: true }),
      player(6, { retired: true }),
      player(7, { teamId: 2 }),
    ];
    expect(deriveGameDayAvailability(roster, { teamId: 1 }).eligiblePlayers.map(({ id }) => id)).toEqual([1]);
  });

  it('does not independently parse descriptive legacy injury metadata', () => {
    const stale = player(1, { injury: { name: 'Knee', status: 'Out', weeksRemaining: 8 } });
    const facts = deriveGameDayAvailability([stale], { teamId: 1 });
    expect(facts.injuredPlayers).toEqual([]);
    expect(facts.eligiblePlayers).toEqual([stale]);
  });
});
