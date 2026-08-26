function finite(value) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sideId(game, side) {
  return game?.[`${side}Id`] ?? game?.[side]?.id ?? game?.[side] ?? null;
}

export function isSameCompletedGame(left, right) {
  if (!left || !right) return false;
  if (left.gameId != null && right.gameId != null) return String(left.gameId) === String(right.gameId);
  return String(sideId(left, 'home')) === String(sideId(right, 'home'))
    && String(sideId(left, 'away')) === String(sideId(right, 'away'));
}

function readSideMetric(game, side, metric) {
  const teamStats = game?.teamStats?.[side] ?? game?.teamDriveStats?.[side] ?? null;
  if (metric === 'qbRating') return finite(game?.simFactors?.[side]?.qbRating ?? teamStats?.qbRating);
  if (metric === 'rushYpc') {
    const canonical = finite(game?.simFactors?.[side]?.rushYpc ?? teamStats?.rushYPC ?? teamStats?.rushYpc);
    if (canonical != null) return canonical;
    const yards = finite(teamStats?.rushYd ?? teamStats?.rushYards);
    const attempts = finite(teamStats?.rushAtt ?? teamStats?.rushAttempts);
    return yards != null && attempts != null && attempts > 0 ? yards / attempts : null;
  }
  if (metric === 'turnovers') return finite(teamStats?.turnovers);
  if (metric === 'sacks') return finite(teamStats?.sacksMade ?? teamStats?.sacks);
  return null;
}

export function buildWeeklyRecapMetrics(recapGame, completedGames = []) {
  if (!recapGame) return [];
  const matching = completedGames.find((game) => isSameCompletedGame(recapGame, game));
  const sources = matching && matching !== recapGame ? [recapGame, matching] : [recapGame];
  const read = (side, metric) => {
    for (const source of sources) {
      const value = readSideMetric(source, side, metric);
      if (value != null) return value;
    }
    return null;
  };
  return [
    { key: 'qbRating', label: 'QB Rtg', digits: 1 },
    { key: 'rushYpc', label: 'YPC', digits: 2 },
    { key: 'turnovers', label: 'TO', digits: 0 },
    { key: 'sacks', label: 'Sacks', digits: 0 },
  ].map((definition) => ({
    ...definition,
    away: read('away', definition.key),
    home: read('home', definition.key),
  })).filter((row) => row.away != null && row.home != null);
}
