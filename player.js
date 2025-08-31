'use strict';

/**
 * Creates a new player object with stats.
 * @param {string} pos - The player's position (e.g., 'QB', 'WR').
 * @param {number} age - The player's age.
 * @param {number} ovr - The player's overall rating.
 * @returns {object} A new player object.
 */
window.makePlayer = function(pos, age, ovr) {
    const U = window.Utils;
    const C = window.Constants;
    
    // Use position-specific names if available, otherwise use general names
    const names = C.NAMES_BY_POS[pos] || C.NAMES;
    const name = `${U.randChoice(names.first)} ${U.randChoice(names.last)}`;
    const college = U.randChoice(C.COLLEGES);

    // Generate abilities based on position and overall rating
    let abilities = [];
    if (C.ABILITIES_BY_POS[pos]) {
        const potentialAbilities = C.ABILITIES_BY_POS[pos];
        const numAbilities = ovr > 85 ? U.rand(1, 2) : (ovr > 75 ? U.rand(0, 1) : 0);
        for (let i = 0; i < numAbilities; i++) {
            const ability = U.randChoice(potentialAbilities);
            if (!abilities.includes(ability)) {
                abilities.push(ability);
            }
        }
    }

    // Base contract values
    const contractYears = ovr > 80 ? U.rand(3, 5) : (ovr > 70 ? U.rand(2, 4) : U.rand(1, 2));
    const contractValue = Math.max(0.5, (ovr / 10) + U.rand(-1, 1)); // Simplified contract logic

    return {
        id: U.uuid(),
        name: name,
        pos: pos,
        age: age,
        ovr: ovr,
        college: college,
        abilities: abilities,
        years: contractYears,
        baseAnnual: contractValue,
        // Add other potential player attributes here as needed
        morale: 80,
        potential: ovr + U.rand(0, 15 - (age - 21)),
    };
};

// Player object definition
const Player = {
    // Generate a new player with specified position and type
    generate: function(pos, type = 'standard') {
        const C = window.Constants;
        const U = window.Utils;

        const age = U.rand(C.PLAYER_AGE_MIN, C.PLAYER_AGE_MAX);
        const potential = U.rand(C.PLAYER_POTENTIAL_MIN, C.PLAYER_POTENTIAL_MAX);
        const ratings = this.generateRatings(pos, type);
        const ovr = this.calculateOvr(ratings, pos);

        return {
            name: `${U.randItem(C.FIRST_NAMES)} ${U.randItem(C.LAST_NAMES)}`,
            pos: pos,
            age: age,
            ovr: ovr,
            pot: potential,
            ratings: ratings,
            stats: { game: {}, season: {} },
            contract: this.generateContract(ovr, age),
            status: 'healthy',
            morale: U.rand(70, 95)
        };
    },

    // Generate ratings based on position and type
    generateRatings: function(pos, type) {
        const C = window.Constants;
        const U = window.Utils;
        const ratings = {};
        const ratingRanges = C.POS_RATING_RANGES[pos] || {};

        for (const key in ratingRanges) {
            ratings[key] = U.rand(ratingRanges[key][0], ratingRanges[key][1]);
        }
        return ratings;
    },

    // Calculate overall rating based on position-specific weights
    calculateOvr: function(ratings, pos) {
        const C = window.Constants;
        const weights = C.OVR_WEIGHTS[pos];
        if (!weights) return 65; // Default for unweighted positions

        let weightedSum = 0;
        let weightTotal = 0;

        for (const key in weights) {
            if (ratings[key]) {
                weightedSum += ratings[key] * weights[key];
                weightTotal += weights[key];
            }
        }

        return Math.round(weightedSum / weightTotal);
    },

    // Generate a contract for a player
    generateContract: function(ovr, age) {
        const U = window.Utils;
        const years = U.rand(1, 5);
        const ageFactor = Math.max(0.5, (35 - age) / 10);
        const salary = Math.round((Math.pow(ovr, 3) / 1000 + 500) * ageFactor) * 1000;
        return { years: years, salary: salary };
    },

    // Player progression during offseason
    progress: function(player) {
        const U = window.Utils;
        const C = window.Constants;

        // Age progression
        player.age++;
        if (player.age > C.PLAYER_RETIREMENT_AGE_MAX) {
            // Retirement logic placeholder
            return;
        }

        // Rating progression/regression
        const devRoll = U.rand(1, 100);
        if (devRoll <= player.pot) {
            const points = U.rand(1, 5);
            for (let i = 0; i < points; i++) {
                const ratingToInc = U.randItem(Object.keys(player.ratings));
                if (player.ratings[ratingToInc] < 99) {
                    player.ratings[ratingToInc]++;
                }
            }
        } else {
            // Regression for older players
            if (player.age > 30) {
                const points = U.rand(1, 3);
                for (let i = 0; i < points; i++) {
                    const ratingToDec = U.randItem(Object.keys(player.ratings));
                    if (player.ratings[ratingToDec] > 40) {
                        player.ratings[ratingToDec]--;
                    }
                }
            }
        }

        // Recalculate OVR
        player.ovr = this.calculateOvr(player.ratings, player.pos);
        return player;
    }
};

// --- CRITICAL ---
// This makes the entire Player object, including its `generate` method,
// available to the rest of the application.
window.Player = Player;

// Also create a global alias for the main generation function for convenience,
// as other files like freeagency.js were trying to call it directly.
window.generatePlayer = Player.generate.bind(Player);
