/**
 * aiCapManagementExecution.test.js
 *
 * Integration coverage for AiLogic.executeAICapManagement against an in-memory
 * cache. Verifies the live commit path: user-team isolation (interactive vs
 * explicit headless), team-id-0 validity, live-cap legality, and determinism.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = { store: null, txLog: [] };
  const mockCache = {
    getMeta: () => state.store.meta,
    setMeta: (p) => Object.assign(state.store.meta, p),
    getAllTeams: () => [...state.store.teams.values()],
    getTeam: (id) => state.store.teams.get(id),
    getPlayer: (id) => state.store.players.get(id),
    getPlayersByTeam: (id) => [...state.store.players.values()].filter((p) => p.teamId === id && p.status !== 'free_agent'),
    getAllPlayers: () => [...state.store.players.values()],
    updatePlayer: (id, patch) => { const p = state.store.players.get(id); if (p) Object.assign(p, patch); },
    updateTeam: (id, patch) => { const t = state.store.teams.get(id); if (t) Object.assign(t, patch); },
  };
  return { state, mockCache };
});

vi.mock('../../src/db/cache.js', () => ({ cache: h.mockCache }));
vi.mock('../../src/db/index.js', () => ({ Transactions: { add: (tx) => { h.state.txLog.push(tx); return Promise.resolve(); } } }));
vi.mock('../../src/core/news-engine.js', () => ({ default: { logTransaction: () => {}, logNews: () => {} } }));

import AiLogic from '../../src/core/ai-logic.js';
import { buildTeamCapSnapshot } from '../../src/core/contracts/contractObligations.js';

const LIVE_CAP = 100;

function contract(base, sb = 0, yearsTotal = 1, years = yearsTotal) {
  return { baseAnnual: base, signingBonus: sb, yearsTotal, years, yearsRemaining: years, restructureCount: 0 };
}

function makeRoster(teamId, { starBase = 40 } = {}) {
  const players = [];
  // Restructurable star (4 yrs) — one restructure should restore legality.
  players.push({ id: `${teamId}-STAR`, teamId, pos: 'QB', ovr: 92, age: 28, status: 'active', contract: contract(starBase, 0, 4, 4) });
  // 52 cheap depth players across positions so floors are satisfied.
  const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
  for (let i = 0; i < 52; i++) {
    players.push({ id: `${teamId}-d${i}`, teamId, pos: positions[i % positions.length], ovr: 62, age: 25, status: 'active', contract: contract(1.3, 0, 1, 1) });
  }
  return players;
}

function buildStore({ difficulty = 'Normal' } = {}) {
  const teams = new Map([
    [0, { id: 0, abbr: 'USR', capTotal: LIVE_CAP, deadCap: 0 }],
    [1, { id: 1, abbr: 'AI1', capTotal: LIVE_CAP, deadCap: 0 }],
    [2, { id: 2, abbr: 'AI2', capTotal: LIVE_CAP, deadCap: 0 }],
  ]);
  const players = new Map();
  // Team 0 (user) and Team 1 (AI) both over cap; Team 2 under cap.
  for (const p of makeRoster(0)) players.set(p.id, p);
  for (const p of makeRoster(1)) players.set(p.id, p);
  for (const p of [...makeRoster(2, { starBase: 5 })]) players.set(p.id, p); // cheap → legal
  return {
    meta: { userTeamId: 0, difficulty, economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's4', currentWeek: 1, year: 2029 },
    teams, players,
  };
}

function committed(teamId) {
  const team = h.state.store.teams.get(teamId);
  const roster = [...h.state.store.players.values()].filter((p) => p.teamId === teamId && p.status !== 'free_agent');
  return buildTeamCapSnapshot({ team, roster, salaryCap: LIVE_CAP });
}

beforeEach(() => {
  h.state.txLog.length = 0;
  h.state.store = buildStore();
});

describe('executeAICapManagement — user-team isolation', () => {
  it('does NOT auto-manage the interactive user team but DOES make AI teams legal', async () => {
    const userBefore = JSON.stringify([...h.state.store.players.values()].filter((p) => p.teamId === 0).map((p) => [p.id, p.contract, p.status]));
    expect(committed(0).isLegallyCompliant).toBe(false); // user starts over cap

    await AiLogic.executeAICapManagement({ autoManageUserCap: false });

    // User roster + contracts are untouched.
    const userAfter = JSON.stringify([...h.state.store.players.values()].filter((p) => p.teamId === 0).map((p) => [p.id, p.contract, p.status]));
    expect(userAfter).toBe(userBefore);
    expect(committed(0).isLegallyCompliant).toBe(false);

    // AI team is legal.
    expect(committed(1).isLegallyCompliant).toBe(true);
  });

  it('auto-manages the user team ONLY under the explicit headless capability', async () => {
    expect(committed(0).isLegallyCompliant).toBe(false);
    const res = await AiLogic.executeAICapManagement({ autoManageUserCap: true });
    expect(committed(0).isLegallyCompliant).toBe(true);
    expect(res.failures.length).toBe(0);
  });
});

describe('executeAICapManagement — legality & structure', () => {
  function releaseReserveRoster({ overage, releasableBase }) {
    const players = [];
    const floors = { QB: 2, RB: 2, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 2, S: 2, K: 1, P: 1 };
    let index = 0;
    for (const [pos, count] of Object.entries(floors)) {
      for (let i = 0; i < count; i += 1) players.push({ id: `floor-${index++}`, teamId: 9, pos, ovr: 70, contract: contract(1) });
    }
    while (players.length < 53) players.push({ id: `extra-${index++}`, teamId: 9, pos: 'WR', ovr: 60, contract: contract(releasableBase) });
    const current = players.reduce((sum, player) => sum + player.contract.baseAnnual, 0);
    players[0].contract.baseAnnual += LIVE_CAP + overage - current;
    return players;
  }

  it('dynamically reserves the replacement minimum after a release creates one missing slot', () => {
    const roster = releaseReserveRoster({ overage: 0.2, releasableBase: 1.2 });
    const plan = AiLogic.buildAiCapCompliancePlan({ id: 9, deadCap: 0 }, roster, { legalCap: LIVE_CAP, season: 2032 });
    const releases = plan.actions.filter((action) => action.type === 'RELEASE');
    expect(releases).toHaveLength(1);
    expect(plan.projected.projectedRosterCount ?? (53 - releases.length)).toBe(52);
    expect(plan.projected.requiredMinimumRoom).toBe(0.8);
    expect(plan.projected.rosterReadyCommitted).toBeLessThanOrEqual(LIVE_CAP);
  });

  it('keeps planning when the first release is cap-legal alone but not with its replacement', () => {
    const roster = releaseReserveRoster({ overage: 0.5, releasableBase: 1.1 });
    const plan = AiLogic.buildAiCapCompliancePlan({ id: 9, deadCap: 0 }, roster, { legalCap: LIVE_CAP, season: 2032 });
    const releases = plan.actions.filter((action) => action.type === 'RELEASE');
    expect(releases).toHaveLength(2);
    expect(plan.projected.requiredMinimumRoom).toBe(1.6);
    expect(plan.projected.rosterReadyCommitted).toBeLessThanOrEqual(LIVE_CAP);
    expect(plan.failure).toBeNull();
  });

  it('brings every AI team legally under the LIVE cap', async () => {
    await AiLogic.executeAICapManagement({ autoManageUserCap: false });
    expect(committed(1).isLegallyCompliant).toBe(true);
    expect(committed(2).isLegallyCompliant).toBe(true); // already legal, untouched
  });

  it('treats team id 0 as a valid team (not absent) when headless', async () => {
    // team 0 must be found and managed — not skipped as a falsy id.
    await AiLogic.executeAICapManagement({ autoManageUserCap: true });
    expect(h.state.store.teams.get(0)).toBeDefined();
    expect(committed(0).isLegallyCompliant).toBe(true);
  });

  it('commits NOTHING and reports a structured failure when no legal plan exists', async () => {
    // Team at exact position floors, expensive, un-restructurable (1 yr left),
    // and massively over a tiny live cap — no legal plan is possible.
    const floors = { QB: 2, RB: 2, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 2, S: 2, K: 1, P: 1 };
    const players = new Map();
    for (const [pos, count] of Object.entries(floors)) {
      for (let k = 0; k < count; k++) {
        const id = `imp-${pos}-${k}`;
        players.set(id, { id, teamId: 7, pos, ovr: 80, age: 30, status: 'active', contract: contract(20, 0, 1, 1) });
      }
    }
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: 50 }, currentSeasonId: 's4', currentWeek: 1, year: 2029 },
      teams: new Map([[7, { id: 7, abbr: 'IMP', capTotal: 50, deadCap: 0 }]]),
      players,
    };
    const before = JSON.stringify([...h.state.store.players.values()].map((p) => [p.id, p.teamId, p.contract]));

    const res = await AiLogic.executeAICapManagement({ autoManageUserCap: false });

    const after = JSON.stringify([...h.state.store.players.values()].map((p) => [p.id, p.teamId, p.contract]));
    expect(h.state.txLog.length).toBe(0);       // no destructive actions committed
    expect(after).toBe(before);                 // roster + contracts intact
    expect(res.failures.length).toBe(1);
    expect(res.failures[0].teamId).toBe(7);
    expect(res.failures[0].remainingOverage).toBeGreaterThan(0);
  });

  it('emits one transaction per committed action', async () => {
    await AiLogic.executeAICapManagement({ autoManageUserCap: false });
    // Only AI teams (1) acted; team 2 legal. Every tx is RESTRUCTURE or RELEASE.
    expect(h.state.txLog.length).toBeGreaterThan(0);
    for (const tx of h.state.txLog) expect(['RESTRUCTURE', 'RELEASE']).toContain(tx.type);
    const playerIds = h.state.txLog.map((t) => t.details.playerId);
    expect(new Set(playerIds).size).toBe(playerIds.length); // no duplicate action on one player
  });
});

describe('ensureMinimumRosters — stable rollover legality', () => {
  it('cap management reserves a legal minimum-contract slot before the production signing pass', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's7', currentWeek: 1, year: 2032, phase: 'preseason' },
      teams: new Map([[22, { id: 22, abbr: 'AI22', capTotal: LIVE_CAP, deadCap: 0, capRoom: 0.5 }]]),
      players: new Map(),
    };
    h.state.store.players.set('star', { id: 'star', teamId: 22, pos: 'QB', ovr: 90, status: 'active', contract: contract(48.5, 0, 4, 4) });
    for (let i = 0; i < 51; i++) h.state.store.players.set(`owned-${i}`, { id: `owned-${i}`, teamId: 22, pos: 'WR', ovr: 60, status: 'active', contract: contract(1) });
    h.state.store.players.set('fa', { id: 'fa', teamId: null, pos: 'CB', ovr: 60, status: 'free_agent', contract: contract(12, 3, 3, 3) });

    await AiLogic.executeAICapManagement({ autoManageUserCap: false });
    await AiLogic.ensureMinimumRosters({ includeUserTeam: false });

    expect(h.mockCache.getPlayersByTeam(22)).toHaveLength(53);
    expect(h.state.store.players.get('fa')).toMatchObject({ teamId: 22, status: 'active', contract: { baseAnnual: 0.8, yearsTotal: 1 } });
    expect(committed(22).isLegallyCompliant).toBe(true);
    expect(h.state.txLog.map((tx) => tx.type)).toContain('RESTRUCTURE');
    expect(h.state.txLog.some((tx) => tx.details?.source === 'minimum_roster_reconciliation')).toBe(true);
  });

  it('fills under-minimum AI rosters from existing free agents without touching interactive user teams', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030 },
      teams: new Map([
        [0, { id: 0, abbr: 'USR', capTotal: LIVE_CAP, deadCap: 0, capRoom: 80 }],
        [31, { id: 31, abbr: 'AI31', capTotal: LIVE_CAP, deadCap: 0, capRoom: 80 }],
      ]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) {
      h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
      h.state.store.players.set(`usr-${i}`, { id: `usr-${i}`, teamId: 0, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    }
    h.state.store.players.set('fa-b', { id: 'fa-b', teamId: null, pos: 'CB', ovr: 59, age: 25, status: 'free_agent', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('fa-a', { id: 'fa-a', teamId: null, pos: 'CB', ovr: 60, age: 25, status: 'free_agent', contract: contract(1, 0, 1, 1) });

    await AiLogic.ensureMinimumRosters({ includeUserTeam: false });

    expect(h.mockCache.getPlayersByTeam(31)).toHaveLength(53);
    expect(h.mockCache.getPlayersByTeam(0)).toHaveLength(52);
    expect(h.state.store.players.get('fa-a').teamId).toBe(31);
    expect(h.state.txLog.some((tx) => tx.details?.source === 'minimum_roster_reconciliation')).toBe(true);
  });

  it('signs two distinct minimum-contract free agents when canonical ownership starts at 51', async () => {
    h.state.store = {
      meta: { userTeamId: 0, economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's7', currentWeek: 1, year: 2032, phase: 'preseason' },
      teams: new Map([[16, { id: 16, abbr: 'AI16', capTotal: LIVE_CAP, deadCap: 0, capRoom: 2 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 51; i++) h.state.store.players.set(`owned-${i}`, { id: `owned-${i}`, teamId: 16, pos: 'WR', ovr: 60, status: 'active', contract: contract(1) });
    h.state.store.players.set('fa-2', { id: 'fa-2', teamId: null, pos: 'CB', ovr: 60, status: 'free_agent', contract: contract(20, 5, 3, 3) });
    h.state.store.players.set('fa-1', { id: 'fa-1', teamId: null, pos: 'S', ovr: 60, status: 'free_agent', contract: contract(18, 4, 3, 3) });

    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    expect(h.mockCache.getPlayersByTeam(16)).toHaveLength(53);
    expect(h.state.txLog.map((tx) => tx.playerId)).toHaveLength(2);
    expect(new Set(h.state.txLog.map((tx) => tx.playerId))).toEqual(new Set(['fa-1', 'fa-2']));
    expect(h.state.txLog.every((tx) => tx.details.contract.baseAnnual === 0.8)).toBe(true);
  });

  it('recomputes positional needs after each signing and preserves deterministic signing order', async () => {
    const makeStore = () => ({
      meta: { userTeamId: 0, economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030 },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: LIVE_CAP, deadCap: 0, capRoom: 90 }]]),
      players: new Map([
        ['roster-rb', { id: 'roster-rb', teamId: 31, pos: 'RB', ovr: 60, age: 24, status: 'active', contract: contract(1) }],
        ['fa-qb-a', { id: 'fa-qb-a', teamId: null, pos: 'QB', ovr: 60, age: 25, status: 'free_agent', contract: contract(1) }],
        ['fa-qb-b', { id: 'fa-qb-b', teamId: null, pos: 'QB', ovr: 59, age: 25, status: 'free_agent', contract: contract(1) }],
        ['fa-cb', { id: 'fa-cb', teamId: null, pos: 'CB', ovr: 58, age: 25, status: 'free_agent', contract: contract(1) }],
      ]),
    });
    const needsSpy = vi.spyOn(AiLogic, 'calculateTeamNeeds').mockImplementation((teamId) => {
      const roster = h.mockCache.getPlayersByTeam(teamId);
      return {
        QB: roster.some((player) => player.pos === 'QB') ? 1 : 2.2,
        CB: roster.some((player) => player.pos === 'CB') ? 1 : 2.1,
      };
    });
    const run = async () => {
      h.state.store = makeStore();
      h.state.txLog.length = 0;
      await AiLogic.ensureMinimumRosters({ includeUserTeam: true, minimum: 3 });
      return h.state.txLog.map((tx) => tx.playerId ?? tx.details?.playerId);
    };
    const first = await run();
    const second = await run();
    expect(first).toEqual(['fa-qb-a', 'fa-cb']);
    expect(second).toEqual(first);
    expect(h.mockCache.getPlayersByTeam(31).map((player) => player.pos).sort()).toEqual(['CB', 'QB', 'RB']);
    needsSpy.mockRestore();
  });

  it('creates a fresh contract for a released free agent instead of inheriting former-club money or restructure metadata', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: LIVE_CAP, deadCap: 0, capRoom: 80 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('released', {
      id: 'released', teamId: null, pos: 'CB', ovr: 60, potential: 60, age: 26, status: 'free_agent',
      contract: { ...contract(22, 18, 5, 3), restructureCount: 2, restructureHistory: [{ year: 2029, savings: 5 }], tag: 'franchise' },
      restructureCount: 2, restructureHistory: [{ year: 2029, savings: 5 }], franchiseTag: true,
    });

    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    const signed = h.state.store.players.get('released');
    expect(signed.teamId).toBe(31);
    expect(signed.contract.startYear).toBe(2030);
    expect(signed.contract.signingBonus).not.toBe(18);
    expect(signed.contract.baseAnnual).not.toBe(22);
    expect(signed.contract.yearsRemaining).toBeGreaterThan(0);
    expect(signed.contract.restructureCount).toBe(0);
    expect(signed.contract.restructureHistory).toEqual([]);
    expect(signed.restructureCount).toBe(0);
    expect(signed.restructureHistory).toEqual([]);
    expect(signed.franchiseTag).toBeNull();
  });

  it('gives an expired free agent a valid production-shaped minimum-roster contract', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: LIVE_CAP, deadCap: 0, capRoom: 80 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('expired', { id: 'expired', teamId: null, pos: 'S', ovr: 62, potential: 62, age: 29, status: 'free_agent', contract: contract(0, 0, 1, 0) });

    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    const signed = h.state.store.players.get('expired');
    expect(signed.contract.yearsRemaining).toBeGreaterThan(0);
    expect(signed.contract.yearsTotal).toBeGreaterThan(0);
    expect(signed.contract.baseAnnual).toBeGreaterThan(0);
    expect(signed.contract.startYear).toBe(2030);
  });

  it('never signs invalid null-team categories even when they are the highest-rated players', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: LIVE_CAP, deadCap: 0, capRoom: 80 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    const prohibited = [
      { id: 'retired-status', teamId: null, pos: 'CB', ovr: 99, age: 35, status: 'retired', contract: contract(1, 0, 1, 1) },
      { id: 'retired-flag', teamId: null, pos: 'CB', ovr: 98, age: 35, status: 'free_agent', retired: true, contract: contract(1, 0, 1, 1) },
      { id: 'draft-eligible', teamId: null, pos: 'CB', ovr: 97, age: 22, status: 'draft_eligible', contract: contract(1, 0, 1, 1) },
      { id: 'draft-pool', teamId: null, pos: 'CB', ovr: 96, age: 22, status: 'draft_pool', contract: contract(1, 0, 1, 1) },
      { id: 'deleted', teamId: null, pos: 'CB', ovr: 95, age: 26, status: 'deleted', contract: contract(1, 0, 1, 1) },
      { id: 'removed', teamId: null, pos: 'CB', ovr: 94, age: 26, status: 'removed', contract: contract(1, 0, 1, 1) },
      { id: 'inconsistent-active', teamId: null, pos: 'CB', ovr: 93, age: 26, status: 'active', contract: contract(1, 0, 1, 1) },
    ];
    for (const p of prohibited) h.state.store.players.set(p.id, p);
    h.state.store.players.set('valid-fa', { id: 'valid-fa', teamId: null, pos: 'CB', ovr: 60, potential: 60, age: 25, status: 'free_agent', contract: contract(1, 0, 1, 1) });

    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    expect(h.state.store.players.get('valid-fa').teamId).toBe(31);
    for (const p of prohibited) expect(h.state.store.players.get(p.id).teamId).toBeNull();
  });

  it('does not reprice an elite free agent and chooses a legitimate replacement-level minimum candidate', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: 53 }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: 53, deadCap: 0, capRoom: 1 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('fa-costly', { id: 'fa-costly', teamId: null, pos: 'QB', ovr: 90, potential: 90, age: 27, status: 'free_agent', contract: contract(30, 10, 4, 4) });
    h.state.store.players.set('fa-replacement', { id: 'fa-replacement', teamId: null, pos: 'QB', ovr: 59, potential: 59, age: 27, status: 'free_agent', contract: contract(1, 0, 1, 1) });
    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    const signed = h.state.store.players.get('fa-replacement');
    expect(signed.teamId).toBe(31);
    expect(signed.contract).toMatchObject({ baseAnnual: 0.8, yearsTotal: 1, yearsRemaining: 1, signingBonus: 0 });
    expect(h.state.store.players.get('fa-costly')).toMatchObject({ teamId: null, status: 'free_agent', contract: { baseAnnual: 30 } });
    expect(h.state.txLog).toHaveLength(1);
  });

  it('preserves minimum-contract room for every slot remaining after a signing', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: 53 }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: 53, deadCap: 0, capRoom: 2 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 51; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('fa-rotation', { id: 'fa-rotation', teamId: null, pos: 'CB', ovr: 64, potential: 64, age: 27, status: 'free_agent', contract: contract(2, 0, 1, 1) });
    h.state.store.players.set('fa-replacement-a', { id: 'fa-replacement-a', teamId: null, pos: 'CB', ovr: 60, potential: 60, age: 27, status: 'free_agent', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('fa-replacement-b', { id: 'fa-replacement-b', teamId: null, pos: 'CB', ovr: 59, potential: 59, age: 27, status: 'free_agent', contract: contract(1, 0, 1, 1) });

    const result = await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    expect(result.failures).toEqual([]);
    expect(h.state.store.players.get('fa-rotation')).toMatchObject({ teamId: null, status: 'free_agent' });
    expect(h.state.store.players.get('fa-replacement-a').teamId).toBe(31);
    expect(h.state.store.players.get('fa-replacement-b').teamId).toBe(31);
    expect(h.state.store.players.get('fa-replacement-a').contract.baseAnnual).toBe(0.8);
    expect(h.state.store.players.get('fa-replacement-b').contract.baseAnnual).toBe(0.8);
    expect(h.state.txLog).toHaveLength(2);
  });

  it('leaves player and team state unchanged when even the league minimum cannot fit under the live cap', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: 52.5 }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: 52.5, deadCap: 0, capRoom: 0.5 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('fa-costly', { id: 'fa-costly', teamId: null, pos: 'QB', ovr: 90, potential: 90, age: 27, status: 'free_agent', contract: contract(30, 10, 4, 4) });
    const before = JSON.stringify([...h.state.store.teams, ...h.state.store.players]);

    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    expect(JSON.stringify([...h.state.store.teams, ...h.state.store.players])).toBe(before);
    expect(h.state.txLog).toHaveLength(0);
  });

  it('uses the live economy cap rather than stale team capTotal while accepting a legal minimum deal', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: 53 }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: 100, deadCap: 0, capRoom: 48 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('fits-stale-cap', { id: 'fits-stale-cap', teamId: null, pos: 'QB', ovr: 59, potential: 59, age: 27, status: 'free_agent', contract: contract(1, 0, 1, 0) });
    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    expect(h.state.store.players.get('fits-stale-cap')).toMatchObject({
      teamId: 31,
      status: 'active',
      contract: { baseAnnual: 0.8, yearsTotal: 1 },
    });
    expect(h.state.txLog).toHaveLength(1);
  });

  it('does not record a SIGN and rolls back all durable state when final cap validation fails after mutation', async () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
      teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: LIVE_CAP, deadCap: 0, capRoom: 80, capUsed: 52 }]]),
      players: new Map(),
    };
    for (let i = 0; i < 52; i++) h.state.store.players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
    h.state.store.players.set('fa-rollback', { id: 'fa-rollback', teamId: null, pos: 'CB', ovr: 65, potential: 65, age: 25, status: 'free_agent', contract: contract(1, 0, 1, 1) });
    const before = JSON.stringify([...h.state.store.teams, ...h.state.store.players]);
    const spy = vi.spyOn(AiLogic, 'updateTeamCap').mockReturnValueOnce({ ok: false, error: 'forced failure' });

    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });

    expect(JSON.stringify([...h.state.store.teams, ...h.state.store.players])).toBe(before);
    expect(h.state.txLog).toHaveLength(0);
    spy.mockRestore();
  });

  it('chooses the same minimum-roster signing and contract from differently ordered cache input', async () => {
    const make = (reverse = false) => {
      const players = new Map();
      for (let i = 0; i < 52; i++) players.set(`ai-${i}`, { id: `ai-${i}`, teamId: 31, pos: 'WR', ovr: 60, age: 24, status: 'active', contract: contract(1, 0, 1, 1) });
      const fas = [
        ['fa-b', { id: 'fa-b', teamId: null, pos: 'CB', ovr: 60, potential: 60, age: 25, status: 'free_agent', contract: contract(5, 2, 2, 2) }],
        ['fa-a', { id: 'fa-a', teamId: null, pos: 'CB', ovr: 60, potential: 60, age: 25, status: 'free_agent', contract: contract(20, 9, 3, 3) }],
      ];
      for (const [id, p] of (reverse ? fas.reverse() : fas)) players.set(id, p);
      return {
        meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'preseason' },
        teams: new Map([[31, { id: 31, abbr: 'AI31', capTotal: LIVE_CAP, deadCap: 0, capRoom: 80 }]]),
        players,
      };
    };
    h.state.store = make(false);
    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });
    const first = { tx: h.state.txLog[0], contract: h.state.store.players.get(h.state.txLog[0].playerId).contract };
    h.state.txLog.length = 0;
    h.state.store = make(true);
    await AiLogic.ensureMinimumRosters({ includeUserTeam: true });
    const second = { tx: h.state.txLog[0], contract: h.state.store.players.get(h.state.txLog[0].playerId).contract };
    expect(second).toEqual(first);
  });
});

describe('free-agency offer evaluation — deterministic ties', () => {
  it('uses canonical team id as the tie-break when offer scores are equal', () => {
    h.state.store = {
      meta: { userTeamId: 0, difficulty: 'Normal', economy: { currentSalaryCap: LIVE_CAP }, currentSeasonId: 's5', currentWeek: 1, year: 2030, phase: 'free_agency' },
      teams: new Map([
        [27, { id: 27, abbr: 'T27', wins: 8, losses: 9, capRoom: 50 }],
        [28, { id: 28, abbr: 'T28', wins: 8, losses: 9, capRoom: 50 }],
      ]),
      players: new Map([
        ['fa', {
          id: 'fa', teamId: null, pos: 'CB', ovr: 74, potential: 74, age: 26, morale: 68, status: 'free_agent',
          contract: contract(2, 0, 1, 0),
          offers: [
            { teamId: 28, contract: contract(5, 0, 1, 1) },
            { teamId: 27, contract: contract(5, 0, 1, 1) },
          ],
        }],
      ]),
    };
    const decision = AiLogic.evaluateOffers(h.state.store.players.get('fa'), 3);
    expect(decision.offer.teamId).toBe(27);
  });
});

describe('executeAICapManagement — determinism', () => {
  it('produces identical transactions across two identical runs', async () => {
    await AiLogic.executeAICapManagement({ autoManageUserCap: true });
    const first = JSON.stringify(h.state.txLog);

    h.state.txLog.length = 0;
    h.state.store = buildStore();
    await AiLogic.executeAICapManagement({ autoManageUserCap: true });
    const second = JSON.stringify(h.state.txLog);

    expect(second).toBe(first);
  });
});
