/**
 * Long-Save Durability Harness — orchestrator.
 *
 * Drives the REAL production lifecycle through the LifecycleDriver, evaluates
 * the phase-aware invariant framework at meaningful checkpoints, exercises
 * save/reload at configured durability checkpoints, and produces a structured
 * DurabilityReport.
 *
 * Execution modes differ ONLY in season count + reporting config. Failure modes:
 *   - 'fail-fast'   : stop at the first invariant failure or lifecycle crash.
 *   - 'collect-all' : continue as far as safely possible, accumulating failures;
 *                     a lifecycle crash still stops the run but every failure
 *                     discovered before termination is preserved.
 */
import { LifecycleDriver, CHECKPOINTS, EXPECTED_TEAM_COUNT } from './lifecycleDriver.js';
import { runInvariants } from './invariants/index.js';
import { canonicalSummary, compareCanonical } from './invariants/saveReload.js';
import { compareDurableSnapshots } from './invariants/durableSnapshot.js';
import { DurabilityReport } from './report.js';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const MODES = Object.freeze({
  '1-season': { seasons: 1, durabilityCheckpoints: [1] },
  '5-season': { seasons: 5, durabilityCheckpoints: [1, 5] },
  '10-season': { seasons: 10, durabilityCheckpoints: [1, 5, 10] },
  '20-season': { seasons: 20, durabilityCheckpoints: [1, 5, 10, 20] },
});

class StopHarness extends Error {
  constructor(reason) { super(reason); this.stop = true; }
}

/**
 * @param {object} config
 * @param {string} [config.mode='1-season']
 * @param {number} [config.seed]
 * @param {'fail-fast'|'collect-all'} [config.failureMode='fail-fast']
 * @param {number[]} [config.durabilityCheckpoints]
 * @param {'playoffs'|'offseason'|'rollover'} [config.perSeasonStopPhase='rollover']
 *        Bounds each season to a stage — used by the fast required smoke to
 *        exercise the real lifecycle through playoffs without the expensive
 *        (~6-8 min) offseason rollover. Default 'rollover' = full season.
 * @param {string} [config.gitSha]
 * @param {Function} [config.onEvent]
 * @param {object} [config.driverOverrides] - test hooks (dispatch/loadWorker)
 * @returns {Promise<DurabilityReport>}
 */
