// missing-functions.js - All Missing Function Implementations
'use strict';

// === SALARY CAP FUNCTIONS ===

/**
 * Checks if a player can be restructured
 * @param {Object} player - The player object
 * @returns {boolean} Whether the player can be restructured
 */
function canRestructure(player) {
  if (!player) return false;
  
  const C = window.Constants;
  
  // Can't restructure if:
  // - Player has no years left on contract
  // - Player has less than 2 years remaining
  // - Player's guaranteed percentage is already very high
  // - Player is injured for extended period
  
  return player.years >= 2 && 
         (player.guaranteedPct || 0) < 0.8 && 
         (player.injuryWeeks || 0) <= C.TRAINING.MAX_RATING_IMPROVEMENT &&
         player.baseAnnual > 1.0; // Must be making decent money to restructure
}

/**
 * Restructures a player's contract to create immediate cap space
 * @param {Object} league - The league object
 * @param {Object} team - The team object  
 * @param {Object} player - The player to restructure
 * @param {number} amount - Amount to convert to signing bonus (millions)
 */
function restructureContract(league, team, player, amount = null) {
  if (!canRestructure(player)) {
    throw new Error('Player cannot be restructured');
  }
  
  const C = window.Constants;
  
  // Default to restructuring half of remaining base salary
  const maxAmount = player.baseAnnual * 0.5;
  const restructureAmount = amount || maxAmount;
  
  // Convert base salary to prorated signing bonus
  player.baseAnnual = Math.max(0.5, player.baseAnnual - restructureAmount);
  player.signingBonus += restructureAmount;
  player.yearsTotal = Math.max(player.yearsTotal, player.years); // Ensure consistency
  player.guaranteedPct = Math.min(0.9, (player.guaranteedPct || 0.5) + 0.1);
  
  // Recalculate cap impact
  if (window.recalcCap) {
    window.recalcCap(league, team);
  }
  
  return {
    player: player.name,
    amountRestructured: restructureAmount,
    newCapHit: window.capHitFor ? window.capHitFor(player, 0) : 0
  };
}

// === PLAYER GENERATION FUNCTIONS ===

/**
 * Generates a complete player with all ratings and attributes
 * @param {string} pos - Position (QB, RB, etc.)
 * @param {Object} overrides - Optional overrides for specific attributes
 * @returns {Object} Complete player object
 */
function makePlayer(pos, overrides = {}) {
  const U = window.Utils;
  const C = window.Constants;
  
  if (!U || !C) {
    throw new Error('Utils and Constants must be loaded');
  }

  // Generate detailed ratings based on position
  const ratings = generatePlayerRatings(pos);
  
  // Calculate overall rating
  const ovr = calculateOvr(pos, ratings);
  
  // Generate contract details
  const contractDetails = generateContract(ovr, pos);
  
  const player = {
    id: U.id(),
    name: generatePlayerName(),
    pos: pos,
    age: overrides.age || U.rand(C.PLAYER_CONFIG.MIN_AGE, C.PLAYER_CONFIG.MAX_AGE),
    ratings: ratings,
    ovr: ovr,
    years: contractDetails.years,
    yearsTotal: contractDetails.years,
    baseAnnual: contractDetails.baseAnnual,
    signingBonus: contractDetails.signingBonus,
    guaranteedPct: contractDetails.guaranteedPct,
    injuryWeeks: 0,
    fatigue: 0,
    abilities: [],
    stats: { 
      game: {}, 
      season: {}, 
      career: {} 
    },
    history: [],
    awards: [],
    ...overrides
  };

  // Add position-specific abilities
  tagAbilities(player);
  
  return player;
}

/**
 * Generates ratings for a player based on position
 * @param {string} pos - Player position
 * @returns {Object} Ratings object
 */
