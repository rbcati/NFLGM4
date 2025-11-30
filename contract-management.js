// contract-management.js - Comprehensive contract management system
'use strict';

// Ensure necessary helper functions exist before use (prevents crashes)
const U = window.Utils;
const C = window.Constants;
const capHitFor = window.capHitFor || ((player) => player.baseAnnual || 0);
const recalcCap = window.recalcCap || (() => console.warn('recalcCap not found, skipping cap update.'));
const setStatus = window.setStatus || ((msg) => console.log('Status:', msg));


// Contract management constants
const CONTRACT_CONSTANTS = {
  FRANCHISE_TAG_MULTIPLIER: 1.2, // 120% of top 5 salaries at position
  TRANSITION_TAG_MULTIPLIER: 1.1, // 110% of top 10 salaries at position
  FIFTH_YEAR_OPTION_MULTIPLIER: 1.25, // Increased multiplier for more realism
  MAX_FRANCHISE_TAGS: 1, 
  MAX_TRANSITION_TAGS: 1, 
  EXTENSION_MIN_YEARS: 2,
  EXTENSION_MAX_YEARS: 7, // Increased max years for big deals
  ROOKIE_CONTRACT_LENGTH: 4, 
  MAX_GUARANTEED_PCT: 0.95 // Maximum percentage of money that can be guaranteed
};

/**
 * Gets all players on the user team with expiring contracts
 * @param {Object} league - League object
 * @param {number} userTeamId - User's team ID
 * @returns {Array} Array of players with 1 year or less remaining on their contract
 */
function getExpiringContracts(league, userTeamId) {
  const team = league?.teams?.[userTeamId];
  if (!team?.roster) return [];
  
  return team.roster.filter(player => {
    // A contract is 'expiring' if it has 1 year left, 
    // or if the player is on a rookie deal (4th year, years=1) and hasn't been extended.
    return player?.years === 1;
  });
}

/**
 * Gets all 1st round picks eligible for 5th year option
 * @param {Object} league - League object
 * @param {number} userTeamId - User's team ID
 * @returns {Array} Array of players eligible for 5th year option
 */
function getFifthYearOptionEligible(league, userTeamId) {
  const team = league?.teams?.[userTeamId];
  if (!team?.roster) return [];

  // 5th year option is only exercised before the 4th season (i.e., at the end of the 3rd year)
  const requiredCareerYears = 3; 

  return team.roster.filter(player => {
    // Check 1: 1st round pick
    if (player.draftRound !== 1) return false;
    
    // Check 2: Must be at the end of their 3rd season (start of the 4th year on a 4-year deal)
    if (!player.draftYear || (league.season - player.draftYear) !== requiredCareerYears) return false;
    
    // Check 3: Contract must be 1 year remaining (the 4th year is the final year of the rookie deal)
    if (player.years !== CONTRACT_CONSTANTS.ROOKIE_CONTRACT_LENGTH - (requiredCareerYears - 1)) return false; 
    
    // Check 4: Must not have already been extended
    if (player.extended === true) return false;

    return true;
  });
}

/**
 * Calculates franchise tag salary for a position
 * @param {string} position - Player position
 * @param {Object} league - League object
 * @returns {number} Franchise tag salary in millions (rounded to 1 decimal)
 */
function calculateFranchiseTagSalary(position, league) {
  if (!league?.teams) return 0;
  
  const allPlayerSalaries = league.teams.flatMap(team => 
    team.roster
      .filter(player => player?.pos === position && player.baseAnnual > 0)
      .map(player => capHitFor(player, 0)) // Use full current year cap hit
  );
  
  if (allPlayerSalaries.length < 5) {
    // Fallback if not enough players (using position estimates)
    const estimates = { 'QB': 30, 'OL': 18, 'DL': 15, 'WR': 16, 'CB': 14, 'LB': 10, 'RB': 8, 'S': 9, 'TE': 7, 'K': 4, 'P': 3 };
    return estimates[position] || 10;
  }
  
  // Sort by salary (descending) and get top 5 average
  allPlayerSalaries.sort((a, b) => b - a);
  const top5Avg = allPlayerSalaries.slice(0, 5).reduce((sum, salary) => sum + salary, 0) / 5;
  
  return U.round(top5Avg * CONTRACT_CONSTANTS.FRANCHISE_TAG_MULTIPLIER, 1);
}

