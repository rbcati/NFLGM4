import { describe, expect, it, vi } from 'vitest';
import {
  buildAvailabilityDecisionQueue,
  buildContractDecisionQueue,
  buildGMDecisionQueue,
  buildRosterLimitContext,
  buildRosterCutdownDecisionQueue,
  createAvailabilityDecisionQueueBuilder,
  createContractDecisionQueueBuilder,
  createGMDecisionQueueBuilder,
} from '../gmDecisionQueue.js';
import { getRosterLimitForPhase, validateLeagueTeamLegality } from '../teamValidation.js';
import { buildPlayerDecisionPresentation } from '../playerDecisionPresentation.js';

const player = (id, overrides = {}) => ({
  id, name: `Player ${id}`, pos: 'QB', teamId: 10, status: 'active', age: 26, ovr: 76,
  contract: { yearsRemaining: 2 }, depthChart: { rowKey: 'QB', order: 2, role: 'backup' },
  injury: { type: 'Knee', weeksRemaining: 2 }, ...overrides,
});
const build = (roster, overrides = {}) => buildAvailabilityDecisionQueue({
  roster, team: { id: 10, depthChart: { QB: roster.filter(Boolean).map((p) => p.id) } },
  league: { players: roster.filter((p) => p && typeof p === 'object'), draftClass: [] }, ...overrides,
});