function generatePlayerRatings(pos) {
  const U = window.Utils;
  
  const baseRatings = {
    throwPower: U.rand(50, 99),
    throwAccuracy: U.rand(50, 99),
    awareness: U.rand(40, 99),
    catching: U.rand(40, 99),
    catchInTraffic: U.rand(40, 99),
    acceleration: U.rand(60, 99),
    speed: U.rand(60, 99),
    agility: U.rand(60, 99),
    trucking: U.rand(40, 99),
    juking: U.rand(40, 99),
    passRushSpeed: U.rand(40, 99),
    passRushPower: U.rand(40, 99),
    runStop: U.rand(40, 99),
    coverage: U.rand(40, 99),
    runBlock: U.rand(50, 99),
    passBlock: U.rand(50, 99),
    intelligence: U.rand(40, 99),
    kickPower: U.rand(60, 99),
    kickAccuracy: U.rand(60, 99),
    height: U.rand(68, 80), // inches
    weight: U.rand(180, 320) // pounds
  };

  // Position-specific adjustments
  const positionAdjustments = {
    QB: {
      speed: [50, 90], strength: [60, 85], 
      throwPower: [65, 99], throwAccuracy: [55, 99]
    },
    RB: {
      speed: [70, 99], acceleration: [70, 99],
      trucking: [60, 99], juking: [50, 99]
    },
    WR: {
      speed: [75, 99], acceleration: [70, 99],
      catching: [65, 99], catchInTraffic: [55, 99]
    },
    TE: {
      catching: [55, 95], runBlock: [60, 95],
      passBlock: [55, 90], speed: [45, 85]
    },
    OL: {
      speed: [40, 65], runBlock: [70, 99],
      passBlock: [70, 99], weight: [290, 350]
    },
    DL: {
      passRushPower: [60, 99], passRushSpeed: [55, 99],
      runStop: [65, 99], weight: [250, 320]
    },
    LB: {
      speed: [60, 95], runStop: [60, 95],
      coverage: [45, 90], awareness: [55, 95]
    },
    CB: {
      speed: [75, 99], acceleration: [75, 99],
      coverage: [60, 99], intelligence: [50, 95]
    },
    S: {
      speed: [65, 95], coverage: [55, 95],
      runStop: [50, 90], awareness: [60, 95]
    },
    K: {
      kickPower: [70, 99], kickAccuracy: [60, 99],
      speed: [40, 70]
    },
    P: {
      kickPower: [65, 99], kickAccuracy: [60, 99],
      speed: [40, 70]
    }
  };

  const adjustments = positionAdjustments[pos] || {};
  
  // Apply position-specific ranges
  Object.keys(adjustments).forEach(stat => {
    const [min, max] = adjustments[stat];
    baseRatings[stat] = U.rand(min, max);
  });

  return baseRatings;
}

/**
 * Calculates overall rating based on position and ratings
 * @param {string} pos - Player position
 * @param {Object} ratings - Player ratings
 * @returns {number} Overall rating (40-99)
 */
function calculateOvr(pos, ratings) {
  const C = window.Constants;
  const U = window.Utils;
  
  const weights = C.OVR_WEIGHTS[pos];
  if (!weights) return U.rand(50, 75); // Fallback for unknown positions

  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const stat in weights) {
    const weight = weights[stat];
    const rating = ratings[stat] || 50;
    weightedSum += rating * weight;
    totalWeight += weight;
  }
  
  const rawOvr = totalWeight > 0 ? weightedSum / totalWeight : 50;
  return U.clamp(Math.round(rawOvr), C.PLAYER_CONFIG.MIN_OVR, C.PLAYER_CONFIG.MAX_OVR);
}

/**
 * Generates contract details based on player overall rating and position
 * @param {number} ovr - Player overall rating
 * @param {string} pos - Player position  
 * @returns {Object} Contract details
 */
function generateContract(ovr, pos) {
  const U = window.Utils;
  const C = window.Constants;
  
  // Base salary calculation using constants instead of magic numbers - realistic scale
  const positionMultiplier = C.POSITION_VALUES[pos] || 1.0;
  const baseAnnual = Math.round((0.15 * ovr * positionMultiplier) * 10) / 10;
  
  const years = U.rand(1, 4);
  const bonusPercent = C.SALARY_CAP.SIGNING_BONUS_MIN + 
                      Math.random() * (C.SALARY_CAP.SIGNING_BONUS_MAX - C.SALARY_CAP.SIGNING_BONUS_MIN);
  
  return {
    years,
    baseAnnual,
    signingBonus: Math.round((baseAnnual * years * bonusPercent) * 10) / 10,
    guaranteedPct: C.SALARY_CAP.GUARANTEED_PCT_DEFAULT
  };
}

/**
 * Generates a random player name
 * @returns {string} Full player name
 */
function generatePlayerName() {
  const U = window.Utils;
  // Use expanded names for maximum variety (1,000,000+ combinations)
  const firstName = U.choice(window.EXPANDED_FIRST_NAMES || window.FIRST_NAMES || ['John', 'Mike', 'James', 'David']);
  const lastName = U.choice(window.EXPANDED_LAST_NAMES || window.LAST_NAMES || ['Smith', 'Johnson', 'Williams', 'Brown']);
  return `${firstName} ${lastName}`;
}

/**
 * Tags abilities for a player based on their ratings
 * @param {Object} player - The player object to tag abilities for
 */
