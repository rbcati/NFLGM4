import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { bulkWrite, clearAllData, configureActiveLeague, openDB, Players, Teams } from '../../src/db/index.js';
import { reconcileLegacyTeamRosters, serializeTeamForPersistence } from '../../src/db/teamPersistence.js';

const richPlayer = (id, overrides = {}) => ({
  id, name: `Player ${id}`, pos: 'QB', age: 27, ovr: 88, pot: 91,
  ratings: { arm: 94 }, trueRatings: { arm: 95 }, visibleRatings: { arm: 93 },
  contract: { baseAnnual: 20, signingBonus: 8, years: 4 }, baseAnnual: 20,
  signingBonus: 8, years: 4, yearsTotal: 5, status: 'active', teamId: 1,
  injury: { type: 'none', weeks: 0 }, morale: 77, development: { trait: 'star' },
  agent: { patience: 40 }, personality: 'leader', awards: ['MVP'],
  history: [{ year: 2025, teamId: 1 }], draft: { round: 1, pick: 2 },
  ...overrides,
});

describe('team persistence normalization', () => {
  beforeEach(async () => {
    configureActiveLeague(`team_persistence_${Date.now()}_${Math.random()}`);
    await openDB();
    await clearAllData();
  });

  it('strips player projections without mutating the runtime team', () => {
    const roster = [richPlayer('a'), richPlayer('b')];
    const team = {
      id: 1, name: 'Owls', roster, players: roster, rosterIds: ['a', 'b'], rosterCount: 2,
      depthChart: { QB: ['a'] }, staff: { hc: 'coach' }, strategies: { offense: 'spread' },
      capSpace: 42, draftBoard: { shortlist: ['x'] }, franchiseInvestments: { training: 2 },
      history: [{ year: 2025, wins: 12 }], scouting: { points: 10 },
    };
    const persisted = serializeTeamForPersistence(team);

    expect(persisted).toEqual(expect.objectContaining({
      id: 1, rosterIds: ['a', 'b'], rosterCount: 2, depthChart: { QB: ['a'] },
      staff: { hc: 'coach' }, capSpace: 42, draftBoard: { shortlist: ['x'] },
    }));
    expect(persisted).not.toHaveProperty('roster');
    expect(persisted).not.toHaveProperty('players');
    expect(team.roster).toBe(roster);
    expect(team.players).toBe(roster);
  });

  it('keeps canonical players and safely promotes missing legacy players', () => {
    const canonicalA = richPlayer('a', { ovr: 88, contract: { years: 4 } });
    const staleA = richPlayer('a', { ovr: 71, contract: { years: 1 } });
    const legacyB = richPlayer('b', { teamId: undefined });
    const result = reconcileLegacyTeamRosters([
      { id: 1, roster: [staleA, legacyB], rosterIds: ['a'], depthChart: { QB: ['a'] } },
    ], [canonicalA]);

    expect(result.players.find((p) => p.id === 'a')).toBe(canonicalA);
    expect(result.players.find((p) => p.id === 'a').contract.years).toBe(4);
    expect(result.players.find((p) => p.id === 'b')).toMatchObject({ id: 'b', teamId: 1 });
    expect(result.migratedPlayers.map((p) => p.id)).toEqual(['b']);
    expect(result.teams[0]).toMatchObject({ rosterIds: ['a', 'b'], rosterCount: 2, depthChart: { QB: ['a'] } });
    expect(result.teams[0]).not.toHaveProperty('roster');
    expect(result.normalizedTeamIds).toEqual([1]);
  });

  it.each([
    {
      label: 'empty roster plus populated players',
      team: { id: 1, roster: [], players: [richPlayer('players-only')] },
      expectedIds: ['players-only'],
    },
    {
      label: 'populated roster plus populated players',
      team: { id: 1, roster: [richPlayer('roster-only')], players: [richPlayer('players-only')] },
      expectedIds: ['roster-only', 'players-only'],
    },
    {
      label: 'same player duplicated in both projections',
      team: { id: 1, roster: [richPlayer('same')], players: [richPlayer('same', { ovr: 40 })] },
      expectedIds: ['same'],
    },
  ])('reconciles $label', ({ team, expectedIds }) => {
    const result = reconcileLegacyTeamRosters([team], []);
    expect(result.teams[0].rosterIds).toEqual(expectedIds);
    expect(result.players.map((player) => player.id)).toEqual(expectedIds);
    expect(result.normalizedTeamIds).toEqual([1]);
  });

  it('keeps the canonical copy over stale copies in both embedded arrays', () => {
    const canonical = richPlayer('same', { ovr: 96, contract: { years: 5 } });
    const result = reconcileLegacyTeamRosters([{
      id: 1,
      roster: [richPlayer('same', { ovr: 70, contract: { years: 1 } })],
      players: [richPlayer('same', { ovr: 60, contract: { years: 2 } })],
    }], [canonical]);
    expect(result.players).toEqual([canonical]);
    expect(result.teams[0]).toMatchObject({ rosterIds: ['same'], rosterCount: 1 });
  });

  it.each([
    { id: 1, roster: null, players: undefined },
    { id: 1, roster: [], rosterIds: [] },
    { id: 1, roster: [richPlayer('a')], rosterIds: ['a', 'a'] },
  ])('handles nullish, empty, and duplicate legacy membership', (team) => {
    const result = reconcileLegacyTeamRosters([team], []);
    expect(result.teams[0]).not.toHaveProperty('roster');
    expect(result.teams[0]).not.toHaveProperty('players');
    expect(new Set(result.teams[0].rosterIds || []).size).toBe((result.teams[0].rosterIds || []).length);
  });

  it('normalizes every raw team write seam while preserving player rows', async () => {
    const a = richPlayer('a');
    const duplicated = { id: 1, name: 'Owls', roster: [a], players: [a], rosterIds: ['a'], rosterCount: 1, depthChart: { QB: ['a'] } };
    await Players.save(a);
    await Teams.save(duplicated);
    let raw = await Teams.load(1);
    expect(raw).toEqual(expect.objectContaining({ rosterIds: ['a'], rosterCount: 1, depthChart: { QB: ['a'] } }));
    expect(raw).not.toHaveProperty('roster');
    expect(raw).not.toHaveProperty('players');

    await Teams.saveBulk([{ ...duplicated, id: 2 }]);
    await bulkWrite({ teams: [{ ...duplicated, id: 3 }] });
    for (const id of [2, 3]) {
      raw = await Teams.load(id);
      expect(raw).not.toHaveProperty('roster');
      expect(raw).not.toHaveProperty('players');
    }
    expect(await Players.loadAll()).toEqual([a]);
  });

  it('reduces serialized team payload without deep-copying player data', () => {
    const player = richPlayer('a', { history: Array.from({ length: 100 }, (_, year) => ({ year, stats: { yards: 4000 } })) });
    const duplicated = { id: 1, roster: [player], rosterIds: ['a'], rosterCount: 1 };
    const before = new TextEncoder().encode(JSON.stringify(duplicated)).byteLength;
    const after = new TextEncoder().encode(JSON.stringify(serializeTeamForPersistence(duplicated))).byteLength;
    expect(after).toBeLessThan(before / 4);
  });
});
