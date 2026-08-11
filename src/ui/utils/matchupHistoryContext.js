import { isPostseasonGame } from '../../core/championshipInference.js';
import { buildCanonicalGameId, toTeamId } from '../../core/gameIdentity.js';
import { readStrictFinalScore } from '../../core/gameArchive.js';

const PLAYOFF_STAGE_LABELS = {
  wildcard: 'Wild Card',
  wild_card: 'Wild Card',
  wc: 'Wild Card',
  divisional: 'Divisional',
  div: 'Divisional',
  division: 'Divisional',
  conference: 'Conference Championship',
  conference_final: 'Conference Championship',
  conf: 'Conference Championship',
  afc_championship: 'Conference Championship',
  nfc_championship: 'Conference Championship',
  superbowl: 'Championship',
  super_bowl: 'Championship',
  championship: 'Championship',
  final: 'Championship',
  playoff_final: 'Championship',
  f: 'Championship',
};

const STAGE_ORDER = {
  'Regular season': 0,
  'Wild Card': 1,
  Divisional: 2,
  'Conference Championship': 3,
  Championship: 4,
};

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function teamKey(value) {
  const id = toTeamId(value);
  return id == null ? null : String(id);
}

function seasonToken(value) {
  if (value == null || value === '') return null;
  return String(value);
}

function seasonSortValue(value) {
  const numeric = finiteNumber(value);
  if (numeric != null) return { numeric, text: '' };
  const text = String(value ?? '');
  const trailingNumber = text.match(/(\d+)(?!.*\d)/)?.[1];
  return { numeric: trailingNumber == null ? null : Number(trailingNumber), text };
}

function compareSeasonsNewestFirst(a, b) {
  const aa = seasonSortValue(a);
  const bb = seasonSortValue(b);
  if (aa.numeric != null && bb.numeric != null && aa.numeric !== bb.numeric) return bb.numeric - aa.numeric;
  if (aa.numeric != null && bb.numeric == null) return -1;
  if (aa.numeric == null && bb.numeric != null) return 1;
  return bb.text.localeCompare(aa.text);
}

function compareMeetingsNewestFirst(a, b) {
  const seasonDiff = compareSeasonsNewestFirst(a?.season, b?.season);
  if (seasonDiff) return seasonDiff;
  const aWeek = finiteNumber(a?.week);
  const bWeek = finiteNumber(b?.week);
  if (aWeek != null && bWeek != null && aWeek !== bWeek) return bWeek - aWeek;
  if (aWeek != null && bWeek == null) return -1;
  if (aWeek == null && bWeek != null) return 1;
  const stageDiff = (STAGE_ORDER[b?.stage] ?? -1) - (STAGE_ORDER[a?.stage] ?? -1);
  if (stageDiff) return stageDiff;
  return String(a?.gameId ?? '').localeCompare(String(b?.gameId ?? ''));
}

function playoffStageLabel(value) {
  const token = String(value ?? '').trim().toLowerCase();
  return PLAYOFF_STAGE_LABELS[token] ?? null;
}

function isExplicitPreseason(game, stageToken) {
  return Boolean(game?.isPreseason || String(stageToken ?? '').toLowerCase().includes('preseason'));
}

function getTeam(league, id) {
  const key = teamKey(id);
  return (league?.teams ?? []).find((team) => teamKey(team?.id) === key) ?? null;
}

function teamLabel(league, id) {
  const team = getTeam(league, id);
  return team?.abbr ?? team?.name ?? String(id ?? 'Team');
}

function buildPlayoffIndex(seasonRow) {
  const index = new Map();
  const snapshot = seasonRow?.playoffBracketSnapshot;
  const rounds = snapshot?.rounds;
  if (!Array.isArray(rounds)) return index;
  for (const round of rounds) {
    for (const game of round?.games ?? []) {
      const gameId = game?.gameId ?? game?.id;
      if (gameId == null || gameId === '') continue;
      // A flat bracket's heading groups games whose exact rounds are unknown;
      // it is playoff authority, but not round-name authority.
      index.set(String(gameId), snapshot?.mode === 'flat' ? null : round?.label ?? null);
    }
  }
  return index;
}

function seasonRows(league) {
  const rows = [
    ...(Array.isArray(league?.leagueHistory) ? league.leagueHistory : []),
    ...(Array.isArray(league?.history?.seasons) ? league.history.seasons : []),
  ];
  return [...rows].sort((a, b) => {
    const aSeason = a?.year ?? a?.season ?? a?.seasonId ?? a?.id;
    const bSeason = b?.year ?? b?.season ?? b?.seasonId ?? b?.id;
    const seasonDiff = compareSeasonsNewestFirst(aSeason, bSeason);
    if (seasonDiff) return seasonDiff;
    return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
  });
}