function tagAbilities(player) {
  if (!player || !player.ratings) return;
  
  player.abilities = []; // Reset abilities
  const r = player.ratings;
  const C = window.Constants;
  
  const abilityThresholds = {
    // Elite thresholds
    ELITE: 95,
    VERY_GOOD: 88,
    GOOD: 82
  };
  
  // QB Abilities
  if (player.pos === 'QB') {
    if (r.throwPower >= abilityThresholds.ELITE) player.abilities.push('Cannon Arm');
    if (r.throwAccuracy >= abilityThresholds.ELITE) player.abilities.push('Deadeye');
    if (r.speed >= abilityThresholds.VERY_GOOD) player.abilities.push('Escape Artist');
    if (r.awareness >= abilityThresholds.VERY_GOOD && r.intelligence >= abilityThresholds.VERY_GOOD) {
      player.abilities.push('Field General');
    }
  }
  
  // RB Abilities
  if (player.pos === 'RB') {
    if (r.trucking >= abilityThresholds.ELITE) player.abilities.push('Bruiser');
    if (r.juking >= abilityThresholds.ELITE) player.abilities.push('Ankle Breaker');
    if (r.catching >= abilityThresholds.VERY_GOOD) player.abilities.push('Mismatch Nightmare');
    if (r.speed >= abilityThresholds.ELITE) player.abilities.push('Breakaway Speed');
  }
  
  // WR/TE Abilities
  if (player.pos === 'WR' || player.pos === 'TE') {
    if (r.speed >= abilityThresholds.ELITE) player.abilities.push('Deep Threat');
    if (r.catchInTraffic >= abilityThresholds.ELITE) player.abilities.push('Possession Specialist');
    if (r.catching >= abilityThresholds.ELITE) player.abilities.push('Sure Hands');
    if (r.acceleration >= abilityThresholds.VERY_GOOD && r.agility >= abilityThresholds.VERY_GOOD) {
      player.abilities.push('Route Runner');
    }
  }
  
  // Offensive Line Abilities
  if (player.pos === 'OL') {
    if (r.passBlock >= abilityThresholds.ELITE) player.abilities.push('Pass Pro Specialist');
    if (r.runBlock >= abilityThresholds.ELITE) player.abilities.push('Road Grader');
    if (r.awareness >= abilityThresholds.VERY_GOOD) player.abilities.push('Line Leader');
  }
  
  // Defensive Line Abilities
  if (player.pos === 'DL') {
    if (r.passRushPower >= abilityThresholds.ELITE) player.abilities.push('Bull Rush');
    if (r.passRushSpeed >= abilityThresholds.ELITE) player.abilities.push('Edge Threat');
    if (r.runStop >= abilityThresholds.ELITE) player.abilities.push('Run Stopper');
  }
  
  // Linebacker Abilities
  if (player.pos === 'LB') {
    if (r.coverage >= abilityThresholds.VERY_GOOD && r.speed >= abilityThresholds.GOOD) {
      player.abilities.push('Coverage Specialist');
    }
    if (r.runStop >= abilityThresholds.VERY_GOOD) player.abilities.push('Run Defender');
    if (r.passRushSpeed >= abilityThresholds.VERY_GOOD) player.abilities.push('Pass Rush Moves');
  }
  
  // Defensive Back Abilities
  if (player.pos === 'CB' || player.pos === 'S') {
    if (r.coverage >= abilityThresholds.ELITE && r.intelligence >= abilityThresholds.VERY_GOOD) {
      player.abilities.push('Shutdown Corner');
    }
    if (r.speed >= abilityThresholds.ELITE) player.abilities.push('Lock Down Speed');
    if (r.runStop >= abilityThresholds.VERY_GOOD) player.abilities.push('Enforcer');
    if (r.awareness >= abilityThresholds.ELITE) player.abilities.push('Ball Hawk');
  }
  
  // Kicker/Punter Abilities
  if (player.pos === 'K' || player.pos === 'P') {
    if (r.kickAccuracy >= abilityThresholds.ELITE) player.abilities.push('Clutch Kicker');
    if (r.kickPower >= abilityThresholds.ELITE) player.abilities.push('Big Leg');
  }
  
  // Universal abilities based on multiple stats
  const avgRating = Object.values(r).reduce((sum, val) => sum + (val || 0), 0) / Object.keys(r).length;
  if (avgRating >= 90) player.abilities.push('Superstar');
  else if (avgRating >= 85) player.abilities.push('Star Player');
  
  // Age-based abilities
  if (player.age >= 30 && r.awareness >= abilityThresholds.VERY_GOOD) {
    player.abilities.push('Veteran Leadership');
  }
}

