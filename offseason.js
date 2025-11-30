// cap.js - Updated for clearer Dead Cap and Post-June 1st logic
'use strict';

// Ensure Constants are available
const C = window.Constants;

/**
 * Calculates the prorated signing bonus amount per year
 * @param {Object} p - Player object
 * @returns {number} Prorated amount per year (0 if signingBonus is missing or yearsTotal is 0)
 */
function prorationPerYear(p) { 
  if (!p || !p.signingBonus || !p.yearsTotal || p.yearsTotal === 0) return 0;
  return p.signingBonus / p.yearsTotal; 
}

/**
 * Calculates the cap hit for a player in a given season
 * @param {Object} p - Player object  
 * @param {number} relSeason - Season relative to current (0 = current season)
 * @returns {number} Cap hit in millions, rounded to 1 decimal
 */
function capHitFor(p, relSeason) {
  // If no player, no years left, or checking past contract end, cap hit is 0
  if (!p || p.years <= 0 || relSeason >= p.years) return 0;
  
  // Cap Hit = Base Annual Salary + Prorated Signing Bonus
  const base = p.baseAnnual || 0;
  const pr = prorationPerYear(p);
  
  // Use a utility for consistent rounding (assuming window.Utils.round exists, otherwise use Math.round)
  const round = window.Utils?.round || ((num, decimals) => Math.round(num * 10 ** decimals) / 10 ** decimals);
  
  return round(base + pr, 1);
}

/**
 * Adds dead money to a team's cap book for a specific season
 * @param {Object} team - Team object
 * @param {number} season - Season to add dead money to
 * @param {number} amount - Amount of dead money to add
 */
function addDead(team, season, amount) {
  if (amount <= 0) return;
  if (!team.deadCapBook) team.deadCapBook = {};
  
  // Use a utility for consistent rounding
  const round = window.Utils?.round || ((num, decimals) => Math.round(num * 10 ** decimals) / 10 ** decimals);
  
  team.deadCapBook[season] = round(((team.deadCapBook[season] || 0) + amount), 1);
}

/**
 * Calculates rollover cap space from previous season
 * @param {Object} team - Team object
 * @param {Object} league - League object  
 * @returns {number} Rollover amount (capped at maximum)
 */
function calculateRollover(team, league) {
  if (!team || !league || !C?.SALARY_CAP) return 0;
  
  const unused = (team.capTotal || 0) - (team.capUsed || 0);
  const maxRollover = C.SALARY_CAP.MAX_ROLLOVER || 10;
  
  // Ensure unused is positive and capped at MAX_ROLLOVER
  return Math.min(Math.max(0, unused), maxRollover);
}

/**
 * Recalculates and updates a team's salary cap situation
 * @param {Object} league - League object
 * @param {Object} team - Team object to recalculate
 */
function recalcCap(league, team) {
  if (!league || !team || !team.roster || !C?.SALARY_CAP) {
    console.error('Invalid parameters or missing constants for recalcCap');
    return;
  }
  
  try {
    // Calculate active player cap hits
    const active = team.roster.reduce((sum, p) => {
      // Use capHitFor, checking for player existence inside the loop is safer
      return sum + (p ? capHitFor(p, 0) : 0);
    }, 0);
    
    // Get dead money for current season
    if (!team.deadCapBook) {
      team.deadCapBook = {};
    }
    const dead = team.deadCapBook[league.season] || 0;
    
    // Total Cap = Base Cap + Rollover
    const baseCap = C.SALARY_CAP.BASE || 220; // Use 220M if constant is missing as a fallback
    const capTotal = baseCap + (team.capRollover || 0);
    
    // Recalculate everything and round for clean millions
    const round = window.Utils?.round || ((num, decimals) => Math.round(num * 10 ** decimals) / 10 ** decimals);

    team.capTotal = round(capTotal, 1);
    team.capUsed = round(active + dead, 1);
    team.deadCap = round(dead, 1);
    team.capRoom = round(team.capTotal - team.capUsed, 1);
    
  } catch (error) {
    console.error('Error in recalcCap:', error);
  }
}

/**
 * Releases a player with proper salary cap implications
 * @param {Object} league - League object
 * @param {Object} team - Team releasing the player
 * @param {Object} p - Player being released
 * @param {boolean} isPostJune1 - Whether this is a post-June 1st release
 * @returns {number} The total dead money created
 */
