import { describe, expect, it } from 'vitest';
import { Games, Meta, Players, PlayerStats, Teams, configureActiveLeague, openDB, clearAllData, profileLeagueStorage } from '../../src/db/index.js';

describe('db loadBulk', () => {
  it('loads multiple ids in-order when indexedDB is available', async () => {
    if (!global.indexedDB) {
      // Node-only runners in CI often do not provide indexedDB.
      expect(true).toBe(true);
      return;
    }

    configureActiveLeague('test_league');
    await openDB();
    await clearAllData();

    const testPlayers = [
      { id: 'p1', name: 'Player 1', pos: 'QB', teamId: 1 },
      { id: 'p2', name: 'Player 2', pos: 'RB', teamId: 2 },
      { id: 'p3', name: 'Player 3', pos: 'WR', teamId: 1 },
    ];

    await Players.saveBulk(testPlayers);
    const loaded = await Players.loadBulk(['p1', 'p2', 'p4']);

    expect(loaded).toHaveLength(3);
    expect(loaded[0]?.id).toBe('p1');
    expect(loaded[1]?.id).toBe('p2');
    expect(loaded[2]).toBeNull();

    const empty = await Players.loadBulk([]);
    expect(empty).toEqual([]);
  });

  it('profiles UTF-8 serialized payloads one store at a time', async () => {
    if (!global.indexedDB) return;
    configureActiveLeague('storage_profile_league');
    await openDB();
    await clearAllData();
    const player = { id: 'p-unicode', name: 'José 🏈', teamId: 1 };
    await Players.save(player);
    await PlayerStats.save({ id: 's1_p-unicode', seasonId: 's1', playerId: 'p-unicode', totals: { yards: 10 } });
    await Meta.save({ currentSeasonId: 's1', leagueHistory: [{ year: 2025 }] });
    await Teams.save({ id: 1, name: 'Team', draftBoard: ['p1', 'p2'] });
    await Games.save({ id: 'g-current', seasonId: 's1', plays: [{ yards: 5 }] });
    await Games.save({ id: 'g-old', seasonId: 's0', plays: [{ yards: 10 }, { yards: 20 }] });

    const census = await profileLeagueStorage({ currentSeasonId: 's1' });

    expect(census.authority).toBe('approximate-serialized-payload');
    expect(census.stores.players).toMatchObject({ rowCount: 1, serializedBytes: new TextEncoder().encode(JSON.stringify(player)).byteLength });
    expect(census.stores.playerStats).toMatchObject({ rowCount: 1, currentSeasonRows: 1 });
    expect(census.stores.meta.topLevelFields.leagueHistory).toMatchObject({ serializedBytes: expect.any(Number), percentOfParent: expect.any(Number) });
    expect(census.stores.teams.topLevelFields.draftBoard.serializedBytes).toBeGreaterThan(0);
    expect(census.stores.teams.largestTeamRow).toMatchObject({ id: 1, serializedBytes: expect.any(Number) });
    expect(census.stores.games.bySeasonAge).toMatchObject({ currentSeason: { rowCount: 1 }, olderSeasons: { rowCount: 1 } });
    expect(census.stores.games.bySeasonAge.olderSeasons.averageBytesPerRow).toBeGreaterThan(census.stores.games.bySeasonAge.currentSeason.averageBytesPerRow);
    expect(census.totalSerializedBytes).toBeGreaterThan(census.stores.players.serializedBytes);
  });
});