describe('roster cutdown decisions', () => {
  const rosterPlayer = (id, overrides = {}) => player(id, { injury: null, ...overrides });
  const rosterInput = (count, overrides = {}) => {
    const roster = Array.from({ length: count }, (_, index) => rosterPlayer(index + 1));
    return { roster, team: { id: 10, roster }, league: { phase: 'regular', players: roster }, ...overrides };
  };

  it('uses the gameplay roster authority and only emits one team constraint when over limit', () => {
    expect(buildRosterLimitContext(rosterInput(53))).toMatchObject({ currentCount: 53, limit: getRosterLimitForPhase('regular'), requiredMoves: 0, overLimit: false });
    expect(buildRosterCutdownDecisionQueue(rosterInput(52)).items).toEqual([]);
    const result = buildRosterCutdownDecisionQueue(rosterInput(55));
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 'roster_cutdown:10', subject: { type: 'team', teamId: 10 }, severity: 'high',
      rosterConstraint: { currentCount: 55, limit: 53, requiredMoves: 2 },
    });
    expect(result.items[0].rosterConstraint.candidates).toHaveLength(55);
    expect(result.items[0].rosterConstraint.candidates.every((candidate) => !('recommendation' in candidate))).toBe(true);
  });

  it('uses the proven preseason advance gate and marks that blocker critical', () => {
    const input = rosterInput(54);
    input.league.phase = 'preseason';
    expect(buildRosterCutdownDecisionQueue(input).items[0]).toMatchObject({ severity: 'critical', rosterConstraint: { limit: 53, requiredMoves: 1 } });
  });

  it('matches ownership-based gameplay membership while excluding free agents, foreign players, and duplicates', () => {
    const active = rosterPlayer(1);
    const ir = rosterPlayer(2, { status: 'injured_reserve', onIR: true });
    const result = buildRosterLimitContext({
      roster: [active, { ...active }, ir, rosterPlayer(3, { teamId: 11 }), rosterPlayer(4, { status: 'free_agent' }), rosterPlayer(5, { status: null })],
      team: { id: 10 }, league: { phase: 'regular', players: [] },
    });
    expect(result.currentCount).toBe(3);
    expect(result.diagnostics.map((entry) => entry.reason)).toEqual(expect.arrayContaining([
      'Duplicate roster reference', 'Player not owned by supplied team', 'Status does not count toward constrained roster',
      'Missing status counted by gameplay ownership authority',
    ]));
  });

  it('counts legacy missing statuses exactly as the gameplay legality authority does', () => {
    const roster = Array.from({ length: 55 }, (_, index) => rosterPlayer(index + 1,
      index < 4 ? { status: undefined } : {}));
    const context = buildRosterLimitContext({ roster, team: { id: 10 }, league: { phase: 'regular', players: roster } });
    const legality = validateLeagueTeamLegality({ teams: [{ id: 10, abbr: 'TST' }], players: roster, phase: 'regular', hardCap: Number.MAX_SAFE_INTEGER });

    expect(context).toMatchObject({ currentCount: 55, requiredMoves: 2, overLimit: true });
    expect(legality.rosterLimit).toBe(context.limit);
    expect(legality.issues.find((issue) => issue.code === 'roster_limit')?.message).toContain('55/53');
    expect(context.diagnostics.filter((entry) => entry.reason === 'Missing status counted by gameplay ownership authority')).toHaveLength(4);
  });

  it('counts IR, retired, and draft-class statuses when the ownership gate counts them', () => {
    const roster = [
      rosterPlayer(1, { status: 'injured_reserve', onIR: true }),
      rosterPlayer(2, { status: 'retired', retired: true }),
      rosterPlayer(3, { status: 'draft_eligible', draftEligible: true }),
    ];
    const context = buildRosterLimitContext({ roster, team: { id: 10 }, league: { phase: 'regular', players: roster, draftClass: [roster[2]] } });
    const legality = validateLeagueTeamLegality({ teams: [{ id: 10 }], players: roster, phase: 'regular', hardCap: Number.MAX_SAFE_INTEGER });
    expect(context.currentCount).toBe(3);
    expect(legality.issues.find((issue) => issue.code === 'roster_limit')).toBeUndefined();
    expect(context.diagnostics.filter((entry) => entry.reason === 'Nonstandard status counted by gameplay ownership authority')).toHaveLength(2);
  });

  it('never invents a limit for missing phase data and remains pure and deterministic', () => {
    const input = rosterInput(54);
    const snapshot = structuredClone(input);
    delete input.league.phase;
    const first = buildRosterLimitContext(input);
    expect(first).toMatchObject({ currentCount: null, limit: null, requiredMoves: 0, overLimit: false, availableData: false });
    expect(buildRosterLimitContext(input)).toEqual(first);
    expect(buildRosterLimitContext({ ...input, league: { ...input.league, phase: 'unknown_future_phase' } }).limit).toBeNull();
    expect({ ...input, league: { ...input.league, phase: snapshot.league.phase } }).toEqual(snapshot);
  });

  it('keeps team subjects out of player overlap buckets and shares presentation cache', () => {
    const input = rosterInput(54);
    input.roster[0].injury = { type: 'Knee', weeksRemaining: 2 };
    const presentation = vi.fn(({ player: row }) => buildPlayerDecisionPresentation({ player: row, team: input.team, league: input.league }));
    const result = createGMDecisionQueueBuilder({ buildPresentation: presentation })(input);
    expect(result.items.filter((item) => item.category === 'roster_cutdown')).toHaveLength(1);
    expect(result.items.some((item) => item.category === 'availability')).toBe(true);
    expect(presentation).toHaveBeenCalledTimes(54);
  });
});

