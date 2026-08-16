import { buildPlayerDecisionPresentation } from './playerDecisionPresentation.js';
import { Constants } from './constants.js';
import { getRosterLimitForPhase } from './teamValidation.js';

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 };
const ROLE_RANK = { Starter: 0, Backup: 1, Reserve: 2 };
const REPLACEMENT_RANK = { High: 0, Medium: 1, Low: 2 };
const EXCLUDED_STATUSES = new Set(['free_agent', 'draft_eligible', 'retired']);
const CONTRACT_PHASE = 'offseason_resign';
const RETENTION_RECOMMENDATION_RANK = {
  cornerstone_priority: 0,
  strong_keep: 1,
  extension_candidate: 2,
  franchise_tag_candidate: 3,
  keep_if_price_is_right: 4,
  replaceable_depth: 5,
  likely_to_walk: 6,
  move_on: 7,
};
const RETENTION_ROLE_RANK = { core_starter: 0, starter: 1, rotation: 2, depth: 3 };
const MARKET_RANK = { high: 0, medium: 1, low: 2 };
const RESOLVED_EXTENSION_DECISIONS = new Set(['extended', 'let_walk', 'tagged']);
const ROSTER_COUNTING_STATUSES = new Set(['active', 'injured_reserve']);
const ROSTER_LIMIT_PHASES = new Set([
  'offseason_resign', 'free_agency', 'draft', 'offseason', 'preseason', 'regular', 'playoffs',
]);

