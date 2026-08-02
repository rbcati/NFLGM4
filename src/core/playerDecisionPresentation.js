import { derivePlayerArchetype, getPositionGroup } from './playerEvaluation.js';
import { evaluateReSigningPriority } from './retention/reSigning.js';

const numberOrNull = (value) => {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const titleCase = (value) => String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function playerStatus(player, league) {
  if (player?.retired || player?.isRetired || player?.status === 'retired') return 'Retired';
  const draftClass = Array.isArray(league?.draftClass) ? league.draftClass : [];
  if (player?.isProspect || player?.draftEligible || player?.status === 'draft_eligible'
    || draftClass.some((prospect) => String(prospect?.id ?? prospect?.prospectId) === String(player?.id ?? player?.prospectId))) return 'Draft prospect';
  if (player?.status === 'practice_squad') return 'Practice squad';
  if (player?.status === 'injured_reserve' || player?.onIR) return 'Injured reserve';
  if (player?.teamId == null || player?.teamId === 'FA' || player?.status === 'free_agent') return 'Free agent';
  return titleCase(player?.status === 'active' || !player?.status ? 'active roster' : player.status);
}

function depthRole(player, status) {
  if (status !== 'Active Roster' && status !== 'Injured Reserve') return status;
  const canonical = player?.depthChart?.role;
  if (canonical) return titleCase(canonical);
  const order = numberOrNull(player?.depthChart?.order ?? player?.depthOrder ?? player?.depthRank);
  if (order === 1) return 'Starter';
  if (order === 2) return 'Backup';
  if (order != null && order > 2) return 'Reserve';
  return 'Role unavailable';
}

function availability(player) {
  const weeks = numberOrNull(player?.injuryWeeksRemaining ?? player?.injury?.weeksRemaining ?? player?.injury?.gamesRemaining);
  const injuryName = player?.injury?.name ?? player?.injury?.type ?? null;
  const injured = (weeks != null && weeks > 0) || Boolean(injuryName) || (player?.injury?.status && player.injury.status !== 'Healthy');
  return injured
    ? { label: weeks ? `Unavailable · ${weeks}w` : 'Injured', detail: injuryName ?? player?.injury?.status ?? null, available: false }
    : { label: 'Available', detail: null, available: true };
}

const METRICS = {
  QB: [['Passing yards', 'passYd'], ['Passing TD', 'passTD'], ['Interceptions', 'interceptions']],
  RB: [['Rushing yards', 'rushYd'], ['Yards / carry', '_ypc'], ['Rushing TD', 'rushTD'], ['Receiving yards', 'recYd']],
  RECEIVER: [['Receptions', 'receptions'], ['Receiving yards', 'recYd'], ['Receiving TD', 'recTD'], ['Yards / catch', '_ypr']],
  FRONT7: [['Tackles', 'tackles'], ['Sacks', 'sacks'], ['Tackles for loss', 'tacklesForLoss'], ['Forced fumbles', 'forcedFumbles']],
  SECONDARY: [['Tackles', 'tackles'], ['Interceptions', 'interceptions'], ['Passes defended', 'passesDefended'], ['Forced fumbles', 'forcedFumbles']],
  K: [['Field goals', '_fg'], ['FG percentage', '_fgPct'], ['Long', 'longestFG']],
  P: [['Punts', 'punts'], ['Punt average', '_puntAvg'], ['Long', 'longestPunt']],
};

function metricValue(key, stats) {
  if (key === '_ypc') return Number(stats?.rushAtt) > 0 ? (Number(stats.rushYd ?? 0) / Number(stats.rushAtt)).toFixed(1) : null;
  if (key === '_ypr') return Number(stats?.receptions) > 0 ? (Number(stats.recYd ?? 0) / Number(stats.receptions)).toFixed(1) : null;
  if (key === '_fg') return stats?.fgMade != null && stats?.fgAttempts != null ? `${stats.fgMade}/${stats.fgAttempts}` : null;
  if (key === '_fgPct') return Number(stats?.fgAttempts) > 0 ? `${((Number(stats.fgMade ?? 0) / Number(stats.fgAttempts)) * 100).toFixed(1)}%` : null;
  if (key === '_puntAvg') return Number(stats?.punts) > 0 ? (Number(stats.puntYards ?? 0) / Number(stats.punts)).toFixed(1) : null;
  return stats?.[key] == null ? null : stats[key];
}

function performance(player, stats) {
  if (!stats || !Object.values(stats).some((value) => Number.isFinite(Number(value)) && Number(value) !== 0)) {
    return { label: 'No recorded usage', metrics: [], available: false };
  }
  const pos = String(player?.pos ?? player?.position ?? '').toUpperCase();
  const group = pos === 'K' || pos === 'P' ? pos : getPositionGroup(player);
  const definitions = METRICS[group] ?? [];
  const metrics = definitions.map(([label, key]) => ({ label, value: metricValue(key, stats) })).filter((metric) => metric.value != null);
  return { label: metrics.length ? 'Current season' : 'No position stats recorded', metrics, available: metrics.length > 0 };
}

function development(player) {
  const histories = [player?.ovrHistory, player?.ratingHistory, player?.developmentHistory].find((rows) => Array.isArray(rows) && rows.length >= 2) ?? [];
  const points = histories.map((row) => numberOrNull(typeof row === 'number' ? row : row?.ovr ?? row?.overall)).filter((value) => value != null);
  let delta = null;
  let detail = null;
  if (points.length >= 2) {
    delta = points.at(-1) - points[0];
    detail = `Overall moved from ${points[0]} to ${points.at(-1)} across ${points.length} recorded checkpoints.`;
  } else {
    delta = numberOrNull(player?.progressionDelta);
  }
  if (delta != null && points.length < 2) {
    detail = `${delta >= 0 ? '+' : ''}${delta} OVR in the latest recorded progression cycle.`;
  }
  if (delta == null) return { label: 'Insufficient history', detail: 'No comparable overall checkpoints are recorded.', available: false };
  return { label: delta >= 2 ? 'Rising' : delta <= -2 ? 'Declining' : 'Stable', detail, available: true };
}

function contractSummary(player, priority) {
  const contract = player?.contract;
  if (!contract) return { label: 'No contract data', available: false };
  const yearsRemaining = numberOrNull(contract.yearsRemaining ?? contract.yearsLeft ?? contract.years);
  const salary = numberOrNull(contract.capHit ?? contract.baseAnnual ?? contract.salary ?? contract.annualSalary);
  const guaranteed = numberOrNull(contract.guaranteedMoney ?? contract.guaranteed);
  let label = yearsRemaining != null && yearsRemaining <= 1 ? 'Rental / expiring' : 'Under contract';
  if (priority?.recommendation === 'cornerstone_priority' || priority?.recommendation === 'extension_candidate') label = 'Extension priority';
  else if (priority?.recommendation === 'replaceable_depth' && salary != null) label = 'Review role and cost';
  return { label, yearsRemaining, capHit: salary, guaranteed, available: true, tagged: Boolean(contract.tag || player?.isTagged) };
}

function recommendation(priority, role, status, player, health) {
  if (!priority || !['Active Roster', 'Injured Reserve'].includes(status)) return null;
  if (!health.available) return { action: 'Monitor injury recovery', reasons: [health.detail ?? health.label, `${role} role`].filter(Boolean) };
  const map = {
    cornerstone_priority: 'Build around', strong_keep: 'Explore extension', extension_candidate: 'Explore extension',
    keep_if_price_is_right: role === 'Starter' ? 'Start' : 'Keep in rotation', franchise_tag_candidate: 'Explore extension',
    replaceable_depth: 'Develop', likely_to_walk: 'Let walk', move_on: (() => {
      const yearsRemaining = numberOrNull(player?.contract?.yearsRemaining ?? player?.contract?.years);
      return yearsRemaining != null && yearsRemaining <= 1 ? 'Let walk' : 'Replace';
    })(),
  };
  const reasons = [`${role} role`, `${titleCase(priority.replacementDifficulty)} to replace`];
  if (priority.expiring) reasons.push('Contract expires after this season');
  else if (priority.developmentOutlook === 'ascending') reasons.push('Existing evaluation marks an ascending outlook');
  return { action: map[priority.recommendation] ?? 'Monitor', reasons: [...new Set(reasons)].slice(0, 3), source: 'Re-signing priority' };
}

export function buildPlayerDecisionPresentation({ player, team = null, league = {}, seasonStats = null } = {}) {
  if (!player) return { identity: null, availableData: [], omittedReasons: ['Player record unavailable'] };
  const status = playerStatus(player, league);
  const roleLabel = depthRole(player, status);
  const health = availability(player);
  const leaguePlayers = Array.isArray(league?.players) ? league.players : null;
  const teamRoster = Array.isArray(team?.roster) ? team.roster : null;
  const canEvaluateRetention = Boolean(team && (leaguePlayers || teamRoster) && ['Active Roster', 'Injured Reserve'].includes(status));
  const retentionLeague = leaguePlayers ? league : { ...league, players: teamRoster };
  const priority = canEvaluateRetention ? evaluateReSigningPriority(player, team, retentionLeague) : null;
  const perf = performance(player, seasonStats ?? player?.seasonStats ?? player?.stats ?? null);
  const dev = development(player);
  const contract = contractSummary(player, priority);
  const archetype = player?.archetype ?? (player?.attributesV2 || player?.ratings ? derivePlayerArchetype(player).archetype : null);
  const replacement = priority ? { label: titleCase(priority.replacementDifficulty), source: 'Re-signing priority' } : null;
  const rosterValue = priority ? { label: ({ core_starter: 'Core', starter: 'High', rotation: 'Moderate', depth: 'Depth' })[priority.roleImportance] ?? 'Moderate', source: 'Re-signing role importance' } : null;
  const result = {
    identity: { id: player.id ?? player.prospectId ?? null, name: player.name ?? 'Unknown Player', position: player.pos ?? player.position ?? '—', age: numberOrNull(player.age), team: team?.abbr ?? team?.name ?? null, jerseyNumber: player.jerseyNumber ?? player.number ?? null, overall: numberOrNull(player.ovr ?? player.ratings?.ovr), potential: numberOrNull(player.potential ?? player.pot ?? player.ratings?.potential), experience: numberOrNull(player.experience ?? player.yearsPro), status },
    role: { label: roleLabel, depthOrder: numberOrNull(player?.depthChart?.order ?? player?.depthOrder ?? player?.depthRank), archetype },
    availability: health,
    performance: perf,
    development: dev,
    contract,
    rosterValue,
    replacement,
    recommendation: recommendation(priority, roleLabel, status, player, health),
    context: { morale: player?.morale ?? null, awards: Array.isArray(player?.awards) ? player.awards.length : null },
  };
  result.availableData = Object.entries(result).filter(([, value]) => value != null).map(([key]) => key);
  result.omittedReasons = [!archetype && 'Archetype source unavailable', !replacement && 'Replacement evaluation unavailable', !result.recommendation && 'GM recommendation unavailable outside an evaluated team roster'].filter(Boolean);
  return result;
}
