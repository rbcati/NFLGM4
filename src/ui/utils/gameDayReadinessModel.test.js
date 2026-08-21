import { describe, expect, it } from 'vitest';
import { buildGameDayReadinessModel } from './gameDayReadinessModel.js';

describe('buildGameDayReadinessModel', () => {
  it('projects factual canonical counts and blocking starter state', () => {
    const roster = [
      { id: 1, name: 'QB One', pos: 'QB', injured: true, depthOrder: 1 },
      { id: 2, name: 'Wide One', pos: 'WR', holdout: { active: true }, depthOrder: 1 },
      { id: 3, name: 'Edge One', pos: 'EDGE', seasonEndingInjury: true, depthOrder: 1 },
      { id: 4, name: 'QB Two', pos: 'QB', depthOrder: 2 },
    ];
    const before = structuredClone(roster);
    const model = buildGameDayReadinessModel({ roster });

    expect(model.availableCount).toBe(1);
    expect(model.unavailableCount).toBe(3);
    expect(model.unavailableStarterCount).toBe(3);
    expect(model.blockingLineupIssue).toBe(true);
    expect(model.majorInjuryStress).toBe(false);
    expect(model.status).toBe('blocking');
    expect(roster).toEqual(before);
    expect(buildGameDayReadinessModel({ roster })).toEqual(model);
  });

  it('is healthy when every player is canonically available and ignores stale injury copy', () => {
    const model = buildGameDayReadinessModel({ roster: [{ id: 1, injury: { status: 'Out', gamesRemaining: 4 } }] });
    expect(model).toMatchObject({ availableCount: 1, unavailableCount: 0, unavailableStarterCount: 0, blockingLineupIssue: false, status: 'ready' });
  });
});
