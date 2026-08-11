import { describe, expect, it } from 'vitest';
import { buildMatchupHistoryContext } from './matchupHistoryContext.js';

const teams = [
  { id: 1, name: 'Alpha Long Team Name', abbr: 'ALP', conf: 0, div: 1 },
  { id: 2, name: 'Beta Long Team Name', abbr: 'BET', conf: 0, div: 1 },
  { id: 3, name: 'Gamma', abbr: 'GAM', conf: 1, div: 2 },
  { id: 4, name: 'Unknown Alignment', abbr: 'UNK' },
];

function game({ id, week, home = 1, away = 2, homeScore = 24, awayScore = 20, played = true, ...extra }) {
  return { id, gameId: id, seasonId: 's2030', week, home, away, homeScore, awayScore, played, ...extra };
}

function leagueWith(games = [], overrides = {}) {
  return {
    seasonId: 's2030',
    year: 2030,
    week: 10,
    teams,
    schedule: { weeks: games.map((row) => ({ week: row.week, games: [row] })) },
    leagueHistory: [],
    ...overrides,
  };
}

function build(league, overrides = {}) {
  return buildMatchupHistoryContext({ league, teamAId: 1, teamBId: 2, currentSeason: 's2030', currentWeek: 10, ...overrides });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

describe('buildMatchupHistoryContext history eligibility', () => {
  it('returns a safe no-history model and does not manufacture a 0-0 series', () => {
    const result = build(leagueWith([]));
    expect(result.totalMeetings).toBe(0);
    expect(result.recentMeetings).toEqual([]);
    expect(result.recentSeries).toBeNull();
    expect(result.lastMeeting).toBeNull();
    expect(result.omittedReasons).toContain('no_completed_recorded_meetings');
  });

  it('returns one completed meeting with canonical factual fields', () => {
    const result = build(leagueWith([game({ id: 's2030_w4_1_2', week: 4 })]));
    expect(result.totalMeetings).toBe(1);
    expect(result.lastMeeting).toMatchObject({
      gameId: 's2030_w4_1_2', season: 2030, week: 4, homeTeamId: 1, awayTeamId: 2,
      homeScore: 24, awayScore: 20, winnerTeamId: 1, margin: 4,
    });
    expect(result.currentSeriesStreak).toBeNull();
  });

  it('caps recent meetings at five while keeping the recorded total', () => {
    const games = Array.from({ length: 7 }, (_, index) => game({ id: `g-${index + 1}`, week: index + 1 }));
    const result = build(leagueWith(games));
    expect(result.totalMeetings).toBe(7);
    expect(result.recentMeetings).toHaveLength(5);
    expect(result.recentMeetings.map((row) => row.week)).toEqual([7, 6, 5, 4, 3]);
    expect(result.recentSeries.sampleSize).toBe(5);
  });

  it('excludes future, incomplete, canceled, and explicit preseason games without treating missing scores as zero', () => {
    const rows = [
      game({ id: 'final', week: 1 }),
      game({ id: 'future', week: 2, played: false, homeScore: 0, awayScore: 0 }),
      game({ id: 'missing-score', week: 3, awayScore: null }),
      game({ id: 'canceled', week: 4, status: 'canceled' }),
      game({ id: 'preseason', week: 5, stage: 'preseason' }),
    ];
    const result = build(leagueWith(rows));
    expect(result.recentMeetings.map((row) => row.gameId)).toEqual(['final']);
  });

  it('deduplicates the same canonical game across current and archived references', () => {
    const duplicate = game({ id: 's2030_w4_1_2', week: 4 });
    const league = leagueWith([duplicate], {
      leagueHistory: [{ id: 's2030', year: 2030, gameIndex: [{ id: duplicate.id, week: 4, homeId: 1, awayId: 2, homeScore: 24, awayScore: 20 }] }],
    });
    expect(build(league).totalMeetings).toBe(1);
  });

  it('uses authoritative post-advance results while the schedule is stale, then deduplicates the refreshed game', () => {
    const staleSchedule = game({ id: 's2030_w4_1_2', week: 4, played: false, homeScore: null, awayScore: null });
    const olderWin = game({ id: 's2030_w1_1_2', week: 1, homeScore: 21, awayScore: 10 });
    const completedResult = {
      gameId: 's2030_w4_1_2', seasonId: 's2030', week: 4,
      homeId: 1, awayId: 2, homeScore: 27, awayScore: 17,
    };
    const league = leagueWith([olderWin, staleSchedule]);

    const immediate = build(league, { currentWeek: 8, completedResults: [completedResult] });
    expect(immediate.lastMeeting).toMatchObject({ gameId: 's2030_w4_1_2', homeScore: 27, awayScore: 17 });
    expect(immediate.isRematchThisSeason).toBe(true);
    expect(immediate.previousCurrentSeasonMeeting.gameId).toBe('s2030_w4_1_2');
    expect(immediate.recentSeries).toMatchObject({ sampleSize: 2, teamAWins: 2, teamBWins: 0 });
    expect(immediate.currentSeriesStreak).toEqual({ teamId: 1, wins: 2, label: 'ALP has won 2 straight meetings' });

    const refreshed = leagueWith([olderWin, { ...staleSchedule, played: true, homeScore: 27, awayScore: 17 }]);
    expect(build(refreshed, { currentWeek: 8, completedResults: [completedResult] }).totalMeetings).toBe(2);
  });

  it('ignores partial post-advance rows and orders completed results deterministically', () => {
    const complete = [
      { gameId: 'result-b', seasonId: 's2030', week: 4, homeId: 1, awayId: 2, homeScore: 24, awayScore: 20 },
      { gameId: 'result-a', seasonId: 's2030', week: 4, homeId: 2, awayId: 1, homeScore: 17, awayScore: 21 },
    ];
    const partial = [
      { gameId: 'missing-score', seasonId: 's2030', week: 5, homeId: 1, awayId: 2, homeScore: 20 },
      { gameId: 'missing-team', seasonId: 's2030', week: 5, homeId: 1, homeScore: 20, awayScore: 17 },
    ];
    const forward = build(leagueWith([]), { completedResults: [...complete, ...partial] });
    const reversed = build(leagueWith([]), { completedResults: [...complete, ...partial].reverse() });
    expect(forward).toEqual(reversed);
    expect(forward.recentMeetings.map((row) => row.gameId)).toEqual(['result-a', 'result-b']);
  });

  it('matches numeric and string team IDs canonically', () => {
    const result = build(leagueWith([game({ id: 'mixed', week: 2, home: '1', away: '2' })]), { teamAId: '1', teamBId: 2 });
    expect(result.totalMeetings).toBe(1);
    expect(result.teamAId).toBe(1);
    expect(result.teamBId).toBe(2);
  });
});

describe('buildMatchupHistoryContext factual summaries', () => {
  it('uses current conference and division metadata only', () => {
    expect(build(leagueWith([])).isDivisionMatchup).toBe(true);
    expect(buildMatchupHistoryContext({ league: leagueWith([]), teamAId: 1, teamBId: 3 }).isDivisionMatchup).toBe(false);
    expect(buildMatchupHistoryContext({ league: leagueWith([]), teamAId: 1, teamBId: 4 }).isDivisionMatchup).toBeNull();
  });

  it('summarizes team A leads, team B leads, tied series, and ties in the exact bounded sample', () => {
    const aLeads = build(leagueWith([
      game({ id: 'a1', week: 1, homeScore: 21, awayScore: 10 }),
      game({ id: 'a2', week: 2, homeScore: 17, awayScore: 14 }),
      game({ id: 'b1', week: 3, homeScore: 10, awayScore: 20 }),
      game({ id: 'tie', week: 4, homeScore: 17, awayScore: 17 }),
    ]));
    expect(aLeads.recentSeries).toMatchObject({ sampleSize: 4, teamAWins: 2, teamBWins: 1, ties: 1, leaderTeamId: 1 });
    expect(aLeads.recentSeries.label).toBe('ALP leads last 4 meetings 2-1-1');

    const bLeads = build(leagueWith([
      game({ id: 'b2', week: 1, homeScore: 10, awayScore: 20 }),
      game({ id: 'b3', week: 2, homeScore: 7, awayScore: 14 }),
    ]));
    expect(bLeads.recentSeries.leaderTeamId).toBe(2);
    expect(bLeads.recentSeries.label).toBe('BET leads last 2 meetings 2-0');

    const tied = build(leagueWith([
      game({ id: 'a', week: 1, homeScore: 20, awayScore: 10 }),
      game({ id: 'b', week: 2, homeScore: 10, awayScore: 20 }),
    ]));
    expect(tied.recentSeries).toMatchObject({ teamAWins: 1, teamBWins: 1, ties: 0, leaderTeamId: null });
    expect(tied.recentSeries.label).toContain('Recent series tied');
  });

  it('exposes only consecutive head-to-head win streaks of two or more and lets a tie break the streak', () => {
    const two = build(leagueWith([
      game({ id: 'old-b', week: 1, homeScore: 10, awayScore: 20 }),
      game({ id: 'a-1', week: 2, homeScore: 20, awayScore: 10 }),
      game({ id: 'a-2', week: 3, homeScore: 24, awayScore: 17 }),
    ]));
    expect(two.currentSeriesStreak).toEqual({ teamId: 1, wins: 2, label: 'ALP has won 2 straight meetings' });

    const three = build(leagueWith([
      game({ id: 'a-1', week: 1 }), game({ id: 'a-2', week: 2 }), game({ id: 'a-3', week: 3 }),
    ]));
    expect(three.currentSeriesStreak.wins).toBe(3);

    const alternating = build(leagueWith([
      game({ id: 'a', week: 1, homeScore: 20, awayScore: 10 }),
      game({ id: 'b', week: 2, homeScore: 10, awayScore: 20 }),
    ]));
    expect(alternating.currentSeriesStreak).toBeNull();

    const tiedLatest = build(leagueWith([
      game({ id: 'a-1', week: 1 }), game({ id: 'a-2', week: 2 }), game({ id: 'tie', week: 3, homeScore: 17, awayScore: 17 }),
    ]));
    expect(tiedLatest.currentSeriesStreak).toBeNull();
  });

  it('selects the newest season and week with a stable game-ID tie-breaker', () => {
    const archive = [
      { id: 's2029', year: 2029, gameIndex: [{ id: 'z-old', week: 18, homeId: 1, awayId: 2, homeScore: 40, awayScore: 10 }] },
      { id: 's2028', year: 2028, gameIndex: [{ id: 'older', week: 18, homeId: 1, awayId: 2, homeScore: 20, awayScore: 10 }] },
    ];
    const current = [
      game({ id: 'same-week-b', week: 8, homeScore: 20, awayScore: 17 }),
      game({ id: 'same-week-a', week: 8, homeScore: 21, awayScore: 17 }),
    ];
    const result = build(leagueWith(current, { leagueHistory: archive }));
    expect(result.lastMeeting.gameId).toBe('same-week-a');
    expect(result.recentMeetings.map((row) => row.gameId).slice(0, 3)).toEqual(['same-week-a', 'same-week-b', 'z-old']);
  });
});

describe('buildMatchupHistoryContext playoff and rematch truth', () => {
  it('counts only explicitly archived playoff games as playoff history', () => {
    const league = leagueWith([], {
      leagueHistory: [{
        id: 's2029', year: 2029,
        gameIndex: [
          { id: 'reg', week: 6, homeId: 1, awayId: 2, homeScore: 20, awayScore: 17 },
          { id: 'po', week: 20, homeId: 2, awayId: 1, homeScore: 21, awayScore: 24 },
        ],
        playoffBracketSnapshot: { mode: 'rounds', rounds: [{ label: 'Divisional', games: [{ id: 'po', gameId: 'po' }] }] },
      }],
    });
    const result = build(league);
    expect(result.playoffHistory).toMatchObject({ totalMeetings: 1, teamAWins: 1, teamBWins: 0, ties: 0 });
    expect(result.playoffHistory.lastPlayoffMeeting).toMatchObject({ gameId: 'po', stage: 'Divisional', isPlayoff: true });
    expect(result.recentMeetings.find((row) => row.gameId === 'reg').isPlayoff).toBe(false);
  });

  it('keeps an authoritative playoff meeting while omitting an unsupported round name', () => {
    const result = build(leagueWith([game({ id: 'unknown-playoff', week: 9, isPlayoff: true })]));
    expect(result.playoffHistory.totalMeetings).toBe(1);
    expect(result.lastMeeting.stage).toBeNull();
    expect(result.omittedReasons).toContain('playoff_round_unavailable');
  });

  it.each([
    ['Wild Card', 'Wild Card'],
    ['Divisional', 'Divisional'],
    ['Conference Championship', 'Conference Championship'],
    ['Championship', 'Championship'],
  ])('preserves the authoritative %s archived round', (label, expected) => {
    const result = build(leagueWith([], {
      leagueHistory: [{
        id: 's2029', year: 2029,
        gameIndex: [{ id: `po-${label}`, week: 20, homeId: 1, awayId: 2, homeScore: 24, awayScore: 20 }],
        playoffBracketSnapshot: { mode: 'rounds', rounds: [{ label, games: [{ gameId: `po-${label}` }] }] },
      }],
    }));
    expect(result.lastMeeting).toMatchObject({ gameId: `po-${label}`, stage: expected, isPlayoff: true });
  });

  it('treats a flat bracket as playoff authority without inventing its grouping heading as the round', () => {
    const archivedGame = { id: 'flat-po', week: 20, homeId: 2, awayId: 1, homeScore: 20, awayScore: 27 };
    const league = leagueWith([], {
      leagueHistory: [{
        id: 's2029', year: 2029, gameIndex: [archivedGame],
        playoffBracketSnapshot: { mode: 'flat', rounds: [{ label: 'Postseason games', games: [{ gameId: 'flat-po' }] }] },
      }],
    });
    const result = build(league);
    expect(result.lastMeeting).toMatchObject({ gameId: 'flat-po', homeScore: 20, awayScore: 27, stage: null, isPlayoff: true });
    expect(result.playoffHistory).toMatchObject({ totalMeetings: 1, teamAWins: 1, teamBWins: 0 });
    expect(result.playoffHistory.lastPlayoffMeeting).toEqual(result.lastMeeting);
    expect(result.omittedReasons).toContain('playoff_round_unavailable');
  });

  it('detects only an earlier meeting in the current season as a rematch', () => {
    const current = build(leagueWith([game({ id: 'current', week: 4 })]));
    expect(current.isRematchThisSeason).toBe(true);
    expect(current.previousCurrentSeasonMeeting.gameId).toBe('current');

    const previousOnly = build(leagueWith([], {
      leagueHistory: [{ id: 's2029', year: 2029, gameIndex: [{ id: 'previous', week: 4, homeId: 1, awayId: 2, homeScore: 20, awayScore: 10 }] }],
    }));
    expect(previousOnly.isRematchThisSeason).toBe(false);
    expect(previousOnly.previousCurrentSeasonMeeting).toBeNull();
  });
});

describe('buildMatchupHistoryContext determinism and language', () => {
  it('does not mutate inputs and returns deeply equal output for identical or reordered history input', () => {
    const rows = [game({ id: 'g1', week: 1 }), game({ id: 'g2', week: 2, homeScore: 10, awayScore: 20 })];
    const frozen = deepFreeze(leagueWith(rows));
    const first = build(frozen);
    const second = build(frozen);
    expect(second).toEqual(first);

    const reordered = leagueWith([...rows].reverse());
    expect(build(reordered)).toEqual(first);
  });

  it('never emits unsupported all-time, revenge, grudge, intensity, or non-division rivalry language', () => {
    const result = buildMatchupHistoryContext({ league: leagueWith([game({ id: 'g', week: 1 })]), teamAId: 1, teamBId: 3 });
    const text = JSON.stringify(result).toLowerCase();
    expect(text).not.toMatch(/all-time|revenge|grudge|heated|bitter|intense/);
    expect(text).not.toContain('rival');
    expect(result.isDivisionMatchup).toBe(false);
  });
});
