import { describe, expect, it, vi } from 'vitest';
import { mapOverallToAttributesV2 } from '../migration/attributeMigrator.ts';
import {
  attachFullRostersForSimulation,
  aggregateTeamUnitsFromRoster,
  buildDeterministicSeed,
  mapGameSummaryToLegacyResult,
  simulateWithOptionalNewEngine,
} from '../sim/weekSimulationBridge.ts';
import { applyDepthChartToPlayers } from '../depthChart.js';
import { deriveGameDayAvailability } from '../gameDayAvailability.js';

describe('weekSimulationBridge', () => {
  it('attaches full owned rosters before deriving eligible simulation players', () => {
    const qb1 = { id: 1, teamId: 10, name: 'QB1', pos: 'QB', ovr: 99, injured: true, injuryWeeksRemaining: 3, depthChart: { rowKey: 'QB', order: 1 } };
    const qb2 = { id: 2, teamId: 10, name: 'QB2', pos: 'QB', ovr: 70, depthChart: { rowKey: 'QB', order: 2 } };
    const teams = [{ id: 10, name: 'Home' }];
    const before = structuredClone(teams);

    const withRosters = attachFullRostersForSimulation(teams, () => [qb1, qb2] as any);
    const readiness = deriveGameDayAvailability(withRosters[0].roster, { teamId: 10 });
    const units = aggregateTeamUnitsFromRoster(withRosters[0].roster, 10);

    expect(withRosters[0].roster).toEqual([qb1, qb2]);
    expect(readiness.fullRoster).toEqual([qb1, qb2]);
    expect(readiness.injuredPlayers).toEqual([qb1]);
    expect(readiness.eligiblePlayers).toEqual([qb2]);
    expect(units.selectedUnitPlayerIds.offense).not.toContain(1);
    expect(units.selectedUnitPlayerIds.offense).toContain(2);
    expect(teams).toEqual(before);
  });

  it('aggregates offense/defense units from roster players and migrates missing attributesV2', () => {
    const roster = [
      { id: 1, name: 'QB1', pos: 'QB', ovr: 90 },
      { id: 2, name: 'WR1', pos: 'WR', ovr: 88 },
      { id: 3, name: 'WR2', pos: 'WR', ovr: 84 },
      { id: 4, name: 'CB1', pos: 'CB', ovr: 85, attributesV2: mapOverallToAttributesV2(85, 5.5, 'cb1') },
      { id: 5, name: 'EDGE1', pos: 'EDGE', ovr: 86 },
    ];

    const units = aggregateTeamUnitsFromRoster(roster as any);

    expect(units.migratedPlayers.length).toBe(4);
    expect(units.offense.throwAccuracyShort).toBeGreaterThan(40);
    expect(units.defense.passRush).toBeGreaterThan(40);
  });

  it('keeps migration idempotent when attributesV2 already exists', () => {
    const attrs = mapOverallToAttributesV2(82, 5.5, 'existing-player');
    const roster = [{ id: 7, name: 'Existing', pos: 'LB', attributesV2: attrs }];

    const units = aggregateTeamUnitsFromRoster(roster as any);

    expect(units.migratedPlayers).toHaveLength(0);
    expect(units.defense.zoneCoverage).toBeGreaterThan(0);
  });

  it('gates unavailable starters before depth and rating selection while preserving healthy backups', () => {
    const unavailable = [
      { id: 1, name: 'QB1', pos: 'QB', ovr: 99, injured: true, injuryWeeksRemaining: 3, depthChart: { rowKey: 'QB', order: 1 } },
      { id: 3, name: 'RB1', pos: 'RB', ovr: 99, status: 'injured_reserve', depthChart: { rowKey: 'RB', order: 1 } },
      { id: 5, name: 'WR1', pos: 'WR', ovr: 99, injured: true, depthChart: { rowKey: 'WR', order: 1 } },
      { id: 7, name: 'EDGE1', pos: 'EDGE', ovr: 99, seasonEndingInjury: true, depthChart: { rowKey: 'EDGE', order: 1 } },
      { id: 9, name: 'RS1', pos: 'WR', ovr: 99, injured: true, injuryWeeksRemaining: 2, depthChart: { rowKey: 'RS', order: 1 } },
    ];
    const available = [
      { id: 2, name: 'QB2', pos: 'QB', ovr: 60, depthChart: { rowKey: 'QB', order: 2 } },
      { id: 4, name: 'RB2', pos: 'RB', ovr: 60, depthChart: { rowKey: 'RB', order: 2 } },
      { id: 6, name: 'WR2', pos: 'WR', ovr: 60, depthChart: { rowKey: 'WR', order: 2 } },
      { id: 8, name: 'EDGE2', pos: 'EDGE', ovr: 60, depthChart: { rowKey: 'EDGE', order: 2 } },
    ];
    const roster = [...unavailable, ...available] as any;
    const before = structuredClone(roster);

    const units = aggregateTeamUnitsFromRoster(roster);

    expect(units.selectedUnitPlayerIds.offense).toEqual(expect.arrayContaining([2, 4, 6]));
    expect(units.selectedUnitPlayerIds.defense).toContain(8);
    for (const player of unavailable) {
      expect(units.selectedUnitPlayerIds.offense).not.toContain(player.id);
      expect(units.selectedUnitPlayerIds.defense).not.toContain(player.id);
    }
    expect(roster).toEqual(before);
    expect(aggregateTeamUnitsFromRoster(roster)).toEqual(units);
  });

  it('applies severe out-of-position penalties when depth assignment is known', () => {
    const qbAttrs = mapOverallToAttributesV2(90, 5.5, 'qb');
    const wrAttrs = mapOverallToAttributesV2(90, 5.5, 'wr');
    const roster = [
      { id: 1, name: 'Natural QB', pos: 'QB', attributesV2: qbAttrs, depthChart: { rowKey: 'QB', order: 1 } },
      { id: 2, name: 'Wrong QB', pos: 'WR', attributesV2: wrAttrs, depthChart: { rowKey: 'QB', order: 1 } },
    ];

    const natural = aggregateTeamUnitsFromRoster([roster[0]] as any);
    const mismatch = aggregateTeamUnitsFromRoster([roster[1]] as any);

    expect(mismatch.offense.throwAccuracyShort).toBeLessThanOrEqual(natural.offense.throwAccuracyShort);
    expect(mismatch.offense.throwPower).toBeLessThan(natural.offense.throwPower);
  });

  it('falls back to legacy simulation when new path throws', async () => {
    const legacySimulate = vi.fn(async () => [{ scoreHome: 14, scoreAway: 10 }]);
    const manager = {
      simWeekParallel: vi.fn(async () => {
        throw new Error('worker unavailable');
      }),
    };

    const result = await simulateWithOptionalNewEngine({
      enabled: true,
      matchups: [],
      manager: manager as any,
      legacySimulate,
    });

    expect(result.mode).toBe('legacy');
    expect(legacySimulate).toHaveBeenCalledTimes(1);
  });

  it('maps game summaries into existing result shape', () => {
    const gameDayUnits = { home: { offense: [1, 2], defense: [3] }, away: { offense: [4], defense: [5] } };
    const mapped = mapGameSummaryToLegacyResult({
      gameId: 'g1',
      homeTeamId: 1,
      awayTeamId: 2,
      gameDayUnits,
      homeScore: 28,
      awayScore: 21,
      totalPlays: 120,
      homePassYards: 260,
      awayPassYards: 230,
      homeSuccessRate: 0.58,
      awaySuccessRate: 0.53,
      normalizationConstant: 0.74,
      topReason1: 'Pocket survived pressure',
      topReason2: 'Route leverage over zone',
      quarterScores: { home: [7, 7, 7, 7], away: [7, 7, 0, 7] },
      driveSummary: [
        { drive: 1, team: 'away', result: 'Punt', yards: 24, plays: 6, topSeconds: 188 },
        { drive: 2, team: 'home', result: 'TD', yards: 76, plays: 8, topSeconds: 251 },
      ],
      teamStats: {
        home: {
          plays: 62, firstDowns: 21, passAtt: 35, passComp: 23, passYd: 260, passTD: 2,
          rushAtt: 27, rushYd: 110, rushTD: 2, totalYards: 370, yardsPerPlay: 5.97,
          turnovers: 1, sacksAllowed: 2, sacksMade: 3, interceptions: 1,
          redZoneTrips: 3, redZoneScores: 2, explosivePlays: 4, successRate: 0.58,
        },
        away: {
          plays: 58, firstDowns: 18, passAtt: 31, passComp: 20, passYd: 230, passTD: 2,
          rushAtt: 27, rushYd: 93, rushTD: 1, totalYards: 323, yardsPerPlay: 5.57,
          turnovers: 2, sacksAllowed: 3, sacksMade: 2, interceptions: 1,
          redZoneTrips: 2, redZoneScores: 2, explosivePlays: 3, successRate: 0.53,
        },
      },
      boxScore: { home: {}, away: {} },
      playDigest: [],
      scoringSummary: [{ id: 'score_1', quarter: 1, clock: '12:00', teamId: 1, teamAbbr: 'HME', type: 'Touchdown', scoreType: 'touchdown', points: 7, text: 'TD', scoreAfter: { home: 7, away: 0 } }],
      playLogs: [],
      summary: { storyline: 'Key edge: Pocket survived pressure', headlineMoments: [] },
      recapText: 'Home wins with late pressure.',
      simFactors: {
        home: { qbRating: 101.4, rushYpc: 4.07, successRate: 0.58, passRate: 0.565 },
        away: { qbRating: 89.1, rushYpc: 3.44, successRate: 0.53, passRate: 0.534 },
      },
    });

    expect(mapped.scoreHome).toBe(28);
    expect(mapped.gameDayUnits).toEqual(gameDayUnits);
    expect(mapped.boxScore).toEqual({ home: {}, away: {} });
    expect(mapped.playerStats).toEqual({ home: {}, away: {} });
    expect(mapped.teamStats.home.totalYards).toBe(370);
    expect(mapped.scoringSummary).toHaveLength(1);
    expect(mapped.canonicalEvents).toEqual([
      expect.objectContaining({ eventType: 'punt', driveNumber: 1, plays: 6, yards: 24, scoreAfter: { home: 0, away: 0 }, isScore: false }),
      expect.objectContaining({ eventType: 'touchdown', driveNumber: 2, plays: 8, yards: 76, scoreAfter: { home: 7, away: 0 }, isScore: true }),
      expect.objectContaining({ eventType: 'game_end', scoreAfter: { home: 28, away: 21 }, isScore: false }),
    ]);
    expect(mapped.gameReasoningFlags).toEqual(['Pocket survived pressure', 'Route leverage over zone']);
    expect(mapped.summary.storyline).toContain('Key edge');
  });

  it('builds deterministic seeds', () => {
    expect(buildDeterministicSeed('2026:4:1:2')).toBe(buildDeterministicSeed('2026:4:1:2'));
  });

  it('carries advancedAttribution from rich summary into bridge result', () => {
    const advancedAttribution = {
      'qb-1': { targets: 0, receptionsAllowed: 0, coverageTargets: 0, coverageCompletionsAllowed: 0, drops: 2, battedPasses: 1, sacksAllowed: 3, sacksMade: 0 },
    };
    const mapped = mapGameSummaryToLegacyResult({
      gameId: 'g-adv',
      homeTeamId: 1,
      awayTeamId: 2,
      homeScore: 21,
      awayScore: 14,
      totalPlays: 110,
      homePassYards: 240,
      awayPassYards: 200,
      homeSuccessRate: 0.55,
      awaySuccessRate: 0.50,
      normalizationConstant: 0.74,
      topReason1: null,
      topReason2: null,
      quarterScores: { home: [7, 0, 7, 7], away: [7, 7, 0, 0] },
      teamStats: {
        home: { plays: 60, passAtt: 30, passComp: 20, passYd: 240, rushAtt: 30, rushYd: 110, passTD: 1, rushTD: 2, totalYards: 350, yardsPerPlay: 5.8, turnovers: 0, sacksAllowed: 1, sacksMade: 2, interceptions: 0, redZoneTrips: 3, redZoneScores: 2, explosivePlays: 3, successRate: 0.55, firstDowns: 18, fieldGoalsMade: 0, fieldGoalsAttempted: 0, extraPointsMade: 3, extraPointsAttempted: 3, punts: 4, puntYards: 160, kickReturns: 3, kickReturnYards: 60, puntReturns: 2, puntReturnYards: 18 },
        away: { plays: 58, passAtt: 28, passComp: 18, passYd: 200, rushAtt: 30, rushYd: 90, passTD: 1, rushTD: 1, totalYards: 290, yardsPerPlay: 5.0, turnovers: 1, sacksAllowed: 2, sacksMade: 1, interceptions: 1, redZoneTrips: 2, redZoneScores: 1, explosivePlays: 2, successRate: 0.50, firstDowns: 15, fieldGoalsMade: 1, fieldGoalsAttempted: 1, extraPointsMade: 2, extraPointsAttempted: 2, punts: 5, puntYards: 200, kickReturns: 2, kickReturnYards: 44, puntReturns: 1, puntReturnYards: 8 },
      },
      boxScore: { home: {}, away: {} },
      playDigest: [],
      scoringSummary: [],
      playLogs: [],
      summary: { storyline: 'Solid win.', headlineMoments: [] },
      recapText: 'Home holds on.',
      regulationTied: false,
      overtime: { played: false, periods: 0, decidedBy: null },
      shutoutFloorApplied: { home: false, away: false },
      advancedAttribution,
      simFactors: {
        home: { qbRating: 95.0, rushYpc: 3.67, successRate: 0.55, passRate: 0.5 },
        away: { qbRating: 85.0, rushYpc: 3.0, successRate: 0.50, passRate: 0.483 },
      },
    } as any);

    expect(mapped.advancedAttribution).toEqual(advancedAttribution);
  });

  it('carries shutoutFloorApplied from rich summary into bridge result', () => {
    const mapped = mapGameSummaryToLegacyResult({
      gameId: 'g-shutout',
      homeTeamId: 10,
      awayTeamId: 20,
      homeScore: 17,
      awayScore: 3,
      totalPlays: 100,
      homePassYards: 200,
      awayPassYards: 150,
      homeSuccessRate: 0.52,
      awaySuccessRate: 0.44,
      normalizationConstant: 0.74,
      topReason1: null,
      topReason2: null,
      quarterScores: { home: [7, 0, 10, 0], away: [0, 0, 0, 3] },
      teamStats: {
        home: { plays: 55, passAtt: 25, passComp: 15, passYd: 200, rushAtt: 30, rushYd: 120, passTD: 1, rushTD: 2, totalYards: 320, yardsPerPlay: 5.8, turnovers: 0, sacksAllowed: 1, sacksMade: 3, interceptions: 0, redZoneTrips: 3, redZoneScores: 3, explosivePlays: 2, successRate: 0.52, firstDowns: 16, fieldGoalsMade: 0, fieldGoalsAttempted: 0, extraPointsMade: 3, extraPointsAttempted: 3, punts: 3, puntYards: 120, kickReturns: 2, kickReturnYards: 40, puntReturns: 1, puntReturnYards: 6 },
        away: { plays: 52, passAtt: 24, passComp: 14, passYd: 150, rushAtt: 28, rushYd: 70, passTD: 0, rushTD: 0, totalYards: 220, yardsPerPlay: 4.2, turnovers: 2, sacksAllowed: 3, sacksMade: 1, interceptions: 2, redZoneTrips: 1, redZoneScores: 0, explosivePlays: 1, successRate: 0.44, firstDowns: 11, fieldGoalsMade: 1, fieldGoalsAttempted: 1, extraPointsMade: 0, extraPointsAttempted: 0, punts: 6, puntYards: 252, kickReturns: 3, kickReturnYards: 63, puntReturns: 2, puntReturnYards: 12 },
      },
      boxScore: { home: {}, away: {} },
      playDigest: [],
      scoringSummary: [],
      playLogs: [],
      summary: { storyline: 'Home dominates.', headlineMoments: [] },
      recapText: 'Home wins big.',
      regulationTied: false,
      overtime: { played: false, periods: 0, decidedBy: null },
      shutoutFloorApplied: { home: false, away: true },
      simFactors: {
        home: { qbRating: 92.0, rushYpc: 4.0, successRate: 0.52, passRate: 0.455 },
        away: { qbRating: 72.0, rushYpc: 2.5, successRate: 0.44, passRate: 0.462 },
      },
    } as any);

    expect(mapped.shutoutFloorApplied).toEqual({ home: false, away: true });
  });

  it('prefers the depth-1 QB over a higher-OVR backup when aggregating unit ratings', () => {
    const wrs = Array.from({ length: 12 }, (_, i) => ({
      id: 100 + i,
      name: `WR${i}`,
      pos: 'WR',
      ovr: 50,
      depthOrder: 1,
    }));
    const starterUnits = aggregateTeamUnitsFromRoster([
      { id: 1, name: 'Starter', pos: 'QB', ovr: 70, depthOrder: 1, depthChart: { rowKey: 'QB', order: 1 } },
      ...wrs,
    ] as any);
    const backupUnits = aggregateTeamUnitsFromRoster([
      { id: 2, name: 'Backup', pos: 'QB', ovr: 95, depthOrder: 1, depthChart: { rowKey: 'QB', order: 1 } },
      ...wrs,
    ] as any);
    const mixedUnits = aggregateTeamUnitsFromRoster([
      { id: 2, name: 'Backup', pos: 'QB', ovr: 95, depthOrder: 2, depthChart: { rowKey: 'QB', order: 2 } },
      { id: 1, name: 'Starter', pos: 'QB', ovr: 70, depthOrder: 1, depthChart: { rowKey: 'QB', order: 1 } },
      ...wrs,
    ] as any);

    expect(mixedUnits.offense.throwAccuracyShort).toBe(starterUnits.offense.throwAccuracyShort);
    expect(mixedUnits.offense.throwPower).toBe(starterUnits.offense.throwPower);
    expect(mixedUnits.offense.throwAccuracyShort).not.toBe(backupUnits.offense.throwAccuracyShort);
  });

  it('does not let an RS assignment affect scrimmage unit aggregation', () => {
    const roster = [
      { id: 1, name: 'Returner', pos: 'WR', ovr: 92, depthOrder: 1, depthChart: { rowKey: 'RS', order: 1 } },
      { id: 2, name: 'WR starter', pos: 'WR', ovr: 65, depthOrder: 1, depthChart: { rowKey: 'WR', order: 1 } },
      { id: 3, name: 'QB', pos: 'QB', ovr: 75, depthOrder: 1, depthChart: { rowKey: 'QB', order: 1 } },
      { id: 4, name: 'Defensive returner', pos: 'CB', ovr: 80, depthOrder: 1, depthChart: { rowKey: 'RS', order: 1 } },
    ] as any;
    const withReturnRow = aggregateTeamUnitsFromRoster(roster);
    const withoutReturnRow = aggregateTeamUnitsFromRoster(roster.map((player) => player.id === 1
      ? { ...player, depthOrder: undefined, depthChart: undefined }
      : player));

    expect(withReturnRow.offense).toEqual(withoutReturnRow.offense);
    expect(withReturnRow.defense).toEqual(withoutReturnRow.defense);
    expect(withReturnRow.selectedUnitPlayerIds.offense).toContain(1);
    expect(withReturnRow.selectedUnitPlayerIds.defense).toContain(4);
  });

  it.each(['DT', 'NT', 'DL'])('includes an %s alias assigned to canonical IDL when other defensive rows are full', (pos) => {
    const attributes = (passRush: number) => ({ ...mapOverallToAttributesV2(70, 0, `idl-${pos}-${passRush}`), passRush });
    const populated = [
      ...Array.from({ length: 3 }, (_, i) => ({ id: `edge-${i}`, name: `EDGE${i}`, pos: 'EDGE', attributesV2: attributes(50), depthChart: { rowKey: 'EDGE', order: i + 1 } })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `lb-${i}`, name: `LB${i}`, pos: 'LB', attributesV2: attributes(50), depthChart: { rowKey: 'LB', order: i + 1 } })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `cb-${i}`, name: `CB${i}`, pos: 'CB', attributesV2: attributes(50), depthChart: { rowKey: 'CB', order: i + 1 } })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `s-${i}`, name: `S${i}`, pos: 'S', attributesV2: attributes(50), depthChart: { rowKey: 'S', order: i + 1 } })),
    ];
    const lowIdl = { id: 'idl', name: 'IDL1', pos, attributesV2: attributes(20), depthChart: { rowKey: 'IDL', order: 1 } };
    const highIdl = { ...lowIdl, attributesV2: attributes(100) };

    const lowUnits = aggregateTeamUnitsFromRoster([lowIdl, ...populated] as any);
    const highUnits = aggregateTeamUnitsFromRoster([highIdl, ...populated] as any);

    expect(highUnits.defense.passRush).toBeGreaterThan(lowUnits.defense.passRush);
    expect(highUnits.defense.pressCoverage).toBe(lowUnits.defense.pressCoverage);
  });

  it('builds an 11-player defensive unit across every canonical row without duplicates', () => {
    const rows = [
      ['EDGE', 'DE', 4],
      ['IDL', 'DT', 4],
      ['LB', 'LB', 5],
      ['CB', 'CB', 5],
      ['S', 'S', 3],
    ] as const;
    let nextId = 1;
    const players: any[] = [];
    const assignments: Record<string, number[]> = {};
    for (const [rowKey, pos, count] of rows) {
      assignments[rowKey] = [];
      for (let order = 1; order <= count; order += 1) {
        const player = { id: nextId, name: `${rowKey}${order}`, pos, ovr: 90 - order, teamId: 1 };
        players.push(player);
        assignments[rowKey].push(nextId);
        nextId += 1;
      }
    }
    const secondarySafety = { id: nextId, name: 'Secondary S1', pos: 'WR', secondaryPositions: ['S'], ovr: 95, teamId: 1 };
    players.push(secondarySafety);
    assignments.S.unshift(nextId);
    const roster = applyDepthChartToPlayers(players, assignments);

    const first = aggregateTeamUnitsFromRoster(roster as any);
    const second = aggregateTeamUnitsFromRoster(roster as any);
    const selected = first.selectedUnitPlayerIds.defense;
    const namesById = new Map(roster.map((player) => [player.id, player.name]));
    const selectedNames = selected.map((id) => namesById.get(id));

    expect(selected).toHaveLength(11);
    expect(new Set(selected).size).toBe(11);
    expect(selectedNames.some((name) => name?.startsWith('EDGE'))).toBe(true);
    expect(selectedNames.some((name) => name?.startsWith('IDL'))).toBe(true);
    expect(selectedNames.some((name) => name?.startsWith('LB'))).toBe(true);
    expect(selectedNames.some((name) => name?.startsWith('CB'))).toBe(true);
    expect(selectedNames).toContain('Secondary S1');
    expect(selectedNames.filter((name) => name?.startsWith('S') || name === 'Secondary S1')).toHaveLength(1);
    expect(second.selectedUnitPlayerIds.defense).toEqual(selected);
    expect(second.defense).toEqual(first.defense);
  });

  it.each([
    ['CB assigned WR1', { id: 1, name: 'CB at WR', pos: 'CB', secondaryPositions: ['WR'], depthChart: { rowKey: 'WR', order: 1 } }, 'offense', 'defense'],
    ['WR assigned CB1', { id: 2, name: 'WR at CB', pos: 'WR', secondaryPositions: ['CB'], depthChart: { rowKey: 'CB', order: 1 } }, 'defense', 'offense'],
  ])('keeps %s exclusively in its authoritative scrimmage unit', (_label, assigned, includedGroup, excludedGroup) => {
    const roster = [
      assigned,
      { id: 10, name: 'QB', pos: 'QB', ovr: 75 },
      { id: 11, name: 'WR', pos: 'WR', ovr: 75 },
      { id: 12, name: 'CB', pos: 'CB', ovr: 75 },
      { id: 13, name: 'S', pos: 'S', ovr: 75 },
      { id: 14, name: 'LB', pos: 'LB', ovr: 75 },
      { id: 15, name: 'DE', pos: 'DE', ovr: 75 },
      { id: 16, name: 'DT', pos: 'DT', ovr: 75 },
    ] as any;
    const units = aggregateTeamUnitsFromRoster(roster);

    expect(units.selectedUnitPlayerIds[includedGroup]).toContain(assigned.id);
    expect(units.selectedUnitPlayerIds[excludedGroup]).not.toContain(assigned.id);
  });

  it('keeps natural-position fallback when no valid canonical assignment exists', () => {
    const natural = { id: 1, name: 'Natural WR', pos: 'WR', ovr: 80 } as any;
    const units = aggregateTeamUnitsFromRoster([natural]);

    expect(units.selectedUnitPlayerIds.offense).toContain(natural.id);
  });

  it('excludes pure special-team players from sparse scrimmage-unit fallback', () => {
    const roster = [
      { id: 1, name: 'QB', pos: 'QB', ovr: 75 },
      { id: 2, name: 'Kicker', pos: 'K', ovr: 99, depthChart: { rowKey: 'K', order: 1 } },
      { id: 3, name: 'Punter', pos: 'P', ovr: 98, depthChart: { rowKey: 'P', order: 1 } },
    ] as any;

    const units = aggregateTeamUnitsFromRoster(roster);
    const repeated = aggregateTeamUnitsFromRoster(roster);

    expect(units.selectedUnitPlayerIds.offense).not.toContain(2);
    expect(units.selectedUnitPlayerIds.defense).not.toContain(2);
    expect(units.selectedUnitPlayerIds.offense).not.toContain(3);
    expect(units.selectedUnitPlayerIds.defense).not.toContain(3);
    expect(repeated.selectedUnitPlayerIds).toEqual(units.selectedUnitPlayerIds);
    expect(repeated.offense).toEqual(units.offense);
    expect(repeated.defense).toEqual(units.defense);
  });

  it('retains an incompatible scrimmage-row penalty without granting starter authority', () => {
    const roster = [
      { id: 1, name: 'Natural QB', pos: 'QB', ovr: 72, depthChart: { rowKey: 'QB', order: 2 } },
      { id: 2, name: 'Out-of-position WR', pos: 'WR', ovr: 90, depthChart: { rowKey: 'QB', order: 1 } },
      { id: 3, name: 'Natural WR', pos: 'WR', ovr: 70 },
    ] as any;
    const starterOrder = aggregateTeamUnitsFromRoster(roster);
    const depthOrderNine = aggregateTeamUnitsFromRoster(roster.map((player) => player.id === 2
      ? { ...player, depthChart: { rowKey: 'QB', order: 9 } }
      : player));
    const unassigned = aggregateTeamUnitsFromRoster(roster.map((player) => player.id === 2
      ? { ...player, depthChart: undefined }
      : player));

    expect(starterOrder.offense).toEqual(depthOrderNine.offense);
    expect(starterOrder.offense.routeRunning).toBeLessThan(unassigned.offense.routeRunning);
  });

  it('preserves natural behavior and evaluates an eligible secondary-position row', () => {
    const natural = { id: 1, name: 'Hybrid', pos: 'WR', secondaryPositions: ['RB'], ovr: 82 } as any;
    const unassigned = aggregateTeamUnitsFromRoster([natural]);
    const unknown = aggregateTeamUnitsFromRoster([{ ...natural, depthChart: { rowKey: 'UNKNOWN', order: 1 } }] as any);
    const assignedRb = aggregateTeamUnitsFromRoster([{ ...natural, depthChart: { rowKey: 'RB', order: 1 } }] as any);

    expect(unknown.offense).toEqual(unassigned.offense);
    expect(assignedRb.offense.routeRunning).toBeLessThan(unassigned.offense.routeRunning);
  });
});
