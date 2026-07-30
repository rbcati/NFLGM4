import { describe, expect, it } from 'vitest';
import { buildPostgameBriefing } from './postgameBriefing.js';

const final = {
  homeScore: 24,
  awayScore: 17,
  homeTeam: { id: 1, abbr: 'HME' },
  awayTeam: { id: 2, abbr: 'AWY' },
  userTeamId: 1,
};

describe('buildPostgameBriefing', () => {
  it('uses authoritative final scores for home wins, away losses, and ties', () => {
    expect(buildPostgameBriefing({ gameResult: final })).toMatchObject({ homeScore: 24, awayScore: 17, outcome: 'Win', userIsHome: true });
    expect(buildPostgameBriefing({ gameResult: { ...final, userTeamId: 2 } }).outcome).toBe('Loss');
    expect(buildPostgameBriefing({ gameResult: { ...final, homeScore: 10, awayScore: 10 } }).outcome).toBe('Tie');
  });

  it('handles an away user team and sparse legacy scores honestly', () => {
    expect(buildPostgameBriefing({ gameResult: { ...final, homeScore: 14, awayScore: 21, userTeamId: 2 } })).toMatchObject({ outcome: 'Win', userIsHome: false });
    expect(buildPostgameBriefing({ gameResult: { ...final, homeScore: null, awayScore: '' } })).toMatchObject({ hasFinal: false, outcome: 'Final' });
  });

  it('omits blank performer metrics and keeps available consequences', () => {
    const injury = { id: 9, name: 'A. Player' };
    const briefing = buildPostgameBriefing({
      gameResult: final,
      leaders: [{ name: 'Q. Back', statLine: '20/27, 250 yards' }, { name: 'Empty', statLine: '' }, { statLine: '2 sacks' }],
      injuries: [injury],
    });
    expect(briefing.leaders).toEqual([{ name: 'Q. Back', statLine: '20/27, 250 yards' }]);
    expect(briefing.injuries).toEqual([injury]);
  });
});
