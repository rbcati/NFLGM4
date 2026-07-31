import { buildGameBookPresentation, unwrapBoxScoreResponse } from './boxScoreViewModel.js';

/** Loads the same canonical archive used by Game Book before story presentation. */
export async function loadWeeklyStoryArchivedGame({ getBoxScore, gameId } = {}) {
  if (!gameId || typeof getBoxScore !== 'function') return null;
  return unwrapBoxScoreResponse(await getBoxScore(gameId));
}

/** Resolves factual next-game context from the saved schedule without mutation. */
export function buildNextWeekStoryContext(league = {}) {
  const week = league?.week;
  const userTeamId = league?.userTeamId;
  const weeks = Array.isArray(league?.schedule?.weeks) ? league.schedule.weeks : [];
  const teamId = (side) => side?.id ?? side;
  const involves = (game, first, second = null) => {
    const ids = [Number(teamId(game?.homeId ?? game?.home)), Number(teamId(game?.awayId ?? game?.away))];
    return ids.includes(Number(first)) && (second == null || ids.includes(Number(second)));
  };
  const weekRow = weeks.find((row) => Number(row?.week) === Number(week));
  const matchup = (weekRow?.games ?? []).find((game) => involves(game, userTeamId));
  if (!matchup) return { week };
  const homeId = teamId(matchup?.homeId ?? matchup?.home);
  const awayId = teamId(matchup?.awayId ?? matchup?.away);
  const opponentId = Number(homeId) === Number(userTeamId) ? awayId : homeId;
  const teams = Array.isArray(league?.teams) ? league.teams : [];
  const opponent = teams.find((team) => Number(team?.id) === Number(opponentId));
  const userTeam = teams.find((team) => Number(team?.id) === Number(userTeamId));
  const priorMeeting = weeks
    .filter((row) => Number(row?.week) < Number(week))
    .flatMap((row) => (row?.games ?? []).filter((game) => involves(game, userTeamId, opponentId)).map((game) => ({ row, game })))
    .sort((a, b) => Number(b.row?.week) - Number(a.row?.week))[0];
  const wins = number(opponent?.wins); const losses = number(opponent?.losses); const ties = number(opponent?.ties) ?? 0;
  const userDivision = userTeam?.div ?? userTeam?.division;
  const opponentDivision = opponent?.div ?? opponent?.division;
  return {
    week,
    opponentAbbr: opponent?.abbr ?? null,
    opponentRecord: wins != null && losses != null ? `${wins}-${losses}${ties ? `-${ties}` : ''}` : null,
    isDivisional: userTeam?.conf != null && userDivision != null && String(userTeam.conf) === String(opponent?.conf) && String(userDivision) === String(opponentDivision),
    isRematch: Boolean(priorMeeting),
    previousMeetingWeek: priorMeeting?.row?.week ?? null,
  };
}

const number = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const id = (value) => String(value?.id ?? value?.teamId ?? value ?? '');
const label = (team, fallback = 'Team') => team?.abbr ?? team?.name ?? fallback;
const gameId = (game) => String(game?.gameId ?? game?.id ?? `${id(game?.awayId ?? game?.away)}-${id(game?.homeId ?? game?.home)}`);
const score = (game, side) => number(game?.[`${side}Score`] ?? game?.[`score${side[0].toUpperCase()}${side.slice(1)}`]);

function completed(game) {
  return score(game, 'home') != null && score(game, 'away') != null;
}

function gameTeams(game, teamMap) {
  const homeId = id(game?.homeId ?? game?.home);
  const awayId = id(game?.awayId ?? game?.away);
  return {
    homeId,
    awayId,
    home: teamMap.get(homeId) ?? game?.homeTeam ?? (typeof game?.home === 'object' ? game.home : null),
    away: teamMap.get(awayId) ?? game?.awayTeam ?? (typeof game?.away === 'object' ? game.away : null),
  };
}

