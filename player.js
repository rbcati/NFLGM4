// player.js - Fixed implementation using available constants
'use strict';

/**
 * Creates a new player object with all ratings and attributes
 * @param {string} pos - Player position (QB, RB, etc.)
 * @param {number} age - Optional age override
 * @param {number} ovr - Optional overall override
 * @returns {Object} Complete player object
 */
function makePlayer(pos, age = null, ovr = null) {
  const U = window.Utils;
  const C = window.Constants;
  
  if (!U || !C) {
    throw new Error('Utils and Constants must be loaded to create players');
  }

  try {
    // Generate or use provided age
    const playerAge = age || U.rand(C.PLAYER_CONFIG.MIN_AGE, C.PLAYER_CONFIG.MAX_AGE);
    
    // Generate detailed ratings based on position
    const ratings = generatePlayerRatings(pos);
    
    // Calculate or use provided overall rating
    const playerOvr = ovr || calculateOvr(pos, ratings);
    
    // Generate contract details
    const contractDetails = generateContract(playerOvr, pos, playerAge);
    
    // Generate player name
    const playerName = generatePlayerName();
    
    const player = {
      id: U.id(),
      name: playerName,
      pos: pos,
      age: playerAge,
      ratings: ratings,
      ovr: playerOvr,
      years: contractDetails.years,
      yearsTotal: contractDetails.years,
      baseAnnual: contractDetails.baseAnnual,
      signingBonus: contractDetails.signingBonus,
      guaranteedPct: contractDetails.guaranteedPct,
      
      // Player status
      injuryWeeks: 0,
      fatigue: 0,
      morale: U.rand(70, 95),
      
      // Progression
      potential: Math.min(99, playerOvr + U.rand(0, 15 - Math.max(0, playerAge - 21))),
      
      // Collections
      abilities: [],
      awards: [],
      
      // Statistics tracking
      stats: { 
        game: {}, 
        season: {}, 
        career: {} 
      },
      
      // History
      history: [],
      
      // Physical attributes
      college: generateCollege()
    };

    // Add position-specific abilities
    tagAbilities(player);
    
    return player;
    
  } catch (error) {
    console.error('Error creating player:', error);
    // Return a basic fallback player
    return createFallbackPlayer(pos, age, ovr);
  }
}

/**
 * Generates ratings for a player based on position
 * @param {string} pos - Player position
 * @returns {Object} Ratings object
 */
