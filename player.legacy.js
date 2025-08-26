// player-legacy.js - Enhanced Player Statistics System
'use strict';

/**
 * Initialize enhanced player statistics and legacy tracking
 * @param {Object} player - Player object
 * @returns {Object} Player with initialized legacy stats
 */
function initializePlayerLegacy(player) {
  if (!player) return null;
  
  if (!player.legacy) {
    player.legacy = {
      // Career milestones
      milestones: [],
      
      // Career achievements
      achievements: [],
      
      // All-time rankings (within team and league)
      rankings: {
        team: {},
        league: {}
      },
      
      // Contract history
      contractHistory: [],
      
      // Team history
      teamHistory: [],
      
      // Playoff performance
      playoffStats: {
        games: 0,
        wins: 0,
        losses: 0,
        stats: {}
      },
      
      // Awards and recognitions
      awards: {
        playerOfYear: 0,
        allPro: 0,
        proBowl: 0,
        rookie: 0,
        comeback: 0,
        other: []
      },
      
      // Records held
      records: {
        team: [],
        league: []
      },
      
      // Legacy metrics
      metrics: {
        impactScore: 0,        // Overall impact on games/seasons
        clutchScore: 0,        // Performance in crucial moments
        longevityScore: 0,     // Career length and consistency
        peakScore: 0,          // Best season performance
        legacyScore: 0         // Overall legacy rating
      },
      
      // Notable games/performances
      notablePerformances: [],
      
      // Injuries and durability
      healthRecord: {
        gamesPlayed: 0,
        gamesMissed: 0,
        majorInjuries: [],
        durabilityRating: 100
      },
      
      // Hall of Fame tracking
      hallOfFame: {
        eligible: false,
        inducted: false,
        eligibilityYear: 0,
        votingHistory: []
      }
    };
  }
  
  // Enhanced stats tracking if not present
  if (!player.stats.career.advanced) {
    player.stats.career.advanced = {
      // Passing (QB)
      qbRating: 0,
      completionPct: 0,
      yardsPerAttempt: 0,
      touchdownPct: 0,
      interceptionPct: 0,
      
      // Rushing (RB/QB)
      yardsPerCarry: 0,
      rushingTouchdowns: 0,
      fumbles: 0,
      
      // Receiving (WR/TE/RB)
      receptionsPerGame: 0,
      yardsPerReception: 0,
      catchPct: 0,
      droppedPasses: 0,
      
      // Defense
      tacklesPerGame: 0,
      sacks: 0,
      interceptions: 0,
      forcedFumbles: 0,
      defensiveScore: 0,
      
      // Special Teams
      kickingPct: 0,
      fieldGoalLong: 0,
      puntAverage: 0,
      
      // Advanced metrics
      winShares: 0,           // Player's contribution to team wins
      gameScore: 0,           // Average game impact
      clutchPerformance: 0,   // Performance in close games
      rivalryPerformance: 0   // Performance vs rivals
    };
  }
  
  return player;
}

/**
 * Update player statistics after a game
 * @param {Object} player - Player object
 * @param {Object} gameStats - Game statistics
 * @param {Object} gameContext - Game context (playoff, rivalry, etc.)
 */
function updatePlayerGameLegacy(player, gameStats, gameContext = {}) {
  if (!player || !gameStats) return;
  
  try {
    initializePlayerLegacy(player);
    
    // Update health record
    if (gameStats.injured) {
      player.legacy.healthRecord.gamesMissed++;
      if (gameStats.majorInjury) {
        player.legacy.healthRecord.majorInjuries.push({
          year: gameContext.year || state.league?.year || 2025,
          injury: gameStats.injury || 'Unknown',
          weeksOut: gameStats.weeksOut || 1
        });
      }
    } else {
      player.legacy.healthRecord.gamesPlayed++;
    }
    
    // Update durability rating
    const totalGames = player.legacy.healthRecord.gamesPlayed + player.legacy.healthRecord.gamesMissed;
    if (totalGames > 0) {
      player.legacy.healthRecord.durabilityRating = 
        Math.round((player.legacy.healthRecord.gamesPlayed / totalGames) * 100);
    }
    
    // Track notable performances
    checkForNotablePerformance(player, gameStats, gameContext);
    
    // Update playoff stats if playoff game
    if (gameContext.isPlayoff) {
      updatePlayoffStats(player, gameStats, gameContext);
    }
    
    // Update clutch performance tracking
    if (gameContext.clutchSituation) {
      updateClutchStats(player, gameStats, gameContext);
    }
    
    // Check for milestones
    checkCareerMilestones(player);
    
  } catch (error) {
    console.error('Error updating player game legacy:', error);
  }
}