/**
 * Calculates transition tag salary for a position
 * @param {string} position - Player position
 * @param {Object} league - League object
 * @returns {number} Transition tag salary in millions (rounded to 1 decimal)
 */
function calculateTransitionTagSalary(position, league) {
  if (!league?.teams) return 0;
  
  const allPlayerSalaries = league.teams.flatMap(team => 
    team.roster
      .filter(player => player?.pos === position && player.baseAnnual > 0)
      .map(player => capHitFor(player, 0)) // Use full current year cap hit
  );
  
  if (allPlayerSalaries.length < 10) {
    // Fallback if not enough players (slightly lower estimates than franchise)
    const estimates = { 'QB': 25, 'OL': 15, 'DL': 12, 'WR': 13, 'CB': 11, 'LB': 8, 'RB': 6, 'S': 7, 'TE': 5, 'K': 3, 'P': 2 };
    return estimates[position] || 8;
  }
  
  // Sort by salary (descending) and get top 10 average
  allPlayerSalaries.sort((a, b) => b - a);
  const top10Avg = allPlayerSalaries.slice(0, 10).reduce((sum, salary) => sum + salary, 0) / 10;
  
  return U.round(top10Avg * CONTRACT_CONSTANTS.TRANSITION_TAG_MULTIPLIER, 1);
}

/**
 * Calculates 5th year option salary for a player (Uses the current 4th year salary)
 * @param {Object} player - Player object
 * @returns {number} 5th year option salary in millions (rounded to 1 decimal)
 */
function calculateFifthYearOptionSalary(player) {
  // Use the average of the top 3-20 salaries depending on draft pick slot
  // For simplicity, we'll use a strong multiplier on the player's 4th-year base salary
  const baseSalary = player?.baseAnnual || 1.0; 
  return U.round(baseSalary * CONTRACT_CONSTANTS.FIFTH_YEAR_OPTION_MULTIPLIER, 1);
}

/**
 * Applies franchise tag to a player
 * @param {Object} league - League object
 * @param {Object} team - Team object
 * @param {Object} player - Player to franchise tag
 * @returns {Object} Result object with success status and details
 */
function applyFranchiseTag(league, team, player) {
  if (!player || player.years !== 1) {
    return { success: false, message: 'Player must have an expiring contract to use the tag.' };
  }
  if (team.franchiseTagged) {
    return { success: false, message: 'Team has already used the franchise tag this year. 😭' };
  }
  
  const franchiseSalary = calculateFranchiseTagSalary(player.pos, league);
  const capImpact = franchiseSalary - capHitFor(player, 0); // Calculate the difference in cap hit
  
  if (team.capRoom < capImpact) {
    return { 
      success: false, 
      message: `Franchise tag costs $${franchiseSalary.toFixed(1)}M and you only have $${team.capRoom.toFixed(1)}M in cap space. Trade time! 💸`
    };
  }
  
  // Apply franchise tag contract (1 year, fully guaranteed)
  player.years = 1; 
  player.baseAnnual = franchiseSalary;
  player.signingBonus = 0; 
  player.franchiseTagged = true;
  player.franchiseTagYear = league.season;
  player.guaranteedPct = 1.0; // Fully guaranteed

  team.franchiseTagged = true;
  team.franchiseTaggedPlayer = player.id;
  
  recalcCap(league, team);
  
  return { 
    success: true, 
    message: `Applied **Franchise Tag** to **${player.name}** for **$${franchiseSalary.toFixed(1)}M**! Secured the bag.`,
    salary: franchiseSalary
  };
}

// ... (applyTransitionTag, exerciseFifthYearOption functions remain similar but use U.round and setStatus)

/**
 * Extends a player's contract
 * @param {Object} league - League object
 * @param {Object} team - Team object
 * @param {Object} player - Player to extend
 * @param {number} years - Number of years to extend
 * @param {number} baseSalary - Average annual base salary
 * @param {number} signingBonus - Signing bonus amount
 * @returns {Object} Result object with success status and details
 */