function buildUserTakeaways(vm) {
  if (!vm?.availableData?.finalScore) return [];
  const away = label(vm.awayTeam, 'Away');
  const home = label(vm.homeTeam, 'Home');
  if (vm.tie) {
    const moments = vm.decisiveMoments?.filter((row) => row?.text).slice(0, 1) ?? [];
    return moments.length ? moments.map((row) => row.text) : [`${away} and ${home} finished tied at ${vm.finalScore.away}–${vm.finalScore.home}.`];
  }
  const winnerSide = vm.winnerSide;
  const loserSide = winnerSide === 'home' ? 'away' : 'home';
  const winner = label(vm[winnerSide === 'home' ? 'homeTeam' : 'awayTeam']);
  const totals = vm.teamTotals ?? {};
  const candidates = [];
  const addDiff = (key, minimum, priority, text) => {
    const won = number(totals?.[winnerSide]?.[key]);
    const lost = number(totals?.[loserSide]?.[key]);
    if (won != null && lost != null && won - lost >= minimum) candidates.push({ key, priority, text: text(won, lost) });
  };
  const wonTurnovers = number(totals?.[winnerSide]?.turnovers);
  const lostTurnovers = number(totals?.[loserSide]?.turnovers);
  if (wonTurnovers != null && lostTurnovers != null && lostTurnovers > wonTurnovers) {
    candidates.push({ key: 'turnovers', priority: 100 + (lostTurnovers - wonTurnovers), text: `${winner} protected the ball and finished plus-${lostTurnovers - wonTurnovers} in turnover differential.` });
  }
  addDiff('rushYards', 50, 80, (won) => `${winner} controlled the ground game with ${won} rushing yards.`);
  addDiff('totalYards', 100, 70, (won, lost) => `${winner} produced ${won} total yards to ${lost}.`);
  addDiff('sacks', 2, 75, (won) => `${winner}'s defense recorded ${won} sacks.`);
  addDiff('passYards', 100, 60, (won) => `${winner} created separation with ${won} passing yards.`);

  const quarterHome = vm.quarterScores?.home;
  const quarterAway = vm.quarterScores?.away;
  if (Array.isArray(quarterHome) && Array.isArray(quarterAway)) {
    const diffs = quarterHome.map((value, index) => ({ index, diff: (number(winnerSide === 'home' ? value : quarterAway[index]) ?? 0) - (number(winnerSide === 'home' ? quarterAway[index] : value) ?? 0) }));
    const best = diffs.sort((a, b) => (b.diff - a.diff) || (a.index - b.index))[0];
    if (best?.diff >= 10) candidates.push({ key: 'quarter', priority: 65 + best.diff, text: `A ${best.diff}-point edge in the ${['first', 'second', 'third', 'fourth'][best.index] ?? `Q${best.index + 1}`} quarter created the separation.` });
  }
  const selected = candidates.sort((a, b) => (b.priority - a.priority) || a.key.localeCompare(b.key)).slice(0, 3).map((row) => row.text);
  if (selected.length) return selected;
  const moment = vm.decisiveMoments?.find((row) => row?.text)?.text;
  if (moment) return [moment];
  return [`${winner} won ${vm.finalScore[winnerSide]}–${vm.finalScore[loserSide]}; detailed game evidence was not recorded.`];
}