describe('buildAvailabilityDecisionQueue', () => {
  it('includes unavailable starters/backups and excludes healthy or foreign players', () => {
    const starter = player(1, { depthChart: { rowKey: 'QB', order: 1, role: 'starter' } });
    const backup = player(2);
    const healthy = player(3, { injury: null });
    const foreign = player(4, { teamId: 11 });
    const result = build([starter, backup, healthy, foreign]);
    expect(result.items.map((item) => item.subject.playerId)).toEqual([1, 2]);
    expect(result.items[0]).toMatchObject({ severity: 'high', destination: { view: 'Depth Chart', playerId: 1 } });
    expect(result.items[1]).toMatchObject({ destination: { view: 'Injuries', playerId: 2 } });
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      { playerId: 3, reason: 'Healthy player' },
      { playerId: 4, reason: 'Player not owned by supplied team' },
    ]));
  });

  it.each([
    ['free agent', { status: 'free_agent', teamId: null }],
    ['draft prospect', { status: 'draft_eligible', draftEligible: true }],
    ['retired player', { status: 'retired', retired: true }],
  ])('excludes %s', (_label, fields) => {
    expect(build([player(1, fields)]).items).toEqual([]);
  });

  it('requires confirmed missing replacement for critical and a healthy backup prevents it', () => {
    const starter = player(1, { depthChart: { rowKey: 'QB', order: 1, role: 'starter' } });
    expect(build([starter]).items[0].severity).toBe('critical');
    expect(build([starter, player(2, { injury: null })]).items[0].severity).toBe('high');
    const missingDepth = build([starter], { team: { id: 10 }, league: { players: [starter] } });
    expect(missingDepth.items[0].severity).toBe('high');
    expect(missingDepth.diagnostics).toContainEqual({ playerId: 1, reason: 'Unsupported depth data for critical classification' });
  });

  it('does not invent starter status when role data is missing', () => {
    const incomplete = player(1, { depthChart: null, depthOrder: null, ovr: 1 });
    const result = build([incomplete]);
    expect(result.items[0]).toMatchObject({ severity: 'high', destination: { view: 'Injuries' } });
    expect(result.items[0].reasons).not.toContain('Recorded starter role');
  });

  it('uses authoritative High replacement difficulty to raise a backup to high', () => {
    const backup = player(1);
    const result = build([backup]);
    expect(result.items[0].severity).toBe('high');
    expect(result.items[0].reasons).toContain('High replacement difficulty');
  });

  it('renders recorded duration, omits missing duration, and preserves recorded zero without calling it missing', () => {
    const duration = build([player(1)]).items[0].reasons;
    expect(duration).toContain('Recorded absence: 2 weeks');
    const noDuration = build([player(2, { injury: { type: 'Knee', weeksRemaining: null } })]).items[0].reasons;
    expect(noDuration.join(' ')).not.toMatch(/0 week/);
    const zero = build([player(3, { injury: { type: 'Knee', weeksRemaining: 0 } })]).items[0];
    expect(zero.availableData.injuryDuration).toBe(true);
    expect(new Set(zero.reasons).size).toBe(zero.reasons.length);
  });

  it('orders by severity, role, replacement, then stable canonical ID independent of input order', () => {
    const rows = [player('20'), player(3), player('11')];
    const first = build(rows).items.map((item) => item.subject.playerId);
    const second = build([...rows].reverse()).items.map((item) => item.subject.playerId);
    expect(first).toEqual([3, '11', '20']);
    expect(second).toEqual(first);
  });

  it('deduplicates canonical IDs and presentation calls', () => {
    const presentation = vi.fn(({ player: input }) => ({
      identity: { statusKey: 'active_roster', position: input.pos }, role: { label: 'Backup' },
      availability: { available: false, detail: 'Knee' }, replacement: { label: 'Medium' },
    }));
    const builder = createAvailabilityDecisionQueueBuilder({ buildPresentation: presentation });
    const original = player(1);
    const result = builder({ roster: [original, { ...original }], team: { id: 10 }, league: { players: [original] } });
    expect(result.items).toHaveLength(1);
    expect(presentation).toHaveBeenCalledTimes(1);
    expect(result.diagnostics).toContainEqual({ playerId: 1, reason: 'Duplicate roster reference' });
  });

  it('prefilters healthy players before presentation construction', () => {
    const presentation = vi.fn();
    const builder = createAvailabilityDecisionQueueBuilder({ buildPresentation: presentation });
    builder({ roster: [player(1, { injury: null })], team: { id: 10 }, league: {} });
    expect(presentation).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'injured_reserve', injury: null }], [{ onIR: true, injury: null }],
    [{ injuryWeeksRemaining: 3, injury: null }], [{ injury: { type: 'Knee', weeksRemaining: null } }],
    [{ injury: { status: 'Out', weeksRemaining: '' } }],
  ])('handles legacy/partial unavailable shape %j', (fields) => {
    expect(build([player(1, fields)]).items).toHaveLength(1);
  });

  it('is pure, deterministic, and safely handles stale/partial inputs', () => {
    const roster = [player(1)];
    const team = { id: 10, depthChart: { QB: [1] } };
    const league = { players: roster };
    const stats = { 1: { passYd: 0 } };
    const snapshot = structuredClone({ roster, team, league, stats });
    const input = { roster, team, league, seasonStatsByPlayerId: stats };
    expect(buildAvailabilityDecisionQueue(input)).toEqual(buildAvailabilityDecisionQueue(input));
    expect({ roster, team, league, stats }).toEqual(snapshot);
    expect(buildAvailabilityDecisionQueue({ roster: [999], team, league })).toMatchObject({ items: [] });
    expect(buildAvailabilityDecisionQueue({ roster: [], team, league }).items).toEqual([]);
    expect(buildAvailabilityDecisionQueue({ roster: null, team: null, league: null }).diagnostics).not.toEqual([]);
  });
});