// === TEAM MANAGEMENT FUNCTIONS ===

/**
 * Releases selected players and handles cap implications
 * @param {Array} selectedIds - Array of player IDs to release
 */
function releaseSelected(selectedIds) {
  if (!selectedIds || selectedIds.length === 0) {
    window.setStatus('No players selected for release.');
    return;
  }
  
  const L = window.state?.league;
  const team = window.currentTeam();
  if (!L || !team) return;
  
  let releasedCount = 0;
  
  selectedIds.forEach(playerId => {
    const playerIndex = team.roster.findIndex(p => p.id === playerId);
    if (playerIndex >= 0) {
      const player = team.roster[playerIndex];
      
      // Handle cap implications (simplified - could ask user about June 1st designation)
      if (window.releaseWithProration) {
        window.releaseWithProration(L, team, player, false);
        releasedCount++;
      } else {
        // Fallback - just remove player
        team.roster.splice(playerIndex, 1);
        releasedCount++;
      }
    }
  });
  
  // Recalculate cap
  if (window.recalcCap) {
    window.recalcCap(L, team);
  }
  
  // Update team ratings after roster change
  if (window.updateTeamRatings) {
    window.updateTeamRatings(team);
  }
  
  // Refresh UI
  if (window.renderRoster) window.renderRoster();
  if (window.updateCapSidebar) window.updateCapSidebar();
  
  window.setStatus(`Released ${releasedCount} player(s).`);
}

// === UTILITY FUNCTIONS ===

/**
 * Validates player data for consistency
 * @param {Object} player - Player object to validate
 * @returns {Array} Array of validation errors
 */
function validatePlayer(player) {
  const errors = [];
  const C = window.Constants;
  
  if (!player) {
    errors.push('Player object is null or undefined');
    return errors;
  }
  
  // Required fields
  const requiredFields = ['id', 'name', 'pos', 'age', 'ovr'];
  requiredFields.forEach(field => {
    if (player[field] === undefined || player[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Value ranges
  if (player.age < C.PLAYER_CONFIG.MIN_AGE || player.age > 45) {
    errors.push(`Invalid age: ${player.age}`);
  }
  
  if (player.ovr < C.PLAYER_CONFIG.MIN_OVR || player.ovr > C.PLAYER_CONFIG.MAX_OVR) {
    errors.push(`Invalid overall rating: ${player.ovr}`);
  }
  
  if (!C.POSITIONS.includes(player.pos)) {
    errors.push(`Invalid position: ${player.pos}`);
  }
  
  return errors;
}

/**
 * Gets positional needs for a team (for smarter AI decisions)
 * @param {Object} team - Team object
 * @returns {Object} Object with positional needs analysis
 */
function getPositionalNeeds(team) {
  if (!team || !team.roster) return {};
  
  const C = window.Constants;
  const byPos = {};
  
  // Initialize position groups
  C.POSITIONS.forEach(pos => { byPos[pos] = []; });
  
  // Group players by position
  team.roster.forEach(p => {
    if (byPos[p.pos]) {
      byPos[p.pos].push(p);
    }
  });
  
  // Sort by overall rating
  Object.keys(byPos).forEach(pos => {
    byPos[pos].sort((a, b) => b.ovr - a.ovr);
  });
  
  const needs = {};
  
  // Analyze each position
  Object.keys(C.DEPTH_NEEDS).forEach(pos => {
    const targetCount = C.DEPTH_NEEDS[pos];
    const currentPlayers = byPos[pos];
    
    const countGap = Math.max(0, targetCount - currentPlayers.length);
    const qualityGap = currentPlayers.length > 0 ? 
      Math.max(0, 82 - currentPlayers[0].ovr) : 20;
    
    needs[pos] = {
      countGap,
      qualityGap,
      score: (countGap * 15) + (qualityGap * 0.5),
      currentStarter: currentPlayers[0] || null,
      depth: currentPlayers.length
    };
  });
  
  return needs;
}

// Make functions globally available
window.canRestructure = canRestructure;
window.restructureContract = restructureContract;
window.makePlayer = makePlayer;
window.generatePlayerRatings = generatePlayerRatings;
window.calculateOvr = calculateOvr;
window.generateContract = generateContract;
window.generatePlayerName = generatePlayerName;
window.tagAbilities = tagAbilities;
window.releaseSelected = releaseSelected;
window.validatePlayer = validatePlayer;
window.getPositionalNeeds = getPositionalNeeds;