function buildGameCandidates(games, teamMap, userTeamId) {
  const rows = games.filter(completed).map((game) => {
    const teams = gameTeams(game, teamMap);
    const homeScore = score(game, 'home');
    const awayScore = score(game, 'away');
    const margin = Math.abs(homeScore - awayScore);
    const winnerSide = homeScore === awayScore ? null : homeScore > awayScore ? 'home' : 'away';
    const winner = winnerSide ? teams[winnerSide] : null;
    const loser = winnerSide ? teams[winnerSide === 'home' ? 'away' : 'home'] : null;
    const scoreLine = `${label(teams.away, 'Away')} ${awayScore}–${homeScore} ${label(teams.home, 'Home')}`;
    return { game, ...teams, homeScore, awayScore, margin, winnerSide, winner, loser, scoreLine, key: gameId(game), userRelevant: teams.homeId === id(userTeamId) || teams.awayId === id(userTeamId) };
  });
  if (!rows.length) return [];
  const candidates = [];
  const largest = [...rows].sort((a, b) => (b.margin - a.margin) || a.key.localeCompare(b.key))[0];
  if (largest?.winner) candidates.push({ type: 'largest-margin', significance: 60 + largest.margin, key: `margin:${largest.key}`, teamIds: [id(largest.winner)], text: `${label(largest.winner)} posted the week's largest margin, beating ${label(largest.loser)} ${Math.max(largest.homeScore, largest.awayScore)}–${Math.min(largest.homeScore, largest.awayScore)}.` });
  const closest = [...rows].sort((a, b) => (a.margin - b.margin) || a.key.localeCompare(b.key))[0];
  if (closest) candidates.push({ type: 'closest', significance: 75 - closest.margin, key: `closest:${closest.key}`, teamIds: [closest.homeId, closest.awayId], text: closest.margin === 0 ? `${closest.scoreLine} ended in the week's closest finish: a tie.` : `${label(closest.winner)} edged ${label(closest.loser)} ${Math.max(closest.homeScore, closest.awayScore)}–${Math.min(closest.homeScore, closest.awayScore)} in the week's closest finish.` });
  const highestScoring = [...rows].sort((a, b) => ((b.homeScore + b.awayScore) - (a.homeScore + a.awayScore)) || a.key.localeCompare(b.key))[0];
  if (highestScoring) candidates.push({ type: 'highest-scoring', significance: 50 + highestScoring.homeScore + highestScoring.awayScore, key: `scoring:${highestScoring.key}`, teamIds: [highestScoring.homeId, highestScoring.awayId], text: `${highestScoring.scoreLine} produced the week's highest combined score (${highestScoring.homeScore + highestScoring.awayScore} points).` });

  for (const row of rows) {
    const expectedHome = number(row.game?.pregameExpectation?.homeWinProbability ?? row.game?.homeWinProbability);
    if (!row.winner || expectedHome == null || expectedHome < 0 || expectedHome > 1) continue;
    const winnerProbability = row.winnerSide === 'home' ? expectedHome : 1 - expectedHome;
    if (winnerProbability <= 0.35) candidates.push({ type: 'upset', significance: 90 + Math.round((0.5 - winnerProbability) * 100), key: `upset:${row.key}`, teamIds: [id(row.winner)], text: `${label(row.winner)} upset ${label(row.loser)} ${Math.max(row.homeScore, row.awayScore)}–${Math.min(row.homeScore, row.awayScore)} after entering with a ${Math.round(winnerProbability * 100)}% win probability.` });
  }
  return candidates;
}

function standingsStories(before, after, teamMap) {
  if (!Array.isArray(before) || !Array.isArray(after)) return [];
  const previous = new Map(before.map((row) => [id(row.teamId ?? row.id), row]));
  return after.flatMap((row) => {
    const teamId = id(row.teamId ?? row.id);
    const old = previous.get(teamId);
    if (!old) return [];
    const team = teamMap.get(teamId);
    if (row.divisionLeader === true && old.divisionLeader !== true) return [{ type: 'division-lead', significance: 110, key: `division:${teamId}`, teamIds: [teamId], text: `${label(team)} took the division lead.` }];
    const oldSeed = number(old.playoffSeed ?? old.seed); const newSeed = number(row.playoffSeed ?? row.seed);
    if (oldSeed != null && newSeed != null && oldSeed !== newSeed) return [{ type: 'playoff-seed', significance: 100 + Math.abs(oldSeed - newSeed), key: `seed:${teamId}`, teamIds: [teamId], text: `${label(team)} moved from playoff seed No. ${oldSeed} to No. ${newSeed}.` }];
    return [];
  });
}

function injuryStories(injuries) {
  const top = (Array.isArray(injuries) ? injuries : [])
    .filter((player) => String(player?.name ?? '').trim() && number(player?.injuryWeeksRemaining ?? player?.injury?.gamesRemaining) > 0)
    .sort((a, b) => (number(b?.injuryWeeksRemaining ?? b?.injury?.gamesRemaining) - number(a?.injuryWeeksRemaining ?? a?.injury?.gamesRemaining)) || id(a).localeCompare(id(b)))[0];
  if (!top) return [];
  const weeks = number(top?.injuryWeeksRemaining ?? top?.injury?.gamesRemaining);
  const injuryName = String(top?.injury?.name ?? top?.injuryName ?? '').trim();
  return [{ type: 'injury', significance: 80 + Math.min(weeks, 20), key: `injury:${id(top)}`, teamIds: top?.teamId != null ? [id(top.teamId)] : [], text: `${top.name}${injuryName ? ` (${injuryName})` : ''} is recorded out for ${weeks} week${weeks === 1 ? '' : 's'}.` }];
}

