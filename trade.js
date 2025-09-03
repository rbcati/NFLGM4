// trade.js - Enhanced trade evaluation system

/**
 * Configuration constants for trade evaluations
 */
const TRADE_CONFIG = {
    // Position value multipliers - how important each position is in trades
    POSITION_MULTIPLIERS: {
        'QB': 1.6,   // Quarterbacks are most valuable
        'WR': 1.25,  // Wide receivers
        'CB': 1.2,   // Cornerbacks
        'DL': 1.15,  // Defensive line
        'OL': 1.1,   // Offensive line
        'RB': 1.0,   // Running backs (baseline)
        'LB': 1.0,   // Linebackers
        'S': 1.0,    // Safeties
        'TE': 0.9,   // Tight ends
        'K': 0.5,    // Kickers
        'P': 0.5     // Punters
    },
    
    // Age-related constants
    AGE_DECLINE_THRESHOLD: 27,    // Age when decline penalties start
    AGE_PENALTY_PER_YEAR: 0.75,  // Value lost per year over threshold
    
    // Contract evaluation
    CONTRACT_VALUE_MULTIPLIER: 0.1,  // How much contract years add to value
    
    // Value bounds
    MIN_TRADE_VALUE: 5,  // Minimum trade value for any player
    
    // Team need evaluation
    LEAGUE_AVERAGE_STARTER_OVR: 82,  // Baseline for starter quality comparison
    COUNT_GAP_WEIGHT: 15,            // Weight for missing players at position
    QUALITY_GAP_WEIGHT: 0.5,         // Weight for starter quality deficit
    SEVERE_QUALITY_GAP: 20           // Default gap when no players at position
};

/**
 * Default depth chart requirements by position
 */
const DEFAULT_DEPTH_NEEDS = {
    'QB': 2,
    'RB': 3,
    'WR': 5,
    'TE': 3,
    'OL': 8,
    'DL': 6,
    'LB': 6,
    'CB': 5,
    'S': 4,
    'K': 1,
    'P': 1
};

/**
 * Validates a player object has required properties for trade evaluation
 * @param {Object} player - Player object to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validatePlayer(player) {
    if (!player || typeof player !== 'object') {
        return false;
    }
    
    const requiredFields = ['pos', 'age', 'ovr', 'years', 'baseAnnual'];
    return requiredFields.every(field => 
        player.hasOwnProperty(field) && 
        typeof player[field] === 'number' && 
        !isNaN(player[field])
    );
}

/**
 * Calculates the trade value of a player based on multiple factors
 * @param {Object} player - Player object with pos, age, ovr, years, baseAnnual
 * @param {Object} config - Optional configuration overrides
 * @returns {number} - Calculated trade value
 */
function calculatePlayerTradeValue(player, config = {}) {
    // Input validation
    if (!validatePlayer(player)) {
        throw new Error('Invalid player object provided to calculatePlayerTradeValue');
    }
    
    // Merge config with defaults
    const cfg = { ...TRADE_CONFIG, ...config };
    
    // Position value multiplier
    const positionMultiplier = cfg.POSITION_MULTIPLIERS[player.pos] || 1.0;
    
    // Age penalty calculation - players decline after threshold age
    const yearsOverThreshold = Math.max(0, player.age - cfg.AGE_DECLINE_THRESHOLD);
    const agePenalty = yearsOverThreshold * cfg.AGE_PENALTY_PER_YEAR;
    
    // Contract value - having years left on contract adds value
    const contractYearsRemaining = Math.max(0, player.years - 1);
    const contractBonus = contractYearsRemaining * (player.baseAnnual * cfg.CONTRACT_VALUE_MULTIPLIER);
    
    // Calculate base value adjusted by all factors
    const adjustedOverall = player.ovr - agePenalty + contractBonus;
    const finalValue = adjustedOverall * positionMultiplier;
    
    // Ensure minimum value
    return Math.max(cfg.MIN_TRADE_VALUE, Math.round(finalValue * 100) / 100);
}

