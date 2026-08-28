import 'fake-indexeddb/auto';
import { afterAll, describe, expect, it } from 'vitest';
import { cache } from '../../db/cache.js';
import { openDB, Players, Teams } from '../../db/index.js';
import { dispatchWorker, loadWorkerModule } from '../../testSupport/dynastySoakRunner.js';
import { toUI, toWorker } from '../protocol.js';

const SLOT_KEY = 'save_slot_1';

async function putLegacyTeamRow(team) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction('teams', 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Legacy fixture write aborted'));
    tx.objectStore('teams').put(team);
  });
}

describe.sequential('legacy embedded roster membership', () => {
  afterAll(() => {
    globalThis.__dynastySoakBroadcast = null;
  });

  it('assigns a promoted legacy-only player to the containing team across save/reload', async () => {
    await loadWorkerModule();
    await dispatchWorker(toWorker.INIT, {}, { timeoutMs: 30_000 });
    const created = await dispatchWorker(toWorker.USE_SAFE_STARTER_LEAGUE, {
      slotKey: SLOT_KEY,
      options: { rngSeed: 1780, userTeamId: 0, name: 'Legacy Roster Membership' },
    }, { timeoutMs: 60_000 });
    expect(created.type).toBe(toUI.FULL_STATE);

    const teamA = await Teams.load(0);
    const teamB = await Teams.load(1);
    const initialAPlayers = await Players.byTeam(0);
    const replacedPlayer = initialAPlayers.at(-1);
    await Players.delete(replacedPlayer.id);
    const canonicalAPlayers = initialAPlayers.slice(0, -1);
    expect(canonicalAPlayers.length).toBeGreaterThan(0);

    const legacyX = {
      id: 'legacy-x', name: 'Legacy X', pos: 'WR', age: 25, ovr: 79, pot: 84,
      ratings: { speed: 91, catching: 86 }, contract: { baseAnnual: 4.5, signingBonus: 1.25, years: 2, yearsTotal: 2 },
      baseAnnual: 4.5, signingBonus: 1.25, years: 2, yearsTotal: 2,
      status: 'active', teamId: teamB.id, morale: 88, history: [{ year: 2024, teamId: teamB.id }],
    };
    await putLegacyTeamRow({
      ...teamA,
      roster: [...canonicalAPlayers, legacyX],
      players: [...canonicalAPlayers, legacyX],
      rosterIds: [...canonicalAPlayers.map((player) => player.id), legacyX.id],
      rosterCount: canonicalAPlayers.length + 1,
    });
    expect(await Players.load(legacyX.id)).toBeNull();

    cache.reset();
    const firstLoad = await dispatchWorker(toWorker.LOAD_SAVE, { leagueId: SLOT_KEY }, { timeoutMs: 180_000 });
    expect(firstLoad.type).toBe(toUI.FULL_STATE);
    expect(cache.getPlayer(legacyX.id)).toMatchObject({ ...legacyX, teamId: teamA.id });
    expect(cache.getPlayersByTeam(teamA.id).some((player) => player.id === legacyX.id)).toBe(true);
    expect(cache.getPlayersByTeam(teamB.id).some((player) => player.id === legacyX.id)).toBe(false);

    const saved = await dispatchWorker(toWorker.SAVE_NOW, {}, { timeoutMs: 120_000 });
    expect(saved.type).toBe(toUI.SAVED);
    const rawTeamA = await Teams.load(teamA.id);
    expect(rawTeamA).not.toHaveProperty('roster');
    expect(rawTeamA).not.toHaveProperty('players');

    cache.reset();
    const secondLoad = await dispatchWorker(toWorker.LOAD_SAVE, { leagueId: SLOT_KEY }, { timeoutMs: 180_000 });
    expect(secondLoad.type).toBe(toUI.FULL_STATE);
    const persistedX = await Players.load(legacyX.id);
    expect(persistedX).toMatchObject({ ...legacyX, teamId: teamA.id });
    expect(cache.getPlayersByTeam(teamA.id).filter((player) => player.id === legacyX.id)).toHaveLength(1);
    expect(cache.getPlayersByTeam(teamB.id).some((player) => player.id === legacyX.id)).toBe(false);
    expect((await Players.loadAll()).filter((player) => player.id === legacyX.id)).toHaveLength(1);
  }, 300_000);
});
