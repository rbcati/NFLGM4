// rookies.js
'use strict';

// Configuration constants
const DRAFT_CONFIG = {
    DEFAULT_CLASS_SIZE: 150,
    ROOKIE_AGE: { MIN: 21, MAX: 23 },
    POTENTIAL_VARIANCE: { MIN: 5, MAX: 15 },
    OVERALL_BOUNDS: { MIN: 40, MAX: 99 },
    POSITIONS: {
        // More realistic position distribution weights
        'QB': 0.08,   // ~12 players
        'RB': 0.12,   // ~18 players  
        'WR': 0.18,   // ~27 players
        'TE': 0.08,   // ~12 players
        'OL': 0.20,   // ~30 players
        'DL': 0.15,   // ~23 players
        'LB': 0.10,   // ~15 players
        'CB': 0.12,   // ~18 players
        'S': 0.08,    // ~12 players
        'K': 0.02,    // ~3 players
        'P': 0.02     // ~3 players
    }
};

/**
 * Validates the draft generation parameters
 * @param {number} year - The draft year
 * @param {Object} options - Optional configuration overrides
 * @returns {boolean} - True if valid, throws error if not
 */
function validateDraftParams(year, options = {}) {
    if (!year || typeof year !== 'number' || year < 1920 || year > 2100) {
        throw new Error('Invalid year: must be a number between 1920 and 2100');
    }
    
    if (options.classSize && (typeof options.classSize !== 'number' || options.classSize < 1)) {
        throw new Error('Invalid class size: must be a positive number');
    }
    
    return true;
}

/**
 * Generates a weighted random position based on realistic NFL draft distributions
 * @param {Object} positionWeights - Position weight distribution
 * @returns {string} - Selected position
 */
function getWeightedPosition(positionWeights = DRAFT_CONFIG.POSITIONS) {
    const U = window.Utils;
    const positions = Object.keys(positionWeights);
    const weights = Object.values(positionWeights);
    
    // Simple weighted selection
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < positions.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return positions[i];
        }
    }
    
    // Fallback to simple random choice
    return U.choice(positions);
}

/**
 * Calculates scouting potential range with fog of war effect
 * @param {number} actualOverall - The player's true overall rating
 * @param {Object} config - Configuration for variance calculation
 * @returns {Object} - Object with floor, ceiling, and range string
 */
function calculatePotentialRange(actualOverall, config = DRAFT_CONFIG) {
    const U = window.Utils;
    const variance = U.rand(config.POTENTIAL_VARIANCE.MIN, config.POTENTIAL_VARIANCE.MAX);
    
    const floor = U.clamp(
        actualOverall - variance, 
        config.OVERALL_BOUNDS.MIN, 
        config.OVERALL_BOUNDS.MAX
    );
    
    const ceiling = U.clamp(
        actualOverall + variance, 
        config.OVERALL_BOUNDS.MIN, 
        config.OVERALL_BOUNDS.MAX
    );
    
    return {
        floor,
        ceiling,
        range: `${floor}-${ceiling}`,
        confidence: Math.max(0, 100 - variance * 3) // Lower variance = higher confidence
    };
}

/**
 * Creates a single rookie player
 * @param {string} position - Player position
 * @param {number} year - Draft year
 * @returns {Object} - Rookie player object
 */
function createRookiePlayer(position, year) {
    const U = window.Utils;
    
    // Check if makePlayer function exists
    if (typeof makePlayer !== 'function') {
        throw new Error('makePlayer function is not available. Please ensure it is loaded.');
    }
    
    const rookie = makePlayer(position);
    rookie.age = U.rand(DRAFT_CONFIG.ROOKIE_AGE.MIN, DRAFT_CONFIG.ROOKIE_AGE.MAX);
    rookie.year = year;
    rookie.position = position; // Ensure position is explicitly set
    
    // Add scouting information
    const potentialData = calculatePotentialRange(rookie.ovr);
    rookie.potentialRange = potentialData.range;
    rookie.scoutingFloor = potentialData.floor;
    rookie.scoutingCeiling = potentialData.ceiling;
    rookie.scoutingConfidence = potentialData.confidence;
    rookie.scouted = false;
    rookie.timesWatched = 0; // Track how many times this player has been scouted
    
    return rookie;
}