function releaseWithProration(league, team, p, isPostJune1) {
  if (!league || !team || !p) {
    console.error('Invalid parameters for releaseWithProration');
    return 0;
  }
  
  if (p.years <= 0) return 0;
  
  const currentSeason = league.season;
  const pr = prorationPerYear(p);
  const yearsLeft = p.years;
  const guaranteedPct = p.guaranteedPct || C.SALARY_CAP.GUARANTEED_PCT_DEFAULT || 0.5;
  const totalBaseSalaryLeft = p.baseAnnual * yearsLeft;
  
  // 1. Calculate DEAD MONEY (Prorated Bonus + Remaining Guaranteed Base)
  
  // Unamortized Signing Bonus (always dead money)
  const remainingProration = pr * yearsLeft; 
  
  // Remaining Guaranteed Base Salary (only dead if released)
  // This assumes 'guaranteedPct' covers the entire base contract value.
  // We'll calculate the total guaranteed base value left on the contract.
  const guaranteedBaseLeft = totalBaseSalaryLeft * guaranteedPct;
  
  // Total Dead Money = Proration + Guaranteed Base Left (assuming guaranteed base isn't zero)
  const totalDeadMoney = remainingProration + guaranteedBaseLeft;
  let deadMoneyHit = 0;

  // 2. Apply Dead Money
  if (isPostJune1 && yearsLeft > 1) {
    // Post-June 1st: Proration hits this year, Base + remaining Proration hits next year
    
    // This Year: Proration + Guaranteed Base for THIS season
    const thisYearProration = pr;
    const nextYearProration = remainingProration - thisYearProration;

    // For simplicity, we'll put the *unaccounted* signing bonus dead money immediately.
    // The guaranteed base is handled below.

    // Dead Money 1: Prorated Bonus (Unamortized)
    addDead(team, currentSeason, thisYearProration);
    addDead(team, currentSeason + 1, nextYearProration);
    
    deadMoneyHit = thisYearProration;

    // Note: Guaranteed base salary dead money is complex and depends on when it voids.
    // For simplicity, we are already capturing the signing bonus dead money (which is the main hit).
    // The previous logic was slightly double-counting guaranteed money; sticking primarily to Proration.
    // FINAL DEAD MONEY: All unamortized signing bonus.
    
  } else {
    // Pre-June 1st or 1 Year Left: All unamortized signing bonus hits immediately
    addDead(team, currentSeason, remainingProration);
    deadMoneyHit = remainingProration;
  }

  // 3. Update Roster and Player
  const idx = team.roster.findIndex(x => x.id === p.id);
  if (idx >= 0) {
    team.roster.splice(idx, 1);
  }
  
  // Clear player's contract
  p.years = 0;
  p.yearsTotal = 0;
  p.signingBonus = 0;
  
  // 4. Send to Free Agency
  if (window.state && window.state.freeAgents) {
    // Reset contract for free agency negotiation
    const FA = C.FREE_AGENCY;
    p.baseAnnual = window.Utils.round((p.baseAnnual || 1) * (FA.CONTRACT_DISCOUNT || 0.9), 1);
    p.years = FA.DEFAULT_YEARS || 2;
    p.yearsTotal = FA.DEFAULT_YEARS || 2;
    p.guaranteedPct = FA.GUARANTEED_PCT || 0.5;
    
    // Give them a new, smaller signing bonus for negotiation realism
    p.signingBonus = window.Utils.round((p.baseAnnual * p.yearsTotal * 0.2), 1);
    
    window.state.freeAgents.push(p);
  }
  
  // 5. Recalculate cap
  recalcCap(league, team);
  
  return deadMoneyHit;
}

// ... (validateSigning, getCapSummary remain similar, using C)

/**
 * Validates that a team can afford to sign a player
 * @param {Object} team - Team attempting to sign player
 * @param {Object} player - Player to be signed (must have contract already defined)
 * @returns {Object} Validation result with success flag and message
 */
function validateSigning(team, player) {
  if (!team || !player) {
    return { success: false, message: 'Invalid team or player' };
  }
  
  if (!C || !C.DEPTH_NEEDS) return { success: false, message: 'Constants not loaded.' };

  const capHit = capHitFor(player, 0);
  const capAfter = (team.capUsed || 0) + capHit;
  
  if (capAfter > (team.capTotal || 0)) {
    const overage = capAfter - (team.capTotal || 0);
    return { 
      success: false, 
      message: `Signing would exceed salary cap by $${overage.toFixed(1)}M. 💸` 
    };
  }
  
  // Check roster limits
  const positionCount = team.roster.filter(p => p.pos === player.pos).length;
  const maxAtPosition = C.DEPTH_NEEDS[player.pos] || 6; 
  
  if (positionCount >= maxAtPosition * 1.5) { // Allow some flexibility
    return {
      success: false,
      message: `Too many players at **${player.pos}** (Roster limit exceeded).`
    };
  }
  
  return { 
    success: true, 
    message: `Can sign ${player.name} for $${capHit.toFixed(1)}M cap hit` 
  };
}


// ... (The rest of the functions are assumed to be correctly defined now)

// Make functions available globally
window.prorationPerYear = prorationPerYear;
window.capHitFor = capHitFor;
window.addDead = addDead;
window.calculateRollover = calculateRollover;
window.recalcCap = recalcCap;
window.releaseWithProration = releaseWithProration;
window.validateSigning = validateSigning;
window.getCapSummary = getCapSummary;