/**
 * Update player statistics at end of season
 * @param {Object} player - Player object
 * @param {Object} seasonStats - Season statistics
 * @param {Object} team - Team object
 * @param {number} year - Season year
 */
function updatePlayerSeasonLegacy(player, seasonStats, team, year) {
  if (!player || !seasonStats || !team) return;
  
  try {
    initializePlayerLegacy(player);
    
    // Add season to team history
    const teamSeason = {
      year: year,
      team: team.abbr,
      teamName: team.name,
      stats: { ...seasonStats },
      teamRecord: {
        wins: team.record?.w || 0,
        losses: team.record?.l || 0,
        ties: team.record?.t || 0
      },
      playoffAppearance: seasonStats.madePlayoffs || false,
      championships: seasonStats.championships || []
    };
    
    player.legacy.teamHistory.push(teamSeason);
    
    // Check for season awards
    checkSeasonAwards(player, seasonStats, team, year);
    
    // Update advanced career statistics
    updateAdvancedStats(player, seasonStats);
    
    // Calculate impact metrics
    calculateImpactMetrics(player, seasonStats, team, year);
    
    // Check for records
    checkPlayerRecords(player, seasonStats, team, year);
    
    // Update legacy score
    calculateLegacyScore(player);
    
  } catch (error) {
    console.error('Error updating player season legacy:', error);
  }
}

/**
 * Check for notable individual game performances
 * @param {Object} player - Player object
 * @param {Object} gameStats - Game statistics
 * @param {Object} gameContext - Game context
 */
function checkForNotablePerformance(player, gameStats, gameContext) {
  const notable = [];
  
  // Position-specific notable performances
  if (player.pos === 'QB') {
    if (gameStats.passYd >= 400) notable.push('400+ Passing Yards');
    if (gameStats.passTD >= 5) notable.push('5+ Passing TDs');
    if (gameStats.passYd >= 300 && gameStats.rushYd >= 100) notable.push('300 Pass + 100 Rush');
  } else if (player.pos === 'RB') {
    if (gameStats.rushYd >= 200) notable.push('200+ Rushing Yards');
    if (gameStats.rushTD >= 4) notable.push('4+ Rushing TDs');
    if (gameStats.rushYd >= 100 && gameStats.recYd >= 100) notable.push('100 Rush + 100 Rec');
  } else if (player.pos === 'WR' || player.pos === 'TE') {
    if (gameStats.recYd >= 200) notable.push('200+ Receiving Yards');
    if (gameStats.recTD >= 3) notable.push('3+ Receiving TDs');
    if (gameStats.receptions >= 15) notable.push('15+ Receptions');
  }
  
  // Add notable performances
  if (notable.length > 0) {
    player.legacy.notablePerformances.push({
      year: gameContext.year || state.league?.year || 2025,
      week: gameContext.week || 1,
      opponent: gameContext.opponent || 'Unknown',
      performances: notable,
      isPlayoff: gameContext.isPlayoff || false,
      gameWon: gameContext.teamWon || false
    });
  }
}

/**
 * Update playoff statistics
 * @param {Object} player - Player object
 * @param {Object} gameStats - Game statistics
 * @param {Object} gameContext - Game context
 */
