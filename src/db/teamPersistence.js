/**
 * Return the canonical durable representation of a team.
 *
 * Player records belong to the players store. `roster` and `players` are
 * runtime/legacy projections and must never cross the team-store boundary.
 * Shallow exclusion is intentional: it avoids cloning the large player trees
 * that are being discarded and leaves the runtime object untouched.
 */
export function serializeTeamForPersistence(team) {
  if (!team || typeof team !== 'object') return team;
  const { roster: _roster, players: _players, ...persistedTeam } = team;
  return persistedTeam;
}

/**
 * Reconcile historically-supported embedded rosters before they are removed.
 * Existing player-store rows always win; embedded rows only fill missing IDs.
 */
export function reconcileLegacyTeamRosters(teams = [], canonicalPlayers = []) {
  const playersById = new Map();
  for (const player of canonicalPlayers || []) {
    if (player?.id != null) playersById.set(String(player.id), player);
  }

  const migratedPlayers = [];
  const normalizedTeams = (teams || []).map((team) => {
    const embedded = Array.isArray(team?.roster)
      ? team.roster
      : Array.isArray(team?.players) ? team.players : [];
    const membership = [];
    const seen = new Set();

    const addMember = (id) => {
      if (id == null) return;
      const key = String(id);
      if (seen.has(key)) return;
      seen.add(key);
      membership.push(id);
    };
    for (const id of Array.isArray(team?.rosterIds) ? team.rosterIds : []) addMember(id);
    for (const legacyPlayer of embedded) {
      if (legacyPlayer?.id == null) continue;
      addMember(legacyPlayer.id);
      const key = String(legacyPlayer.id);
      if (!playersById.has(key)) {
        const migrated = { ...legacyPlayer, teamId: team.id };
        playersById.set(key, migrated);
        migratedPlayers.push(migrated);
      }
    }

    const normalized = serializeTeamForPersistence(team);
    if (membership.length || embedded.length || Array.isArray(team?.rosterIds)) {
      normalized.rosterIds = membership;
      normalized.rosterCount = membership.length;
    }
    return normalized;
  });

  return {
    teams: normalizedTeams,
    players: [...playersById.values()],
    migratedPlayers,
  };
}
