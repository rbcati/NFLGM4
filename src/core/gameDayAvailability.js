import { canPlayerPlay } from './injury-core.js';
import { isAvailableForGameDay } from './holdouts/holdoutEngine.js';

function isStarter(player) {
  return Number(player?.depthChart?.order ?? player?.depthOrder ?? 0) === 1;
}

/**
 * Derive participation and readiness facts without altering the owned roster.
 * Injury context deliberately uses canPlayerPlay; the broader game-day gate is
 * reserved for the eligible participant pool.
 */
export function deriveGameDayAvailability(roster = [], context = {}) {
  const fullRoster = Array.isArray(roster) ? roster.filter(Boolean) : [];
  const injuredPlayers = fullRoster.filter((player) => !canPlayerPlay(player));
  const injuredStarters = injuredPlayers.filter(isStarter);
  const eligiblePlayers = fullRoster.filter((player) => isAvailableForGameDay(player, context));
  const unavailablePlayers = fullRoster.filter((player) => !isAvailableForGameDay(player, context));
  const unavailableStarters = unavailablePlayers.filter(isStarter);

  return {
    fullRoster,
    eligiblePlayers,
    unavailablePlayers,
    injuredPlayers,
    injuredStarters,
    unavailableStarters,
    majorInjuryStress: injuredPlayers.length >= 3,
    blockingLineupIssue: injuredStarters.length >= 2,
  };
}
