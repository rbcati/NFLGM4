// injury-system.js - Comprehensive Injury System
'use strict';

(function() {
  'use strict';

  // Injury types and severities
  const INJURY_TYPES = {
    // Minor injuries (1-3 weeks)
    minor: [
      { name: 'Bruised Shoulder', weeks: 1, impact: 0.05 },
      { name: 'Sprained Ankle', weeks: 2, impact: 0.10 },
      { name: 'Strained Hamstring', weeks: 2, impact: 0.10 },
      { name: 'Bruised Ribs', weeks: 2, impact: 0.15 },
      { name: 'Concussion (Minor)', weeks: 1, impact: 0.20 }
    ],
    // Moderate injuries (3-8 weeks)
    moderate: [
      { name: 'Torn MCL', weeks: 6, impact: 0.40 },
      { name: 'Torn PCL', weeks: 6, impact: 0.40 },
      { name: 'Broken Finger', weeks: 4, impact: 0.30 },
      { name: 'Strained Groin', weeks: 4, impact: 0.35 },
      { name: 'High Ankle Sprain', weeks: 6, impact: 0.40 },
      { name: 'Concussion (Moderate)', weeks: 2, impact: 0.30 }
    ],
    // Major injuries (8+ weeks, season-ending possible)
    major: [
      { name: 'Torn ACL', weeks: 52, impact: 0.80, seasonEnding: true },
      { name: 'Torn Achilles', weeks: 52, impact: 0.85, seasonEnding: true },
      { name: 'Broken Leg', weeks: 12, impact: 0.70 },
      { name: 'Torn Rotator Cuff', weeks: 16, impact: 0.75 },
      { name: 'Herniated Disc', weeks: 10, impact: 0.65 },
      { name: 'Severe Concussion', weeks: 4, impact: 0.50 }
    ]
  };

  /**
   * Generate a random injury for a player
   * @param {Object} player - Player object
   * @param {Object} context - Game context (playoff, important game, etc.)
   * @returns {Object|null} Injury object or null
   */
  function generateInjury(player, context = {}) {
    if (!player) return null;
    
    const U = window.Utils;
    if (!U) return null;
    
    // Base injury chance (per game)
    let injuryChance = 0.02; // 2% base chance
    
    // Adjust based on player injury proneness
    if (player.character?.injury_prone) {
      injuryChance *= 2.5;
    }
    
    // Adjust based on position (OL, RB, LB more prone)
    const positionRisk = {
      'OL': 1.5, 'RB': 1.4, 'LB': 1.3, 'DL': 1.2,
      'QB': 0.8, 'K': 0.5, 'P': 0.5
    };
    injuryChance *= (positionRisk[player.pos] || 1.0);
    
    // Playoff games are more intense
    if (context.isPlayoff) {
      injuryChance *= 1.3;
    }
    
    // Check if injury occurs
    if (Math.random() > injuryChance) {
      return null;
    }
    
    // Determine severity
    let severity = 'minor';
    const roll = Math.random();
    if (roll < 0.05) { // 5% major
      severity = 'major';
    } else if (roll < 0.25) { // 20% moderate
      severity = 'moderate';
    }
    
    // Select specific injury
    const injuries = INJURY_TYPES[severity];
    const injury = U.choice(injuries);
    
    // Create injury object
    const injuryObj = {
      id: U.id(),
      type: injury.name,
      severity: severity,
      weeksRemaining: injury.weeks,
      impact: injury.impact, // Performance reduction (0.0 to 1.0)
      seasonEnding: injury.seasonEnding || false,
      date: new Date().toISOString(),
      position: player.pos
    };
    
    return injuryObj;
  }

  /**
   * Apply injury to player
   * @param {Object} player - Player object
   * @param {Object} injury - Injury object
   */
  function applyInjury(player, injury) {
    if (!player || !injury) return;
    
    if (!player.injuries) {
      player.injuries = [];
    }
    
    player.injuries.push(injury);
    player.injured = true;
    
    // If season-ending, mark player
    if (injury.seasonEnding) {
      player.seasonEndingInjury = true;
    }
    
    console.log(`⚠️ ${player.name} (${player.pos}) injured: ${injury.type} (${injury.weeksRemaining} weeks)`);
  }

  /**
   * Process weekly injury recovery
   * @param {Object} league - League object
   */
  function processInjuryRecovery(league) {
    if (!league || !league.teams) return;
    
    league.teams.forEach(team => {
      if (!team.roster) return;
      
      team.roster.forEach(player => {
        if (!player.injuries || player.injuries.length === 0) {
          player.injured = false;
          return;
        }
        
        // Process each injury
        player.injuries = player.injuries.filter(injury => {
          injury.weeksRemaining--;
          
          if (injury.weeksRemaining <= 0) {
            // Injury healed
            console.log(`✅ ${player.name} recovered from ${injury.type}`);
            return false; // Remove injury
          }
          
          return true; // Keep injury
        });
        
        // Update injured status
        player.injured = player.injuries.length > 0;
        
        // Clear season-ending flag if all injuries healed
        if (!player.injured) {
          player.seasonEndingInjury = false;
        }
      });
    });
  }

  /**
   * Get effective rating for injured player
   * @param {Object} player - Player object
   * @returns {number} Effective overall rating
   */
  function getEffectiveRating(player) {
    if (!player || !player.injured || !player.injuries) {
      return player.ovr || 0;
    }
    
    let totalImpact = 0;
    player.injuries.forEach(injury => {
      totalImpact += injury.impact;
    });
    
    // Cap total impact at 0.85 (player still has some ability)
    totalImpact = Math.min(totalImpact, 0.85);
    
    const baseOvr = player.ovr || 0;
    return Math.max(40, Math.round(baseOvr * (1 - totalImpact)));
  }

  /**
   * Check if player can play (not season-ending injury)
   * @param {Object} player - Player object
   * @returns {boolean} Can play
   */
  function canPlayerPlay(player) {
    if (!player || !player.injured) return true;
    
    // Can't play with season-ending injury
    if (player.seasonEndingInjury) return false;
    
    // Can play but at reduced effectiveness
    return true;
  }

  /**
   * Get injury status display
   * @param {Object} player - Player object
   * @returns {string} Injury status text
   */
  function getInjuryStatus(player) {
    if (!player || !player.injured || !player.injuries || player.injuries.length === 0) {
      return '';
    }
    
    const injury = player.injuries[0]; // Show most severe
    const weeks = injury.weeksRemaining;
    
    if (injury.seasonEnding) {
      return `🚑 ${injury.type} (Out for Season)`;
    }
    
    return `🚑 ${injury.type} (${weeks} week${weeks !== 1 ? 's' : ''})`;
  }

  // Export functions
  window.generateInjury = generateInjury;
  window.applyInjury = applyInjury;
  window.processInjuryRecovery = processInjuryRecovery;
  window.getEffectiveRating = getEffectiveRating;
  window.canPlayerPlay = canPlayerPlay;
  window.getInjuryStatus = getInjuryStatus;

  console.log('✅ Injury System loaded');

})();