function updatePlayoffStats(player, gameStats, gameContext) {
  const playoffs = player.legacy.playoffStats;
  
  playoffs.games++;
  if (gameContext.teamWon) {
    playoffs.wins++;
  } else {
    playoffs.losses++;
  }
  
  // Add to playoff stats
  Object.keys(gameStats).forEach(stat => {
    if (typeof gameStats[stat] === 'number') {
      playoffs.stats[stat] = (playoffs.stats[stat] || 0) + gameStats[stat];
    }
  });
}

/**
 * Update clutch performance tracking
 * @param {Object} player - Player object
 * @param {Object} gameStats - Game statistics
 * @param {Object} gameContext - Game context
 */
function updateClutchStats(player, gameStats, gameContext) {
  // Track performance in crucial moments
  const clutchValue = calculateClutchValue(gameStats, gameContext);
  
  const currentClutch = player.legacy.metrics.clutchScore || 0;
  player.legacy.metrics.clutchScore = (currentClutch + clutchValue) / 2;
}

/**
 * Calculate clutch value for a performance
 * @param {Object} gameStats - Game statistics
 * @param {Object} gameContext - Game context
 * @returns {number} Clutch value (0-100)
 */
function calculateClutchValue(gameStats, gameContext) {
  let clutchValue = 50; // Base value
  
  // Game situation modifiers
  if (gameContext.gameWinning) clutchValue += 30;
  if (gameContext.gameTying) clutchValue += 20;
  if (gameContext.fourthQuarter) clutchValue += 15;
  if (gameContext.overtime) clutchValue += 25;
  if (gameContext.isPlayoff) clutchValue += 20;
  
  // Performance modifiers based on position
  if (player.pos === 'QB') {
    if (gameStats.passTD > 0) clutchValue += 10;
    if (gameStats.interceptions === 0) clutchValue += 5;
  } else if (player.pos === 'RB') {
    if (gameStats.rushTD > 0) clutchValue += 10;
    if (gameStats.rushYd > 50) clutchValue += 5;
  } else if (player.pos === 'WR' || player.pos === 'TE') {
    if (gameStats.recTD > 0) clutchValue += 10;
    if (gameStats.receptions >= 5) clutchValue += 5;
  }
  
  return Math.max(0, Math.min(100, clutchValue));
}

/**
 * Check for career milestones
 * @param {Object} player - Player object
 */
function checkCareerMilestones(player) {
  if (!player.stats.career) return;
  
  const career = player.stats.career;
  const milestones = player.legacy.milestones;
  
  // Define milestone thresholds
  const milestoneSets = {
    QB: [
      { stat: 'passYd', thresholds: [5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000], suffix: 'Passing Yards' },
      { stat: 'passTD', thresholds: [50, 100, 200, 300, 400, 500], suffix: 'Passing TDs' },
      { stat: 'passComp', thresholds: [1000, 2000, 3000, 4000, 5000], suffix: 'Completions' }
    ],
    RB: [
      { stat: 'rushYd', thresholds: [1000, 5000, 10000, 15000, 20000], suffix: 'Rushing Yards' },
      { stat: 'rushTD', thresholds: [10, 25, 50, 100, 150], suffix: 'Rushing TDs' },
      { stat: 'rushAtt', thresholds: [500, 1000, 2000, 3000], suffix: 'Rushing Attempts' }
    ],
    WR: [
      { stat: 'recYd', thresholds: [1000, 5000, 10000, 15000, 20000], suffix: 'Receiving Yards' },
      { stat: 'receptions', thresholds: [100, 500, 1000, 1500], suffix: 'Receptions' },
      { stat: 'recTD', thresholds: [10, 25, 50, 100, 150], suffix: 'Receiving TDs' }
    ]
  };
  
  const playerMilestones = milestoneSets[player.pos] || [];
  
  playerMilestones.forEach(milestoneSet => {
    const currentValue = career[milestoneSet.stat] || 0;
    
    milestoneSet.thresholds.forEach(threshold => {
      const milestoneKey = `${milestoneSet.stat}_${threshold}`;
      
      if (currentValue >= threshold && !milestones.find(m => m.key === milestoneKey)) {
        milestones.push({
          key: milestoneKey,
          year: state.league?.year || 2025,
          description: `${threshold.toLocaleString()} ${milestoneSet.suffix}`,
          value: currentValue,
          rarity: getMilestoneRarity(threshold, milestoneSet.stat)
        });
      }
    });
  });
}

