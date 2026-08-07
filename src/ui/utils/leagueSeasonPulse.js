import { prepareStandingsView } from '../../views/standingsView.js';
import { buildWeeklyStoryPresentation } from './weeklyStoryPresentation.js';

const n = (value) => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const id = (value) => String(value?.id ?? value?.teamId ?? value ?? '');
const playerId = (value) => value?.playerId ?? value?.id ?? value?.player?.id ?? null;
const playerKey = (value) => String(playerId(value) ?? '');
const teamName = (team) => team?.abbr ?? team?.name ?? 'Team';
const sideId = (game, side) => id(game?.[`${side}Id`] ?? game?.[side]);
const gameKey = (game) => String(game?.gameId ?? game?.id ?? `${sideId(game, 'away')}-${sideId(game, 'home')}`);
const isPlayed = (game) => n(game?.homeScore ?? game?.scoreHome) != null && n(game?.awayScore ?? game?.scoreAway) != null;

function scheduleRows(schedule) {
  return (Array.isArray(schedule?.weeks) ? schedule.weeks : [])
    .map((row) => ({ week: n(row?.week), games: Array.isArray(row?.games) ? row.games : [] }))
    .filter((row) => row.week != null)
    .sort((a, b) => a.week - b.week);
}

function resolveCompletedGames(schedule, requestedWeek, supplied) {
  if (Array.isArray(supplied)) return { week: n(requestedWeek), games: supplied.filter(isPlayed) };
  const eligible = scheduleRows(schedule)
    .filter((row) => requestedWeek == null || row.week <= requestedWeek)
    .filter((row) => row.games.some(isPlayed));
  const row = eligible.at(-1);
  return { week: row?.week ?? n(requestedWeek), games: (row?.games ?? []).filter(isPlayed) };
}

function resultsForTeam(schedule, teamId, throughWeek) {
  return scheduleRows(schedule).filter((row) => throughWeek == null || row.week <= throughWeek).flatMap((row) => row.games)
    .filter(isPlayed)
    .filter((game) => sideId(game, 'home') === teamId || sideId(game, 'away') === teamId)
    .map((game) => {
      const home = sideId(game, 'home') === teamId;
      const mine = n(home ? game?.homeScore ?? game?.scoreHome : game?.awayScore ?? game?.scoreAway);
      const theirs = n(home ? game?.awayScore ?? game?.scoreAway : game?.homeScore ?? game?.scoreHome);
      return mine === theirs ? 'T' : mine > theirs ? 'W' : 'L';
    });
}

function buildTrends(teams, schedule, week) {
  const rows = teams.map((team) => {
    const teamId = id(team);
    const results = resultsForTeam(schedule, teamId, week);
    const last = results.at(-1);
    let length = 0;
    if (last === 'W' || last === 'L') for (let i = results.length - 1; i >= 0 && results[i] === last; i -= 1) length += 1;
    const wins = n(team?.wins) ?? results.filter((r) => r === 'W').length;
    const losses = n(team?.losses) ?? results.filter((r) => r === 'L').length;
    const ties = n(team?.ties) ?? results.filter((r) => r === 'T').length;
    return { team, teamId, results, last, length, wins, losses, ties };
  });
  const trends = [];
  const winners = rows.filter((row) => row.last === 'W' && row.length >= 2).sort((a, b) => b.length - a.length || a.teamId.localeCompare(b.teamId));
  const losers = rows.filter((row) => row.last === 'L' && row.length >= 2).sort((a, b) => b.length - a.length || a.teamId.localeCompare(b.teamId));
  const undefeated = rows.filter((row) => row.results.length >= 2 && row.losses === 0).sort((a, b) => b.wins - a.wins || a.teamId.localeCompare(b.teamId));
  if (winners[0]) trends.push({ teamId: winners[0].team.id, label: 'Winning streak', value: `${winners[0].length} games`, reason: `${teamName(winners[0].team)} has won ${winners[0].length} straight.` });
  if (losers[0]) trends.push({ teamId: losers[0].team.id, label: 'Losing streak', value: `${losers[0].length} games`, reason: `${teamName(losers[0].team)} has lost ${losers[0].length} straight.` });
  if (undefeated[0] && !trends.some((row) => id(row.teamId) === undefeated[0].teamId)) trends.push({ teamId: undefeated[0].team.id, label: 'Undefeated', value: `${undefeated[0].wins}-${undefeated[0].losses}${undefeated[0].ties ? `-${undefeated[0].ties}` : ''}`, reason: `${teamName(undefeated[0].team)} remains unbeaten.` });
  return trends.slice(0, 4);
}

