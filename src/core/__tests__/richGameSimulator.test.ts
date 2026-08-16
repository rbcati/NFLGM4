import { describe, expect, it } from 'vitest';
import { mapOverallToAttributesV2 } from '../migration/attributeMigrator.ts';
import { simulateRichGame } from '../sim/richGameSimulator.ts';
import type { DerivedGamePlanMultipliers } from '../sim/gamePlanMultipliers.ts';

const PREP_EDGE: DerivedGamePlanMultipliers = {
  passSuccessDelta: 0.03,
  rushSuccessDelta: 0,
  explosivePlayDelta: 0.01,
  turnoverAvoidanceDelta: 0.01,
  redZoneDelta: 0.005,
  fatigueDisciplineDelta: 0.01,
  chemistryPenalty: 0,
  score: 0.065,
  netImpact: 0.065,
  severity: 'ready',
  activeReasons: ['Test prep edge'],
};

function buildPayload(seed = 7) {
  return {
    gameId: `g-${seed}`,
    homeTeamId: 1,
    awayTeamId: 2,
    seed,
    weather: 'clear' as const,
    homeOffense: mapOverallToAttributesV2(86, 5.5, `h-off-${seed}`),
    awayOffense: mapOverallToAttributesV2(84, 5.5, `a-off-${seed}`),
    homeDefense: mapOverallToAttributesV2(83, 5.5, `h-def-${seed}`),
    awayDefense: mapOverallToAttributesV2(82, 5.5, `a-def-${seed}`),
    homePlayers: [
      { id: 'h-qb', name: 'Home QB', pos: 'QB', ovr: 88 },
      { id: 'h-rb', name: 'Home RB', pos: 'RB', ovr: 84 },
      { id: 'h-wr1', name: 'Home WR1', pos: 'WR', ovr: 85 },
      { id: 'h-wr2', name: 'Home WR2', pos: 'WR', ovr: 82 },
      { id: 'h-te', name: 'Home TE', pos: 'TE', ovr: 80 },
      { id: 'h-edge', name: 'Home EDGE', pos: 'EDGE', ovr: 83 },
      { id: 'h-lb', name: 'Home LB', pos: 'LB', ovr: 81 },
      { id: 'h-cb', name: 'Home CB', pos: 'CB', ovr: 82 },
    ],
    awayPlayers: [
      { id: 'a-qb', name: 'Away QB', pos: 'QB', ovr: 85 },
      { id: 'a-rb', name: 'Away RB', pos: 'RB', ovr: 82 },
      { id: 'a-wr1', name: 'Away WR1', pos: 'WR', ovr: 84 },
      { id: 'a-wr2', name: 'Away WR2', pos: 'WR', ovr: 81 },
      { id: 'a-te', name: 'Away TE', pos: 'TE', ovr: 79 },
      { id: 'a-edge', name: 'Away EDGE', pos: 'EDGE', ovr: 82 },
      { id: 'a-lb', name: 'Away LB', pos: 'LB', ovr: 80 },
      { id: 'a-cb', name: 'Away CB', pos: 'CB', ovr: 81 },
    ],
    homePrepMultipliers: PREP_EDGE,
  };
}

