import 'fake-indexeddb/auto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cache } from '../../src/db/cache.js';
import { toUI, toWorker } from '../../src/worker/protocol.js';

const USER_TEAM_ID = 0;
const SLOT_KEY = 'save_slot_1';
const TIMEOUT_MS = 180_000;

const waiters = new Map();
let messageSequence = 0;

function installSelfBridge() {
  globalThis.self = {
    onmessage: null,
    postMessage(message) {
      if (message?.id == null || !waiters.has(message.id)) return;
      const resolve = waiters.get(message.id);
      waiters.delete(message.id);
      resolve(message);
    },
  };
}

function send(type, payload = {}) {
  const id = `start-season-roster-authority-${++messageSequence}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiters.delete(id);
      reject(new Error(`Timeout waiting for ${type}`));
    }, TIMEOUT_MS);
    waiters.set(id, (message) => {
      clearTimeout(timer);
      resolve(message);
    });
    globalThis.self.onmessage({ data: { type, payload, id } });
  });
}

function payloadOf(message) {
  const payload = message?.payload;
  return payload && typeof payload._jsonPayload === 'string' ? JSON.parse(payload._jsonPayload) : payload;
}

function roster(teamId) {
  return cache.getPlayersByTeam(teamId).slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));
}

function rosterIds(teamId) {
  return roster(teamId).map((player) => String(player.id));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function trimRoster(teamId, count) {
  for (const player of roster(teamId).slice(count)) {
    cache.updatePlayer(player.id, { teamId: null, status: 'free_agent', ovr: 59, potential: 59, age: 27 });
  }
  expect(roster(teamId)).toHaveLength(count);
}

async function bootDraftLeague() {
  const boot = await send(toWorker.USE_SAFE_STARTER_LEAGUE, {
    slotKey: SLOT_KEY,
    options: { rngSeed: 1684, userTeamId: USER_TEAM_ID, name: `Start Season Authority ${Date.now()}` },
  });
  expect(boot.type, JSON.stringify(payloadOf(boot))).toBe(toUI.FULL_STATE);
  cache.setMeta({ phase: 'draft', currentWeek: 1 });
  delete globalThis.__FOOTBALL_GM_LITE_BATCH_SIM__;
}

beforeAll(async () => {
  installSelfBridge();
  await import('../../src/worker/worker.js');
  const ready = await send(toWorker.INIT);
  expect(ready.type).toBe(toUI.READY);
}, TIMEOUT_MS);

beforeEach(async () => {
  await bootDraftLeague();
}, TIMEOUT_MS);

afterAll(() => {
  delete globalThis.__FOOTBALL_GM_LITE_BATCH_SIM__;
  delete globalThis.self;
});

describe('START_NEW_SEASON roster-management authority', () => {
  it('allows an underfilled interactive user into preseason without auto-managing that roster', async () => {
    trimRoster(USER_TEAM_ID, 52);
    const idsBefore = rosterIds(USER_TEAM_ID);
    const contractsBefore = roster(USER_TEAM_ID).map((player) => [String(player.id), clone(player.contract)]);
    const userMoneyBefore = clone({ deadCap: cache.getTeam(USER_TEAM_ID)?.deadCap, deadMoneyNextYear: cache.getTeam(USER_TEAM_ID)?.deadMoneyNextYear });

    const reply = await send(toWorker.START_NEW_SEASON);

    expect(reply.type, JSON.stringify(payloadOf(reply))).toBe(toUI.FULL_STATE);
    expect(cache.getMeta()?.phase).toBe('preseason');
    expect(rosterIds(USER_TEAM_ID)).toEqual(idsBefore);
    expect(roster(USER_TEAM_ID).map((player) => [String(player.id), clone(player.contract)])).toEqual(contractsBefore);
    expect({ deadCap: cache.getTeam(USER_TEAM_ID)?.deadCap, deadMoneyNextYear: cache.getTeam(USER_TEAM_ID)?.deadMoneyNextYear }).toEqual(userMoneyBefore);
  }, TIMEOUT_MS);

  it('includes an underfilled user in explicit headless reconciliation', async () => {
    trimRoster(USER_TEAM_ID, 52);
    globalThis.__FOOTBALL_GM_LITE_BATCH_SIM__ = true;

    const reply = await send(toWorker.START_NEW_SEASON);

    expect(reply.type, JSON.stringify(payloadOf(reply))).toBe(toUI.FULL_STATE);
    expect(cache.getMeta()?.phase).toBe('preseason');
    expect(roster(USER_TEAM_ID).length).toBeGreaterThanOrEqual(53);
  }, TIMEOUT_MS);

  it('still reconciles an underfilled AI team during interactive rollover', async () => {
    const aiTeamId = Number(cache.getAllTeams().find((team) => Number(team.id) !== USER_TEAM_ID).id);
    trimRoster(aiTeamId, 52);

    const reply = await send(toWorker.START_NEW_SEASON);

    expect(reply.type, JSON.stringify(payloadOf(reply))).toBe(toUI.FULL_STATE);
    expect(cache.getMeta()?.phase).toBe('preseason');
    expect(roster(aiTeamId).length).toBeGreaterThanOrEqual(53);
  }, TIMEOUT_MS);

  it('reports a genuine AI failure without stranding START_NEW_SEASON in preseason', async () => {
    const aiTeamId = Number(cache.getAllTeams().find((team) => Number(team.id) !== USER_TEAM_ID).id);
    trimRoster(aiTeamId, 52);
    for (const player of cache.getAllPlayers()) {
      if (player.teamId == null) cache.updatePlayer(player.id, { status: 'retired', retired: true });
    }
    const before = clone({
      phase: cache.getMeta()?.phase,
      year: cache.getMeta()?.year,
      season: cache.getMeta()?.season,
      currentSeasonId: cache.getMeta()?.currentSeasonId,
    });

    const reply = await send(toWorker.START_NEW_SEASON);
    const failure = payloadOf(reply)?.rosterLegalityFailure;

    expect(reply.type).toBe(toUI.ERROR);
    expect(failure?.teamId).toBe(aiTeamId);
    expect(Number(failure?.teamId)).not.toBe(USER_TEAM_ID);
    expect({
      phase: cache.getMeta()?.phase,
      year: cache.getMeta()?.year,
      season: cache.getMeta()?.season,
      currentSeasonId: cache.getMeta()?.currentSeasonId,
    }).toEqual(before);
  }, TIMEOUT_MS);

  it('retains the interactive 53-player gate before regular-season entry', async () => {
    trimRoster(USER_TEAM_ID, 52);
    cache.setMeta({ phase: 'preseason', currentWeek: 1 });

    const reply = await send(toWorker.ADVANCE_WEEK, { skipUserGame: true });

    expect(reply.type).toBe(toUI.ERROR);
    expect(payloadOf(reply)?.message).toContain('Roster minimum not met');
    expect(cache.getMeta()?.phase).toBe('preseason');
    expect(roster(USER_TEAM_ID)).toHaveLength(52);
  }, TIMEOUT_MS);
});
