import { describe, expect, it } from 'vitest';
import { buildWeeklyRecapMetrics } from './weeklyRecapMetrics.js';

const rich = {
  gameId: 'week-5-user', homeId: 1, awayId: 2,
  simFactors: { away: { qbRating: 88.2, rushYpc: 3.4 }, home: { qbRating: 102.4, rushYpc: 4.8 } },
  teamStats: { away: { turnovers: 1, sacksMade: 2 }, home: { turnovers: 0, sacksMade: 4 } },
};

describe('weekly recap metric authority', () => {
  it('reads rich-result canonical metrics and preserves known zero', () => {
    expect(buildWeeklyRecapMetrics(rich)).toEqual([
      expect.objectContaining({ label: 'QB Rtg', away: 88.2, home: 102.4 }),
      expect.objectContaining({ label: 'YPC', away: 3.4, home: 4.8 }),
      expect.objectContaining({ label: 'TO', away: 1, home: 0 }),
      expect.objectContaining({ label: 'Sacks', away: 2, home: 4 }),
    ]);
  });

  it('derives factual YPC only when both rushing inputs are recorded', () => {
    const rows = buildWeeklyRecapMetrics({
      homeId: 1, awayId: 2,
      teamStats: { away: { rushYd: 68, rushAtt: 20 }, home: { rushYd: 96, rushAtt: 20 } },
    });
    expect(rows).toEqual([expect.objectContaining({ label: 'YPC', away: 3.4, home: 4.8 })]);
  });

  it('omits genuinely unavailable metrics rather than returning blank shells', () => {
    expect(buildWeeklyRecapMetrics({ gameId: 'sparse', homeId: 1, awayId: 2 })).toEqual([]);
  });

  it('never enriches a recap from a different completed game', () => {
    const recap = { gameId: 'user-game', homeId: 1, awayId: 2 };
    expect(buildWeeklyRecapMetrics(recap, [{ ...rich, gameId: 'other-game', homeId: 3, awayId: 4 }])).toEqual([]);
  });
});
