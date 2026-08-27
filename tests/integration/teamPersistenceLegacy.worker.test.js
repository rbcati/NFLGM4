import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it } from 'vitest';
import { cache } from '../../src/db/cache.js';
import { openDB, Players, Teams } from '../../src/db/index.js';
import { dispatchWorker, loadWorkerModule } from '../../src/testSupport/dynastySoakRunner.js';
import { toUI, toWorker } from '../../src/worker/protocol.js';

const SLOT_KEY = 'save_slot_1';

async function putRawLegacyTeam(team) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('teams', 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Legacy fixture write aborted'));
    tx.objectStore('teams').put(team);
  });
}

describe.sequential('legacy team persistence rewrite', () => {
  afterAll(() => {
    globalThis.__dynastySoakBroadcast = null;
  });

  it('reconciles team.players when roster is empty and rewrites the raw row', async () => {
    await loadWorkerModule();
    await dispatchWorker(toWorker.INIT, {}, { timeoutMs: 30_000 });
    const created = await dispatchWorker(toWorker.USE_SAFE_STARTER_LEAGUE, {
      slotKey: SLOT_KEY,
      options: { rngSeed: 1781, userTeamId: 0, name: 'Legacy Team Rewrite' },
    }, { timeoutMs: 60_000 });
    expect(created.type).toBe(toUI.FULL_STATE);

    const team = await Teams.load(0);
    const initialPlayers = await Players.byTeam(team.id);
    const canonical = initialPlayers[0];
    const remainingPlayers = initialPlayers.slice(0, -1);
    await Players.delete(initialPlayers.at(-1).id);
    const staleCanonical = {
      ...canonical,
      ovr: Math.max(0, Number(canonical.ovr) - 20),
      contract: { ...canonical.contract, years: 1 },
    };
    const legacyOnly = {
      id: 'legacy-players-only', name: 'Players Only', pos: 'WR', age: 24,
      ovr: 76, pot: 82, ratings: { speed: 90, catching: 83 },
      baseAnnual: 3, signingBonus: 0.5, years: 2, yearsTotal: 2,
      contract: { baseAnnual: 3, signingBonus: 0.5, years: 2, yearsTotal: 2 },
      teamId: 1, status: 'active', morale: 74,
    };
    await putRawLegacyTeam({
      ...team,
      roster: [],
      players: [staleCanonical, legacyOnly],
      rosterIds: [...remainingPlayers.map((player) => player.id), legacyOnly.id],
      rosterCount: remainingPlayers.length + 1,
    });

    cache.reset();
    expect((await dispatchWorker(toWorker.LOAD_SAVE, { leagueId: SLOT_KEY }, { timeoutMs: 180_000 })).type).toBe(toUI.FULL_STATE);
    expect(cache.getPlayer(canonical.id)).toMatchObject({
      ovr: canonical.ovr,
      contract: { years: canonical.contract.years, yearsTotal: canonical.contract.yearsTotal },
    });
    expect(cache.getPlayer(legacyOnly.id)).toMatchObject({ ...legacyOnly, teamId: team.id });
    const depthIds = Object.values(cache.getTeam(team.id).depthChart ?? {}).flat(Infinity).filter((id) => typeof id !== 'object');
    for (const playerId of depthIds) expect(cache.getPlayer(playerId)).toBeTruthy();

    expect((await dispatchWorker(toWorker.SAVE_NOW, {}, { timeoutMs: 120_000 })).type).toBe(toUI.SAVED);
    const rewritten = await Teams.load(team.id);
    expect(rewritten).not.toHaveProperty('roster');
    expect(rewritten).not.toHaveProperty('players');

    cache.reset();
    expect((await dispatchWorker(toWorker.LOAD_SAVE, { leagueId: SLOT_KEY }, { timeoutMs: 180_000 })).type).toBe(toUI.FULL_STATE);
    expect(cache.getPlayersByTeam(team.id).filter((player) => player.id === legacyOnly.id)).toHaveLength(1);
    expect(cache.getPlayersByTeam(1).some((player) => player.id === legacyOnly.id)).toBe(false);
    expect((await Players.loadAll()).filter((player) => player.id === legacyOnly.id)).toHaveLength(1);
  }, 300_000);
});