const canonicalId = (value) => value == null ? null : String(value);
const playerId = (player) => player?.id ?? player?.prospectId ?? null;
const sameId = (left, right) => left != null && right != null && String(left) === String(right);
const finiteNumber = (value) => {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

function recordedUnavailable(player) {
  const weeks = finiteNumber(player?.injuryWeeksRemaining ?? player?.injury?.weeksRemaining ?? player?.injury?.gamesRemaining);
  const injuryStatus = String(player?.injury?.status ?? '').trim();
  const injuryLabel = player?.injury?.name ?? player?.injury?.type ?? null;
  return (weeks != null && weeks > 0)
    || Boolean(injuryLabel)
    || Boolean(injuryStatus && injuryStatus.toLowerCase() !== 'healthy')
    || player?.onIR === true
    || player?.status === 'injured_reserve';
}

function excludedPlayer(player, league) {
  if (player?.retired || player?.isRetired || EXCLUDED_STATUSES.has(player?.status)) return true;
  if (player?.isProspect || player?.draftEligible) return true;
  return Array.isArray(league?.draftClass) && league.draftClass.some((prospect) =>
    sameId(playerId(prospect), playerId(player)));
}

function statsFor(stats, id) {
  if (!stats || id == null) return null;
  if (stats instanceof Map) return stats.get(id) ?? stats.get(String(id)) ?? null;
  return stats[id] ?? stats[String(id)] ?? null;
}

function depthResult(player, roster, team) {
  const id = playerId(player);
  const rowKey = player?.depthChart?.rowKey ?? null;
  if (!rowKey) return { confirmed: false, healthyBackup: false };

  const assignedIds = team?.depthChart?.[rowKey];
  if (Array.isArray(assignedIds) && assignedIds.some((assignedId) => sameId(assignedId, id))) {
    const laterIds = assignedIds.slice(assignedIds.findIndex((assignedId) => sameId(assignedId, id)) + 1);
    const healthyBackup = laterIds.some((assignedId) => {
      const candidate = roster.find((entry) => sameId(playerId(entry), assignedId));
      return candidate && sameId(candidate.teamId, team?.id) && !excludedPlayer(candidate, null) && !recordedUnavailable(candidate);
    });
    return { confirmed: true, healthyBackup };
  }

  const assigned = roster.filter((candidate) => candidate?.depthChart?.rowKey === rowKey
    && finiteNumber(candidate?.depthChart?.order ?? candidate?.depthOrder ?? candidate?.depthRank) != null);
  if (!assigned.some((candidate) => sameId(playerId(candidate), id))) return { confirmed: false, healthyBackup: false };
  const healthyBackup = assigned.some((candidate) => !sameId(playerId(candidate), id)
      && sameId(candidate.teamId, team?.id)
      && finiteNumber(candidate?.depthChart?.order ?? candidate?.depthOrder ?? candidate?.depthRank) > 1
      && !excludedPlayer(candidate, null)
      && !recordedUnavailable(candidate));
  // Per-player placement can prove a replacement exists, but cannot prove that
  // an otherwise absent row assignment does not exist elsewhere in partial data.
  return { confirmed: healthyBackup, healthyBackup };
}

function compareIds(left, right) {
  const a = canonicalId(left) ?? '';
  const b = canonicalId(right) ?? '';
  const an = finiteNumber(a);
  const bn = finiteNumber(b);
  if (an != null && bn != null && an !== bn) return an - bn;
  return a.localeCompare(b, 'en', { numeric: true });
}

export function createAvailabilityDecisionQueueBuilder({ buildPresentation = buildPlayerDecisionPresentation } = {}) {
  return function buildAvailabilityDecisionQueue({ roster, team, league, seasonStatsByPlayerId = null } = {}) {
    const items = [];
    const diagnostics = [];
    const diagnosticKeys = new Set();
    const addDiagnostic = (id, reason) => {
      const key = `${canonicalId(id) ?? 'unresolved'}:${reason}`;
      if (!diagnosticKeys.has(key)) {
        diagnosticKeys.add(key);
        diagnostics.push({ playerId: id ?? null, reason });
      }
    };

    if (!Array.isArray(roster)) {
      addDiagnostic(null, 'Roster unavailable');
      return { items, diagnostics };
    }
    if (!team || team.id == null) {
      addDiagnostic(null, 'Supplied team unavailable');
      return { items, diagnostics };
    }

    const leaguePlayers = Array.isArray(league?.players) ? league.players : [];
    const leagueById = new Map(leaguePlayers.map((player) => [canonicalId(playerId(player)), player]));
    const resolvedRoster = roster.map((entry) => {
      if (entry && typeof entry === 'object') return entry;
      return leagueById.get(canonicalId(entry)) ?? null;
    }).filter(Boolean);
    const seen = new Set();

    for (const entry of roster) {
      const player = entry && typeof entry === 'object' ? entry : leagueById.get(canonicalId(entry));
      const id = playerId(player) ?? (entry && typeof entry !== 'object' ? entry : null);
      if (!player || playerId(player) == null) {
        addDiagnostic(id, 'Unresolved player ID');
        continue;
      }
      const key = canonicalId(playerId(player));
      if (seen.has(key)) {
        addDiagnostic(playerId(player), 'Duplicate roster reference');
        continue;
      }
      seen.add(key);
      if (!sameId(player.teamId, team.id)) {
        addDiagnostic(playerId(player), 'Player not owned by supplied team');
        continue;
      }
      if (excludedPlayer(player, league)) {
        addDiagnostic(playerId(player), 'Excluded player status');
        continue;
      }
      if (!recordedUnavailable(player)) {
        addDiagnostic(playerId(player), 'Healthy player');
        continue;
      }

      const presentation = buildPresentation({
        player,
        team,
        league: league ?? {},
        seasonStats: statsFor(seasonStatsByPlayerId, playerId(player)),
      });
      const presentationUnavailable = presentation?.availability?.available === false;
      const recordedIr = presentation?.identity?.statusKey === 'injured_reserve';
      if (!presentationUnavailable && !recordedIr) {
        addDiagnostic(playerId(player), 'Missing actionable injury context');
        continue;
      }

      const role = presentation?.role?.label;
      const starter = role === 'Starter';
      const supportedRole = starter || role === 'Backup' || role === 'Reserve';
      const replacement = presentation?.replacement?.label ?? null;
      const depth = starter ? depthResult(player, resolvedRoster, team) : { confirmed: false, healthyBackup: false };
      let severity = starter && depth.confirmed && !depth.healthyBackup
        ? 'critical'
        : (starter || replacement === 'High' ? 'high' : supportedRole ? 'medium' : null);
      if (!severity) {
        addDiagnostic(playerId(player), 'Insufficient role/context for medium severity');
        continue;
      }
      if (starter && !depth.confirmed) addDiagnostic(playerId(player), 'Unsupported depth data for critical classification');

      const duration = finiteNumber(player?.injuryWeeksRemaining ?? player?.injury?.weeksRemaining ?? player?.injury?.gamesRemaining);
      const reasons = [];
      if (starter) reasons.push('Recorded starter role');
      else if (supportedRole) reasons.push(`Recorded ${role.toLowerCase()} role`);
      if (player?.status === 'injured_reserve' || player?.onIR === true) reasons.push('Injured-reserve status');
      else if (duration != null) reasons.push(`Recorded absence: ${duration} week${duration === 1 ? '' : 's'}`);
      else if (presentation?.availability?.detail) reasons.push(String(presentation.availability.detail));
      if (severity === 'critical') reasons.push('No healthy assigned backup');
      else if (starter && depth.confirmed && depth.healthyBackup) reasons.push('Healthy assigned backup exists');
      else if (replacement) reasons.push(`${replacement} replacement difficulty`);

      const position = presentation?.identity?.position ?? player?.pos ?? player?.position ?? '—';
      const stableSortKey = [SEVERITY_RANK[severity], ROLE_RANK[role] ?? 3,
        REPLACEMENT_RANK[replacement] ?? 3, canonicalId(playerId(player))].join(':');
      items.push({
        id: `availability:${canonicalId(playerId(player))}`,
        category: 'availability',
        severity,
        subject: { type: 'player', playerId: playerId(player), position },
        title: starter ? `Starting ${position} unavailable` : `${position} depth requires review`,
        reasons: [...new Set(reasons)].slice(0, 3),
        primaryReason: player?.status === 'injured_reserve' || player?.onIR === true
          ? 'Injured-reserve status'
          : duration != null
            ? `Recorded absence: ${duration} week${duration === 1 ? '' : 's'}`
            : presentation?.availability?.detail ?? reasons[0] ?? null,
        destination: { view: starter ? 'Depth Chart' : 'Injuries', playerId: playerId(player) },
        stableSortKey,
        availableData: {
          role: supportedRole,
          replacementDifficulty: replacement != null,
          injuryDuration: duration != null,
          depthChart: depth.confirmed,
        },
      });
    }

    items.sort((a, b) => a.stableSortKey.localeCompare(b.stableSortKey, 'en', { numeric: true })
      || compareIds(a.subject.playerId, b.subject.playerId));
    diagnostics.sort((a, b) => compareIds(a.playerId, b.playerId) || a.reason.localeCompare(b.reason));
    return { items, diagnostics };
  };
}

export const buildAvailabilityDecisionQueue = createAvailabilityDecisionQueueBuilder();

function contractYearsRemaining(player) {
  return finiteNumber(player?.contract?.yearsRemaining ?? player?.contract?.yearsLeft ?? player?.contract?.years);
}

function isContractCandidateStatus(player, league) {
  if (excludedPlayer(player, league)) return false;
  return ['active', 'injured_reserve'].includes(player?.status ?? 'active') || player?.onIR === true;
}

function contractRetentionForQueue(retention, hasAuthoritativeMarketPool) {
  if (!retention) return null;
  if (hasAuthoritativeMarketPool) return retention;
  // The SPA view state contains team rosters but not the complete league player
  // pool. evaluateReSigningPriority() needs that pool for free-agent scarcity,
  // so never let a roster-only fallback affect contract queue severity or rank.
  return {
    ...retention,
    recommendation: null,
    expectedMarketDifficulty: null,
  };
}

function hasUsableContractContext(retention) {
  return Object.hasOwn(RETENTION_ROLE_RANK, retention?.roleImportance)
    || Object.hasOwn(MARKET_RANK, retention?.replacementDifficulty)
    || Object.hasOwn(RETENTION_RECOMMENDATION_RANK, retention?.recommendation);
}

function contractSeverity(retention) {
  const recommendation = retention?.recommendation;
  const role = retention?.roleImportance;
  const market = retention?.expectedMarketDifficulty;
  const replacement = retention?.replacementDifficulty;
  if (recommendation === 'cornerstone_priority' && role === 'core_starter'
    && market === 'high' && replacement === 'high') return 'critical';
  if (role === 'core_starter' || role === 'starter' || market === 'high'
    || replacement === 'high'
    || ['cornerstone_priority', 'strong_keep', 'extension_candidate'].includes(recommendation)) return 'high';
  return 'medium';
}

function contractTitle(position, recommendation) {
  if (recommendation === 'franchise_tag_candidate') return `Expiring ${position} tag or extension decision`;
  return `Expiring ${position} contract`;
}

function contractReasons(retention) {
  const reasons = ['Contract expires after this season'];
  if (retention?.expectedMarketDifficulty === 'high') reasons.push('High expected market difficulty');
  if (retention?.replacementDifficulty === 'high') reasons.push('High replacement difficulty');
  if (retention?.recommendation) reasons.push(`Retention recommendation: ${retention.recommendation.replaceAll('_', ' ')}`);
  if (retention?.roleImportance) reasons.push(`Recorded ${retention.roleImportance.replaceAll('_', ' ')} role`);
  return [...new Set(reasons)].slice(0, 3);
}

export function createContractDecisionQueueBuilder({ buildPresentation = buildPlayerDecisionPresentation } = {}) {
  return function buildContractDecisionQueue({ roster, team, league } = {}) {
    const items = [];
    const diagnostics = [];
    const diagnosticKeys = new Set();
    const addDiagnostic = (id, reason) => {
      const key = `${canonicalId(id) ?? 'unresolved'}:${reason}`;
      if (!diagnosticKeys.has(key)) {
        diagnosticKeys.add(key);
        diagnostics.push({ playerId: id ?? null, reason });
      }
    };

    if (!Array.isArray(roster)) {
      addDiagnostic(null, 'Roster unavailable');
      return { items, diagnostics };
    }
    if (!team || team.id == null) {
      addDiagnostic(null, 'Supplied team unavailable');
      return { items, diagnostics };
    }
    if (league?.phase !== CONTRACT_PHASE) {
      addDiagnostic(null, 'Contract review unavailable outside re-signing phase');
      return { items, diagnostics };
    }

    const leaguePlayers = Array.isArray(league?.players) ? league.players : [];
    const hasAuthoritativeMarketPool = Array.isArray(league?.players);
    const leagueById = new Map(leaguePlayers.map((player) => [canonicalId(playerId(player)), player]));
    const seen = new Set();

    for (const entry of roster) {
      const player = entry && typeof entry === 'object' ? entry : leagueById.get(canonicalId(entry));
      const id = playerId(player) ?? (entry && typeof entry !== 'object' ? entry : null);
      if (!player || playerId(player) == null) {
        addDiagnostic(id, 'Unresolved player ID');
        continue;
      }
      const key = canonicalId(playerId(player));
      if (seen.has(key)) {
        addDiagnostic(playerId(player), 'Duplicate roster reference');
        continue;
      }
      seen.add(key);
      if (!sameId(player.teamId, team.id)) {
        addDiagnostic(playerId(player), 'Player not owned by supplied team');
        continue;
      }
      if (!isContractCandidateStatus(player, league)) {
        addDiagnostic(playerId(player), 'Excluded player status');
        continue;
      }
      if (RESOLVED_EXTENSION_DECISIONS.has(String(player?.extensionDecision ?? ''))) {
        addDiagnostic(playerId(player), 'Resolved extension decision');
        continue;
      }
      if (!player.contract) {
        addDiagnostic(playerId(player), 'Contract unavailable');
        continue;
      }
      const yearsRemaining = contractYearsRemaining(player);
      if (yearsRemaining == null) {
        addDiagnostic(playerId(player), 'Contract term unavailable');
        continue;
      }
      if (yearsRemaining !== 1) {
        addDiagnostic(playerId(player), yearsRemaining > 1 ? 'Multi-year contract' : 'Contract is not expiring after this season');
        continue;
      }

      const presentation = buildPresentation({ player, team, league: league ?? {} });
      const retention = contractRetentionForQueue(presentation?.retention, hasAuthoritativeMarketPool);
      if (!hasUsableContractContext(retention)) {
        addDiagnostic(playerId(player), 'Retention context unavailable');
        continue;
      }

      const position = presentation?.identity?.position ?? player?.pos ?? player?.position ?? '—';
      const severity = contractSeverity(retention);
      const reasons = contractReasons(retention);
      const stableSortKey = [
        SEVERITY_RANK[severity],
        RETENTION_RECOMMENDATION_RANK[retention.recommendation],
        RETENTION_ROLE_RANK[retention.roleImportance] ?? 4,
        MARKET_RANK[retention.expectedMarketDifficulty] ?? 3,
        MARKET_RANK[retention.replacementDifficulty] ?? 3,
        yearsRemaining,
        canonicalId(playerId(player)),
      ].join(':');
      items.push({
        id: `contract:${canonicalId(playerId(player))}`,
        category: 'contract',
        severity,
        subject: { type: 'player', playerId: playerId(player), position },
        title: contractTitle(position, retention.recommendation),
        reasons,
        primaryReason: reasons[0] ?? null,
        destination: { view: 'Contract Center', playerId: playerId(player) },
        stableSortKey,
        contract: {
          yearsRemaining,
          recommendation: retention.recommendation,
          roleImportance: retention.roleImportance,
          expectedMarketDifficulty: retention.expectedMarketDifficulty,
          replacementDifficulty: retention.replacementDifficulty,
          extensionReadiness: retention.extensionReadiness,
          marketContextAvailable: hasAuthoritativeMarketPool,
        },
      });
    }

    items.sort((a, b) => a.stableSortKey.localeCompare(b.stableSortKey, 'en', { numeric: true })
      || compareIds(a.subject.playerId, b.subject.playerId));
    diagnostics.sort((a, b) => compareIds(a.playerId, b.playerId) || a.reason.localeCompare(b.reason));
    return { items, diagnostics };
  };
}

export const buildContractDecisionQueue = createContractDecisionQueueBuilder();

function rosterLimitForDecision(league) {
  const phase = league?.phase;
  if (!ROSTER_LIMIT_PHASES.has(phase)) return null;
  // Starting the season has a distinct, authoritative 53-player gate in the
  // advance handler even though preseason transactions retain the 90-player
  // offseason limit.
  return phase === 'preseason'
    ? Constants.ROSTER_LIMITS.REGULAR_SEASON
    : getRosterLimitForPhase(phase);
}

function resolveRoster(roster, league, team, diagnostics) {
  const leaguePlayers = Array.isArray(league?.players) ? league.players : [];
  const byId = new Map(leaguePlayers.map((entry) => [canonicalId(playerId(entry)), entry]));
  const seen = new Set();
  const players = [];
  for (const entry of roster) {
    const resolved = entry && typeof entry === 'object' ? entry : byId.get(canonicalId(entry));
    const id = playerId(resolved) ?? (typeof entry !== 'object' ? entry : null);
    if (!resolved || playerId(resolved) == null) {
      diagnostics.push({ playerId: id ?? null, reason: 'Unresolved player ID' });
      continue;
    }
    const key = canonicalId(playerId(resolved));
    if (seen.has(key)) {
      diagnostics.push({ playerId: playerId(resolved), reason: 'Duplicate roster reference' });
      continue;
    }
    seen.add(key);
    if (!sameId(resolved.teamId, team.id)) {
      diagnostics.push({ playerId: playerId(resolved), reason: 'Player not owned by supplied team' });
      continue;
    }
    if (!resolved.status && resolved.onIR !== true) {
      diagnostics.push({ playerId: playerId(resolved), reason: 'Roster-counting status unavailable' });
      continue;
    }
    const status = resolved.onIR === true ? 'injured_reserve' : resolved.status;
    if (!ROSTER_COUNTING_STATUSES.has(status)) {
      diagnostics.push({ playerId: playerId(resolved), reason: 'Status does not count toward constrained roster' });
      continue;
    }
    players.push(resolved);
  }
  return players;
}

export function buildRosterLimitContext({ roster, team, league } = {}) {
  const diagnostics = [];
  const limit = rosterLimitForDecision(league);
  if (!Array.isArray(roster)) diagnostics.push({ playerId: null, reason: 'Roster unavailable' });
  if (!team || team.id == null) diagnostics.push({ playerId: null, reason: 'Supplied team unavailable' });
  if (limit == null || !Number.isFinite(limit)) diagnostics.push({ playerId: null, reason: 'Roster limit authority unavailable' });
  if (diagnostics.length || !Array.isArray(roster) || !team || team.id == null || limit == null) {
    return { currentCount: null, limit: limit ?? null, requiredMoves: 0, overLimit: false, availableData: false, diagnostics };
  }
  const players = resolveRoster(roster, league, team, diagnostics);
  const currentCount = players.length;
  const requiredMoves = Math.max(0, currentCount - limit);
  diagnostics.sort((a, b) => compareIds(a.playerId, b.playerId) || a.reason.localeCompare(b.reason));
  return { currentCount, limit, requiredMoves, overLimit: requiredMoves > 0, availableData: true, diagnostics };
}

export function createRosterCutdownDecisionQueueBuilder({ buildPresentation = buildPlayerDecisionPresentation } = {}) {
  return function buildRosterCutdownDecisionQueue(input = {}) {
    const context = buildRosterLimitContext(input);
    if (!context.overLimit) return { items: [], diagnostics: context.diagnostics };
    const candidateDiagnostics = [];
    const players = resolveRoster(input.roster, input.league, input.team, candidateDiagnostics);
    const positionCounts = new Map();
    const presented = players.map((player) => {
      const presentation = buildPresentation({ player, team: input.team, league: input.league ?? {} });
      const position = presentation?.identity?.position ?? player?.pos ?? player?.position ?? '—';
      positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
      return { player, presentation, position };
    });
    const candidates = presented.map(({ player, presentation, position }) => {
      const role = presentation?.role?.label ?? null;
      const replacementDifficulty = presentation?.replacement?.label ?? null;
      const reasons = [];
      if (['Starter', 'Backup', 'Reserve'].includes(role)) reasons.push(`${role} role`);
      reasons.push(`${positionCounts.get(position)} ${position}s currently rostered`);
      if (replacementDifficulty) reasons.push(`${replacementDifficulty} replacement difficulty`);
      return {
        playerId: playerId(player), position, reasons,
        availableData: { role: role != null, replacementDifficulty: replacementDifficulty != null },
        role: role ?? null, replacementDifficulty,
      };
    }).sort((a, b) => String(a.position).localeCompare(String(b.position)) || compareIds(a.playerId, b.playerId));
    const critical = input.league?.phase === 'preseason';
    const teamId = input.team.id;
    return {
      items: [{
        id: `roster_cutdown:${canonicalId(teamId)}`, category: 'roster_cutdown', severity: critical ? 'critical' : 'high',
        subject: { type: 'team', teamId }, title: 'Roster cutdown required',
        primaryReason: `${context.requiredMoves} roster move${context.requiredMoves === 1 ? '' : 's'} required`,
        reasons: [`${context.currentCount} / ${context.limit} players`], destination: { view: 'Roster / Depth' },
        stableSortKey: `${critical ? 0 : 1}:roster_cutdown:${canonicalId(teamId)}`,
        rosterConstraint: { currentCount: context.currentCount, limit: context.limit, requiredMoves: context.requiredMoves, candidates },
        availableData: context.availableData,
      }],
      diagnostics: context.diagnostics,
    };
  };
}

export const buildRosterCutdownDecisionQueue = createRosterCutdownDecisionQueueBuilder();

function compareCombinedItems(left, right) {
  const severity = (SEVERITY_RANK[left.severity] ?? 3) - (SEVERITY_RANK[right.severity] ?? 3);
  if (severity) return severity;
  const categoryRank = { availability: 0, roster_cutdown: 1, contract: 2 };
  const category = (categoryRank[left.category] ?? 3) - (categoryRank[right.category] ?? 3);
  if (category) return category;
  return String(left.stableSortKey ?? '').localeCompare(String(right.stableSortKey ?? ''), 'en', { numeric: true })
    || compareIds(left.subject?.playerId, right.subject?.playerId);
}

export function createGMDecisionQueueBuilder({ buildPresentation = buildPlayerDecisionPresentation } = {}) {
  return function buildGMDecisionQueue(input = {}) {
    const cachedPresentation = new Map();
    const presentOnce = (context) => {
      const key = canonicalId(playerId(context?.player));
      if (!cachedPresentation.has(key)) cachedPresentation.set(key, buildPresentation(context));
      return cachedPresentation.get(key);
    };
    const availability = createAvailabilityDecisionQueueBuilder({ buildPresentation: presentOnce })(input);
    const contracts = createContractDecisionQueueBuilder({ buildPresentation: presentOnce })(input);
    const rosterCutdown = createRosterCutdownDecisionQueueBuilder({ buildPresentation: presentOnce })(input);
    const diagnostics = [...availability.diagnostics, ...contracts.diagnostics, ...rosterCutdown.diagnostics];
    const diagnosticKeys = new Set(diagnostics.map((entry) => `${canonicalId(entry.playerId) ?? 'unresolved'}:${entry.reason}`));
    const addDiagnostic = (id, reason) => {
      const key = `${canonicalId(id) ?? 'unresolved'}:${reason}`;
      if (!diagnosticKeys.has(key)) {
        diagnosticKeys.add(key);
        diagnostics.push({ playerId: id ?? null, reason });
      }
    };
    const exactIds = new Set();
    const candidates = [...availability.items, ...contracts.items, ...rosterCutdown.items].filter((item) => {
      if (exactIds.has(item.id)) {
        addDiagnostic(item.subject?.playerId, 'Duplicate decision item ID');
        return false;
      }
      exactIds.add(item.id);
      return true;
    });
    const byPlayer = new Map();
    candidates.forEach((item) => {
      if (item.subject?.type !== 'player') return;
      const key = canonicalId(item.subject?.playerId);
      const bucket = byPlayer.get(key) ?? [];
      bucket.push(item);
      byPlayer.set(key, bucket);
    });
    const items = candidates.filter((item) => item.subject?.type !== 'player');
    for (const [id, bucket] of byPlayer) {
      const availabilityItem = bucket.find((item) => item.category === 'availability');
      const contractItem = bucket.find((item) => item.category === 'contract');
      if (availabilityItem && contractItem
        && (SEVERITY_RANK[availabilityItem.severity] ?? 3) <= (SEVERITY_RANK[contractItem.severity] ?? 3)) {
        items.push(availabilityItem);
        addDiagnostic(contractItem.subject?.playerId ?? id, 'Contract decision deferred behind availability item');
      } else {
        items.push(...bucket);
      }
    }
    items.sort(compareCombinedItems);
    diagnostics.sort((a, b) => compareIds(a.playerId, b.playerId) || a.reason.localeCompare(b.reason));
    return { items, diagnostics };
  };
}

export const buildGMDecisionQueue = createGMDecisionQueueBuilder();