const contractPlayer = (id, overrides = {}) => ({
  id, name: `Contract ${id}`, pos: 'QB', teamId: 10, status: 'active', age: 26, ovr: 76,
  contract: { yearsRemaining: 1, baseAnnual: 8 }, depthChart: { rowKey: 'QB', order: 1, role: 'starter' }, ...overrides,
});
const contractBuild = (roster, overrides = {}) => buildContractDecisionQueue({
  roster,
  team: { id: 10, roster },
  league: { phase: 'offseason_resign', players: roster.filter((p) => p && typeof p === 'object'), draftClass: [] },
  ...overrides,
});

describe('buildContractDecisionQueue', () => {
  it('uses the shared presentation retention fields for current-season expiration only', () => {
    const expiring = contractPlayer('expiring');
    const oneYear = contractBuild([expiring]).items;
    expect(oneYear).toHaveLength(1);
    expect(oneYear[0]).toMatchObject({
      id: 'contract:expiring',
      category: 'contract',
      primaryReason: 'Contract expires after this season',
      contract: { yearsRemaining: 1 },
    });
    expect(contractBuild([contractPlayer('multi', { contract: { yearsRemaining: 2 } })]).items).toEqual([]);
    expect(contractBuild([contractPlayer('zero', { contract: { yearsRemaining: 0 } })]).items).toEqual([]);
  });

  it.each([
    ['null years', { contract: { yearsRemaining: null } }],
    ['blank years', { contract: { yearsRemaining: '  ' } }],
    ['missing contract', { contract: null }],
    ['foreign team', { teamId: 11 }],
    ['free agent', { teamId: null, status: 'free_agent' }],
    ['prospect', { status: 'draft_eligible', draftEligible: true }],
    ['retired', { status: 'retired', retired: true }],
  ])('excludes %s safely', (_label, fields) => {
    expect(contractBuild([contractPlayer('excluded', fields)]).items).toEqual([]);
  });

  it.each([
    ['missing decision', undefined],
    ['pending decision', 'pending'],
    ['deferred decision', 'deferred'],
  ])('keeps %s eligible', (_label, extensionDecision) => {
    expect(contractBuild([contractPlayer('unresolved', { extensionDecision })]).items).toHaveLength(1);
  });

  it.each(['extended', 'let_walk', 'tagged'])('excludes resolved %s decisions', (extensionDecision) => {
    const result = contractBuild([contractPlayer('resolved', { extensionDecision })]);
    expect(result.items).toEqual([]);
    expect(result.diagnostics).toContainEqual({ playerId: 'resolved', reason: 'Resolved extension decision' });
  });

  it('requires the supported re-signing phase and resolves primitive references only through league players', () => {
    const player = contractPlayer(1);
    expect(contractBuild([player], { league: { phase: 'regular', players: [player] } }).items).toEqual([]);
    expect(contractBuild([1], { team: { id: 10, roster: [1] }, league: { phase: 'offseason_resign', players: [player] } }).items).toHaveLength(1);
    expect(contractBuild([999], { team: { id: 10, roster: [999] }, league: { phase: 'offseason_resign', players: [player] } }).items).toEqual([]);
  });

  it('uses exact lowercase shared recommendation, market, and replacement fields without player metadata', () => {
    const presentation = vi.fn(() => ({
      identity: { position: 'QB' },
      retention: {
        recommendation: 'cornerstone_priority',
        roleImportance: 'core_starter',
        expectedMarketDifficulty: 'high',
        replacementDifficulty: 'high',
        extensionReadiness: 'open_to_extension_now',
      },
    }));
    const builder = createContractDecisionQueueBuilder({ buildPresentation: presentation });
    const input = { roster: [contractPlayer(1)], team: { id: 10 }, league: { phase: 'offseason_resign', players: [contractPlayer(1)] } };
    const result = builder(input);
    expect(result.items[0]).toMatchObject({ severity: 'critical', contract: { recommendation: 'cornerstone_priority', expectedMarketDifficulty: 'high', replacementDifficulty: 'high' } });
    expect(presentation).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['expiring starter', { recommendation: 'keep_if_price_is_right', roleImportance: 'starter', expectedMarketDifficulty: 'low', replacementDifficulty: 'low' }, 'high'],
    ['high market difficulty', { recommendation: 'keep_if_price_is_right', roleImportance: 'depth', expectedMarketDifficulty: 'high', replacementDifficulty: 'low' }, 'high'],
    ['high replacement difficulty', { recommendation: 'replaceable_depth', roleImportance: 'depth', expectedMarketDifficulty: 'low', replacementDifficulty: 'high' }, 'high'],
    ['lower-priority depth', { recommendation: 'replaceable_depth', roleImportance: 'depth', expectedMarketDifficulty: 'low', replacementDifficulty: 'low' }, 'medium'],
  ])('maps only verified authority to %s severity', (_label, retention, severity) => {
    const builder = createContractDecisionQueueBuilder({ buildPresentation: () => ({ identity: { position: 'QB' }, retention }) });
    expect(builder({ roster: [contractPlayer(1)], team: { id: 10 }, league: { phase: 'offseason_resign', players: [] } }).items[0].severity).toBe(severity);
  });

  it('does not increase severity when authority data is missing', () => {
    const builder = createContractDecisionQueueBuilder({ buildPresentation: () => ({ identity: { position: 'QB' }, retention: null }) });
    expect(builder({ roster: [contractPlayer(1)], team: { id: 10 }, league: { phase: 'offseason_resign', players: [] } }).items).toEqual([]);
  });

  it('does not consume false market scarcity in the live FranchiseHQ league shape', () => {
    const roster = [
      contractPlayer('ordinary', { ovr: 65, depthChart: { rowKey: 'QB', order: 5, role: 'depth' } }),
      contractPlayer('qb-1', { contract: { yearsRemaining: 3 }, ovr: 70 }),
      contractPlayer('qb-2', { contract: { yearsRemaining: 3 }, ovr: 70 }),
      contractPlayer('qb-3', { contract: { yearsRemaining: 3 }, ovr: 70 }),
      contractPlayer('qb-4', { contract: { yearsRemaining: 3 }, ovr: 70 }),
    ];
    const team = { id: 10, roster };
    const liveSpaLeague = { phase: 'offseason_resign', userTeamId: 10, teams: [team] };
    const result = buildContractDecisionQueue({ roster, team, league: liveSpaLeague });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      severity: 'medium',
      contract: {
        recommendation: null,
        expectedMarketDifficulty: null,
        replacementDifficulty: 'low',
        marketContextAvailable: false,
      },
    });
    expect(result.items[0].reasons).not.toContain('High expected market difficulty');
    expect(buildContractDecisionQueue({ roster: [...roster].reverse(), team, league: liveSpaLeague })).toEqual(result);
  });

  it('uses the authoritative market context when a complete league player pool is supplied', () => {
    const target = contractPlayer('target', { ovr: 65, depthChart: { rowKey: 'QB', order: 5, role: 'depth' } });
    const roster = [
      target,
      contractPlayer('qb-1', { contract: { yearsRemaining: 3 }, ovr: 70 }),
      contractPlayer('qb-2', { contract: { yearsRemaining: 3 }, ovr: 70 }),
      contractPlayer('qb-3', { contract: { yearsRemaining: 3 }, ovr: 70 }),
      contractPlayer('qb-4', { contract: { yearsRemaining: 3 }, ovr: 70 }),
    ];
    const freeAgents = Array.from({ length: 8 }, (_, index) => ({
      id: `fa-${index}`, pos: 'QB', teamId: null, status: 'free_agent', ovr: 76,
    }));
    const league = { phase: 'offseason_resign', players: [...roster, ...freeAgents] };
    const presentation = buildPlayerDecisionPresentation({ player: target, team: { id: 10, roster }, league });
    const result = buildContractDecisionQueue({ roster, team: { id: 10, roster }, league });

    expect(result.items[0].contract).toMatchObject({
      recommendation: presentation.retention.recommendation,
      expectedMarketDifficulty: presentation.retention.expectedMarketDifficulty,
      marketContextAvailable: true,
    });
    expect(result.items[0].contract.expectedMarketDifficulty).not.toBeNull();
  });

  it('sorts deterministically and deduplicates canonical IDs before presentation', () => {
    const presentation = vi.fn(({ player: input }) => ({
      identity: { position: input.pos },
      retention: {
        recommendation: input.recommendation,
        roleImportance: input.roleImportance,
        expectedMarketDifficulty: input.market,
        replacementDifficulty: input.replacement,
      },
    }));
    const builder = createContractDecisionQueueBuilder({ buildPresentation: presentation });
    const rows = [
      contractPlayer('20', { recommendation: 'replaceable_depth', roleImportance: 'depth', market: 'low', replacement: 'low' }),
      contractPlayer(3, { recommendation: 'strong_keep', roleImportance: 'starter', market: 'medium', replacement: 'medium' }),
      contractPlayer('11', { recommendation: 'extension_candidate', roleImportance: 'starter', market: 'low', replacement: 'medium' }),
    ];
    const input = { roster: [...rows, { ...rows[0] }], team: { id: 10 }, league: { phase: 'offseason_resign', players: rows } };
    const first = builder(input).items.map((item) => item.subject.playerId);
    const second = builder({ ...input, roster: [...input.roster].reverse() }).items.map((item) => item.subject.playerId);
    expect(first).toEqual([3, '11', '20']);
    expect(second).toEqual(first);
    expect(presentation).toHaveBeenCalledTimes(6);
  });
});