const AWARDS = [['mvp', 'MVP'], ['opoy', 'OPOY'], ['dpoy', 'DPOY'], ['oroy', 'OROY'], ['droy', 'DROY']];
function buildAwardWatch(league, teams) {
  const races = league?.awardRaces?.awards;
  if (!races || typeof races !== 'object') return [];
  const teamMap = new Map(teams.map((team) => [id(team), team]));
  const seen = new Set();
  return AWARDS.flatMap(([key, award]) => {
    const board = races?.[key]?.league ?? races?.[key]?.afc ?? races?.[key]?.nfc;
    const leader = Array.isArray(board) ? board[0] : null;
    const playerId = id(leader?.playerId ?? leader?.id);
    const name = String(leader?.playerName ?? leader?.name ?? '').trim();
    if (!leader || !playerId || !name || seen.has(playerId)) return [];
    seen.add(playerId);
    const team = teamMap.get(id(leader?.teamId));
    return [{ award, playerId: leader?.playerId ?? leader?.id, playerName: name, position: leader?.pos ?? leader?.position ?? null, teamId: leader?.teamId ?? null, team: teamName(team), score: n(leader?.score) }];
  });
}

function buildInjuries(league, teams) {
  const supplied = Array.isArray(league?.injuries) ? league.injuries : [];
  const roster = teams.flatMap((team) => (team?.roster ?? []).map((player) => ({ ...player, teamId: player?.teamId ?? team.id })));
  return [...supplied, ...roster]
    .map((player) => ({ player, weeks: n(player?.injuryWeeksRemaining ?? player?.injury?.gamesRemaining ?? player?.weeksOut) }))
    .filter(({ player, weeks }) => playerKey(player) && String(player?.name ?? '').trim() && weeks > 0)
    .sort((a, b) => b.weeks - a.weeks || playerKey(a.player).localeCompare(playerKey(b.player)))
    .filter((row, index, all) => all.findIndex((other) => playerKey(other.player) === playerKey(row.player)) === index)
    .slice(0, 3)
    .map(({ player, weeks }) => ({ playerId: playerId(player), playerName: player.name, teamId: player.teamId ?? null, position: player.pos ?? player.position ?? null, injury: player?.injury?.name ?? player?.injuryName ?? null, weeksRemaining: weeks }));
}

function currentStandings(league) {
  if (!(league?.teams?.length || league?.standings?.length)) return [];
  return prepareStandingsView(league).divisions.flatMap((division) => {
    const leader = division.teams[0];
    return leader ? [{ type: 'division-leader', teamId: leader.id, text: `${teamName(leader)} leads its division at ${leader.wins}-${leader.losses}${leader.ties ? `-${leader.ties}` : ''}.` }] : [];
  });
}

