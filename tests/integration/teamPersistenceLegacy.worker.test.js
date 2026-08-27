import 'fake-indexeddb/auto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cache } from '../../src/db/cache.js';
import { openDB, Players, Teams } from '../../src/db/index.js';
import { toUI, toWorker } from '../../src/worker/protocol.js';

const SLOT_KEY = 'save_slot_3';
const TIMEOUT = 180_000;
const waiters = new Map();
let sequence = 0;

function installWorkerBridge() {
  globalThis.self = {
    onmessage: null,
    postMessage(message) {
      const waiter = waiters.get(message?.id);
      if (!waiter) return;
      waiters.delete(message.id);
      waiter(message);
    },
  };
}

function send(type, payload = {}) {
  const id = `team-persistence-${++sequence}`;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      waiters.delete(id);
      reject(new Error(`Timed out waiting for ${type}`));
    }, TIMEOUT);
    waiters.set(id, (message) => {
      clearTimeout(timeout);
      resolve(message);
    });
    globalThis.self.onmessage({ data: { id, type, payload } });
  });
}

async function putRawLegacyTeam(team) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(['teams'], 'readwrite');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('raw legacy write aborted'));
    tx.objectStore('teams').put(team);
  });
}

beforeAll(async () => {
  installWorkerBridge();
  await import('../../src/worker/worker.js');
  expect((await send(toWorker.INIT)).type).toBe(toUI.READY);
  const created = await send(toWorker.USE_SAFE_STARTER_LEAGUE, {
    slotKey: SLOT_KEY,
    options: { rngSeed: 1684, userTeamId: 0, name: 'Legacy Team Persistence' },
  });
  expect(created.type).toBe(toUI.FULL_STATE);
}, TIMEOUT);

afterAll(() => {
  delete globalThis.self;
});

describe('legacy team rows through real LOAD_SAVE and SAVE_NOW', () => {
  it('normalizes embedded projections while preserving canonical precedence and depth references', async () => {
    const team = cache.getTeam(0);
    const originalRoster = cache.getPlayersByTeam(0);
    const canonical = originalRoster[0];
    const legacyOnly = structuredClone(originalRoster[1]);
    expect(canonical).toBeTruthy();
    const canonicalAuthority = {
      id: canonical.id,
      name: canonical.name,
      ovr: canonical.ovr,
      ratings: structuredClone(canonical.ratings),
      teamId: canonical.teamId,
    };
    const stale = { ...canonical, ovr: 1, contract: { years: 1 } };
    await Players.delete(legacyOnly.id);
    const legacyTeam = {
      ...team,
      name: 'Preserved Legacy Team Name',
      depthChart: structuredClone(team.depthChart),
      rosterIds: originalRoster.map((player) => player.id),
      rosterCount: originalRoster.length,
      roster: [stale],
      players: [stale, legacyOnly],
    };
    await putRawLegacyTeam(legacyTeam);

    cache.reset();
    expect((await send(toWorker.LOAD_SAVE, { leagueId: SLOT_KEY })).type).toBe(toUI.FULL_STATE);
    expect((await send(toWorker.SAVE_NOW)).type).toBe(toUI.SAVED);

    const rawTeam = await Teams.load(0);
    expect(rawTeam).not.toHaveProperty('roster');
    expect(rawTeam).not.toHaveProperty('players');
    expect(rawTeam.name).toBe('Preserved Legacy Team Name');
    expect(rawTeam.rosterIds.map(String)).toEqual(expect.arrayContaining([String(canonical.id), String(legacyOnly.id)]));
    expect(rawTeam.rosterCount).toBe(rawTeam.rosterIds.length);

    const persistedCanonical = await Players.load(canonical.id);
    expect(persistedCanonical).toMatchObject(canonicalAuthority);
    expect(persistedCanonical.ovr).not.toBe(stale.ovr);
    expect(persistedCanonical.contract?.years).not.toBe(stale.contract.years);
    expect(await Players.load(legacyOnly.id)).toMatchObject({
      id: legacyOnly.id,
      name: legacyOnly.name,
      ovr: legacyOnly.ovr,
      teamId: 0,
    });

    cache.reset();
    expect((await send(toWorker.LOAD_SAVE, { leagueId: SLOT_KEY })).type).toBe(toUI.FULL_STATE);
    expect(cache.getPlayer(canonical.id)).toMatchObject(canonicalAuthority);
    expect(Number(cache.getPlayer(legacyOnly.id)?.teamId)).toBe(0);
    const reloadedTeam = cache.getTeam(0);
    const depthIds = Object.values(reloadedTeam.depthChart || {}).flat(Infinity).filter((id) => id != null);
    for (const playerId of depthIds) expect(cache.getPlayer(playerId)).toBeTruthy();
  }, TIMEOUT);
});
