import { buildPlayerDecisionPresentation } from './playerDecisionPresentation.js';

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 };
const ROLE_RANK = { Starter: 0, Backup: 1, Reserve: 2 };
const REPLACEMENT_RANK = { High: 0, Medium: 1, Low: 2 };
const CONTRACT_ROLE_RANK = { core_starter: 0, starter: 0, rotation: 1, depth: 2 };
const RISK_RANK = { high: 0, medium: 1, low: 2 };
const RECOMMENDATION_RANK = {
  cornerstone_priority: 0, strong_keep: 1, franchise_tag_candidate: 2, extension_candidate: 3,
  keep_if_price_is_right: 4, replaceable_depth: 5, likely_to_walk: 6, move_on: 7,
};
const EXCLUDED_STATUSES = new Set(['free_agent', 'draft_eligible', 'retired']);

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
        primaryReason: severity === 'critical'
          ? 'No healthy assigned backup'
          : replacement === 'High'
            ? 'High replacement difficulty'
            : duration != null
              ? `Recorded absence: ${duration} week${duration === 1 ? '' : 's'}`
              : (presentation?.availability?.detail ?? (starter ? 'Recorded starter role' : `Recorded ${role.toLowerCase()} role`)),
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

const contractYears = (player) => finiteNumber(
  player?.contract?.yearsRemaining ?? player?.contract?.yearsLeft ?? player?.contract?.years,
);
const contractSignal = (player) => player?.extensionEligible === true
  || player?.contract?.extensionEligible === true
  || player?.isTagged === true
  || player?.contract?.tag === true
  || player?.extensionDecision != null
  || player?.reSignRecommendation != null;
const CONTRACT_PHASES = new Set([
  'preseason', 'regular', 'regular_season', 'playoffs', 'offseason', 'offseason_resign',
  'free_agency', 'draft', 'training_camp', 'afterRegularSeason', 'afterSeasonRollover',
]);
const titleForRecommendation = (recommendation, position, expiring) => {
  if (recommendation === 'franchise_tag_candidate') return `Tag or extension review required for ${position}`;
  if (recommendation === 'likely_to_walk' || recommendation === 'move_on' || recommendation === 'replaceable_depth') {
    return `Let-walk decision needed for ${position}`;
  }
  if (recommendation === 'cornerstone_priority' || recommendation === 'strong_keep' || recommendation === 'extension_candidate') {
    return `Extension decision due for ${position}`;
  }
  return expiring ? `${position} enters contract decision window` : `Contract review due for ${position}`;
};

