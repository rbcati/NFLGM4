import { describe, expect, it } from 'vitest';
import { buildPostgameEmotionalFrame } from './postgameEmotionalFrame.js';

function concern(stats) {
  return buildPostgameEmotionalFrame({
    homeId: 1,
    awayId: 2,
    userTeamId: 1,
    homeScore: 21,
    awayScore: 24,
    teamStats: { home: stats, away: {} },
  })?.biggestConcern?.label;
}

describe('postgame emotional stat evidence', () => {
  it.each([
    { passYd: 220, rushYd: 134 },
    { passYards: 220, rushYards: 134 },
  ])('does not call recorded productive offense stalled (%o)', (stats) => {
    expect(concern(stats)).not.toBe('Offense stalled');
  });

  it('does not turn missing offense stats into zero', () => {
    expect(concern({ turnovers: 1 })).not.toBe('Offense stalled');
  });

  it('retains the concern when both recorded metrics support it', () => {
    expect(concern({ passYd: 119, rushYd: 57 })).toBe('Offense stalled');
  });
});