/**
 * Get rarity level for milestone
 * @param {number} threshold - Milestone threshold
 * @param {string} stat - Statistic type
 * @returns {string} Rarity level
 */
function getMilestoneRarity(threshold, stat) {
  const rarityThresholds = {
    passYd: { rare: 40000, legendary: 60000 },
    rushYd: { rare: 15000, legendary: 20000 },
    recYd: { rare: 12000, legendary: 18000 },
    passTD: { rare: 300, legendary: 450 },
    rushTD: { rare: 100, legendary: 150 },
    recTD: { rare: 80, legendary: 120 }
  };
  
  const thresholds = rarityThresholds[stat];
  if (!thresholds) return 'Common';
  
  if (threshold >= thresholds.legendary) return 'Legendary';
  if (threshold >= thresholds.rare) return 'Rare';
  return 'Common';
}

/**
 * Check for season awards
 * @param {Object} player - Player object
 * @param {Object} seasonStats - Season statistics
 * @param {Object} team - Team object
 * @param {number} year - Season year
 */
function checkSeasonAwards(player, seasonStats, team, year) {
  const awards = player.legacy.awards;
  
  // Simplified award logic (in full implementation, this would compare against all players)
  
  // Pro Bowl (top performers at each position)
  if (player.ovr >= 88 && seasonStats.gamesPlayed >= 12) {
    awards.proBowl++;
    player.awards = player.awards || [];
    player.awards.push({
      year: year,
      award: 'Pro Bowl',
      details: 'Selected to Pro Bowl'
    });
  }
  
  // All-Pro (elite performers)
  if (player.ovr >= 93 && seasonStats.gamesPlayed >= 14) {
    awards.allPro++;
    player.awards = player.awards || [];
    player.awards.push({
      year: year,
      award: 'All-Pro',
      details: 'Named to All-Pro team'
    });
  }
  
  // Position-specific awards
  if (player.pos === 'QB' && seasonStats.passTD >= 35 && team.record.w >= 12) {
    awards.playerOfYear++;
    player.awards = player.awards || [];
    player.awards.push({
      year: year,
      award: 'Player of the Year',
      details: 'Outstanding QB performance'
    });
  }
  
  if (player.pos === 'RB' && seasonStats.rushYd >= 1500) {
    player.awards = player.awards || [];
    player.awards.push({
      year: year,
      award: 'Rushing Leader',
      details: `${seasonStats.rushYd} rushing yards`
    });
  }
  
  // Rookie awards (first season)
  if (player.age <= 23 && (player.legacy.teamHistory?.length || 0) === 1) {
    if (player.ovr >= 85) {
      awards.rookie++;
      player.awards = player.awards || [];
      player.awards.push({
        year: year,
        award: 'Rookie of the Year',
        details: 'Outstanding rookie season'
      });
    }
  }
}

/**
 * Update advanced statistics
 * @param {Object} player - Player object
 * @param {Object} seasonStats - Season statistics
 */
