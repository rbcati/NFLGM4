import { describe, expect, it } from 'vitest';
import { buildNextWeekStoryContext, buildWeeklyStoryPresentation, loadWeeklyStoryArchivedGame } from './weeklyStoryPresentation.js';

const teams = [
  { id: 1, abbr: 'BUF', conf: 0, division: 0 },
  { id: 2, abbr: 'MIA', conf: 0, division: 0 },
  { id: 3, abbr: 'KC', conf: 0, division: 1 },
  { id: 4, abbr: 'LV', conf: 0, division: 1 },
  { id: 5, abbr: 'DAL', conf: 1, division: 0 },
  { id: 6, abbr: 'NYG', conf: 1, division: 0 },
];
const league = { seasonId: 2030, teams, userTeamId: 1 };

function build(overrides = {}) {
  return buildWeeklyStoryPresentation({
    league,
    week: 4,
    userGame: { gameId: 'g1', homeId: 1, awayId: 2, homeScore: 27, awayScore: 20 },
    completedGames: [
      { gameId: 'g1', homeId: 1, awayId: 2, homeScore: 27, awayScore: 20 },
      { gameId: 'g2', homeId: 3, awayId: 4, homeScore: 31, awayScore: 10 },
      { gameId: 'g3', homeId: 5, awayId: 6, homeScore: 17, awayScore: 16 },
    ],
    ...overrides,
  });
}