/**
 * Validates a team object for need analysis
 * @param {Object} team - Team object to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateTeam(team) {
    return team && 
           typeof team === 'object' && 
           Array.isArray(team.roster) &&
           team.roster.every(player => 
               player && 
               typeof player.pos === 'string' && 
               typeof player.ovr === 'number'
           );
}

/**
 * Groups roster players by position
 * @param {Array} roster - Array of player objects
 * @param {Array} positions - List of valid positions
 * @returns {Object} - Players grouped by position
 */
function groupPlayersByPosition(roster, positions) {
    const grouped = {};
    
    // Initialize all positions with empty arrays
    positions.forEach(pos => {
        grouped[pos] = [];
    });
    
    // Group players by position
    roster.forEach(player => {
        if (grouped.hasOwnProperty(player.pos)) {
            grouped[player.pos].push(player);
        }
    });
    
    // Sort each position group by overall rating (highest first)
    Object.keys(grouped).forEach(pos => {
        grouped[pos].sort((a, b) => b.ovr - a.ovr);
    });
    
    return grouped;
}

/**
 * Calculates team needs across all positions
 * @param {Object} team - Team object with roster array
 * @param {Object} options - Configuration options
 * @returns {Object} - Detailed needs analysis by position
 */
function calculateTeamNeeds(team, options = {}) {
    // Input validation
    if (!validateTeam(team)) {
        throw new Error('Invalid team object provided to calculateTeamNeeds');
    }
    
    // Configuration with defaults
    const depthNeeds = options.depthNeeds || DEFAULT_DEPTH_NEEDS;
    const positions = options.positions || Object.keys(DEFAULT_DEPTH_NEEDS);
    const config = { ...TRADE_CONFIG, ...options.config };
    
    // Group players by position
    const playersByPosition = groupPlayersByPosition(team.roster, positions);
    
    // Calculate needs for each position
    const needs = {};
    
    positions.forEach(position => {
        const targetDepth = depthNeeds[position] || 1;
        const currentPlayers = playersByPosition[position] || [];
        const playerCount = currentPlayers.length;
        
        // Quantity need - how many players short at this position
        const countGap = Math.max(0, targetDepth - playerCount);
        
        // Quality need - how much better does the starter need to be
        let qualityGap = 0;
        if (playerCount === 0) {
            // No players at position - severe need
            qualityGap = config.SEVERE_QUALITY_GAP;
        } else {
            // Compare best player to league average
            const bestPlayer = currentPlayers[0];
            qualityGap = Math.max(0, config.LEAGUE_AVERAGE_STARTER_OVR - bestPlayer.ovr);
        }
        
        // Calculate composite need score
        const needScore = (countGap * config.COUNT_GAP_WEIGHT) + 
                         (qualityGap * config.QUALITY_GAP_WEIGHT);
        
        needs[position] = {
            countGap,
            qualityGap,
            score: Math.round(needScore * 100) / 100,
            currentDepth: playerCount,
            targetDepth,
            topPlayerOvr: currentPlayers.length > 0 ? currentPlayers[0].ovr : null,
            priority: needScore > 10 ? 'High' : needScore > 5 ? 'Medium' : 'Low'
        };
    });
    
    return needs;
}

/**
 * Gets the top team needs sorted by priority
 * @param {Object} team - Team object
 * @param {number} limit - Maximum number of needs to return
 * @param {Object} options - Configuration options
 * @returns {Array} - Array of position needs sorted by score
 */