export async function runDurabilityHarness(config = {}) {
  const mode = config.mode && MODES[config.mode] ? config.mode : '1-season';
  const modeCfg = MODES[mode];
  const seasons = Number.isFinite(config.seasons) ? config.seasons : modeCfg.seasons;
  const failureMode = config.failureMode === 'collect-all' ? 'collect-all' : 'fail-fast';
  const durabilityCheckpoints = new Set(config.durabilityCheckpoints || modeCfg.durabilityCheckpoints);
  const perSeasonStopPhase = ['playoffs', 'offseason', 'rollover'].includes(config.perSeasonStopPhase)
    ? config.perSeasonStopPhase
    : 'rollover';
  const onEvent = typeof config.onEvent === 'function' ? config.onEvent : () => {};

  const driver = new LifecycleDriver({
    seed: config.seed, onEvent,
    storageProfile: config.storageProfile === true,
    ...(Number.isFinite(config.phaseTimeoutMs) ? { phaseTimeoutMs: config.phaseTimeoutMs } : {}),
    ...(config.driverOverrides || {}),
  });
  const report = new DurabilityReport({
    seed: driver.seed, mode, failureMode, requestedSeasons: seasons, gitSha: config.gitSha ?? null,
    perSeasonStopPhase,
  });

  const t0 = Date.now();
  let peakRss = 0;
  const sampleMem = () => {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      peakRss = Math.max(peakRss, process.memoryUsage().rss);
    }
  };

  let seasonsAttempted = 0;
  let seasonsCompleted = 0;
  let competitiveSeasonsCompleted = 0;
  let completedThrough = CHECKPOINTS.AFTER_INIT;

  let previousDurableSnapshot = null;
  let previousTransactions = [];
  let cumulativeSnapshotSerializedBytes = 0;
  let previousStorageCensus = null;
  let previousSeasonStorageCensus = null;
  let lastCheckpointAt = Date.now();
  const evaluate = (ctx) => {
    const isBoundary = ctx.phase === CHECKPOINTS.AFTER_SEASON_ROLLOVER || ctx.phase === CHECKPOINTS.AFTER_RELOAD;
    const memory = sampleBoundaryMemory({ gcAtBoundaries: config.gcAtBoundaries === true, isBoundary });
    sampleMem();
    const snap = canonicalSummary({ view: ctx.view, db: ctx.db, season: ctx.season });
    cumulativeSnapshotSerializedBytes += snap.durableSnapshotSerializedBytes;
    ctx.durableSnapshot = snap.durableSnapshot;
    ctx.durableSnapshotDigest = snap.durableSnapshotDigest;
    ctx.previousDurableSnapshot = previousDurableSnapshot;
    ctx.previousTransactions = previousTransactions;
    const results = runInvariants(ctx);
    const now = Date.now();
    const storage = withStorageDeltas(ctx.storageCensus, previousStorageCensus, isBoundary && ctx.phase === CHECKPOINTS.AFTER_SEASON_ROLLOVER ? previousSeasonStorageCensus : null);
    if (ctx.storageCensus) previousStorageCensus = ctx.storageCensus;
    if (ctx.storageCensus && ctx.phase === CHECKPOINTS.AFTER_SEASON_ROLLOVER) previousSeasonStorageCensus = ctx.storageCensus;
    const diagnosticArtifact = writeDeterminismArtifact(config.determinismArtifactsDir, ctx, snap.durableSnapshot);
    const counts = report.addCheckpoint({
      season: ctx.season,
      phase: ctx.phase,
      week: ctx.week,
      results,
      durable: { digest: ctx.durableSnapshotDigest, summary: summarizeSnapshot(ctx.durableSnapshot), ...(diagnosticArtifact ? { diagnosticArtifact } : {}) },
      metrics: {
        elapsedSincePreviousMs: now - lastCheckpointAt,
        memory,
        liveCounts: summarizeLiveCounts(ctx),
        harnessRetention: { fullSnapshotsInReport: 0, fullSnapshotsRetainedAfterCheckpoint: 1, currentSnapshotSerializedBytes: snap.durableSnapshotSerializedBytes, cumulativeSnapshotSerializedBytes },
        persistentStorage: storage,
      },
    });
    lastCheckpointAt = now;
    previousDurableSnapshot = ctx.durableSnapshot;
    if (Array.isArray(ctx?.probes?.transactions)) previousTransactions = ctx.probes.transactions;
    onEvent({ type: 'checkpoint', season: ctx.season, phase: ctx.phase, counts, checkpoint: report.report.checkpoints.at(-1) });
    if (failureMode === 'fail-fast' && counts.fail > 0) {
      throw new StopHarness(`fail-fast: ${counts.fail} invariant failure(s) at season ${ctx.season} ${ctx.phase}`);
    }
    return counts;
  };

  // Save → reload → re-validate → compare canonical summaries. Used at the
  // season-boundary durability checkpoint, or at the bounded stop when a smoke
  // run does not reach the (expensive) rollover.
  const doSaveReload = async (before, s) => {
    await driver.reload();
    const afterCtx = await driver.buildContext({
      season: s, phase: CHECKPOINTS.AFTER_RELOAD, includeDb: true, includeProbes: true,
    });
    const after = canonicalSummary({ view: afterCtx.view, db: afterCtx.db, season: s });
    const cmp = compareCanonical(before, after);
    report.addSaveReload({ season: s, phase: CHECKPOINTS.AFTER_RELOAD, ok: cmp.ok, mismatches: cmp.mismatches });
    afterCtx.saveReload = { before, after };
    evaluate(afterCtx);
    onEvent({ type: 'saveReload', season: s, ok: cmp.ok, mismatches: cmp.mismatches });
  };

  try {
    // ── league initialization checkpoint ─────────────────────────────────
    await driver.initLeague();
    evaluate(await driver.buildContext({ season: 0, phase: CHECKPOINTS.AFTER_INIT, includeDb: true, includeProbes: true }));

    for (let s = 1; s <= seasons; s += 1) {
      seasonsAttempted = s;
      onEvent({ type: 'seasonStart', season: s });

      // regular season → stops at 'playoffs'
      await driver.simToPhase('playoffs', { checkpoint: CHECKPOINTS.AFTER_REGULAR_SEASON });
      evaluate(await driver.buildContext({ season: s, phase: CHECKPOINTS.AFTER_REGULAR_SEASON, includeProbes: false }));
      completedThrough = CHECKPOINTS.AFTER_REGULAR_SEASON;

      if (perSeasonStopPhase === 'playoffs') { onEvent({ type: 'seasonBoundedStop', season: s, bounded: 'playoffs' }); break; }

      // playoffs/championship → stops at 'offseason'
      await driver.simToPhase('offseason', { checkpoint: CHECKPOINTS.AFTER_PLAYOFFS });
      const playoffCtx = await driver.buildContext({ season: s, phase: CHECKPOINTS.AFTER_PLAYOFFS, includeDb: true, includeProbes: false });
      const boundedBefore = canonicalSummary({ view: playoffCtx.view, db: playoffCtx.db, season: s });
      evaluate(playoffCtx);
      competitiveSeasonsCompleted = s;
      completedThrough = CHECKPOINTS.AFTER_PLAYOFFS;

      if (perSeasonStopPhase === 'offseason') {
        // Bounded smoke: exercise save/reload here since the rollover is skipped.
        if (durabilityCheckpoints.has(s)) await doSaveReload(boundedBefore, s);
        onEvent({ type: 'seasonBoundedStop', season: s, bounded: 'offseason' }); break;
      }

      // draft + free agency + rollover → stops at next 'preseason'
      await driver.simToPhase('preseason', { checkpoint: CHECKPOINTS.AFTER_SEASON_ROLLOVER });

      // Full-pool + probes checkpoint at season boundary (always includes DB).
      const rolloverCtx = await driver.buildContext({
        season: s, phase: CHECKPOINTS.AFTER_SEASON_ROLLOVER, includeDb: true, includeProbes: true,
      });
      const before = canonicalSummary({ view: rolloverCtx.view, db: rolloverCtx.db, season: s });
      evaluate(rolloverCtx);
      completedThrough = CHECKPOINTS.AFTER_SEASON_ROLLOVER;

      // ── save/reload durability validation ────────────────────────────
      if (durabilityCheckpoints.has(s)) await doSaveReload(before, s);

      seasonsCompleted = s;
      competitiveSeasonsCompleted = s;
      onEvent({ type: 'seasonComplete', season: s });
    }
  } catch (err) {
    if (err instanceof StopHarness) {
      onEvent({ type: 'stopped', reason: err.message });
    } else if (err && err.isLifecycleCrash) {
      err.season = seasonsAttempted;
      const isTimeout = /Timeout/i.test(String(err.message));
      report.setLifecycleException({
        message: err.message,
        checkpoint: err.checkpoint,
        season: seasonsAttempted,
        classification: isTimeout ? 'performance-timeout' : 'lifecycle-crash',
        workerPayload: err.workerPayload ?? null,
      });
      if (isTimeout) {
        // A phase timeout is a PERFORMANCE limitation, not state corruption.
        report.addDeferredFinding({
          type: 'performance limitation',
          checkpoint: err.checkpoint,
          season: seasonsAttempted,
          detail: `SIM_TO_PHASE did not return within the configured phase timeout at ${err.checkpoint} (season ${seasonsAttempted}). The offseason draft rollover dominates runtime; see docs §22.`,
        });
      }
      onEvent({ type: 'lifecycleCrash', season: seasonsAttempted, message: err.message, timeout: isTimeout });
    } else {
      report.setLifecycleException({
        message: err?.message ?? String(err), checkpoint: 'unknown', season: seasonsAttempted,
        stack: String(err?.stack ?? '').split('\n').slice(0, 5).join('\n'),
      });
    }
  }

  sampleMem();
  report.finalize({
    seasonsAttempted,
    seasonsCompleted,
    competitiveSeasonsCompleted,
    completedThrough,
    boundedRun: perSeasonStopPhase !== 'rollover',
    unexercisedLifecycleStages: unexercisedStages(perSeasonStopPhase),
    runtimeMs: Date.now() - t0,
    peakMemoryMb: Math.round(peakRss / (1024 * 1024)),
  });
  return report;
}