export function createContractDecisionQueueBuilder({ buildPresentation = buildPlayerDecisionPresentation } = {}) {
  return function buildContractDecisionQueue({ roster, team, league, seasonStatsByPlayerId = null } = {}) {
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
    if (league?.phase != null && !CONTRACT_PHASES.has(String(league.phase))) {
      addDiagnostic(null, 'Unsupported contract phase');
      return { items, diagnostics };
    }

    const leaguePlayers = Array.isArray(league?.players) ? league.players : [];
    const leagueById = new Map(leaguePlayers.map((entry) => [canonicalId(playerId(entry)), entry]));
    const seen = new Set();
    for (const entry of roster) {
      const player = entry && typeof entry === 'object' ? entry : leagueById.get(canonicalId(entry));
      const id = playerId(player) ?? (entry && typeof entry !== 'object' ? entry : null);
      if (!player || playerId(player) == null) { addDiagnostic(id, 'Unresolved player ID'); continue; }
      const key = canonicalId(playerId(player));
      if (seen.has(key)) { addDiagnostic(playerId(player), 'Duplicate roster reference'); continue; }
      seen.add(key);
      if (!sameId(player.teamId, team.id)) { addDiagnostic(playerId(player), 'Player not owned by supplied team'); continue; }
      if (excludedPlayer(player, league)) { addDiagnostic(playerId(player), 'Excluded player status'); continue; }
      if (!player.contract) { addDiagnostic(playerId(player), 'No contract data'); continue; }
      const years = contractYears(player);
      const signal = contractSignal(player);
      if (years == null && !signal) { addDiagnostic(playerId(player), 'Missing contract term'); continue; }
      if ((years == null || years > 1) && !signal) { addDiagnostic(playerId(player), 'No current contract decision'); continue; }

      const presentation = buildPresentation({ player, team, league: league ?? {}, seasonStats: statsFor(seasonStatsByPlayerId, playerId(player)) });
      const contract = presentation?.contract;
      const recommendation = contract?.recommendation ?? null;
      const role = contract?.roleImportance ?? null;
      const replacement = contract?.replacementDifficulty ?? null;
      const risk = contract?.negotiationRisk ?? null;
      const expiring = years != null && years <= 1;
      const strongRecommendation = ['cornerstone_priority', 'strong_keep', 'extension_candidate', 'franchise_tag_candidate'].includes(recommendation);
      let severity = recommendation === 'cornerstone_priority' && expiring
        ? 'critical'
        : (['core_starter', 'starter'].includes(role) && expiring) || replacement === 'high' || risk === 'high' || strongRecommendation
          ? 'high'
          : (expiring || recommendation ? 'medium' : null);
      if (!severity) { addDiagnostic(playerId(player), 'Insufficient recommendation context'); continue; }

      const position = presentation?.identity?.position ?? player?.pos ?? player?.position ?? '—';
      const recommendationReason = recommendation ? `${recommendation.replaceAll('_', ' ')} recommendation` : null;
      const reasons = [...new Set([
        expiring ? 'Contract expires after this season' : years === 1 ? 'One year remaining' : null,
        risk === 'high' ? 'High negotiation risk' : null,
        replacement === 'high' ? 'High replacement difficulty' : null,
        recommendationReason,
        role ? `Recorded ${role.replaceAll('_', ' ')} role` : null,
      ].filter(Boolean))].slice(0, 3);
      const primaryReason = expiring ? 'Contract expires after this season'
        : risk === 'high' ? 'High negotiation risk'
          : replacement === 'high' ? 'High replacement difficulty'
            : recommendationReason ?? (role ? `Recorded ${role.replaceAll('_', ' ')} role` : null);
      if (!primaryReason) { addDiagnostic(playerId(player), 'Insufficient recommendation context'); continue; }
      const urgencyRank = expiring ? 0 : years === 1 ? 1 : 2;
      const stableSortKey = [SEVERITY_RANK[severity], RECOMMENDATION_RANK[recommendation] ?? 8,
        CONTRACT_ROLE_RANK[role] ?? 3, RISK_RANK[risk] ?? 3, RISK_RANK[replacement] ?? 3,
        urgencyRank, canonicalId(playerId(player))].join(':');
      items.push({
        id: `contract:${canonicalId(playerId(player))}`,
        category: 'contract', severity,
        subject: { type: 'player', playerId: playerId(player), position },
        title: titleForRecommendation(recommendation, position, expiring), reasons, primaryReason,
        destination: { view: 'Contract Center', playerId: playerId(player) }, stableSortKey,
        availableData: { contractTerm: years != null, recommendation: recommendation != null,
          negotiationRisk: risk != null, replacementDifficulty: replacement != null, role: role != null },
      });
    }
    items.sort((a, b) => a.stableSortKey.localeCompare(b.stableSortKey, 'en', { numeric: true }) || compareIds(a.subject.playerId, b.subject.playerId));
    diagnostics.sort((a, b) => compareIds(a.playerId, b.playerId) || a.reason.localeCompare(b.reason));
    return { items, diagnostics };
  };
}

export const buildContractDecisionQueue = createContractDecisionQueueBuilder();

export function buildGMDecisionQueue(args = {}) {
  const availability = buildAvailabilityDecisionQueue(args);
  const contracts = buildContractDecisionQueue(args);
  const itemById = new Map();
  for (const item of [...availability.items, ...contracts.items]) itemById.set(item.id, item);
  const items = [...itemById.values()].sort((a, b) => {
    const severity = (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3);
    if (severity) return severity;
    if (a.subject?.playerId != null && sameId(a.subject.playerId, b.subject?.playerId) && a.category !== b.category) {
      return a.category === 'availability' ? -1 : 1;
    }
    return a.stableSortKey.localeCompare(b.stableSortKey, 'en', { numeric: true }) || a.category.localeCompare(b.category);
  });
  const diagnostics = [...availability.diagnostics, ...contracts.diagnostics]
    .filter((row, index, rows) => rows.findIndex((candidate) => sameId(candidate.playerId, row.playerId) && candidate.reason === row.reason) === index)
    .sort((a, b) => compareIds(a.playerId, b.playerId) || a.reason.localeCompare(b.reason));
  return { items, diagnostics };
}
