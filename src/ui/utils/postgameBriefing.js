const finiteScore = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

/**
 * Builds the shared, read-only presentation model used by the weekly briefing.
 * Scores are copied from the completed game record; no scoring events are
 * summed and sparse legacy records remain honest.
 */
export function buildPostgameBriefing({ gameResult, leaders = [], injuries = [], nextWeek = null } = {}) {
  if (!gameResult) return null;
  const homeScore = finiteScore(gameResult.homeScore ?? gameResult.scoreHome);
  const awayScore = finiteScore(gameResult.awayScore ?? gameResult.scoreAway);
  const homeId = gameResult.homeTeam?.id ?? gameResult.homeId;
  const awayId = gameResult.awayTeam?.id ?? gameResult.awayId;
  const userId = gameResult.userTeamId;
  const userIsHome = String(homeId) === String(userId);
  const userIsAway = String(awayId) === String(userId);
  const hasFinal = homeScore != null && awayScore != null;
  const userScore = userIsHome ? homeScore : userIsAway ? awayScore : null;
  const opponentScore = userIsHome ? awayScore : userIsAway ? homeScore : null;
  const outcome = !hasFinal || userScore == null
    ? 'Final'
    : userScore === opponentScore ? 'Tie' : userScore > opponentScore ? 'Win' : 'Loss';
  const opponent = userIsHome ? gameResult.awayTeam : gameResult.homeTeam;
  const cleanLeaders = (Array.isArray(leaders) ? leaders : []).filter(
    (leader) => leader && String(leader.name ?? '').trim() && String(leader.statLine ?? '').trim(),
  );

  return {
    hasFinal,
    homeScore,
    awayScore,
    userIsHome,
    opponent,
    outcome,
    headline: outcome === 'Win' ? 'A winning week is in the books.' : outcome === 'Loss' ? 'Review the tape, then reset for next week.' : outcome === 'Tie' ? 'Even after four quarters.' : 'The official result is recorded.',
    leaders: cleanLeaders.slice(0, 3),
    injuries: (Array.isArray(injuries) ? injuries : []).filter(Boolean).slice(0, 4),
    nextWeek,
  };
}
