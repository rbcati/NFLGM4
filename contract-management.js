// contract-management.js - Comprehensive contract management system
'use strict';

/**
 * Contract Management System for NFL GM
 * Handles re-signing, franchise tags, 5th year options, and contract extensions
 */

// Contract management constants
const CONTRACT_CONSTANTS = {
  FRANCHISE_TAG_MULTIPLIER: 1.2, // 120% of top 5 salaries at position
  TRANSITION_TAG_MULTIPLIER: 1.1, // 110% of top 10 salaries at position
  FIFTH_YEAR_OPTION_MULTIPLIER: 1.1, // 110% of 4th year salary
  MAX_FRANCHISE_TAGS: 1, // Can only franchise tag one player per year
  MAX_TRANSITION_TAGS: 1, // Can only transition tag one player per year
  EXTENSION_MIN_YEARS: 2,
  EXTENSION_MAX_YEARS: 5,
  ROOKIE_CONTRACT_LENGTH: 4 // Standard rookie contract length
};

/**
 * Gets all players on the user team with expiring contracts
 * @param {Object} league - League object
 * @param {number} userTeamId - User's team ID
 * @returns {Array} Array of players with expiring contracts
 */
function getExpiringContracts(league, userTeamId) {
  if (!league || !league.teams || userTeamId === undefined) {
    return [];
  }
  
  const team = league.teams[userTeamId];
  if (!team || !team.roster) {
    return [];
  }
  
  return team.roster.filter(player => {
    return player && player.years === 1; // 1 year remaining = expiring
  });
}

/**
 * Gets all 1st round picks eligible for 5th year option
 * @param {Object} league - League object
 * @param {number} userTeamId - User's team ID
 * @returns {Array} Array of players eligible for 5th year option
 */
function getFifthYearOptionEligible(league, userTeamId) {
  if (!league || !league.teams || userTeamId === undefined) {
    return [];
  }
  
  const team = league.teams[userTeamId];
  if (!team || !team.roster) {
    return [];
  }
  
  return team.roster.filter(player => {
    return player && 
           player.years === 1 && // 1 year remaining (4th year of rookie deal)
           player.draftRound === 1 && // 1st round pick
           player.draftYear && 
           (league.season - player.draftYear) === 3; // 3 years into their career
  });
}

/**
 * Calculates franchise tag salary for a position
 * @param {string} position - Player position
 * @param {Object} league - League object
 * @returns {number} Franchise tag salary in millions
 */
function calculateFranchiseTagSalary(position, league) {
  if (!league || !league.teams) {
    return 0;
  }
  
  // Get all players at this position across the league
  const allPlayers = [];
  league.teams.forEach(team => {
    if (team.roster) {
      team.roster.forEach(player => {
        if (player && player.pos === position && player.baseAnnual > 0) {
          allPlayers.push(player.baseAnnual);
        }
      });
    }
  });
  
  if (allPlayers.length === 0) {
    // Fallback to position-based estimates
    const positionEstimates = {
      'QB': 25, 'OL': 15, 'DL': 12, 'WR': 12, 'CB': 10,
      'LB': 8, 'RB': 7, 'S': 6, 'TE': 5, 'K': 3, 'P': 2
    };
    return positionEstimates[position] || 5;
  }
  
  // Sort by salary (descending) and get top 5 average
  allPlayers.sort((a, b) => b - a);
  const top5 = allPlayers.slice(0, Math.min(5, allPlayers.length));
  const average = top5.reduce((sum, salary) => sum + salary, 0) / top5.length;
  
  return Math.round(average * CONTRACT_CONSTANTS.FRANCHISE_TAG_MULTIPLIER * 10) / 10;
}

/**
 * Calculates transition tag salary for a position
 * @param {string} position - Player position
 * @param {Object} league - League object
 * @returns {number} Transition tag salary in millions
 */