describe('buildWeeklyStoryPresentation', () => {
  it('loads canonical Game Book evidence for the reduced WEEK_COMPLETE result path', async () => {
    const weekCompleteResult = { gameId: '2030_w4_1_2', seasonId: 2030, week: 4, homeId: 1, awayId: 2, homeScore: 24, awayScore: 17 };
    const canonicalArchive = {
      id: weekCompleteResult.gameId,
      season: 2030,
      week: 4,
      homeId: 1,
      awayId: 2,
      score: { home: 24, away: 17 },
      teamStats: { home: { turnovers: 0, rushYards: 184 }, away: { turnovers: 3, rushYards: 91 } },
    };
    const recordedGame = await loadWeeklyStoryArchivedGame({
      gameId: weekCompleteResult.gameId,
      getBoxScore: async () => ({ type: 'BOX_SCORE', payload: { game: canonicalArchive } }),
    });
    const vm = build({ userGame: recordedGame, completedGames: [weekCompleteResult] });
    expect(vm.userGameStory.takeaways).toContain('BUF protected the ball and finished plus-3 in turnover differential.');
    expect(vm.userGameStory.takeaways.join(' ')).not.toContain('detailed game evidence was not recorded');
  });

  it('explains home and away wins from meaningful recorded evidence', () => {
    const home = build({ userGame: { homeId: 1, awayId: 2, homeScore: 24, awayScore: 10, teamStats: { home: { turnovers: 0, rushYards: 184 }, away: { turnovers: 3, rushYards: 90 } } } });
    expect(home.userGameStory.takeaways.join(' ')).toContain('turnover differential');
    expect(home.userGameStory.takeaways.join(' ')).toContain('184 rushing yards');
    const away = build({ userGame: { homeId: 2, awayId: 1, homeScore: 10, awayScore: 21, teamStats: { home: { sacks: 1 }, away: { sacks: 5 } } } });
    expect(away.userGameStory.takeaways.join(' ')).toContain('5 sacks');
  });

  it('handles ties and score-only legacy games without invented causality', () => {
    const tie = build({ userGame: { homeId: 1, awayId: 2, homeScore: 20, awayScore: 20 } });
    expect(tie.userGameStory.takeaways).toEqual(['MIA and BUF finished tied at 20–20.']);
    const scoreOnly = build({ userGame: { homeId: 1, awayId: 2, homeScore: 7, awayScore: 10 } });
    expect(scoreOnly.userGameStory.takeaways[0]).toContain('detailed game evidence was not recorded');
  });

  it('does not make a contradictory takeaway when the losing team led a metric', () => {
    const vm = build({ userGame: { homeId: 1, awayId: 2, homeScore: 24, awayScore: 17, teamStats: { home: { rushYards: 70, turnovers: 2 }, away: { rushYards: 190, turnovers: 1 } } } });
    expect(vm.userGameStory.takeaways.join(' ')).not.toContain('ground game');
    expect(vm.userGameStory.takeaways.join(' ')).not.toContain('turnover differential');
  });

  it('orders headlines deterministically with stable ids and no duplicate types or subjects', () => {
    const first = build().leagueHeadlines;
    const second = build({ completedGames: [
      { gameId: 'g3', homeId: 5, awayId: 6, homeScore: 17, awayScore: 16 },
      { gameId: 'g2', homeId: 3, awayId: 4, homeScore: 31, awayScore: 10 },
      { gameId: 'g1', homeId: 1, awayId: 2, homeScore: 27, awayScore: 20 },
    ] }).leagueHeadlines;
    expect(second).toEqual(first);
    expect(new Set(first.map((row) => row.type)).size).toBe(first.length);
    expect(first.some((row) => row.type === 'largest-margin' && row.text.includes('31–10'))).toBe(true);
    expect(first.some((row) => row.type === 'closest' && row.text.includes('17–16'))).toBe(true);
    expect(first).toHaveLength(3);
  });

  it('omits unsupported upset and uses a recorded pregame probability when present', () => {
    expect(build().leagueHeadlines.some((row) => row.type === 'upset')).toBe(false);
    const vm = build({ completedGames: [{ gameId: 'up', homeId: 3, awayId: 4, homeScore: 17, awayScore: 20, homeWinProbability: 0.8 }] });
    expect(vm.leagueHeadlines.find((row) => row.type === 'upset')?.text).toContain('20% win probability');
  });

  it('claims standings movement only with authoritative before and after rows', () => {
    expect(build({ standingsAfter: [{ teamId: 1, divisionLeader: true }] }).standingsImpact).toEqual([]);
    const vm = build({ standingsBefore: [{ teamId: 1, divisionLeader: false, seed: 6 }], standingsAfter: [{ teamId: 1, divisionLeader: true, seed: 3 }] });
    expect(vm.standingsImpact[0].text).toBe('BUF took the division lead.');
  });

  it('uses only identified, recorded injuries', () => {
    const vm = build({ injuries: [{ id: 9, name: 'Starter QB', teamId: 3, injuryWeeksRemaining: 6, injury: { name: 'Shoulder' } }] });
    expect(vm.leagueHeadlines.find((row) => row.type === 'injury')?.text).toBe('Starter QB (Shoulder) is recorded out for 6 weeks.');
  });

  it('builds only supported next-opponent hooks', () => {
    expect(build({ nextWeek: { week: 5 } }).nextMatchupHook).toBeNull();
    expect(build({ nextWeek: { week: 5, opponentAbbr: 'MIA', isDivisional: true, opponentRecord: '3-1' } }).nextMatchupHook).toBe('Next: a divisional game against MIA (3-1).');
    expect(build({ nextWeek: { week: 5, opponentAbbr: 'KC', isRematch: true, previousMeetingWeek: 2 } }).nextMatchupHook).toContain('rematch');
    expect(build({ nextWeek: { week: 5, opponentAbbr: 'LV', opponentStreak: { type: 'W', length: 4 } } }).nextMatchupHook).toContain('4-game winning streak');
  });

  it('uses canonical conf/div fields for a divisional next matchup', () => {
    const context = buildNextWeekStoryContext({
      week: 5,
      userTeamId: 1,
      teams: [{ id: 1, abbr: 'BUF', conf: 0, div: 2 }, { id: 2, abbr: 'MIA', conf: 0, div: 2, wins: 3, losses: 1 }],
      schedule: { weeks: [{ week: 5, games: [{ home: 1, away: 2 }] }] },
    });
    expect(build({ nextWeek: context }).nextMatchupHook).toBe('Next: a divisional game against MIA (3-1).');
  });

  it('selects the most recent prior meeting without mutating schedule order', () => {
    const weeks = [
      { week: 2, games: [{ home: 1, away: 3 }] },
      { week: 6, games: [{ home: 3, away: 1 }] },
      { week: 9, games: [{ home: 1, away: 3 }] },
    ];
    const before = JSON.stringify(weeks);
    const context = buildNextWeekStoryContext({ week: 9, userTeamId: 1, teams: [{ id: 1, abbr: 'BUF', conf: 0, div: 0 }, { id: 3, abbr: 'KC', conf: 0, div: 1 }], schedule: { weeks } });
    expect(context.previousMeetingWeek).toBe(6);
    expect(build({ nextWeek: context }).nextMatchupHook).toBe('Next: a rematch with KC from Week 6.');
    expect(JSON.stringify(weeks)).toBe(before);
  });

  it('anchors postgame context after the completed week and skips byes', () => {
    const context = buildNextWeekStoryContext({
      week: 5,
      userTeamId: 1,
      teams: [{ id: 1, abbr: 'BUF' }, { id: 2, abbr: 'MIA' }, { id: 3, abbr: 'KC' }],
      schedule: { weeks: [
        { week: 4, games: [{ home: 1, away: 2 }] },
        { week: 5, games: [] },
        { week: 6, games: [{ home: 3, away: 1 }] },
      ] },
    }, { completedWeek: 4 });
    expect(context.week).toBe(6);
    expect(context.opponentAbbr).toBe('KC');
    expect(context.previousMeetingWeek).toBeNull();
  });

  it('degrades for bye weeks, old saves, and missing identities', () => {
    const vm = buildWeeklyStoryPresentation({ league: {}, week: 8, completedGames: [], injuries: [{ injuryWeeksRemaining: 5 }] });
    expect(vm.userGameStory).toBeNull();
    expect(vm.leagueHeadlines).toEqual([]);
    expect(vm.injuries).toEqual([]);
    expect(vm.availableData.nextMatchup).toBe(false);
  });
});
