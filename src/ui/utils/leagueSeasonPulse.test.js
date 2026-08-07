import { describe, expect, it } from 'vitest';
import { buildLeagueSeasonPulse } from './leagueSeasonPulse.js';

const teams = [
  { id: 1, name: 'Buffalo Very Long Team Name', abbr: 'BUF', conf: 0, div: 0, wins: 3, losses: 0, roster: [{ id: 11, name: 'Starting Quarterback With A Long Name', pos: 'QB', injuryWeeksRemaining: 5, injury: { name: 'Shoulder' } }] },
  { id: 2, name: 'Miami', abbr: 'MIA', conf: 0, div: 0, wins: 1, losses: 2 },
  { id: 3, name: 'Kansas City', abbr: 'KC', conf: 0, div: 1, wins: 2, losses: 1 },
  { id: 4, name: 'Las Vegas', abbr: 'LV', conf: 0, div: 1, wins: 0, losses: 3 },
];
const weeks = [
  { week: 1, games: [{ id: 'a', home: 1, away: 2, homeScore: 21, awayScore: 20 }, { id: 'b', home: 3, away: 4, homeScore: 31, awayScore: 10 }] },
  { week: 2, games: [{ id: 'c', home: 2, away: 1, homeScore: 7, awayScore: 28 }, { id: 'd', home: 4, away: 3, homeScore: 13, awayScore: 17 }] },
  { week: 3, games: [{ id: 'e', home: 1, away: 3, homeScore: 30, awayScore: 27 }, { id: 'f', home: 2, away: 4, homeScore: 14, awayScore: 10 }] },
  { week: 4, games: [{ id: 'g', home: 1, away: 2 }, { id: 'h', home: 3, away: 4 }] },
];
const league = { seasonId: 2026, week: 3, phase: 'regular', userTeamId: 1, teams, schedule: { weeks } };

describe('buildLeagueSeasonPulse', () => {
  it('builds factual result stories, trends, injuries, standings, and a next game', () => {
    const pulse = buildLeagueSeasonPulse({ league });
    expect(pulse.headlineStories.some((story) => story.type === 'highest-scoring')).toBe(true);
    expect(pulse.headlineStories.some((story) => story.type === 'largest-margin')).toBe(true);
    expect(pulse.trendingTeams).toEqual(expect.arrayContaining([expect.objectContaining({ teamId: 1, label: 'Winning streak', value: '3 games' }), expect.objectContaining({ teamId: 4, label: 'Losing streak', value: '3 games' })]));
    expect(pulse.majorInjuries[0]).toMatchObject({ playerId: 11, injury: 'Shoulder', weeksRemaining: 5 });
    expect(pulse.standingsImpact.some((row) => row.type === 'division-leader')).toBe(true);
    expect(pulse.nextWeekHighlight).toMatchObject({ gameId: 'g', reason: 'Your Week 4 matchup' });
  });

  it('uses only canonical recorded award boards and deduplicates players', () => {
    const pulse = buildLeagueSeasonPulse({ league: { ...league, awardRaces: { awards: {
      mvp: { league: [{ playerId: 11, playerName: 'QB One', teamId: 1, pos: 'QB', score: 99 }] },
      opoy: { league: [{ playerId: 11, playerName: 'QB One', teamId: 1, pos: 'QB', score: 80 }] },
      dpoy: { league: [{ playerId: 44, playerName: 'Edge Two', teamId: 4, pos: 'EDGE' }] },
    } } } });
    expect(pulse.awardWatch).toEqual([
      expect.objectContaining({ award: 'MVP', playerName: 'QB One', score: 99 }),
      expect.objectContaining({ award: 'DPOY', playerName: 'Edge Two' }),
    ]);
    expect(new Set(pulse.awardWatch.map((row) => row.playerId)).size).toBe(pulse.awardWatch.length);
  });

  it('keeps distinct league-level playerId injuries on the same team in deterministic order', () => {
    const pulse = buildLeagueSeasonPulse({ league: { ...league, injuries: [
      { playerId: 202, teamId: 1, name: 'Second Player', injuryWeeksRemaining: 4 },
      { playerId: 101, teamId: 1, name: 'First Player', injuryWeeksRemaining: 4 },
    ] } });
    expect(pulse.majorInjuries).toEqual([
      expect.objectContaining({ playerId: 11, playerName: 'Starting Quarterback With A Long Name' }),
      expect.objectContaining({ playerId: 101, teamId: 1, playerName: 'First Player' }),
      expect.objectContaining({ playerId: 202, teamId: 1, playerName: 'Second Player' }),
    ]);
  });

  it('omits unsupported upset, award, movement, and single-game trends', () => {
    const oneWeek = { ...league, teams: teams.map((team) => ({ ...team, wins: 0, losses: 0, roster: [] })), schedule: { weeks: [weeks[0]] } };
    const pulse = buildLeagueSeasonPulse({ league: oneWeek });
    expect(pulse.headlineStories.some((story) => story.type === 'upset')).toBe(false);
    expect(pulse.awardWatch).toEqual([]);
    expect(pulse.trendingTeams).toEqual([]);
    expect(pulse.omittedReasons.standingsMovement).toMatch(/No before\/after/);
  });

  it('accepts authoritative expectation and standings snapshots', () => {
    const pulse = buildLeagueSeasonPulse({
      league,
      week: 3,
      completedGames: [{ id: 'upset', home: 3, away: 4, homeScore: 10, awayScore: 17, homeWinProbability: 0.8 }],
      standingsBefore: [{ teamId: 1, divisionLeader: false, seed: 7 }],
      standingsAfter: [{ teamId: 1, divisionLeader: true, seed: 4 }],
    });
    expect(pulse.headlineStories.some((story) => story.type === 'upset')).toBe(true);
    expect(pulse.standingsImpact[0].text).toContain('took the division lead');
  });

  it('is pure and invariant to completed-game input order', () => {
    const completedGames = weeks[0].games;
    const before = structuredClone(league);
    const a = buildLeagueSeasonPulse({ league, week: 1, completedGames });
    const b = buildLeagueSeasonPulse({ league, week: 1, completedGames: [...completedGames].reverse() });
    expect(b).toEqual(a);
    expect(league).toEqual(before);
    expect(buildLeagueSeasonPulse({ league, week: 1, completedGames })).toEqual(a);
  });

  it.each([
    ['empty league', {}],
    ['offseason', { phase: 'offseason', week: null }],
    ['postseason', { phase: 'playoffs', teams: [], schedule: { weeks: [] } }],
    ['partial legacy save', { year: 2020, teams: [{ id: 1, name: 'Legacy' }] }],
  ])('degrades honestly for %s', (_label, partial) => {
    const pulse = buildLeagueSeasonPulse({ league: partial });
    expect(pulse.headlineStories).toEqual([]);
    expect(pulse.awardWatch).toEqual([]);
    expect(pulse.nextWeekHighlight).toBeNull();
  });
});