function calculateTransitionTagSalary(position, league) {
  if (!league || !league.teams) {
    return 0;
  }
  
  // Get all players at this position across the league
  const allPlayers = [];
  league.teams.forEach(team => {
    if (team.roster) {
      team.roster.forEach(player => {
        if (player && player.pos === position && player.baseAnnual > 0) {
          allPlayers.push(player.baseAnnual);
        }
      });
    }
  });
  
  if (allPlayers.length === 0) {
    // Fallback to position-based estimates
    const positionEstimates = {
      'QB': 20, 'OL': 12, 'DL': 10, 'WR': 10, 'CB': 8,
      'LB': 6, 'RB': 5, 'S': 5, 'TE': 4, 'K': 2, 'P': 1.5
    };
    return positionEstimates[position] || 4;
  }
  
  // Sort by salary (descending) and get top 10 average
  allPlayers.sort((a, b) => b - a);
  const top10 = allPlayers.slice(0, Math.min(10, allPlayers.length));
  const average = top10.reduce((sum, salary) => sum + salary, 0) / top10.length;
  
  return Math.round(average * CONTRACT_CONSTANTS.TRANSITION_TAG_MULTIPLIER * 10) / 10;
}

/**
 * Calculates 5th year option salary for a player
 * @param {Object} player - Player object
 * @returns {number} 5th year option salary in millions
 */
function calculateFifthYearOptionSalary(player) {
  if (!player || !player.baseAnnual) {
    return 0;
  }
  
  // 5th year option is typically 110% of 4th year salary
  return Math.round(player.baseAnnual * CONTRACT_CONSTANTS.FIFTH_YEAR_OPTION_MULTIPLIER * 10) / 10;
}

/**
 * Applies franchise tag to a player
 * @param {Object} league - League object
 * @param {Object} team - Team object
 * @param {Object} player - Player to franchise tag
 * @returns {Object} Result object with success status and details
 */
function applyFranchiseTag(league, team, player) {
  if (!league || !team || !player) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  // Check if team already used franchise tag
  if (team.franchiseTagged) {
    return { success: false, message: 'Team has already used franchise tag this year' };
  }
  
  // Check if player is eligible (expiring contract)
  if (player.years !== 1) {
    return { success: false, message: 'Player must have expiring contract to franchise tag' };
  }
  
  const franchiseSalary = calculateFranchiseTagSalary(player.pos, league);
  const capHit = franchiseSalary; // Franchise tag is fully guaranteed, no signing bonus
  
  // Check cap space
  if (team.capUsed + capHit > team.capTotal) {
    return { 
      success: false, 
      message: `Franchise tag would exceed salary cap by $${(team.capUsed + capHit - team.capTotal).toFixed(1)}M` 
    };
  }
  
  // Apply franchise tag
  player.years = 1; // 1 year franchise tag
  player.baseAnnual = franchiseSalary;
  player.signingBonus = 0; // No signing bonus for franchise tag
  player.franchiseTagged = true;
  player.franchiseTagYear = league.season;
  
  team.franchiseTagged = true;
  team.franchiseTaggedPlayer = player.id;
  
  // Recalculate cap
  if (window.recalcCap) {
    window.recalcCap(league, team);
  }
  
  return { 
    success: true, 
    message: `Applied franchise tag to ${player.name} for $${franchiseSalary.toFixed(1)}M`,
    salary: franchiseSalary
  };
}

/**
 * Applies transition tag to a player
 * @param {Object} league - League object
 * @param {Object} team - Team object
 * @param {Object} player - Player to transition tag
 * @returns {Object} Result object with success status and details
 */
function applyTransitionTag(league, team, player) {
  if (!league || !team || !player) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  // Check if team already used transition tag
  if (team.transitionTagged) {
    return { success: false, message: 'Team has already used transition tag this year' };
  }
  
  // Check if player is eligible (expiring contract)
  if (player.years !== 1) {
    return { success: false, message: 'Player must have expiring contract to transition tag' };
  }
  
  const transitionSalary = calculateTransitionTagSalary(player.pos, league);
  const capHit = transitionSalary; // Transition tag is fully guaranteed, no signing bonus
  
  // Check cap space
  if (team.capUsed + capHit > team.capTotal) {
    return { 
      success: false, 
      message: `Transition tag would exceed salary cap by $${(team.capUsed + capHit - team.capTotal).toFixed(1)}M` 
    };
  }
  
  // Apply transition tag
  player.years = 1; // 1 year transition tag
  player.baseAnnual = transitionSalary;
  player.signingBonus = 0; // No signing bonus for transition tag
  player.transitionTagged = true;
  player.transitionTagYear = league.season;
  
  team.transitionTagged = true;
  team.transitionTaggedPlayer = player.id;
  
  // Recalculate cap
  if (window.recalcCap) {
    window.recalcCap(league, team);
  }
  
  return { 
    success: true, 
    message: `Applied transition tag to ${player.name} for $${transitionSalary.toFixed(1)}M`,
    salary: transitionSalary
  };
}