function nextHook(nextWeek = {}) {
  if (!nextWeek?.opponentAbbr && !nextWeek?.opponentName) return null;
  const opponent = nextWeek.opponentAbbr ?? nextWeek.opponentName;
  if (nextWeek.isRematch && nextWeek.previousMeetingWeek != null) return `Next: a rematch with ${opponent} from Week ${nextWeek.previousMeetingWeek}.`;
  if (nextWeek.isDivisional) return `Next: a divisional game against ${opponent}${nextWeek.opponentRecord ? ` (${nextWeek.opponentRecord})` : ''}.`;
  if (number(nextWeek.opponentStreak?.length) >= 2) return `Next: ${opponent}, riding a ${nextWeek.opponentStreak.length}-game ${nextWeek.opponentStreak.type === 'L' ? 'losing' : 'winning'} streak.`;
  return `Next: Week ${nextWeek.week} against ${opponent}${nextWeek.opponentRecord ? ` (${nextWeek.opponentRecord})` : ''}.`;
}

/** Pure, presentation-only weekly story model. It derives copy from recorded facts and never persists state. */
export function buildWeeklyStoryPresentation({ league = {}, week, userTeamId = league?.userTeamId, userGame = null, completedGames = [], injuries = [], standingsBefore = null, standingsAfter = null, nextWeek = null } = {}) {
  const selectedWeek = number(week ?? userGame?.week) ?? null;
  const teams = Array.isArray(league?.teams) ? league.teams : [];
  const teamMap = new Map(teams.map((team) => [id(team), team]));
  const gamePresentation = userGame ? buildGameBookPresentation({ league, game: userGame, gameId: userGame?.gameId, context: { season: league?.seasonId, week: selectedWeek } }) : null;
  const candidates = [...standingsStories(standingsBefore, standingsAfter, teamMap), ...injuryStories(injuries), ...buildGameCandidates(completedGames, teamMap, userTeamId)]
    .sort((a, b) => (b.significance - a.significance) || a.key.localeCompare(b.key));
  const seenTypes = new Set(); const seenSubjects = new Set(); const leagueHeadlines = [];
  for (const candidate of candidates) {
    if (leagueHeadlines.length >= 5 || seenTypes.has(candidate.type)) continue;
    const subject = candidate.teamIds?.[0];
    if (subject && seenSubjects.has(subject)) continue;
    leagueHeadlines.push(candidate); seenTypes.add(candidate.type); (candidate.teamIds ?? []).forEach((teamId) => seenSubjects.add(teamId));
  }
  const standingsImpact = leagueHeadlines.filter((row) => row.type === 'division-lead' || row.type === 'playoff-seed');
  const hook = nextHook(nextWeek);
  return {
    week: selectedWeek,
    season: league?.seasonId ?? league?.year ?? null,
    userGameStory: gamePresentation ? { presentation: gamePresentation, takeaways: buildUserTakeaways(gamePresentation) } : null,
    leagueHeadlines,
    standingsImpact,
    nextMatchupHook: hook,
    injuries: (Array.isArray(injuries) ? injuries : []).filter((player) => String(player?.name ?? '').trim() && number(player?.injuryWeeksRemaining ?? player?.injury?.gamesRemaining) > 0),
    availableData: { userGame: Boolean(gamePresentation?.availableData?.finalScore), detailedGame: Boolean(gamePresentation?.hasDetailedStats), leagueHeadlines: leagueHeadlines.length > 0, standingsMovement: standingsImpact.length > 0, nextMatchup: Boolean(hook) },
    omittedReasons: { upset: completedGames.some((game) => completed(game) && number(game?.pregameExpectation?.homeWinProbability ?? game?.homeWinProbability) != null) ? null : 'No recorded pregame expectation', standingsMovement: Array.isArray(standingsBefore) && Array.isArray(standingsAfter) ? null : 'No authoritative before/after standings snapshots', rookie: 'Weekly results do not expose reliable rookie identity with canonical stat lines', clinchElimination: 'No authoritative weekly transition helper was supplied' },
  };
}