function normalizeMeeting(game, context) {
  if (!game || typeof game !== 'object') return null;
  const homeTeamId = toTeamId(game?.homeTeamId ?? game?.homeId ?? game?.home);
  const awayTeamId = toTeamId(game?.awayTeamId ?? game?.awayId ?? game?.away);
  if (homeTeamId == null || awayTeamId == null || homeTeamId === awayTeamId) return null;

  const finalScore = readStrictFinalScore(game);
  if (!finalScore) return null;
  const status = String(game?.status ?? '').trim().toLowerCase();
  if (['scheduled', 'pending', 'postponed', 'canceled', 'cancelled'].includes(status)) return null;

  const week = finiteNumber(game?.week ?? context?.week);
  const identitySeason = game?.seasonId ?? context?.seasonId ?? context?.season;
  const season = game?.season ?? game?.year ?? context?.season ?? identitySeason;
  const gameId = game?.gameId ?? game?.id ?? buildCanonicalGameId({
    seasonId: identitySeason,
    week,
    homeId: homeTeamId,
    awayId: awayTeamId,
  });
  if (gameId == null || gameId === '') return null;

  const stageToken = game?.playoffRound ?? game?.round ?? game?.stage ?? context?.stage ?? null;
  if (isExplicitPreseason(game, stageToken)) return null;
  const explicitlyPostseason = Boolean(context?.isPlayoff || context?.playoffStage || isPostseasonGame({ ...game, stage: stageToken }));
  const stage = explicitlyPostseason
    ? (context?.playoffStage ?? playoffStageLabel(stageToken))
    : (stageToken ? String(stageToken) : 'Regular season');

  const homeScore = finalScore.home;
  const awayScore = finalScore.away;
  const winnerTeamId = homeScore === awayScore ? null : homeScore > awayScore ? homeTeamId : awayTeamId;
  return {
    gameId: String(gameId),
    season,
    seasonId: identitySeason ?? null,
    week,
    stage,
    isPlayoff: explicitlyPostseason,
    homeTeamId,
    awayTeamId,
    homeScore,
    awayScore,
    winnerTeamId,
    margin: Math.abs(homeScore - awayScore),
    _source: context?.source ?? 'unknown',
  };
}

function candidateRank(candidate) {
  return (candidate?._source === 'completed_result' ? 110 : candidate?._source === 'current_schedule' ? 100 : 0)
    + (candidate?.isPlayoff ? 20 : 0)
    + (candidate?.stage ? 5 : 0)
    + (candidate?.week != null ? 2 : 0)
    + (candidate?.season != null ? 1 : 0);
}

function stableCandidateKey(candidate) {
  return [
    candidate?.gameId,
    candidate?.season,
    candidate?.week,
    candidate?.stage,
    candidate?.homeTeamId,
    candidate?.awayTeamId,
    candidate?.homeScore,
    candidate?.awayScore,
  ].map((value) => String(value ?? '')).join('|');
}

function deduplicateMeetings(candidates) {
  const byId = new Map();
  for (const candidate of candidates) {
    const existing = byId.get(candidate.gameId);
    if (!existing) {
      byId.set(candidate.gameId, candidate);
      continue;
    }
    const rankDiff = candidateRank(candidate) - candidateRank(existing);
    if (rankDiff > 0 || (rankDiff === 0 && stableCandidateKey(candidate).localeCompare(stableCandidateKey(existing)) < 0)) {
      byId.set(candidate.gameId, candidate);
    }
  }
  return [...byId.values()];
}

function summarizeSeries(meetings, teamAId, teamBId, league) {
  let teamAWins = 0;
  let teamBWins = 0;
  let ties = 0;
  for (const meeting of meetings) {
    if (meeting.winnerTeamId == null) ties += 1;
    else if (teamKey(meeting.winnerTeamId) === teamKey(teamAId)) teamAWins += 1;
    else if (teamKey(meeting.winnerTeamId) === teamKey(teamBId)) teamBWins += 1;
  }
  const leaderTeamId = teamAWins === teamBWins ? null : teamAWins > teamBWins ? teamAId : teamBId;
  const sampleLabel = `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`;
  const leaderWins = leaderTeamId == null || teamKey(leaderTeamId) === teamKey(teamAId) ? teamAWins : teamBWins;
  const trailingWins = leaderTeamId == null || teamKey(leaderTeamId) === teamKey(teamAId) ? teamBWins : teamAWins;
  const recordLabel = `${leaderWins}-${trailingWins}${ties ? `-${ties}` : ''}`;
  const label = leaderTeamId == null
    ? `Recent series tied ${recordLabel} in last ${sampleLabel}`
    : `${teamLabel(league, leaderTeamId)} leads last ${sampleLabel} ${recordLabel}`;
  return { sampleSize: meetings.length, teamAWins, teamBWins, ties, leaderTeamId, label };
}