describe('simulateRichGame', () => {
  it('is deterministic for the same seed and emits rich outputs', () => {
    const one = simulateRichGame(buildPayload(101));
    const two = simulateRichGame(buildPayload(101));

    expect(one).toEqual(two);
    expect(one.teamStats.home.plays).toBeGreaterThan(40);
    expect(one.playDigest.length).toBeGreaterThan(0);
    expect(one.quarterScores.home).toHaveLength(4);
  });

  it('keeps player and team totals internally consistent', () => {
    const summary = simulateRichGame(buildPayload(91));

    const homeRows = Object.values(summary.boxScore.home);
    const awayRows = Object.values(summary.boxScore.away);

    const homePassYd = homeRows.reduce((sum, row) => sum + Number(row.stats.passYd ?? 0), 0);
    const awayPassYd = awayRows.reduce((sum, row) => sum + Number(row.stats.passYd ?? 0), 0);
    const homeRushYd = homeRows.reduce((sum, row) => sum + Number(row.stats.rushYd ?? 0), 0);
    const awayRushYd = awayRows.reduce((sum, row) => sum + Number(row.stats.rushYd ?? 0), 0);

    expect(homePassYd).toBe(summary.teamStats.home.passYd);
    expect(awayPassYd).toBe(summary.teamStats.away.passYd);
    expect(homeRushYd).toBe(summary.teamStats.home.rushYd);
    expect(awayRushYd).toBe(summary.teamStats.away.rushYd);
  });

  it('emits complete box score categories for future aggregation', () => {
    const summary = simulateRichGame(buildPayload(909));
    const allRows = [...Object.values(summary.boxScore.home), ...Object.values(summary.boxScore.away)];

    expect(summary.scoringSummary.length).toBeGreaterThan(0);
    expect(summary.teamStats.home.passYards).toBe(summary.teamStats.home.passYd);
    expect(summary.teamStats.away.rushYards).toBe(summary.teamStats.away.rushYd);
    expect(allRows.some((row) => Number(row.stats.passAtt ?? 0) > 0 && Number(row.stats.passerRating ?? 0) >= 0)).toBe(true);
    expect(allRows.some((row) => Number(row.stats.rushAtt ?? 0) > 0 && row.stats.fumbles != null)).toBe(true);
    expect(allRows.some((row) => Number(row.stats.targets ?? 0) > 0 && row.stats.drops != null)).toBe(true);
    expect(allRows.some((row) => Number(row.stats.tackles ?? 0) > 0 && row.stats.tfl != null)).toBe(true);
    expect(allRows.some((row) => Number(row.stats.fieldGoalsAttempted ?? 0) > 0 || Number(row.stats.punts ?? 0) > 0 || Number(row.stats.kickReturns ?? 0) > 0 || Number(row.stats.puntReturns ?? 0) > 0)).toBe(true);
  });

  it('creates a mixed run/pass offense profile', () => {
    const summary = simulateRichGame(buildPayload(313));
    const homePassRate = summary.teamStats.home.passAtt / Math.max(1, summary.teamStats.home.plays);
    const awayPassRate = summary.teamStats.away.passAtt / Math.max(1, summary.teamStats.away.plays);

    expect(homePassRate).toBeGreaterThan(0.25);
    expect(homePassRate).toBeLessThan(0.85);
    expect(awayPassRate).toBeGreaterThan(0.25);
    expect(awayPassRate).toBeLessThan(0.85);
  });

  it('accepts prep multipliers and keeps deterministic behavior for same inputs', () => {
    const one = simulateRichGame(buildPayload(455));
    const two = simulateRichGame(buildPayload(455));
    expect(one).toEqual(two);
  });

  it('gives the depth-1 QB the team passing work even when a higher-OVR backup is listed first', () => {
    const payload = buildPayload(1684);
    payload.homePlayers = [
      { id: 'h-qb-backup', name: 'Backup QB', pos: 'QB', ovr: 95, depthOrder: 2 },
      { id: 'h-qb-starter', name: 'Starter QB', pos: 'QB', ovr: 60, depthOrder: 1 },
      ...payload.homePlayers.filter((player) => player.pos !== 'QB'),
    ];

    const summary = simulateRichGame(payload);
    const starter = summary.boxScore.home['h-qb-starter'];
    const backup = summary.boxScore.home['h-qb-backup'];
    const teamAtt = summary.teamStats.home.passAtt;

    expect(teamAtt).toBeGreaterThan(10);
    expect(starter?.stats.passAtt).toBe(teamAtt);
    expect(backup?.stats.passAtt ?? 0).toBe(0);
    expect(starter.stats.passAtt / teamAtt).toBeGreaterThanOrEqual(0.95);
  });

  it('shifts WR targets toward the depth-1 receiver when the chart is swapped', () => {
    const seeds = [1684, 1702, 1703, 1810, 1901, 2002, 2111, 2222];

    const receptionsFor = (wr1Depth: number, wr2Depth: number) => {
      let wr1 = 0;
      let wr2 = 0;
      for (const seed of seeds) {
        const payload = buildPayload(seed);
        payload.homePlayers = payload.homePlayers.map((player) => {
          if (player.id === 'h-wr1') return { ...player, ovr: 70, depthOrder: wr1Depth };
          if (player.id === 'h-wr2') return { ...player, ovr: 90, depthOrder: wr2Depth };
          return { ...player, depthOrder: 1 };
        });
        const summary = simulateRichGame(payload);
        wr1 += Number(summary.boxScore.home['h-wr1']?.stats.receptions ?? 0);
        wr2 += Number(summary.boxScore.home['h-wr2']?.stats.receptions ?? 0);
      }
      return { wr1, wr2 };
    };

    const starterFirst = receptionsFor(1, 2);
    const swapped = receptionsFor(2, 1);

    expect(starterFirst.wr1).toBeGreaterThan(starterFirst.wr2);
    expect(swapped.wr2).toBeGreaterThan(swapped.wr1);
    expect(starterFirst.wr1).toBeGreaterThan(swapped.wr1);
  });

  it('stays deterministic when the same depth chart is reused', () => {
    const payload = buildPayload(1702);
    payload.homePlayers = payload.homePlayers.map((player, idx) => ({
      ...player,
      depthOrder: idx === 0 ? 1 : idx,
    }));
    payload.awayPlayers = payload.awayPlayers.map((player, idx) => ({
      ...player,
      depthOrder: idx === 0 ? 1 : idx,
    }));

    expect(simulateRichGame(payload)).toEqual(simulateRichGame(payload));
  });

  it('keeps payload order for old saves that have no depthOrder', () => {
    const payload = buildPayload(1911);
    payload.homePlayers = [
      { id: 'h-qb-listed-first', name: 'Listed First QB', pos: 'QB', ovr: 60 },
      { id: 'h-qb-listed-second', name: 'Listed Second QB', pos: 'QB', ovr: 95 },
      ...payload.homePlayers.filter((player) => player.pos !== 'QB'),
    ];

    const summary = simulateRichGame(payload);
    expect(summary.boxScore.home['h-qb-listed-first']?.stats.passAtt).toBe(summary.teamStats.home.passAtt);
    expect(summary.boxScore.home['h-qb-listed-second']?.stats.passAtt ?? 0).toBe(0);
  });

  it('keeps scoring and volume ranges stable across a 16-seed matrix', () => {
    const seeds = Array.from({ length: 16 }, (_, i) => 1400 + i);
    const rows = seeds.map((seed) => {
      const summary = simulateRichGame(buildPayload(seed));
      return {
        points: summary.homeScore + summary.awayScore,
        passAtt: summary.teamStats.home.passAtt + summary.teamStats.away.passAtt,
        rushAtt: summary.teamStats.home.rushAtt + summary.teamStats.away.rushAtt,
        passYd: summary.teamStats.home.passYd + summary.teamStats.away.passYd,
        rushYd: summary.teamStats.home.rushYd + summary.teamStats.away.rushYd,
        sacks: (summary.teamStats.home.sacksAllowed ?? 0) + (summary.teamStats.away.sacksAllowed ?? 0),
        ints: (summary.teamStats.home.interceptions ?? 0) + (summary.teamStats.away.interceptions ?? 0),
      };
    });
    const mean = (key) => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;

    // Pre-change 24-seed balanced snapshot (no depth) sat near 53 points, 62 pass att, 53 rush att.
    // These bands prove depth weighting did not rebalance the engine.
    expect(mean('points')).toBeGreaterThan(35);
    expect(mean('points')).toBeLessThan(75);
    expect(mean('passAtt')).toBeGreaterThan(45);
    expect(mean('passAtt')).toBeLessThan(85);
    expect(mean('rushAtt')).toBeGreaterThan(35);
    expect(mean('rushAtt')).toBeLessThan(75);
    expect(mean('passYd')).toBeGreaterThan(250);
    expect(mean('passYd')).toBeLessThan(700);
    expect(mean('rushYd')).toBeGreaterThan(100);
    expect(mean('rushYd')).toBeLessThan(400);
    expect(mean('sacks')).toBeLessThan(6);
    expect(mean('ints')).toBeLessThan(4);
  });
});