function buildNextWeek(schedule, teams, userTeamId, afterWeek) {
  const teamMap = new Map(teams.map((team) => [id(team), team]));
  const candidates = scheduleRows(schedule).filter((row) => afterWeek == null || row.week > afterWeek).flatMap((row) => row.games.filter((game) => !isPlayed(game)).map((game) => {
    const home = teamMap.get(sideId(game, 'home')); const away = teamMap.get(sideId(game, 'away'));
    if (!home || !away) return null;
    const userGame = [id(home), id(away)].includes(id(userTeamId));
    const divisional = home.conf != null && away.conf != null && String(home.conf) === String(away.conf) && String(home.div ?? home.division) === String(away.div ?? away.division);
    const games = (team) => (n(team.wins) ?? 0) + (n(team.losses) ?? 0) + (n(team.ties) ?? 0);
    const pct = (team) => games(team) ? ((n(team.wins) ?? 0) + (n(team.ties) ?? 0) * 0.5) / games(team) : 0;
    const strong = games(home) >= 2 && games(away) >= 2 && pct(home) > 0.5 && pct(away) > 0.5;
    const prior = scheduleRows(schedule).filter((old) => old.week < row.week).some((old) => old.games.some((game) => [sideId(game, 'home'), sideId(game, 'away')].includes(id(home)) && [sideId(game, 'home'), sideId(game, 'away')].includes(id(away)) && isPlayed(game)));
    const priority = (userGame ? 100 : 0) + (divisional ? 30 : 0) + (strong ? 20 : 0) + (prior ? 10 : 0) - row.week;
    const reason = userGame ? `Your Week ${row.week} matchup` : divisional ? 'Divisional matchup' : strong ? 'Two teams above .500' : prior ? 'Rematch' : `Week ${row.week} matchup`;
    return { week: row.week, gameId: game.gameId ?? game.id ?? null, homeTeamId: home.id, awayTeamId: away.id, homeTeam: teamName(home), awayTeam: teamName(away), reason, priority, key: gameKey(game) };
  }).filter(Boolean));
  return candidates.sort((a, b) => b.priority - a.priority || a.week - b.week || a.key.localeCompare(b.key))[0] ?? null;
}

/** Pure, deterministic Season Pulse assembled only from state already present in the League view. */
export function buildLeagueSeasonPulse({ league = {}, userTeamId = league?.userTeamId, completedGames, schedule = league?.schedule, standingsBefore = null, standingsAfter = null, week = league?.week } = {}) {
  const teams = Array.isArray(league?.teams) ? league.teams : [];
  const completed = resolveCompletedGames(schedule, n(week), completedGames);
  const injuries = buildInjuries(league, teams);
  const storyInjuries = injuries.map((row) => ({ id: row.playerId, name: row.playerName, teamId: row.teamId, injuryWeeksRemaining: row.weeksRemaining, injury: row.injury ? { name: row.injury } : null }));
  const story = buildWeeklyStoryPresentation({ league, week: completed.week, userTeamId, completedGames: completed.games, injuries: storyInjuries, standingsBefore, standingsAfter });
  const trendingTeams = buildTrends(teams, schedule, completed.week);
  const awardWatch = buildAwardWatch(league, teams);
  const standingsImpact = story.standingsImpact.length ? story.standingsImpact : currentStandings(league);
  const nextWeekHighlight = buildNextWeek(schedule, teams, userTeamId, completed.week);
  return {
    week: completed.week,
    headlineStories: story.leagueHeadlines,
    trendingTeams,
    awardWatch,
    majorInjuries: injuries,
    standingsImpact,
    nextWeekHighlight,
    availableData: { headlines: story.leagueHeadlines.length > 0, trends: trendingTeams.length > 0, awards: awardWatch.length > 0, injuries: injuries.length > 0, standings: standingsImpact.length > 0, nextWeek: Boolean(nextWeekHighlight) },
    omittedReasons: { headlines: completed.games.length ? null : 'No completed games were recorded', trends: trendingTeams.length ? null : 'No multi-game streak is established', awards: awardWatch.length ? null : 'No authoritative award race board is available', injuries: injuries.length ? null : 'No active recorded injuries', standingsMovement: Array.isArray(standingsBefore) && Array.isArray(standingsAfter) ? null : 'No before/after standings snapshots; current leaders only', nextWeek: nextWeekHighlight ? null : 'No upcoming scheduled game is available', hotSeat: 'League-wide historical pressure changes are not available in this view' },
  };
}