describe('buildGMDecisionQueue', () => {
  it('preserves urgent availability over a same-player lower-severity contract reminder', () => {
    const player = contractPlayer(1, {
      injury: { type: 'Knee', weeksRemaining: 2 },
      depthChart: { rowKey: 'QB', order: 1, role: 'starter' },
      recommendation: 'replaceable_depth', roleImportance: 'depth', market: 'low', replacement: 'low',
    });
    const presentation = ({ player: input }) => ({
      identity: { statusKey: 'active_roster', position: input.pos },
      role: { label: 'Starter' },
      availability: { available: false, detail: 'Knee' },
      replacement: { label: 'Low' },
      retention: {
        recommendation: input.recommendation,
        roleImportance: input.roleImportance,
        expectedMarketDifficulty: input.market,
        replacementDifficulty: input.replacement,
      },
    });
    const builder = createGMDecisionQueueBuilder({ buildPresentation: presentation });
    const result = builder({
      roster: [player],
      team: { id: 10, depthChart: { QB: [1] } },
      league: { phase: 'offseason_resign', players: [player], draftClass: [] },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('availability:1');
    expect(result.diagnostics).toContainEqual({ playerId: 1, reason: 'Contract decision deferred behind availability item' });
  });

  it('permits distinct same-player decisions only when the contract item is strictly more severe', () => {
    const player = contractPlayer(1, {
      injury: { type: 'Knee', weeksRemaining: 2 },
      depthChart: { rowKey: 'QB', order: 2, role: 'backup' },
    });
    const builder = createGMDecisionQueueBuilder({
      buildPresentation: () => ({
        identity: { statusKey: 'active_roster', position: 'QB' },
        role: { label: 'Backup' },
        availability: { available: false, detail: 'Knee' },
        replacement: { label: 'Low' },
        retention: {
          recommendation: 'cornerstone_priority',
          roleImportance: 'core_starter',
          expectedMarketDifficulty: 'high',
          replacementDifficulty: 'high',
        },
      }),
    });
    const result = builder({ roster: [player], team: { id: 10 }, league: { phase: 'offseason_resign', players: [player] } });
    expect(result.items.map((item) => item.id)).toEqual(['contract:1', 'availability:1']);
  });

  it('is pure, deeply deterministic, and shares presentation evaluation across categories', () => {
    const player = contractPlayer(1, { injury: { type: 'Knee', weeksRemaining: 2 } });
    const presentation = vi.fn(() => ({
      identity: { statusKey: 'active_roster', position: 'QB' },
      role: { label: 'Starter' },
      availability: { available: false, detail: 'Knee' },
      replacement: { label: 'High' },
      retention: { recommendation: 'strong_keep', roleImportance: 'starter', expectedMarketDifficulty: 'medium', replacementDifficulty: 'high' },
    }));
    const builder = createGMDecisionQueueBuilder({ buildPresentation: presentation });
    const input = { roster: [player], team: { id: 10, depthChart: { QB: [1] } }, league: { phase: 'offseason_resign', players: [player] } };
    const snapshot = structuredClone(input);
    expect(builder(input)).toEqual(builder(input));
    expect(input).toEqual(snapshot);
    expect(presentation).toHaveBeenCalledTimes(2);
  });

  it('preserves duplicate and availability-overlap behavior when a resolved contract is removed', () => {
    const player = contractPlayer(1, {
      extensionDecision: 'let_walk',
      injury: { type: 'Knee', weeksRemaining: 2 },
      depthChart: { rowKey: 'QB', order: 1, role: 'starter' },
    });
    const builder = createGMDecisionQueueBuilder({
      buildPresentation: () => ({
        identity: { statusKey: 'active_roster', position: 'QB' },
        role: { label: 'Starter' },
        availability: { available: false, detail: 'Knee' },
        replacement: { label: 'Low' },
        retention: {
          recommendation: 'replaceable_depth',
          roleImportance: 'depth',
          expectedMarketDifficulty: 'low',
          replacementDifficulty: 'low',
        },
      }),
    });
    const result = builder({
      roster: [player, { ...player }],
      team: { id: 10, depthChart: { QB: [1] } },
      league: { phase: 'offseason_resign', players: [player] },
    });
    expect(result.items.map((item) => item.id)).toEqual(['availability:1']);
    expect(result.diagnostics).toContainEqual({ playerId: 1, reason: 'Duplicate roster reference' });
    expect(result.diagnostics).toContainEqual({ playerId: 1, reason: 'Resolved extension decision' });
    expect(result.diagnostics).not.toContainEqual({ playerId: 1, reason: 'Contract decision deferred behind availability item' });
  });
});