function summarizePlayoffs(meetings, teamAId, teamBId) {
  if (!meetings.length) return null;
  let teamAWins = 0;
  let teamBWins = 0;
  let ties = 0;
  for (const meeting of meetings) {
    if (meeting.winnerTeamId == null) ties += 1;
    else if (teamKey(meeting.winnerTeamId) === teamKey(teamAId)) teamAWins += 1;
    else if (teamKey(meeting.winnerTeamId) === teamKey(teamBId)) teamBWins += 1;
  }
  return {
    totalMeetings: meetings.length,
    teamAWins,
    teamBWins,
    ties,
    lastPlayoffMeeting: meetings[0] ?? null,
  };
}

function stripInternalFields(meeting) {
  if (!meeting) return null;
  const { _source, ...publicMeeting } = meeting;
  return publicMeeting;
}

/**
 * Build factual opponent history from the current schedule plus completed-season
 * compact game indexes already present in the league view. This helper performs
 * no I/O and never mutates its inputs.
 */
export function buildMatchupHistoryContext({
  league = {},
  completedResults = [],
  teamAId,
  teamBId,
  currentSeason = null,
  currentWeek = null,
  maxRecentMeetings = 5,
} = {}) {
  const resolvedTeamAId = toTeamId(teamAId);
  const resolvedTeamBId = toTeamId(teamBId);
  const resolvedCurrentSeason = currentSeason ?? league?.seasonId ?? league?.year ?? null;
  const resolvedCurrentWeek = finiteNumber(currentWeek ?? league?.week);
  const boundedLimit = Math.max(1, Math.min(20, finiteNumber(maxRecentMeetings) ?? 5));
  const teamA = getTeam(league, resolvedTeamAId);
  const teamB = getTeam(league, resolvedTeamBId);
  const alignmentAvailable = teamA?.conf != null && teamA?.div != null && teamB?.conf != null && teamB?.div != null;
  const isDivisionMatchup = alignmentAvailable
    ? String(teamA.conf) === String(teamB.conf) && String(teamA.div) === String(teamB.div)
    : null;
  const targetA = teamKey(resolvedTeamAId);
  const targetB = teamKey(resolvedTeamBId);
  const isTargetPair = (game) => {
    const home = teamKey(game?.homeTeamId ?? game?.homeId ?? game?.home);
    const away = teamKey(game?.awayTeamId ?? game?.awayId ?? game?.away);
    return (home === targetA && away === targetB) || (home === targetB && away === targetA);
  };

  const candidates = [];
  // WEEK_COMPLETE result rows are authoritative finals even when the following
  // partial STATE_UPDATE leaves the matching schedule row visibly unplayed.
  for (const game of Array.isArray(completedResults) ? completedResults : []) {
    if (!isTargetPair(game)) continue;
    const normalized = normalizeMeeting(game, {
      source: 'completed_result',
      season: game?.year ?? league?.year ?? resolvedCurrentSeason,
      seasonId: game?.seasonId ?? league?.seasonId ?? resolvedCurrentSeason,
      week: game?.week,
    });
    if (normalized) candidates.push(normalized);
  }

  for (const weekRow of league?.schedule?.weeks ?? []) {
    for (const game of weekRow?.games ?? []) {
      if (!isTargetPair(game)) continue;
      const normalized = normalizeMeeting(game, {
        source: 'current_schedule',
        season: league?.year ?? resolvedCurrentSeason,
        seasonId: league?.seasonId ?? resolvedCurrentSeason,
        week: weekRow?.week,
        stage: weekRow?.playoffRound ?? null,
      });
      if (normalized) candidates.push(normalized);
    }
  }

  const archivedRows = seasonRows(league);
  let playoffAuthorityAvailable = false;
  let archivedSeasonsScanned = 0;
  for (const seasonRow of archivedRows) {
    const gameIndex = Array.isArray(seasonRow?.gameIndex) ? seasonRow.gameIndex : [];
    if (gameIndex.length) archivedSeasonsScanned += 1;
    const playoffIndex = buildPlayoffIndex(seasonRow);
    if (playoffIndex.size > 0) playoffAuthorityAvailable = true;
    const season = seasonRow?.year ?? seasonRow?.season ?? seasonRow?.seasonId ?? seasonRow?.id ?? null;
    const seasonId = seasonRow?.seasonId ?? seasonRow?.id ?? season;
    for (const game of gameIndex) {
      if (!isTargetPair(game)) continue;
      const gameId = game?.gameId ?? game?.id;
      const normalized = normalizeMeeting(game, {
        source: 'season_archive',
        season,
        seasonId,
        week: game?.week,
        isPlayoff: gameId == null ? false : playoffIndex.has(String(gameId)),
        playoffStage: gameId == null ? null : playoffIndex.get(String(gameId)) ?? null,
      });
      if (normalized) candidates.push(normalized);
    }
  }

  const meetings = deduplicateMeetings(candidates)
    .sort(compareMeetingsNewestFirst);

  const recentInternal = meetings.slice(0, boundedLimit);
  const recentMeetings = recentInternal.map(stripInternalFields);
  const lastMeeting = recentMeetings[0] ?? null;
  const recentSeries = recentMeetings.length
    ? summarizeSeries(recentMeetings, resolvedTeamAId, resolvedTeamBId, league)
    : null;

  let currentSeriesStreak = null;
  const latestWinner = recentInternal[0]?.winnerTeamId ?? null;
  if (latestWinner != null) {
    let wins = 0;
    for (const meeting of meetings) {
      if (teamKey(meeting.winnerTeamId) !== teamKey(latestWinner)) break;
      wins += 1;
    }
    if (wins >= 2) {
      currentSeriesStreak = {
        teamId: latestWinner,
        wins,
        label: `${teamLabel(league, latestWinner)} has won ${wins} straight meetings`,
      };
    }
  }

  const currentSeasonTokens = new Set([
    seasonToken(resolvedCurrentSeason),
    seasonToken(league?.seasonId),
    seasonToken(league?.year),
  ].filter(Boolean));
  const priorCurrentSeasonMeetings = meetings.filter((meeting) => {
    const isCurrent = currentSeasonTokens.has(seasonToken(meeting.season))
      || currentSeasonTokens.has(seasonToken(meeting.seasonId));
    if (!isCurrent) return false;
    if (resolvedCurrentWeek == null || meeting.week == null) return false;
    return Number(meeting.week) < resolvedCurrentWeek;
  });
  const previousCurrentSeasonMeeting = stripInternalFields(priorCurrentSeasonMeetings[0] ?? null);
  const isRematchThisSeason = Boolean(previousCurrentSeasonMeeting);

  const playoffMeetings = meetings.filter((meeting) => meeting.isPlayoff).map(stripInternalFields);
  const playoffHistory = summarizePlayoffs(playoffMeetings, resolvedTeamAId, resolvedTeamBId);
  if (meetings.some((meeting) => meeting.isPlayoff)) playoffAuthorityAvailable = true;

  const omittedReasons = [];
  if (resolvedTeamAId == null || resolvedTeamBId == null || resolvedTeamAId === resolvedTeamBId) omittedReasons.push('valid_team_pair_unavailable');
  if (!alignmentAvailable) omittedReasons.push('division_alignment_unavailable');
  if (!meetings.length) omittedReasons.push('no_completed_recorded_meetings');
  if (!playoffAuthorityAvailable) omittedReasons.push('playoff_history_not_authoritative');
  if (playoffMeetings.some((meeting) => meeting.stage == null)) omittedReasons.push('playoff_round_unavailable');

  return {
    teamAId: resolvedTeamAId,
    teamBId: resolvedTeamBId,
    isDivisionMatchup,
    totalMeetings: meetings.length,
    recentMeetings,
    recentSeries,
    currentSeriesStreak,
    lastMeeting,
    playoffHistory,
    isRematchThisSeason,
    previousCurrentSeasonMeeting,
    availableData: {
      hasRecordedHistory: meetings.length > 0,
      recordedMeetingCount: meetings.length,
      currentScheduleIncluded: Boolean(league?.schedule?.weeks?.length),
      archivedSeasonsScanned,
      playoffHistorySupported: playoffAuthorityAvailable,
      coverageLabel: 'Recorded franchise history',
    },
    omittedReasons,
  };
}