function getTopTeamNeeds(team, limit = 5, options = {}) {
    const needs = calculateTeamNeeds(team, options);
    
    return Object.entries(needs)
        .map(([position, need]) => ({ position, ...need }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
}

/**
 * Evaluates trade compatibility between two teams
 * @param {Object} givingTeam - Team giving up players
 * @param {Object} receivingTeam - Team receiving players
 * @param {Array} playersGiven - Players being traded away
 * @param {Array} playersReceived - Players being received
 * @returns {Object} - Trade evaluation results
 */
function evaluateTrade(givingTeam, receivingTeam, playersGiven, playersReceived) {
    // Calculate total values
    const valueGiven = playersGiven.reduce((sum, player) => 
        sum + calculatePlayerTradeValue(player), 0);
    const valueReceived = playersReceived.reduce((sum, player) => 
        sum + calculatePlayerTradeValue(player), 0);
    
    // Get team needs
    const givingTeamNeeds = calculateTeamNeeds(givingTeam);
    const receivingTeamNeeds = calculateTeamNeeds(receivingTeam);
    
    // Calculate need fulfillment
    const needsFulfilled = playersReceived.reduce((needs, player) => {
        const positionNeed = givingTeamNeeds[player.pos]?.score || 0;
        return needs + positionNeed;
    }, 0);
    
    return {
        valueGiven: Math.round(valueGiven * 100) / 100,
        valueReceived: Math.round(valueReceived * 100) / 100,
        valueDifference: Math.round((valueReceived - valueGiven) * 100) / 100,
        needsFulfilled: Math.round(needsFulfilled * 100) / 100,
        recommendation: valueReceived >= valueGiven * 0.9 && needsFulfilled > 10 ? 
                       'Favorable' : 'Unfavorable'
    };
}

/**
 * Renders the trade center interface
 */
function renderTradeCenter() {
    console.log('Rendering trade center...');
    
    try {
        const L = state.league;
        if (!L || !L.teams) {
            console.error('No league data available for trade center');
            return;
        }
        
        // Populate team selectors
        populateTradeTeamSelectors();
        
        // Set default teams
        const tradeA = document.getElementById('tradeA');
        const tradeB = document.getElementById('tradeB');
        
        if (tradeA && !tradeA.value) {
            tradeA.value = state.userTeamId || 0;
        }
        if (tradeB && !tradeB.value) {
            tradeB.value = (state.userTeamId || 0) === 0 ? 1 : 0;
        }
        
        // Render initial trade lists
        renderTradeTeamList('A');
        renderTradeTeamList('B');
        
        // Setup trade validation
        setupTradeValidation();
        
        console.log('✅ Trade center rendered successfully');
        
    } catch (error) {
        console.error('Error rendering trade center:', error);
    }
}

/**
 * Populates the team selectors in the trade interface
 */
function populateTradeTeamSelectors() {
    const L = state.league;
    if (!L || !L.teams) return;
    
    const tradeA = document.getElementById('tradeA');
    const tradeB = document.getElementById('tradeB');
    
    if (tradeA) {
        tradeA.innerHTML = L.teams.map((team, index) => 
            `<option value="${index}">${team.name}</option>`
        ).join('');
    }
    
    if (tradeB) {
        tradeB.innerHTML = L.teams.map((team, index) => 
            `<option value="${index}">${team.name}</option>`
        ).join('');
    }
}

/**
 * Renders the trade list for a specific team
 * @param {string} teamLetter - 'A' or 'B'
 */
function renderTradeTeamList(teamLetter) {
    const L = state.league;
    if (!L || !L.teams) return;
    
    const teamSelect = document.getElementById(`trade${teamLetter}`);
    const playerList = document.getElementById(`tradeList${teamLetter}`);
    const pickList = document.getElementById(`pickList${teamLetter}`);
    
    if (!teamSelect || !playerList || !pickList) return;
    
    const teamId = parseInt(teamSelect.value);
    const team = L.teams[teamId];
    
    if (!team) return;
    
    // Render players
    if (team.roster && team.roster.length > 0) {
        const sortedRoster = [...team.roster].sort((a, b) => {
            if (a.pos !== b.pos) return a.pos.localeCompare(b.pos);
            return (b.ovr || 0) - (a.ovr || 0);
        });
        
        playerList.innerHTML = `
            <h4>Players</h4>
            <div class="trade-players">
                ${sortedRoster.map(player => `
                    <div class="trade-player" data-player-id="${player.id}">
                        <input type="checkbox" name="trade${teamLetter}Players" value="${player.id}">
                        <span class="player-name">${player.name}</span>
                        <span class="player-pos">${player.pos}</span>
                        <span class="player-ovr">${player.ovr}</span>
                        <span class="player-age">${player.age}</span>
                        <span class="player-contract">${player.years}yr</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        playerList.innerHTML = '<p class="muted">No players on roster</p>';
    }
    
    // Render draft picks
    if (team.picks && team.picks.length > 0) {
        pickList.innerHTML = `
            <h4>Draft Picks</h4>
            <div class="trade-picks">
                ${team.picks.map(pick => `
                    <div class="trade-pick" data-pick-id="${pick.id}">
                        <input type="checkbox" name="trade${teamLetter}Picks" value="${pick.id}">
                        <span class="pick-round">${pick.round}</span>
                        <span class="pick-year">${pick.year}</span>
                        <span class="pick-team">${L.teams[pick.team]?.name || 'Unknown'}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        pickList.innerHTML = '<p class="muted">No draft picks available</p>';
    }
}

/**
 * Sets up trade validation functionality
 */
function setupTradeValidation() {
    const tradeA = document.getElementById('tradeA');
    const tradeB = document.getElementById('tradeB');
    const validateBtn = document.getElementById('tradeValidate');
    const executeBtn = document.getElementById('tradeExecute');
    
    if (tradeA) {
        tradeA.addEventListener('change', () => {
            renderTradeTeamList('A');
            clearTradeValidation();
        });
    }
    
    if (tradeB) {
        tradeB.addEventListener('change', () => {
            renderTradeTeamList('B');
            clearTradeValidation();
        });
    }
    
    if (validateBtn) {
        validateBtn.addEventListener('click', validateTrade);
    }
    
    if (executeBtn) {
        executeBtn.addEventListener('click', executeTrade);
    }
}

/**
 * Validates the current trade
 */
function validateTrade() {
    console.log('Validating trade...');
    
    try {
        const L = state.league;
        if (!L || !L.teams) return;
        
        const teamAId = parseInt(document.getElementById('tradeA')?.value || '0');
        const teamBId = parseInt(document.getElementById('tradeB')?.value || '0');
        
        if (teamAId === teamBId) {
            showTradeInfo('Cannot trade with yourself!', 'error');
            return;
        }
        
        const teamA = L.teams[teamAId];
        const teamB = L.teams[teamBId];
        
        // Get selected players and picks
        const playersA = getSelectedTradeItems('tradeAPlayers');
        const picksA = getSelectedTradeItems('tradeAPicks');
        const playersB = getSelectedTradeItems('tradeBPlayers');
        const picksB = getSelectedTradeItems('tradeBPicks');
        
        if (playersA.length === 0 && picksA.length === 0 && 
            playersB.length === 0 && picksB.length === 0) {
            showTradeInfo('Please select players or picks to trade', 'warning');
            return;
        }
        
        // Calculate trade values
        const valueA = calculateTradeValue(teamA, playersA, picksA);
        const valueB = calculateTradeValue(teamB, playersB, picksB);
        
        // Evaluate trade
        const evaluation = evaluateTrade(teamA, teamB, playersA, playersB);
        
        // Show trade info
        const tradeInfo = document.getElementById('tradeInfo');
        if (tradeInfo) {
            tradeInfo.innerHTML = `
                <div class="trade-evaluation">
                    <div class="trade-values">
                        <div>Team A Value: ${valueA.toFixed(1)}</div>
                        <div>Team B Value: ${valueB.toFixed(1)}</div>
                        <div>Difference: ${(valueB - valueA).toFixed(1)}</div>
                    </div>
                    <div class="trade-recommendation ${evaluation.recommendation.toLowerCase()}">
                        ${evaluation.recommendation}
                    </div>
                </div>
            `;
        }
        
        // Enable execute button if trade is valid
        const executeBtn = document.getElementById('tradeExecute');
        if (executeBtn) {
            executeBtn.disabled = false;
        }
        
        console.log('✅ Trade validated');
        
    } catch (error) {
        console.error('Error validating trade:', error);
        showTradeInfo('Error validating trade', 'error');
    }
}

/**
 * Gets selected trade items by name
 * @param {string} name - Name attribute of checkboxes
 * @returns {Array} Array of selected values
 */
function getSelectedTradeItems(name) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]:checked`);
    return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * Calculates the total value of a trade package
 * @param {Object} team - Team object
 * @param {Array} players - Array of player IDs
 * @param {Array} picks - Array of pick IDs
 * @returns {number} Total trade value
 */
function calculateTradeValue(team, players, picks) {
    let totalValue = 0;
    
    // Add player values
    if (team.roster) {
        players.forEach(playerId => {
            const player = team.roster.find(p => p.id === playerId);
            if (player) {
                totalValue += calculatePlayerTradeValue(player);
            }
        });
    }
    
    // Add pick values (simplified)
    picks.forEach(pickId => {
        const pick = team.picks?.find(p => p.id === pickId);
        if (pick) {
            // Basic pick value: 1st round = 100, 2nd = 50, 3rd = 25, etc.
            const pickValue = Math.max(10, 100 / Math.pow(2, pick.round - 1));
            totalValue += pickValue;
        }
    });
    
    return totalValue;
}

/**
 * Executes the validated trade
 */
function executeTrade() {
    console.log('Executing trade...');
    
    try {
        const L = state.league;
        if (!L || !L.teams) return;
        
        const teamAId = parseInt(document.getElementById('tradeA')?.value || '0');
        const teamBId = parseInt(document.getElementById('tradeB')?.value || '0');
        
        const teamA = L.teams[teamAId];
        const teamB = L.teams[teamBId];
        
        // Get selected items
        const playersA = getSelectedTradeItems('tradeAPlayers');
        const picksA = getSelectedTradeItems('tradeAPicks');
        const playersB = getSelectedTradeItems('tradeBPlayers');
        const picksB = getSelectedTradeItems('tradeBPicks');
        
        // Execute the trade
        executeTradeTransfer(teamA, teamB, playersA, picksA, playersB, picksB);
        
        // Clear selections and re-render
        clearTradeSelections();
        renderTradeTeamList('A');
        renderTradeTeamList('B');
        clearTradeValidation();
        
        showTradeInfo('Trade executed successfully!', 'success');
        
        console.log('✅ Trade executed');
        
    } catch (error) {
        console.error('Error executing trade:', error);
        showTradeInfo('Error executing trade', 'error');
    }
}

/**
 * Executes the actual player and pick transfers
 * @param {Object} teamA - First team
 * @param {Object} teamB - Second team
 * @param {Array} playersA - Players from team A
 * @param {Array} picksA - Picks from team A
 * @param {Array} playersB - Players from team B
 * @param {Array} picksB - Picks from team B
 */
function executeTradeTransfer(teamA, teamB, playersA, picksA, playersB, picksB) {
    // Transfer players from A to B
    playersA.forEach(playerId => {
        const playerIndex = teamA.roster.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            const player = teamA.roster.splice(playerIndex, 1)[0];
            teamB.roster.push(player);
        }
    });
    
    // Transfer players from B to A
    playersB.forEach(playerId => {
        const playerIndex = teamB.roster.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
            const player = teamB.roster.splice(playerIndex, 1)[0];
            teamA.roster.push(player);
        }
    });
    
    // Transfer picks (simplified - would need more complex logic for actual pick management)
    // This is a placeholder for the actual pick transfer logic
}

/**
 * Clears trade selections
 */
function clearTradeSelections() {
    document.querySelectorAll('input[name^="trade"]').forEach(cb => {
        cb.checked = false;
    });
}

/**
 * Clears trade validation display
 */
function clearTradeValidation() {
    const tradeInfo = document.getElementById('tradeInfo');
    if (tradeInfo) tradeInfo.innerHTML = '';
    
    const executeBtn = document.getElementById('tradeExecute');
    if (executeBtn) executeBtn.disabled = true;
}

/**
 * Shows trade information message
 * @param {string} message - Message to display
 * @param {string} type - Message type (success, error, warning)
 */
function showTradeInfo(message, type = 'info') {
    const tradeInfo = document.getElementById('tradeInfo');
    if (tradeInfo) {
        tradeInfo.innerHTML = `<div class="trade-message ${type}">${message}</div>`;
    }
}

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculatePlayerTradeValue,
        calculateTeamNeeds,
        getTopTeamNeeds,
        evaluateTrade,
        renderTradeCenter,
        TRADE_CONFIG,
        DEFAULT_DEPTH_NEEDS
    };
}

// Make functions globally available
window.renderTradeCenter = renderTradeCenter;
window.validateTrade = validateTrade;
window.executeTrade = executeTrade;