/**
 * Exercises 5th year option on a player
 * @param {Object} league - League object
 * @param {Object} team - Team object
 * @param {Object} player - Player to exercise 5th year option on
 * @returns {Object} Result object with success status and details
 */
function exerciseFifthYearOption(league, team, player) {
  if (!league || !team || !player) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  // Check if player is eligible for 5th year option
  if (player.years !== 1 || player.draftRound !== 1) {
    return { success: false, message: 'Player must be a 1st round pick with 1 year remaining' };
  }
  
  if ((league.season - player.draftYear) !== 3) {
    return { success: false, message: 'Player must be in their 4th year to exercise 5th year option' };
  }
  
  const fifthYearSalary = calculateFifthYearOptionSalary(player);
  const capHit = fifthYearSalary; // 5th year option is fully guaranteed
  
  // Check cap space
  if (team.capUsed + capHit > team.capTotal) {
    return { 
      success: false, 
      message: `5th year option would exceed salary cap by $${(team.capUsed + capHit - team.capTotal).toFixed(1)}M` 
    };
  }
  
  // Exercise 5th year option
  player.years = 1; // 1 year 5th year option
  player.baseAnnual = fifthYearSalary;
  player.signingBonus = 0; // No signing bonus for 5th year option
  player.fifthYearOption = true;
  player.fifthYearOptionYear = league.season;
  
  // Recalculate cap
  if (window.recalcCap) {
    window.recalcCap(league, team);
  }
  
  return { 
    success: true, 
    message: `Exercised 5th year option on ${player.name} for $${fifthYearSalary.toFixed(1)}M`,
    salary: fifthYearSalary
  };
}

/**
 * Extends a player's contract
 * @param {Object} league - League object
 * @param {Object} team - Team object
 * @param {Object} player - Player to extend
 * @param {number} years - Number of years to extend
 * @param {number} baseSalary - Base salary per year
 * @param {number} signingBonus - Signing bonus
 * @returns {Object} Result object with success status and details
 */
function extendContract(league, team, player, years, baseSalary, signingBonus) {
  if (!league || !team || !player) {
    return { success: false, message: 'Invalid parameters' };
  }
  
  // Validate contract terms
  if (years < CONTRACT_CONSTANTS.EXTENSION_MIN_YEARS || years > CONTRACT_CONSTANTS.EXTENSION_MAX_YEARS) {
    return { success: false, message: `Contract must be ${CONTRACT_CONSTANTS.EXTENSION_MIN_YEARS}-${CONTRACT_CONSTANTS.EXTENSION_MAX_YEARS} years` };
  }
  
  if (baseSalary < 0.5 || signingBonus < 0) {
    return { success: false, message: 'Invalid salary or signing bonus' };
  }
  
  // Calculate cap hit for first year
  const firstYearCapHit = baseSalary + (signingBonus / years);
  
  // Check cap space
  if (team.capUsed + firstYearCapHit > team.capTotal) {
    return { 
      success: false, 
      message: `Contract extension would exceed salary cap by $${(team.capUsed + firstYearCapHit - team.capTotal).toFixed(1)}M` 
    };
  }
  
  // Apply contract extension
  player.years = years;
  player.yearsTotal = years;
  player.baseAnnual = baseSalary;
  player.signingBonus = signingBonus;
  player.guaranteedPct = Math.min(0.8, (signingBonus / (baseSalary * years + signingBonus)) + 0.2);
  
  // Recalculate cap
  if (window.recalcCap) {
    window.recalcCap(league, team);
  }
  
  return { 
    success: true, 
    message: `Extended ${player.name}'s contract for ${years} years at $${baseSalary.toFixed(1)}M/year with $${signingBonus.toFixed(1)}M signing bonus`,
    years: years,
    baseSalary: baseSalary,
    signingBonus: signingBonus
  };
}

/**
 * Renders the contract management interface
 * @param {Object} league - League object
 * @param {number} userTeamId - User's team ID
 */