function generatePlayerRatings(pos) {
  const U = window.Utils;
  const C = window.Constants;
  
  // Get position-specific ranges or use defaults
  const posRanges = C.POS_RATING_RANGES?.[pos] || {};
  
  const baseRatings = {
    // Passing
    throwPower: U.rand(50, 99),
    throwAccuracy: U.rand(50, 99),
    
    // Athletic
    speed: U.rand(60, 99),
    acceleration: U.rand(60, 99),
    agility: U.rand(60, 99),
    
    // Mental
    awareness: U.rand(40, 99),
    intelligence: U.rand(40, 99),
    
    // Receiving
    catching: U.rand(40, 99),
    catchInTraffic: U.rand(40, 99),
    
    // Running
    trucking: U.rand(40, 99),
    juking: U.rand(40, 99),
    
    // Pass rushing
    passRushSpeed: U.rand(40, 99),
    passRushPower: U.rand(40, 99),
    
    // Run defense
    runStop: U.rand(40, 99),
    
    // Coverage
    coverage: U.rand(40, 99),
    
    // Blocking
    runBlock: U.rand(50, 99),
    passBlock: U.rand(50, 99),
    
    // Kicking
    kickPower: U.rand(60, 99),
    kickAccuracy: U.rand(60, 99),
    
    // Physical
    height: U.rand(68, 80), // inches
    weight: U.rand(180, 320) // pounds
  };

  // Apply position-specific ranges if available
  Object.keys(posRanges).forEach(stat => {
    if (posRanges[stat] && Array.isArray(posRanges[stat]) && posRanges[stat].length === 2) {
      const [min, max] = posRanges[stat];
      baseRatings[stat] = U.rand(min, max);
    }
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
  
  const weights = C.OVR_WEIGHTS?.[pos];
  if (!weights) {
    // Fallback for unknown positions
    const avgRating = Object.values(ratings).reduce((sum, val) => sum + (val || 0), 0) / Object.keys(ratings).length;
    return U.clamp(Math.round(avgRating), C.PLAYER_CONFIG.MIN_OVR, C.PLAYER_CONFIG.MAX_OVR);
  }

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
 * @param {number} age - Player age
 * @returns {Object} Contract details
 */
function generateContract(ovr, pos, age) {
  const U = window.Utils;
  const C = window.Constants;
  
  // Base salary calculation
  const positionMultiplier = C.POSITION_VALUES?.[pos] || 1.0;
  const baseAnnual = Math.round((0.42 * ovr * positionMultiplier) * 10) / 10;
  
  // Contract length based on age and performance
  let years;
  if (age <= 25) {
    years = U.rand(2, 4); // Young players get longer deals
  } else if (age <= 30) {
    years = U.rand(1, 3); // Prime players
  } else {
    years = U.rand(1, 2); // Older players get shorter deals
  }
  
  // Signing bonus calculation
  const bonusPercent = (C.SALARY_CAP?.SIGNING_BONUS_MIN || 0.25) + 
                      Math.random() * ((C.SALARY_CAP?.SIGNING_BONUS_MAX || 0.6) - (C.SALARY_CAP?.SIGNING_BONUS_MIN || 0.25));
  
  return {
    years,
    baseAnnual,
    signingBonus: Math.round((baseAnnual * years * bonusPercent) * 10) / 10,
    guaranteedPct: C.SALARY_CAP?.GUARANTEED_PCT_DEFAULT || 0.5
  };
}

/**
 * Generates a random player name
 * @returns {string} Full player name
 */
function generatePlayerName() {
  const U = window.Utils;
  const C = window.Constants;
  
  // Use constants if available, otherwise use global arrays from state.js
  const firstNames = C.FIRST_NAMES || window.FIRST_NAMES || ['John', 'Mike', 'James', 'David'];
  const lastNames = C.LAST_NAMES || window.LAST_NAMES || ['Smith', 'Johnson', 'Williams', 'Brown'];
  
  const firstName = U.choice(firstNames);
  const lastName = U.choice(lastNames);
  
  return `${firstName} ${lastName}`;
}

/**
 * Generate college name
 * @returns {string} College name
 */
function generateCollege() {
  const U = window.Utils;
  const C = window.Constants;
  
  const colleges = C.COLLEGES || [
    'Alabama', 'Ohio State', 'Georgia', 'Clemson', 'Oklahoma', 'LSU', 'Florida',
    'Michigan', 'Penn State', 'Texas', 'Notre Dame', 'USC', 'Oregon'
  ];
  
  return U.choice(colleges);
}

/**
 * Tags abilities for a player based on their ratings
 * @param {Object} player - The player object to tag abilities for
 */
function tagAbilities(player) {
  if (!player || !player.ratings) return;
  
  const C = window.Constants;
  const U = window.Utils;
  const r = player.ratings;
  
  player.abilities = []; // Reset abilities
  
  // Get position-specific abilities if available
  const positionAbilities = C.ABILITIES_BY_POS?.[player.pos] || [];
  
  if (positionAbilities.length > 0) {
    // Elite threshold for abilities
    const eliteThreshold = 88;
    const veryGoodThreshold = 82;
    
    // Position-specific ability logic
    if (player.pos === 'QB') {
      if (r.throwPower >= eliteThreshold) player.abilities.push('Cannon Arm');
      if (r.throwAccuracy >= eliteThreshold) player.abilities.push('Deadeye');
      if (r.speed >= veryGoodThreshold) player.abilities.push('Escape Artist');
      if (r.awareness >= veryGoodThreshold && r.intelligence >= veryGoodThreshold) {
        player.abilities.push('Field General');
      }
    } else if (player.pos === 'RB') {
      if (r.trucking >= eliteThreshold) player.abilities.push('Bruiser');
      if (r.juking >= eliteThreshold) player.abilities.push('Ankle Breaker');
      if (r.catching >= veryGoodThreshold) player.abilities.push('Pass Catcher');
      if (r.speed >= eliteThreshold) player.abilities.push('Breakaway Speed');
    } else if (player.pos === 'WR' || player.pos === 'TE') {
      if (r.speed >= eliteThreshold) player.abilities.push('Deep Threat');
      if (r.catchInTraffic >= eliteThreshold) player.abilities.push('Possession');
      if (r.catching >= eliteThreshold) player.abilities.push('Sure Hands');
      if (r.acceleration >= veryGoodThreshold && r.agility >= veryGoodThreshold) {
        player.abilities.push('Route Runner');
      }
    }
    // Add more position-specific logic as needed...
    
    // Universal abilities
    if (player.ovr >= 90) {
      player.abilities.push('Superstar');
    } else if (player.ovr >= 85) {
      player.abilities.push('Star Player');
    }
    
    // Veteran leadership for older players
    if (player.age >= 30 && r.awareness >= veryGoodThreshold) {
      player.abilities.push('Veteran Leadership');
    }
  } else {
    // Fallback ability assignment
    if (player.ovr >= 90) player.abilities.push('Elite');
    else if (player.ovr >= 85) player.abilities.push('Star');
    else if (player.ovr >= 80) player.abilities.push('Solid');
  }
}

/**
 * Creates a fallback player if the main creation fails
 * @param {string} pos - Position
 * @param {number} age - Age
 * @param {number} ovr - Overall
 * @returns {Object} Basic player object
 */
function createFallbackPlayer(pos, age, ovr) {
  const U = window.Utils;
  
  return {
    id: U.id(),
    name: generatePlayerName(),
    pos: pos,
    age: age || U.rand(22, 32),
    ovr: ovr || U.rand(50, 85),
    years: U.rand(1, 4),
    yearsTotal: U.rand(1, 4),
    baseAnnual: U.rand(1, 15),
    signingBonus: U.rand(0.5, 8),
    guaranteedPct: 0.5,
    ratings: generateBasicRatings(pos),
    abilities: [],
    stats: { game: {}, season: {}, career: {} },
    awards: [],
    injuryWeeks: 0,
    fatigue: 0,
    college: generateCollege()
  };
}

/**
 * Generate basic ratings if detailed system fails
 * @param {string} pos - Position
 * @returns {Object} Basic ratings
 */
function generateBasicRatings(pos) {
  const U = window.Utils;
  const base = U.rand(50, 85);
  const variance = 10;
  
  return {
    throwPower: U.rand(base - variance, base + variance),
    throwAccuracy: U.rand(base - variance, base + variance),
    speed: U.rand(base - variance, base + variance),
    acceleration: U.rand(base - variance, base + variance),
    agility: U.rand(base - variance, base + variance),
    awareness: U.rand(base - variance, base + variance),
    intelligence: U.rand(base - variance, base + variance),
    catching: U.rand(base - variance, base + variance),
    catchInTraffic: U.rand(base - variance, base + variance),
    trucking: U.rand(base - variance, base + variance),
    juking: U.rand(base - variance, base + variance),
    passRushSpeed: U.rand(base - variance, base + variance),
    passRushPower: U.rand(base - variance, base + variance),
    runStop: U.rand(base - variance, base + variance),
    coverage: U.rand(base - variance, base + variance),
    runBlock: U.rand(base - variance, base + variance),
    passBlock: U.rand(base - variance, base + variance),
    kickPower: U.rand(base - variance, base + variance),
    kickAccuracy: U.rand(base - variance, base + variance),
    height: U.rand(68, 80),
    weight: U.rand(180, 320)
  };
}

/**
 * Player progression system
 * @param {Object} player - Player to progress
 * @returns {Object} Updated player
 */
function progressPlayer(player) {
  if (!player) return player;
  
  const U = window.Utils;
  const C = window.Constants;
  
  try {
    // Age progression
    player.age++;
    
    // Check for retirement
    if (player.age > (C.HALL_OF_FAME?.FORCED_RETIREMENT_AGE || 38)) {
      player.retired = true;
      return player;
    }
    
    // Rating progression/regression based on age
    const peakAge = C.PLAYER_CONFIG?.PEAK_AGES?.[player.pos] || 27;
    const isInPrime = player.age <= peakAge + 2;
    const isOld = player.age >= peakAge + 5;
    
    if (isInPrime && player.potential > player.ovr) {
      // Potential for improvement
      const devChance = Math.max(10, player.potential - player.ovr) * 2;
      if (U.rand(1, 100) <= devChance) {
        // Improve 1-3 ratings
        const improvements = U.rand(1, 3);
        for (let i = 0; i < improvements; i++) {
          const statToImprove = U.choice(Object.keys(player.ratings));
          if (player.ratings[statToImprove] < 99) {
            player.ratings[statToImprove]++;
          }
        }
        // Recalculate overall
        player.ovr = calculateOvr(player.pos, player.ratings);
      }
    } else if (isOld) {
      // Age-related decline
      const declineChance = (player.age - peakAge - 2) * 15;
      if (U.rand(1, 100) <= declineChance) {
        // Decline in 1-2 ratings
        const declines = U.rand(1, 2);
        for (let i = 0; i < declines; i++) {
          const statToDecline = U.choice(Object.keys(player.ratings));
          if (player.ratings[statToDecline] > 40) {
            player.ratings[statToDecline]--;
          }
        }
        // Recalculate overall
        player.ovr = calculateOvr(player.pos, player.ratings);
      }
    }
    
    return player;
    
  } catch (error) {
    console.error('Error progressing player:', error);
    return player;
  }
}

// Utility function to handle missing Utils functions
function safeChoice(array) {
  if (!array || array.length === 0) return 'Unknown';
  return array[Math.floor(Math.random() * array.length)];
}

function safeRand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Enhanced Utils if not available
if (!window.Utils || !window.Utils.randChoice) {
  if (window.Utils) {
    window.Utils.randChoice = window.Utils.choice || safeChoice;
  } else {
    window.Utils = {
      rand: safeRand,
      choice: safeChoice,
      randChoice: safeChoice,
      clamp: (x, a, b) => Math.max(a, Math.min(b, x)),
      id: () => Math.random().toString(36).slice(2, 10),
      uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      })
    };
  }
}

// Make functions globally available
window.makePlayer = makePlayer;
window.generatePlayerRatings = generatePlayerRatings;
window.calculateOvr = calculateOvr;
window.generateContract = generateContract;
window.generatePlayerName = generatePlayerName;
window.generateCollege = generateCollege;
window.tagAbilities = tagAbilities;
window.progressPlayer = progressPlayer;
window.createFallbackPlayer = createFallbackPlayer;

// Legacy compatibility - export as Player object too
window.Player = {
  generate: makePlayer,
  generateRatings: generatePlayerRatings,
  calculateOvr: calculateOvr,
  progress: progressPlayer
};

console.log('✅ Player.js fixed and loaded with all required functions');
