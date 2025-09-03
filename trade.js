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

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculatePlayerTradeValue,
        calculateTeamNeeds,
        getTopTeamNeeds,
        evaluateTrade,
        TRADE_CONFIG,
        DEFAULT_DEPTH_NEEDS
    };
}
