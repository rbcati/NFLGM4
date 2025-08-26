// cap.js - Updated to use constants instead of magic numbers
'use strict';

/**
 * Calculates the prorated signing bonus amount per year
 * @param {Object} p - Player object
 * @returns {number} Prorated amount per year
 */
function prorationPerYear(p) { 
  return p.signingBonus / p.yearsTotal; 
}

/**
 * Calculates the cap hit for a player in a given season
 * @param {Object} p - Player object  
 * @param {number} relSeason - Season relative to current (0 = current season)
 * @returns {number} Cap hit in millions, rounded to 1 decimal
 */
function capHitFor(p, relSeason) {
  if (!p || p.years <= 0 || relSeason >= p.years) return 0;
  
  const base = p.baseAnnual;
  const pr = prorationPerYear(p);
  return Math.round((base + pr) * 10) / 10;
}

/**
 * Adds dead money to a team's cap book for a specific season
 * @param {Object} team - Team object
 * @param {number} season - Season to add dead money to
 * @param {number} amount - Amount of dead money to add
 */
function addDead(team, season, amount) {
  if (!team.deadCapBook) team.deadCapBook = {};
  team.deadCapBook[season] = Math.round(((team.deadCapBook[season] || 0) + amount) * 10) / 10;
}

/**
 * Calculates rollover cap space from previous season
 * @param {Object} team - Team object
 * @param {Object} league - League object  
 * @returns {number} Rollover amount (capped at maximum)
 */
function calculateRollover(team, league) {
  if (!team || !league) return 0;
  
  const C = window.Constants;
  const unused = team.capTotal - team.capUsed;
  const maxRollover = C.SALARY_CAP.MAX_ROLLOVER;
  return Math.min(Math.max(0, unused), maxRollover);
}

/**
 * Recalculates and updates a team's salary cap situation
 * @param {Object} league - League object
 * @param {Object} team - Team object to recalculate
 */
function recalcCap(league, team) {
  if (!league || !team || !team.roster) {
    console.error('Invalid parameters for recalcCap');
    return;
  }
  
  const C = window.Constants;
  
  try {
    // Calculate active player cap hits
    const active = team.roster.reduce((sum, p) => {
      return sum + (p ? capHitFor(p, 0) : 0);
    }, 0);
    
    // Get dead money for current season
    const dead = team.deadCapBook[league.season] || 0;
    
    // Calculate total cap with rollover
    const capTotal = C.SALARY_CAP.BASE + (team.capRollover || 0);
    
    // Update team cap values
    team.capTotal = Math.round(capTotal * 10) / 10;
    team.capUsed = Math.round((active + dead) * 10) / 10;
    team.deadCap = Math.round(dead * 10) / 10;
    team.capRoom = Math.round((team.capTotal - team.capUsed) * 10) / 10;
    
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
 */
function releaseWithProration(league, team, p, isPostJune1) {
  if (!canRestructure || !canRestructure(p)) {
    console.warn('Cannot release player:', p.name);
    return;
  }
  
  if (!league || !team || !p) {
    console.error('Invalid parameters for releaseWithProration');
    return;
  }
  
  const C = window.Constants;
  
  try {
    const pr = prorationPerYear(p);
    const yearsLeft = p.years;
    
    if (yearsLeft <= 0) return;

    const currentSeason = league.season;
    const guaranteedAmount = p.baseAnnual * (p.guaranteedPct || C.SALARY_CAP.GUARANTEED_PCT_DEFAULT);
    const remainingProration = pr * yearsLeft;

    // Handle post-June 1st vs regular release
    if (isPostJune1 && yearsLeft > 1) {
      // Spread dead money over two years
      addDead(team, currentSeason, pr + guaranteedAmount);
      addDead(team, currentSeason + 1, remainingProration - pr);
    } else {
      // All dead money hits immediately  
      addDead(team, currentSeason, remainingProration + guaranteedAmount);
    }

    // Remove player from roster
    const idx = team.roster.findIndex(x => x.id === p.id);
    if (idx >= 0) {
      team.roster.splice(idx, 1);
    }
    
    // Clear player's contract
    p.years = 0;
    p.yearsTotal = 0;
    
    // Add to free agent pool if it exists
    if (window.state && window.state.freeAgents) {
      // Reset contract for free agency
      p.baseAnnual = Math.round(p.baseAnnual * C.FREE_AGENCY.CONTRACT_DISCOUNT * 10) / 10;
      p.years = C.FREE_AGENCY.DEFAULT_YEARS;
      p.yearsTotal = C.FREE_AGENCY.DEFAULT_YEARS;
      p.signingBonus = Math.round((p.baseAnnual * p.yearsTotal * 0.3) * 10) / 10;
      
      window.state.freeAgents.push(p);
    }
    
    // Recalculate team cap
    recalcCap(league, team);
    
  } catch (error) {
    console.error('Error in releaseWithProration:', error);
  }
}

/**
 * Validates that a team can afford to sign a player
 * @param {Object} team - Team attempting to sign player
 * @param {Object} player - Player to be signed
 * @returns {Object} Validation result with success flag and message
 */
function validateSigning(team, player) {
  if (!team || !player) {
    return { success: false, message: 'Invalid team or player' };
  }
  
  const C = window.Constants;
  const capHit = capHitFor(player, 0);
  const capAfter = team.capUsed + capHit;
  
  if (capAfter > team.capTotal) {
    const overage = capAfter - team.capTotal;
    return { 
      success: false, 
      message: `Signing would exceed salary cap by $${overage.toFixed(1)}M` 
    };
  }
  
  // Check roster limits
  const positionCount = team.roster.filter(p => p.pos === player.pos).length;
  const maxAtPosition = C.DEPTH_NEEDS[player.pos] || 6; // Default max if not defined
  
  if (positionCount >= maxAtPosition * 1.5) { // Allow some flexibility
    return {
      success: false,
      message: `Too many players at ${player.pos} position`
    };
  }
  
  return { 
    success: true, 
    message: `Can sign ${player.name} for $${capHit.toFixed(1)}M cap hit` 
  };
}

/**
 * Processes salary cap rollover at end of season
 * @param {Object} league - League object
 * @param {Object} team - Team to process rollover for
 */
function processCapRollover(league, team) {
  if (!league || !team) return;
  
  const C = window.Constants;
  const rollover = calculateRollover(team, league);
  
  if (rollover > 0) {
    team.capRollover = rollover;
    
    // Add to league news if significant rollover
    if (rollover >= C.SALARY_CAP.MAX_ROLLOVER * 0.5 && league.news) {
      league.news.push(
        `${team.abbr} rolls over $${rollover.toFixed(1)}M in unused cap space`
      );
    }
  }
}

/**
 * Gets a summary of team's salary cap situation
 * @param {Object} team - Team object
 * @returns {Object} Cap summary with key metrics
 */
function getCapSummary(team) {
  if (!team) return null;
  
  return {
    total: team.capTotal || 0,
    used: team.capUsed || 0,
    room: (team.capTotal || 0) - (team.capUsed || 0),
    dead: team.deadCap || 0,
    rollover: team.capRollover || 0,
    utilization: team.capTotal ? (team.capUsed / team.capTotal) : 0
  };
}

// Make functions available globally
window.prorationPerYear = prorationPerYear;
window.capHitFor = capHitFor;
window.addDead = addDead;
window.calculateRollover = calculateRollover;
window.recalcCap = recalcCap;
window.releaseWithProration = releaseWithProration;
window.validateSigning = validateSigning;
window.processCapRollover = processCapRollover;
window.getCapSummary = getCapSummary;