/**
 * Determinism check: run the same mode twice from clean state and compare
 * normalized outcomes. Returns { deterministic, detail, reports }.
 *
 * NOTE: full byte-for-byte determinism is NOT expected because several
 * production modules still use unseeded Math.random() (documented finding).
 * We compare a normalized canonical outcome, not raw state.
 */
export async function runDeterminismCheck(config = {}) {
  const root = mkdtempSync(join(tmpdir(), 'durability-determinism-'));
  const dirA = join(root, 'A');
  const dirB = join(root, 'B');
  mkdirSync(dirA); mkdirSync(dirB);
  try {
    const a = await runDurabilityHarness({ ...config, _determinismRun: 'A', determinismArtifactsDir: dirA });
    const b = await runDurabilityHarness({ ...config, _determinismRun: 'B', determinismArtifactsDir: dirB });
    return { ...compareReportDeterminism(a.report, b.report), reports: [a, b] };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

export function compareReportDeterminism(reportA, reportB) {
  const na = normalizeOutcome(stripSnapshotsForOutcome(reportA));
  const nb = normalizeOutcome(stripSnapshotsForOutcome(reportB));
  const diffs = [];
  for (const k of Object.keys(na)) if (JSON.stringify(na[k]) !== JSON.stringify(nb[k])) diffs.push({ field: k, a: na[k], b: nb[k] });
  const state = compareReportSnapshots(reportA, reportB);
  const lifecycleDeterministic = diffs.length === 0;
  const stateDeterministic = state.ok;
  return { deterministic: lifecycleDeterministic && stateDeterministic, lifecycleDeterministic, stateDeterministic, firstDivergence: state.firstDivergence, detail: lifecycleDeterministic && stateDeterministic ? 'Lifecycle outcome and canonical durable state identical across two clean runs' : `Lifecycle deterministic=${lifecycleDeterministic}; state deterministic=${stateDeterministic}`, diffs: [...diffs, ...state.diffs] };
}
function stripSnapshotsForOutcome(r) { return { ...r, checkpoints: (r.checkpoints || []).map((c) => ({ ...c, durable: c.durable ? { digest: c.durable.digest } : null })) }; }

function normalizeOutcome(r) {
  return {
    seasonsCompleted: r.seasonsCompleted,
    firstFailure: r.firstFailure
      ? { season: r.firstFailure.season, phase: r.firstFailure.phase, invariantId: r.firstFailure.invariantId }
      : null,
    lifecycleException: r.lifecycleException
      ? { checkpoint: r.lifecycleException.checkpoint, message: r.lifecycleException.message }
      : null,
    summaryShape: { failed: r.summary.failed },
    checkpointPhases: r.checkpoints.map((c) => `${c.season}:${c.phase}:${c.summary.fail}`),
    saveReloadOk: r.saveReload.map((s) => `${s.season}:${s.ok}`),
  };
}

function unexercisedStages(perSeasonStopPhase) {
  if (perSeasonStopPhase === 'rollover') return [];
  if (perSeasonStopPhase === 'offseason') {
    return ['draft', 'freeAgency', 'progression', 'retirement', 'historyRollover', 'nextSeasonGeneration'];
  }
  return ['playoffs', 'draft', 'freeAgency', 'progression', 'retirement', 'historyRollover', 'nextSeasonGeneration'];
}

function memoryUsage() {
  if (typeof process === 'undefined' || !process.memoryUsage) return null;
  const { rss, heapUsed, heapTotal, external, arrayBuffers } = process.memoryUsage();
  return { rss, heapUsed, heapTotal, external, arrayBuffers };
}

export function sampleBoundaryMemory({ gcAtBoundaries, isBoundary, gc = globalThis.gc } = {}) {
  const preGc = memoryUsage();
  const explicitGcAvailable = typeof gc === 'function';
  const explicitGcRequested = gcAtBoundaries === true && isBoundary === true;
  if (explicitGcRequested && explicitGcAvailable) gc();
  return {
    preGc,
    postGc: explicitGcRequested && explicitGcAvailable ? memoryUsage() : null,
    explicitGcRequested,
    explicitGcAvailable,
  };
}

function summarizeLiveCounts(ctx) {
  const players = Array.isArray(ctx?.db?.players) ? ctx.db.players : [];
  const retired = Array.isArray(ctx?.view?.retiredPlayers)
    ? ctx.view.retiredPlayers
    : (Array.isArray(ctx?.db?.meta?.retiredPlayers) ? ctx.db.meta.retiredPlayers : []);
  const stores = ctx?.storageCensus?.stores ?? {};
  return {
    activePlayers: players.filter((p) => p?.status !== 'retired' && p?.retired !== true).length,
    retiredPlayers: retired.length,
    currentSeasonStats: stores.playerStats?.currentSeasonRows ?? null,
    draftPicks: ctx?.db?.picks?.length ?? null,
    scheduleGames: summarizeSnapshot(ctx?.durableSnapshot).scheduleCount,
    history: Array.isArray(ctx?.view?.leagueHistory) ? ctx.view.leagueHistory.length : 0,
    transactions: stores.transactions?.rowCount ?? (Array.isArray(ctx?.probes?.transactions) ? ctx.probes.transactions.length : null),
    persistedGames: stores.games?.rowCount ?? null,
    persistedPlayerStats: stores.playerStats?.rowCount ?? null,
    persistedNews: stores.news?.rowCount ?? null,
  };
}

function withStorageDeltas(current, previous, previousSeason) {
  if (!current) return null;
  const stores = {};
  for (const [name, measured] of Object.entries(current.stores)) {
    const prior = previous?.stores?.[name];
    const priorSeason = previousSeason?.stores?.[name];
    stores[name] = {
      ...measured,
      rowDelta: prior ? measured.rowCount - prior.rowCount : null,
      serializedBytesDelta: prior ? measured.serializedBytes - prior.serializedBytes : null,
      rowDeltaFromPreviousSeason: priorSeason ? measured.rowCount - priorSeason.rowCount : null,
      serializedBytesDeltaFromPreviousSeason: priorSeason ? measured.serializedBytes - priorSeason.serializedBytes : null,
    };
  }
  return {
    ...current,
    stores,
    totalSerializedBytesDelta: previous ? current.totalSerializedBytes - previous.totalSerializedBytes : null,
    totalSerializedBytesDeltaFromPreviousSeason: previousSeason ? current.totalSerializedBytes - previousSeason.totalSerializedBytes : null,
  };
}
function summarizeSnapshot(s) {
  return { league: s?.league, pools: s?.pools, teamCount: s?.teams?.length ?? 0, playerCount: s?.players?.length ?? 0, retiredCount: s?.retiredPlayers?.length ?? 0, pickCount: s?.draftPicks?.length ?? 0, scheduleCount: s?.schedule?.length ?? 0, historyCount: s?.history?.length ?? 0 };
}
function compareReportSnapshots(a, b) {
  const diffs = [];
  const bByKey = new Map((b.checkpoints || []).map((c) => [`${c.season}:${c.phase}`, c]));
  for (const ac of a.checkpoints || []) {
    const key = `${ac.season}:${ac.phase}`;
    const bc = bByKey.get(key);
    if (!bc) { diffs.push({ domain: 'checkpoint', entityId: key, field: 'missing', runA: true, runB: false }); break; }
    if (ac.durable?.digest !== bc.durable?.digest) {
      const diagnostic = compareArtifactSnapshots(ac.durable?.diagnosticArtifact, bc.durable?.diagnosticArtifact, key);
      if (diagnostic) return diagnostic;
      const first = { domain: 'checkpoint', entityId: key, field: 'digest', checkpoint: key, runA: ac.durable?.digest, runB: bc.durable?.digest };
      return { ok: false, firstDivergence: first, diffs: [{ ...first, summaryA: ac.durable?.summary, summaryB: bc.durable?.summary }] };
    }
  }
  return { ok: diffs.length === 0, firstDivergence: diffs[0] || null, diffs };
}

function writeDeterminismArtifact(directory, ctx, snapshot) {
  if (!directory) return null;
  const name = `${ctx.season}-${String(ctx.phase).replace(/[^a-z0-9_-]/gi, '_')}.json`;
  const path = join(directory, name);
  writeFileSync(path, JSON.stringify(snapshot));
  return path;
}

function compareArtifactSnapshots(pathA, pathB, checkpoint) {
  if (!pathA || !pathB) return null;
  try {
    const snapshotA = JSON.parse(readFileSync(pathA, 'utf8'));
    const snapshotB = JSON.parse(readFileSync(pathB, 'utf8'));
    const cmp = compareDurableSnapshots(snapshotA, snapshotB, 20);
    const diffs = cmp.diffs.map((diff) => boundDiff({ ...diff, checkpoint }));
    return { ok: false, firstDivergence: diffs[0] ?? null, diffs };
  } catch {
    return null;
  }
}

function boundDiff(diff) {
  return { ...diff, runA: boundedValue(diff.runA), runB: boundedValue(diff.runB) };
}

function boundedValue(value) {
  const serialized = JSON.stringify(value);
  if (serialized == null || serialized.length <= 500) return value;
  return `${serialized.slice(0, 497)}...`;
}