function updateAdvancedStats(player, seasonStats) {
  const advanced = player.stats.career.advanced;
  
  if (player.pos === 'QB') {
    const attempts = seasonStats.passAtt || 1;
    const completions = seasonStats.passComp || 0;
    
    advanced.completionPct = completions / attempts;
    advanced.yardsPerAttempt = (seasonStats.passYd || 0) / attempts;
    advanced.touchdownPct = (seasonStats.passTD || 0) / attempts;
    advanced.interceptionPct = (seasonStats.interceptions || 0) / attempts;
    advanced.qbRating = calculateQBRating(seasonStats);
  }
  
  if (player.pos === 'RB') {
    const rushAttempts = seasonStats.rushAtt || 1;
    advanced.yardsPerCarry = (seasonStats.rushYd || 0) / rushAttempts;
    advanced.fumbles = (advanced.fumbles || 0) + (seasonStats.fumbles || 0);
  }
  
  if (player.pos === 'WR' || player.pos === 'TE') {
    const targets = seasonStats.targets || Math.max(1, seasonStats.receptions || 1);
    advanced.catchPct = (seasonStats.receptions || 0) / targets;
    advanced.yardsPerReception = (seasonStats.recYd || 0) / Math.max(1, seasonStats.receptions || 1);
    advanced.receptionsPerGame = (seasonStats.receptions || 0) / Math.max(1, seasonStats.gamesPlayed || 1);
  }
}

/**
 * Calculate QB rating (simplified)
 * @param {Object} seasonStats - Season statistics
 * @returns {number} QB rating
 */
function calculateQBRating(seasonStats) {
  const attempts = seasonStats.passAtt || 1;
  const completions = seasonStats.passComp || 0;
  const yards = seasonStats.passYd || 0;
  const touchdowns = seasonStats.passTD || 0;
  const interceptions = seasonStats.interceptions || 0;
  
  // Simplified QB rating calculation
  const compPct = (completions / attempts - 0.3) * 5;
  const yardsPer = (yards / attempts - 3) * 0.25;
  const touchdownPer = touchdowns / attempts * 20;
  const intPer = 2.375 - (interceptions / attempts * 25);
  
  const rating = ((compPct + yardsPer + touchdownPer + intPer) / 6) * 100;
  return Math.max(0, Math.min(158.3, rating));
}

/**
 * Calculate impact metrics for player
 * @param {Object} player - Player object
 * @param {Object} seasonStats - Season statistics
 * @param {Object} team - Team object
 * @param {number} year - Season year
 */
function calculateImpactMetrics(player, seasonStats, team, year) {
  const metrics = player.legacy.metrics;
  
  // Impact score based on team success and individual performance
  const teamWinPct = (team.record.w || 0) / Math.max(1, (team.record.w || 0) + (team.record.l || 0));
  const playerPerformance = Math.min(100, player.ovr + (seasonStats.gamesPlayed || 0));
  
  metrics.impactScore = Math.round((teamWinPct * 50) + (playerPerformance * 0.5));
  
  // Peak score (best single season)
  const currentSeasonScore = calculateSeasonScore(player, seasonStats);
  metrics.peakScore = Math.max(metrics.peakScore || 0, currentSeasonScore);
  
  // Longevity score based on career length and consistency
  const seasonsPlayed = player.legacy.teamHistory?.length || 1;
  metrics.longevityScore = Math.min(100, seasonsPlayed * 5 + player.ovr);
}

/**
 * Calculate score for individual season
 * @param {Object} player - Player object
 * @param {Object} seasonStats - Season statistics
 * @returns {number} Season score
 */
function calculateSeasonScore(player, seasonStats) {
  let score = player.ovr; // Base on overall rating
  
  // Add bonuses for statistical achievement
  if (player.pos === 'QB') {
    if (seasonStats.passTD >= 35) score += 10;
    if (seasonStats.passYd >= 4500) score += 10;
    if (seasonStats.interceptions <= 8) score += 5;
  } else if (player.pos === 'RB') {
    if (seasonStats.rushYd >= 1500) score += 10;
    if (seasonStats.rushTD >= 15) score += 10;
  } else if (player.pos === 'WR') {
    if (seasonStats.recYd >= 1400) score += 10;
    if (seasonStats.recTD >= 12) score += 10;
  }
  
  // Games played bonus
  if (seasonStats.gamesPlayed >= 16) score += 5;
  
  return Math.min(100, score);
}

/**
 * Check for player records
 * @param {Object} player - Player object
 * @param {Object} seasonStats - Season statistics
 * @param {Object} team - Team object
 * @param {number} year - Season year
 */