function renderContractManagement(league, userTeamId) {
  if (!league || userTeamId === undefined) {
    console.error('Invalid parameters for renderContractManagement');
    return;
  }
  
  const team = league.teams[userTeamId];
  if (!team) {
    console.error('Team not found');
    return;
  }
  
  const expiringPlayers = getExpiringContracts(league, userTeamId);
  const fifthYearEligible = getFifthYearOptionEligible(league, userTeamId);
  
  // Create the contract management interface
  const container = document.getElementById('contractManagement') || createContractManagementContainer();
  
  container.innerHTML = `
    <div class="contract-management">
      <h2>Contract Management</h2>
      
      <div class="contract-section">
        <h3>Expiring Contracts (${expiringPlayers.length})</h3>
        <div class="player-list" id="expiringPlayersList">
          ${expiringPlayers.map(player => renderExpiringPlayerCard(player, league)).join('')}
        </div>
      </div>
      
      <div class="contract-section">
        <h3>5th Year Option Eligible (${fifthYearEligible.length})</h3>
        <div class="player-list" id="fifthYearPlayersList">
          ${fifthYearEligible.map(player => renderFifthYearPlayerCard(player)).join('')}
        </div>
      </div>
      
      <div class="contract-section">
        <h3>Franchise/Transition Tags</h3>
        <div class="tag-status">
          <p>Franchise Tag: ${team.franchiseTagged ? 'Used' : 'Available'}</p>
          <p>Transition Tag: ${team.transitionTagged ? 'Used' : 'Available'}</p>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  addContractManagementEventListeners(league, userTeamId);
}

/**
 * Creates the contract management container if it doesn't exist
 * @returns {HTMLElement} Container element
 */
function createContractManagementContainer() {
  const container = document.createElement('div');
  container.id = 'contractManagement';
  container.className = 'contract-management-container';
  
  // Find a suitable place to insert it (after roster section)
  const rosterSection = document.getElementById('rosterSection') || document.querySelector('.roster-section');
  if (rosterSection) {
    rosterSection.parentNode.insertBefore(container, rosterSection.nextSibling);
  } else {
    document.body.appendChild(container);
  }
  
  return container;
}

/**
 * Renders a card for an expiring contract player
 * @param {Object} player - Player object
 * @param {Object} league - League object
 * @returns {string} HTML string
 */
function renderExpiringPlayerCard(player, league) {
  const franchiseSalary = calculateFranchiseTagSalary(player.pos, league);
  const transitionSalary = calculateTransitionTagSalary(player.pos, league);
  
  // Ensure player has a valid ID
  const playerId = player.id || `player_${Math.random().toString(36).substr(2, 9)}`;
  
  return `
    <div class="player-card" data-player-id="${playerId}">
      <div class="player-info">
        <h4>${player.name || 'Unknown Player'}</h4>
        <p>${player.pos || 'N/A'} | ${player.ovr || 0} OVR | Age ${player.age || 0}</p>
        <p>Current: $${(player.baseAnnual || 0).toFixed(1)}M/year</p>
      </div>
      <div class="contract-actions">
        <button class="btn btn-sm" onclick="openContractExtensionModal('${playerId}')">Extend</button>
        <button class="btn btn-sm" onclick="applyFranchiseTagToPlayer('${playerId}')" 
                ${window.state?.league?.teams?.[window.state?.userTeamId]?.franchiseTagged ? 'disabled' : ''}>
          Franchise Tag ($${franchiseSalary.toFixed(1)}M)
        </button>
        <button class="btn btn-sm" onclick="applyTransitionTagToPlayer('${playerId}')"
                ${window.state?.league?.teams?.[window.state?.userTeamId]?.transitionTagged ? 'disabled' : ''}>
          Transition Tag ($${transitionSalary.toFixed(1)}M)
        </button>
      </div>
    </div>
  `;
}

/**
 * Renders a card for a 5th year option eligible player
 * @param {Object} player - Player object
 * @returns {string} HTML string
 */
function renderFifthYearPlayerCard(player) {
  const fifthYearSalary = calculateFifthYearOptionSalary(player);
  
  // Ensure player has a valid ID
  const playerId = player.id || `player_${Math.random().toString(36).substr(2, 9)}`;
  
  return `
    <div class="player-card" data-player-id="${playerId}">
      <div class="player-info">
        <h4>${player.name || 'Unknown Player'}</h4>
        <p>${player.pos || 'N/A'} | ${player.ovr || 0} OVR | Age ${player.age || 0}</p>
        <p>Current: $${(player.baseAnnual || 0).toFixed(1)}M/year</p>
        <p>Draft: Round ${player.draftRound || 'N/A'}, Pick ${player.draftPick || 'N/A'} (${player.draftYear || 'N/A'})</p>
      </div>
      <div class="contract-actions">
        <button class="btn btn-sm" onclick="exerciseFifthYearOptionOnPlayer('${playerId}')">
          5th Year Option ($${fifthYearSalary.toFixed(1)}M)
        </button>
        <button class="btn btn-sm" onclick="openContractExtensionModal('${playerId}')">Extend</button>
      </div>
    </div>
  `;
}

/**
 * Adds event listeners for contract management
 * @param {Object} league - League object
 * @param {number} userTeamId - User's team ID
 */
function addContractManagementEventListeners(league, userTeamId) {
  // Event listeners are added via onclick handlers in the HTML
  // This function can be extended for more complex event handling
}

// Global functions for UI interactions
window.applyFranchiseTagToPlayer = function(playerId) {
  const league = window.state?.league;
  const team = league?.teams?.[window.state?.userTeamId];
  
  if (!league || !team) {
    window.setStatus('League or team not found');
    return;
  }
  
  const player = team.roster.find(p => p.id === playerId || p.id === parseInt(playerId));
  
  if (!player) {
    window.setStatus('Player not found');
    return;
  }
  
  const result = applyFranchiseTag(league, team, player);
  window.setStatus(result.message);
  
  if (result.success) {
    renderContractManagement(league, window.state.userTeamId);
  }
};

window.applyTransitionTagToPlayer = function(playerId) {
  const league = window.state?.league;
  const team = league?.teams?.[window.state?.userTeamId];
  
  if (!league || !team) {
    window.setStatus('League or team not found');
    return;
  }
  
  const player = team.roster.find(p => p.id === playerId || p.id === parseInt(playerId));
  
  if (!player) {
    window.setStatus('Player not found');
    return;
  }
  
  const result = applyTransitionTag(league, team, player);
  window.setStatus(result.message);
  
  if (result.success) {
    renderContractManagement(league, window.state.userTeamId);
  }
};

window.exerciseFifthYearOptionOnPlayer = function(playerId) {
  const league = window.state?.league;
  const team = league?.teams?.[window.state?.userTeamId];
  
  if (!league || !team) {
    window.setStatus('League or team not found');
    return;
  }
  
  const player = team.roster.find(p => p.id === playerId || p.id === parseInt(playerId));
  
  if (!player) {
    window.setStatus('Player not found');
    return;
  }
  
  const result = exerciseFifthYearOption(league, team, player);
  window.setStatus(result.message);
  
  if (result.success) {
    renderContractManagement(league, window.state.userTeamId);
  }
};

window.openContractExtensionModal = function(playerId) {
  // This would open a modal for contract extension negotiation
  // For now, just show a simple prompt
  const league = window.state?.league;
  const team = league?.teams?.[window.state?.userTeamId];
  
  if (!league || !team) {
    window.setStatus('League or team not found');
    return;
  }
  
  const player = team.roster.find(p => p.id === playerId || p.id === parseInt(playerId));
  
  if (!player) {
    window.setStatus('Player not found');
    return;
  }
  
  const years = prompt(`How many years to extend ${player.name}? (2-5):`, '3');
  const baseSalary = prompt(`Base salary per year (millions):`, (player.baseAnnual || 0).toFixed(1));
  const signingBonus = prompt(`Signing bonus (millions):`, '0');
  
  if (years && baseSalary && signingBonus) {
    const result = extendContract(league, team, player, parseInt(years), parseFloat(baseSalary), parseFloat(signingBonus));
    window.setStatus(result.message);
    
    if (result.success) {
      renderContractManagement(league, window.state.userTeamId);
    }
  }
};

// Make functions available globally
window.getExpiringContracts = getExpiringContracts;
window.getFifthYearOptionEligible = getFifthYearOptionEligible;
window.calculateFranchiseTagSalary = calculateFranchiseTagSalary;
window.calculateTransitionTagSalary = calculateTransitionTagSalary;
window.calculateFifthYearOptionSalary = calculateFifthYearOptionSalary;
window.applyFranchiseTag = applyFranchiseTag;
window.applyTransitionTag = applyTransitionTag;
window.exerciseFifthYearOption = exerciseFifthYearOption;
window.extendContract = extendContract;
window.renderContractManagement = renderContractManagement;