/**
 * Generates a complete draft class with realistic distributions
 * @param {number} year - The draft year
 * @param {Object} options - Optional configuration overrides
 * @returns {Array} - Array of rookie player objects, sorted by overall rating
 */
function generateDraftClass(year, options = {}) {
    try {
        // Validate inputs
        validateDraftParams(year, options);
        
        // Check dependencies
        if (!window.Utils) {
            throw new Error('Utils library is not available. Please ensure it is loaded.');
        }
        
        // Merge options with defaults
        const config = {
            classSize: options.classSize || DRAFT_CONFIG.DEFAULT_CLASS_SIZE,
            positionWeights: options.positionWeights || DRAFT_CONFIG.POSITIONS,
            includeUDFA: options.includeUDFA !== false // Default to true
        };
        
        console.log(`Generating ${config.classSize} player draft class for ${year}`);
        
        const draftClass = [];
        
        // Generate players
        for (let i = 0; i < config.classSize; i++) {
            const position = getWeightedPosition(config.positionWeights);
            const rookie = createRookiePlayer(position, year);
            
            // Add draft metadata
            rookie.draftId = i + 1; // Unique identifier within this draft
            rookie.expectedRound = null; // Will be calculated after sorting
            
            draftClass.push(rookie);
        }
        
        // Sort by overall rating (best to worst)
        draftClass.sort((a, b) => b.ovr - a.ovr);
        
        // Assign expected draft rounds (32 picks per round for 7 rounds = 224 drafted players)
        draftClass.forEach((player, index) => {
            if (index < 224) {
                player.expectedRound = Math.floor(index / 32) + 1;
            } else {
                player.expectedRound = 'UDFA'; // Undrafted Free Agent
            }
        });
        
        // Log draft class statistics
        const positionCounts = draftClass.reduce((counts, player) => {
            counts[player.position] = (counts[player.position] || 0) + 1;
            return counts;
        }, {});
        
        console.log('Draft class position distribution:', positionCounts);
        console.log(`Top prospect: ${draftClass[0].position} with ${draftClass[0].ovr} overall`);
        
        return draftClass;
        
    } catch (error) {
        console.error('Error generating draft class:', error);
        throw error;
    }
}

// Export functions
window.generateDraftClass = generateDraftClass;
window.DRAFT_CONFIG = DRAFT_CONFIG; // Export config for external modification

// Additional utility functions for scouting system
window.draftUtils = {
    scoutPlayer: function(player, thoroughness = 'basic') {
        if (!player.scouted) {
            player.scouted = true;
            player.timesWatched = 1;
        } else {
            player.timesWatched++;
        }
        
        // More thorough scouting reduces uncertainty
        if (thoroughness === 'thorough' && player.timesWatched >= 3) {
            const reduction = Math.min(5, player.timesWatched);
            const newFloor = Math.max(player.scoutingFloor, player.ovr - reduction);
            const newCeiling = Math.min(player.scoutingCeiling, player.ovr + reduction);
            player.potentialRange = `${newFloor}-${newCeiling}`;
        }
    },
    
    getDraftBoard: function(draftClass, position = null) {
        let filteredClass = position ? 
            draftClass.filter(p => p.position === position) : 
            draftClass;
        
        return filteredClass.map((player, index) => ({
            rank: index + 1,
            name: player.name || `${player.position} #${player.draftId}`,
            position: player.position,
            potentialRange: player.potentialRange,
            scouted: player.scouted,
            expectedRound: player.expectedRound
        }));
    }
};
