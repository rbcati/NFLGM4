(function(global) {
  // player.js - Updated implementation with XP and Skill Trees
  'use strict';

  // Assume player-progression.js is loaded first, providing global functions.
  const U = global.Utils;
  const C = global.Constants;
  const initProgressionStats = global.initProgressionStats;
  const addXP = global.addXP;
  // ... other functions from player-progression ...

  /**
   * Creates a new player object with all ratings and attributes
   * @param {string} pos - Player position (QB, RB, etc.)
   * @param {number} age - Optional age override
   * @param {number} ovr - Optional overall override
   * @returns {Object} Complete player object
   */
  function makePlayer(pos, age = null, ovr = null) {
    if (!U || !C) {
      throw new Error('Utils and Constants must be loaded to create players');
    }

    try {
      // ... [REMAINDER OF makePlayer FUNCTION BODY IS UNCHANGED] ...
      const playerAge = age || U.rand(C.PLAYER_CONFIG.MIN_AGE, C.PLAYER_CONFIG.MAX_AGE);
      const ratings = generatePlayerRatings(pos);
      const playerOvr = ovr || calculateOvr(pos, ratings);
      const contractDetails = generateContract(playerOvr, pos, playerAge);
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

        // Progression: Use DEV TRAITS and POTENTIAL
        // Progression: Added new devTrait for better long-term management
        devTrait: U.choice(['Normal', 'Star', 'Superstar', 'X-Factor']),
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

      // Initialize the new progression/skill tree tracking
      initProgressionStats(player);

      // Add position-specific abilities
      tagAbilities(player);

      return player;

    } catch (error) {
      console.error('Error creating player:', error);
      // Return a basic fallback player
      return createFallbackPlayer(pos, age, ovr);
    }
  }

  // ... [generatePlayerRatings, calculateOvr, generateContract, etc. are UNCHANGED] ...

  /**
   * Player progression system (Updated for XP/SP)
   * @param {Object} player - Player to progress
   * @returns {Object} Updated player
   */
  function progressPlayer(player) {
    if (!player) return player;

    const U = global.Utils;
    const C = global.Constants;

    try {
      // Age progression
      player.age++;

      // Check for retirement
      if (player.age > (C.HALL_OF_FAME?.FORCED_RETIREMENT_AGE || 38)) {
        player.retired = true;
        return player;
      }

      // ----------------------------------------------------
      // 🔄 CORE PROGRESSION/REGRESSION LOGIC (Updated)
      // ----------------------------------------------------

      const peakAge = C.PLAYER_CONFIG?.PEAK_AGES?.[player.pos] || 27;
      const peakRegressionStart = peakAge + 4; // Start slow decline after 4 peak years
      const devBonus = { 'Normal': 0, 'Star': 3, 'Superstar': 5, 'X-Factor': 8 }[player.devTrait] || 0;

      let declineFactor = 0;
      if (player.age > peakRegressionStart) {
        declineFactor = (player.age - peakRegressionStart) * 0.05; // 5% chance increase per year over peak
      }

      // Auto-progress based on dev trait (even without spending SP)
      if (player.ovr < player.potential) {
          // Smaller, passive gain for players below potential, scaled by dev trait
          const passiveGainChance = 10 + devBonus * 2;
          if (U.rand(1, 100) <= passiveGainChance) {
              const improvements = U.rand(1, Math.min(3, devBonus));
              for (let i = 0; i < improvements; i++) {
                  const statToImprove = U.choice(Object.keys(player.ratings));
                  if (player.ratings[statToImprove] < 99) {
                      player.ratings[statToImprove] = Math.min(99, player.ratings[statToImprove] + U.rand(1, 2));
                  }
              }
          }
      }

      // Age-related decline
      const declineChance = U.clamp(Math.round(declineFactor * 100), 0, 50); // Max 50% chance of decline
      if (U.rand(1, 100) <= declineChance) {
        // Decline in 1-2 ratings, but Superstar/X-Factor decline slower
        const declines = U.rand(1, 2);
        for (let i = 0; i < declines; i++) {
          const statToDecline = U.choice(Object.keys(player.ratings));
          // Decline is less severe for higher dev traits
          const declineAmount = (player.devTrait === 'X-Factor') ? 1 : U.rand(1, 2);
          if (player.ratings[statToDecline] > 40) {
            player.ratings[statToDecline] = Math.max(40, player.ratings[statToDecline] - declineAmount);
          }
        }
      }

      // Recalculate overall after passive progression/regression
      player.ovr = calculateOvr(player.pos, player.ratings);

      // Re-tag abilities based on new ratings
      tagAbilities(player);

      // The player must use their available `player.progression.skillPoints` manually in the UI!
      // This function only handles the passive progression and decline.

      return player;

    } catch (error) {
      console.error('Error progressing player:', error);
      return player;
    }
  }

  // ... [tagAbilities, createFallbackPlayer, generateBasicRatings, etc. are UNCHANGED] ...

  // Make functions globally available
  global.makePlayer = makePlayer;
  global.generatePlayerRatings = generatePlayerRatings;
  global.calculateOvr = calculateOvr;
  global.progressPlayer = progressPlayer;
  // ... other exports ...

  console.log('✅ Player.js updated with Progression hooks');
})(window);