function extendContract(league, team, player, years, baseSalary, signingBonus) {
  // ... (Input validation checks remain)
  
  const totalContractValue = (baseSalary * years) + signingBonus;
  const firstYearCapHit = baseSalary + (signingBonus / years);
  
  // Check cap space against the immediate cap impact
  const currentCapHit = capHitFor(player, 0);
  const capImpact = firstYearCapHit - currentCapHit;

  if (team.capRoom < capImpact) {
    return { 
      success: false, 
      message: `Extension adds $${capImpact.toFixed(1)}M to the cap, exceeding your $${team.capRoom.toFixed(1)}M room. 😬`
    };
  }
  
  // Calculate Guaranteed % for realism
  let guaranteedPct = U.round(signingBonus / totalContractValue, 2); 
  guaranteedPct = Math.min(CONTRACT_CONSTANTS.MAX_GUARANTEED_PCT, guaranteedPct + 0.1); 

  // Apply contract extension
  player.years = years + player.years; // Add new years to existing remaining years
  player.yearsTotal = player.years;
  player.baseAnnual = U.round(baseSalary, 1);
  player.signingBonus = U.round(signingBonus, 1);
  player.guaranteedPct = guaranteedPct;
  player.extended = true;
  player.contractYear = league.season;
  
  recalcCap(league, team);
  
  return { 
    success: true, 
    message: `Extension approved! **${player.name}** is locked in for **${years}** more years, totaling **$${totalContractValue.toFixed(1)}M**! 🤑`,
    years: years,
    baseSalary: baseSalary,
    signingBonus: signingBonus
  };
}

// ... (renderContractManagement, createContractManagementContainer, renderExpiringPlayerCard, renderFifthYearPlayerCard, addContractManagementEventListeners remain similar)

// --- Global Functions (Make sure they use the safer checks!) ---

window.applyFranchiseTagToPlayer = function(playerId) {
  const league = window.state?.league;
  const team = league?.teams?.[window.state?.userTeamId];
  const player = team?.roster.find(p => p.id === playerId || p.id === parseInt(playerId));
  
  if (!player) return setStatus('Player not found, rip.');
  
  const result = applyFranchiseTag(league, team, player);
  setStatus(result.message);
  
  if (result.success) {
    window.renderContractManagement(league, window.state.userTeamId);
  }
};
// ... (Similar global wrappers for applyTransitionTagToPlayer and exerciseFifthYearOptionOnPlayer)

window.openContractExtensionModal = function(playerId) {
  const league = window.state?.league;
  const team = league?.teams?.[window.state?.userTeamId];
  const player = team?.roster.find(p => p.id === playerId || p.id === parseInt(playerId));
  
  if (!player) return setStatus('Player not found, rip.');

  const yearsPrompt = prompt(`How many **NEW** years to add to ${player.name}'s deal? (${CONTRACT_CONSTANTS.EXTENSION_MIN_YEARS}-${CONTRACT_CONSTANTS.EXTENSION_MAX_YEARS}):`, '4');
  const baseSalaryPrompt = prompt(`**Average Annual Salary** (M):`, capHitFor(player, 0).toFixed(1));
  const signingBonusPrompt = prompt(`**Signing Bonus** (M):`, '5.0');
  
  if (yearsPrompt && baseSalaryPrompt && signingBonusPrompt) {
    const years = parseInt(yearsPrompt);
    const baseSalary = parseFloat(baseSalaryPrompt);
    const signingBonus = parseFloat(signingBonusPrompt);
    
    // Check if player is on a rookie contract (player.yearsTotal might exist)
    if (player.draftRound <= 7 && player.yearsTotal === CONTRACT_CONSTANTS.ROOKIE_CONTRACT_LENGTH) {
      setStatus('Rookie contracts can only be extended, not renegotiated with current years remaining.');
    }
    
    const result = extendContract(league, team, player, years, baseSalary, signingBonus);
    setStatus(result.message);
    
    if (result.success) {
      window.renderContractManagement(league, window.state.userTeamId);
    }
  } else {
    setStatus('Extension cancelled. 🧘');
  }
};

// Make functions available globally
// ... (All original exports remain)