function checkPlayerRecords(player, seasonStats, team, year) {
  // This would compare against historical records
  // Simplified implementation
  
  const records = player.legacy.records;
  
  // Team records (simplified - would need historical team data)
  if (player.pos === 'QB' && seasonStats.passTD >= 40) {
    records.team.push({
      record: 'Single Season Passing TDs',
      value: seasonStats.passTD,
      year: year,
      previous: 35 // Would be actual previous record
    });
  }
  
  if (player.pos === 'RB' && seasonStats.rushYd >= 2000) {
    records.team.push({
      record: 'Single Season Rushing Yards',
      value: seasonStats.rushYd,
      year: year,
      previous: 1800 // Would be actual previous record
    });
  }
}

/**
 * Calculate overall legacy score
 * @param {Object} player - Player object
 */
function calculateLegacyScore(player) {
  if (!player.legacy) return;
  
  const metrics = player.legacy.metrics;
  const awards = player.legacy.awards;
  
  let legacyScore = 0;
  
  // Base score from performance metrics
  legacyScore += (metrics.impactScore || 0) * 0.3;
  legacyScore += (metrics.peakScore || 0) * 0.25;
  legacyScore += (metrics.longevityScore || 0) * 0.2;
  legacyScore += (metrics.clutchScore || 0) * 0.15;
  
  // Awards bonus
  legacyScore += (awards.playerOfYear || 0) * 5;
  legacyScore += (awards.allPro || 0) * 3;
  legacyScore += (awards.proBowl || 0) * 1;
  
  // Championship bonus
  const championships = player.awards?.filter(a => a.award === 'Super Bowl Champion').length || 0;
  legacyScore += championships * 10;
  
  // Records bonus
  legacyScore += (player.legacy.records?.team?.length || 0) * 2;
  legacyScore += (player.legacy.records?.league?.length || 0) * 5;
  
  metrics.legacyScore = Math.max(0, Math.min(100, Math.round(legacyScore)));
}

/**
 * Check Hall of Fame eligibility
 * @param {Object} player - Player object
 * @param {number} currentYear - Current year
 * @returns {boolean} Whether player is eligible
 */
function checkHallOfFameEligibility(player, currentYear) {
  if (!player.legacy) return false;
  
  const hof = player.legacy.hallOfFame;
  const careerLength = player.legacy.teamHistory?.length || 0;
  
  // Must be retired for 5 years and played at least 5 seasons
  if (player.years <= 0 && careerLength >= 5) {
    const retirementYear = currentYear; // Simplified
    const eligibilityYear = retirementYear + 5;
    
    if (currentYear >= eligibilityYear) {
      hof.eligible = true;
      hof.eligibilityYear = eligibilityYear;
      
      // Check if worthy of induction
      const legacyThreshold = getHOFThreshold(player.pos);
      if (player.legacy.metrics.legacyScore >= legacyThreshold) {
        hof.inducted = true;
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get Hall of Fame threshold by position
 * @param {string} position - Player position
 * @returns {number} Legacy score threshold
 */
function getHOFThreshold(position) {
  const thresholds = {
    QB: 75,
    RB: 70,
    WR: 70,
    TE: 65,
    OL: 65,
    DL: 65,
    LB: 65,
    CB: 65,
    S: 65,
    K: 80,
    P: 80
  };
  
  return thresholds[position] || 70;
}

// Make functions globally available
window.initializePlayerLegacy = initializePlayerLegacy;
window.updatePlayerGameLegacy = updatePlayerGameLegacy;
window.updatePlayerSeasonLegacy = updatePlayerSeasonLegacy;
window.checkForNotablePerformance = checkForNotablePerformance;
window.updatePlayoffStats = updatePlayoffStats;
window.checkCareerMilestones = checkCareerMilestones;
window.checkSeasonAwards = checkSeasonAwards;
window.updateAdvancedStats = updateAdvancedStats;
window.calculateImpactMetrics = calculateImpactMetrics;
window.calculateLegacyScore = calculateLegacyScore;
window.checkHallOfFameEligibility = checkHallOfFameEligibility;
