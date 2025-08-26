// team-statistics.js - Comprehensive Team History System
'use strict';

/**
 * Initialize team statistics and franchise history
 * @param {Object} team - Team object
 * @returns {Object} Team with initialized statistics
 */
function initializeTeamStatistics(team) {
  if (!team) return null;
  
  if (!team.franchiseHistory) {
    team.franchiseHistory = {
      founded: generateFoundingYear(team),
      totalSeasons: 0,
      
      // All-time regular season record
      regularSeason: {
        wins: 0,
        losses: 0,
        ties: 0,
        winPercentage: 0.0
      },
      
      // All-time playoff record
      playoffs: {
        appearances: 0,
        wins: 0,
        losses: 0,
        winPercentage: 0.0
      },
      
      // Championships and achievements
      championships: {
        superBowls: 0,
        superBowlAppearances: 0,
        conferenceChampionships: 0,
        divisionTitles: 0
      },
      
      // Season-by-season history
      seasonHistory: [],
      
      // Notable achievements
      achievements: [],
      
      // Best/worst seasons
      bestSeason: {
        year: 0,
        wins: 0,
        losses: 17,
        ties: 0,
        winPercentage: 0.0,
        note: ''
      },
      
      worstSeason: {
        year: 0,
        wins: 17,
        losses: 0,
        ties: 0,
        winPercentage: 1.0,
        note: ''
      },
      
      // Playoff streaks and droughts
      streaks: {
        currentWinStreak: 0,
        currentLossStreak: 0,
        longestWinStreak: { games: 0, startYear: 0, endYear: 0 },
        longestLossStreak: { games: 0, startYear: 0, endYear: 0 },
        playoffDrought: 0, // Years since last playoff appearance
        longestPlayoffDrought: 0
      },
      
      // Retired numbers and hall of famers
      retiredNumbers: [],
      hallOfFamers: [],
      
      // Home stadium and attendance
      stadium: {
        name: generateStadiumName(team),
        capacity: generateStadiumCapacity(),
        opened: 0
      }
    };
  }
  
  // Initialize team culture and preferences
  if (!team.culture) {
    team.culture = initializeTeamCulture(team);
  }
  
  return team;
}

/**
 * Initialize team culture including coaching preferences
 * @param {Object} team - Team object
 * @returns {Object} Team culture object
 */
function initializeTeamCulture(team) {
  const U = window.Utils;
  
  return {
    // Coaching style preferences
    preferredCoachingStyle: generatePreferredCoachingStyle(),
    
    // Team identity and philosophy
    identity: {
      offense: U ? U.choice(['Power Running', 'Air Raid', 'West Coast', 'Spread', 'Pro Style']) : 'Pro Style',
      defense: U ? U.choice(['3-4', '4-3', 'Hybrid', 'Multiple']) : '4-3',
      philosophy: U ? U.choice(['Aggressive', 'Conservative', 'Balanced', 'Innovative']) : 'Balanced'
    },
    
    // Organization values
    values: {
      playerDevelopment: U ? U.rand(50, 95) : 75,    // How much they invest in developing players
      loyalty: U ? U.rand(50, 95) : 75,              // Loyalty to players and staff
      innovation: U ? U.rand(50, 95) : 75,           // Willingness to try new approaches
      tradition: U ? U.rand(50, 95) : 75,            // Emphasis on franchise tradition
      community: U ? U.rand(50, 95) : 75             // Community involvement
    },
    
    // Financial approach
    spending: {
      playerSalaries: U ? U.choice(['Big Spender', 'Average', 'Budget Conscious']) : 'Average',
      facilities: U ? U.choice(['State of Art', 'Modern', 'Basic']) : 'Modern',
      scouting: U ? U.choice(['Extensive', 'Standard', 'Limited']) : 'Standard'
    },
    
    // Team traditions
    traditions: generateTeamTraditions(team),
    
    // Fan base characteristics
    fanBase: {
      size: U ? U.choice(['Massive', 'Large', 'Medium', 'Small']) : 'Medium',
      loyalty: U ? U.rand(60, 95) : 80,
      expectations: U ? U.choice(['Championship', 'Playoffs', 'Competitive', 'Patient']) : 'Competitive'
    }
  };
}

/**
 * Generate preferred coaching style based on team history and culture
 * @returns {Object} Preferred coaching characteristics
 */
function generatePreferredCoachingStyle() {
  const U = window.Utils;
  
  return {
    // Personality preferences
    personality: {
      aggression: U ? U.rand(30, 90) : 60,        // Preferred coaching aggression level
      experience: U ? U.choice(['Veteran', 'Mixed', 'Young']) : 'Mixed',
      communication: U ? U.choice(['Players Coach', 'Disciplinarian', 'Teacher']) : 'Teacher'
    },
    
    // Strategic preferences  
    strategy: {
      offensiveStyle: U ? U.choice(['Conservative', 'Balanced', 'Aggressive']) : 'Balanced',
      riskTaking: U ? U.rand(20, 80) : 50,
      playerDevelopment: U ? U.rand(60, 95) : 80
    },
    
    // Background preferences
    background: {
      preferredPosition: U ? U.choice(['Any', 'Offensive', 'Defensive']) : 'Any',
      collegeExperience: U ? U.choice(['Required', 'Preferred', 'Neutral', 'Avoided']) : 'Neutral',
      franchiseHistory: U ? U.choice(['Internal Promotion', 'Fresh Blood', 'No Preference']) : 'No Preference'
    },
    
    // Contract preferences
    contract: {
      maxLength: U ? U.rand(3, 7) : 5,
      maxSalary: U ? U.rand(4000000, 12000000) : 8000000,
      jobSecurity: U ? U.choice(['High', 'Medium', 'Performance Based']) : 'Medium'
    }
  };
}

/**
 * Generate founding year for team
 * @param {Object} team - Team object
 * @returns {number} Founding year
 */
function generateFoundingYear(team) {
  // Most NFL teams founded between 1920-1999
  const U = window.Utils;
  const commonFoundingYears = [1920, 1925, 1930, 1932, 1946, 1950, 1960, 1966, 1970, 1976, 1995, 1999, 2002];
  return U ? U.choice(commonFoundingYears) : 1970;
}

/**
 * Generate stadium name
 * @param {Object} team - Team object
 * @returns {string} Stadium name
 */
function generateStadiumName(team) {
  const suffixes = ['Stadium', 'Field', 'Dome', 'Coliseum', 'Arena'];
  const prefixes = ['Memorial', 'Veterans', 'Municipal', 'City', 'Metropolitan'];
  const U = window.Utils;
  
  // Some teams use team name in stadium
  if (Math.random() < 0.3) {
    return `${team.name} ${U ? U.choice(suffixes) : 'Stadium'}`;
  }
  
  // Some use city name
  if (Math.random() < 0.5) {
    return `${team.abbr} ${U ? U.choice(suffixes) : 'Stadium'}`;
  }
  
  // Others use generic names
  return `${U ? U.choice(prefixes) : 'Memorial'} ${U ? U.choice(suffixes) : 'Stadium'}`;
}

/**
 * Generate stadium capacity
 * @returns {number} Stadium capacity
 */
function generateStadiumCapacity() {
  const U = window.Utils;
  // NFL stadiums typically 50,000 - 85,000
  return U ? U.rand(50000, 85000) : 65000;
}

/**
 * Generate team traditions
 * @param {Object} team - Team object
 * @returns {Array} Array of team traditions
 */
function generateTeamTraditions(team) {
  const allTraditions = [
    'Retired number ceremonies',
    'Fan traditions',
    'Pre-game rituals',
    'Victory celebrations',
    'Community service programs',
    'Historic rivalries',
    'Legendary coaching tree',
    'Distinctive uniforms',
    'Famous fight song',
    'Championship banners'
  ];
  
  const U = window.Utils;
  const numTraditions = U ? U.rand(2, 5) : 3;
  const selectedTraditions = [];
  
  for (let i = 0; i < numTraditions; i++) {
    const tradition = U ? U.choice(allTraditions) : allTraditions[i];
    if (!selectedTraditions.includes(tradition)) {
      selectedTraditions.push(tradition);
    }
  }
  
  return selectedTraditions;
}

/**
 * Update team statistics after a game
 * @param {Object} team - Team object
 * @param {Object} gameResult - Game result
 * @param {boolean} isPlayoff - Whether this is a playoff game
 */
function updateTeamGameStats(team, gameResult, isPlayoff = false) {
  if (!team || !gameResult || !team.franchiseHistory) return;
  
  try {
    const stats = team.franchiseHistory;
    
    if (isPlayoff) {
      // Update playoff statistics
      if (gameResult.win) {
        stats.playoffs.wins++;
      } else if (!gameResult.tie) {
        stats.playoffs.losses++;
      }
      
      // Update playoff win percentage
      const totalPlayoffGames = stats.playoffs.wins + stats.playoffs.losses;
      if (totalPlayoffGames > 0) {
        stats.playoffs.winPercentage = stats.playoffs.wins / totalPlayoffGames;
      }
    } else {
      // Update regular season statistics
      if (gameResult.win) {
        stats.regularSeason.wins++;
        stats.streaks.currentWinStreak++;
        stats.streaks.currentLossStreak = 0;
      } else if (gameResult.tie) {
        stats.regularSeason.ties++;
        stats.streaks.currentWinStreak = 0;
        stats.streaks.currentLossStreak = 0;
      } else {
        stats.regularSeason.losses++;
        stats.streaks.currentLossStreak++;
        stats.streaks.currentWinStreak = 0;
      }
      
      // Update win percentage
      const totalGames = stats.regularSeason.wins + stats.regularSeason.losses + stats.regularSeason.ties;
      if (totalGames > 0) {
        stats.regularSeason.winPercentage = 
          (stats.regularSeason.wins + (stats.regularSeason.ties * 0.5)) / totalGames;
      }
      
      // Update longest streaks
      if (stats.streaks.currentWinStreak > stats.streaks.longestWinStreak.games) {
        stats.streaks.longestWinStreak = {
          games: stats.streaks.currentWinStreak,
          startYear: (state.league?.year || 2025) - Math.floor(stats.streaks.currentWinStreak / 16),
          endYear: state.league?.year || 2025
        };
      }
      
      if (stats.streaks.currentLossStreak > stats.streaks.longestLossStreak.games) {
        stats.streaks.longestLossStreak = {
          games: stats.streaks.currentLossStreak,
          startYear: (state.league?.year || 2025) - Math.floor(stats.streaks.currentLossStreak / 16),
          endYear: state.league?.year || 2025
        };
      }
    }
    
  } catch (error) {
    console.error('Error updating team game stats:', error);
  }
}

/**
 * Update team statistics at end of season
 * @param {Object} team - Team object
 * @param {Object} seasonStats - Season statistics
 * @param {number} year - Season year
 */
function updateTeamSeasonStats(team, seasonStats, year) {
  if (!team || !seasonStats || !team.franchiseHistory) return;
  
  try {
    const stats = team.franchiseHistory;
    stats.totalSeasons++;
    
    // Add to season history
    const seasonRecord = {
      year: year,
      wins: seasonStats.wins || 0,
      losses: seasonStats.losses || 0,
      ties: seasonStats.ties || 0,
      winPercentage: calculateWinPercentage(seasonStats.wins, seasonStats.losses, seasonStats.ties),
      pointsFor: seasonStats.pointsFor || 0,
      pointsAgainst: seasonStats.pointsAgainst || 0,
      playoffAppearance: seasonStats.madePlayoffs || false,
      playoffWins: seasonStats.playoffWins || 0,
      championships: seasonStats.championships || [],
      coach: seasonStats.headCoach || 'Unknown',
      keyPlayers: seasonStats.keyPlayers || []
    };
    
    stats.seasonHistory.push(seasonRecord);
    
    // Check if this is best/worst season
    const currentWinPct = seasonRecord.winPercentage;
    
    if (currentWinPct > stats.bestSeason.winPercentage) {
      stats.bestSeason = {
        year: year,
        wins: seasonStats.wins || 0,
        losses: seasonStats.losses || 0,
        ties: seasonStats.ties || 0,
        winPercentage: currentWinPct,
        note: generateSeasonNote(seasonStats, 'best')
      };
    }
    
    if (currentWinPct < stats.worstSeason.winPercentage) {
      stats.worstSeason = {
        year: year,
        wins: seasonStats.wins || 0,
        losses: seasonStats.losses || 0,
        ties: seasonStats.ties || 0,
        winPercentage: currentWinPct,
        note: generateSeasonNote(seasonStats, 'worst')
      };
    }
    
    // Update playoff drought tracking
    if (seasonStats.madePlayoffs) {
      stats.streaks.playoffDrought = 0;
      stats.playoffs.appearances++;
    } else {
      stats.streaks.playoffDrought++;
      if (stats.streaks.playoffDrought > stats.streaks.longestPlayoffDrought) {
        stats.streaks.longestPlayoffDrought = stats.streaks.playoffDrought;
      }
    }
    
    // Add notable achievements
    addSeasonAchievements(team, seasonStats, year);
    
  } catch (error) {
    console.error('Error updating team season stats:', error);
  }
}

/**
 * Add achievements for notable seasons
 * @param {Object} team - Team object
 * @param {Object} seasonStats - Season statistics
 * @param {number} year - Season year
 */
function addSeasonAchievements(team, seasonStats, year) {
  const stats = team.franchiseHistory;
  const achievements = [];
  
  // Perfect season
  if (seasonStats.wins === 17 && seasonStats.losses === 0) {
    achievements.push({
      year: year,
      type: 'Perfect Season',
      description: 'Completed undefeated regular season (17-0)',
      rarity: 'Legendary'
    });
  }
  
  // Outstanding season
  if (seasonStats.wins >= 15) {
    achievements.push({
      year: year,
      type: 'Outstanding Season',
      description: `${seasonStats.wins}-${seasonStats.losses}-${seasonStats.ties || 0} record`,
      rarity: 'Rare'
    });
  }
  
  // Division title
  if (seasonStats.divisionChampion) {
    stats.championships.divisionTitles++;
    achievements.push({
      year: year,
      type: 'Division Champion',
      description: 'Won division title',
      rarity: 'Common'
    });
  }
  
  // Conference championship
  if (seasonStats.conferenceChampion) {
    stats.championships.conferenceChampionships++;
    achievements.push({
      year: year,
      type: 'Conference Champion',
      description: 'Won conference championship',
      rarity: 'Uncommon'
    });
  }
  
  // Super Bowl
  if (seasonStats.superBowlChampion) {
    stats.championships.superBowls++;
    achievements.push({
      year: year,
      type: 'Super Bowl Champion',
      description: 'Won Super Bowl',
      rarity: 'Legendary'
    });
  }
  
  // Super Bowl appearance
  if (seasonStats.superBowlAppearance) {
    stats.championships.superBowlAppearances++;
  }
  
  // Add all achievements
  achievements.forEach(achievement => {
    stats.achievements.push(achievement);
  });
}

/**
 * Generate descriptive note for notable seasons
 * @param {Object} seasonStats - Season statistics
 * @param {string} type - 'best' or 'worst'
 * @returns {string} Descriptive note
 */
function generateSeasonNote(seasonStats, type) {
  if (type === 'best') {
    if (seasonStats.superBowlChampion) return 'Super Bowl Champions';
    if (seasonStats.conferenceChampion) return 'Conference Champions';
    if (seasonStats.wins >= 15) return 'Outstanding Season';
    if (seasonStats.madePlayoffs) return 'Playoff Team';
    return 'Strong Season';
  } else {
    if (seasonStats.wins === 0) return 'Winless Season';
    if (seasonStats.wins <= 2) return 'Historically Bad';
    if (seasonStats.wins <= 5) return 'Rebuilding Year';
    return 'Disappointing Season';
  }
}

/**
 * Calculate win percentage
 * @param {number} wins - Number of wins
 * @param {number} losses - Number of losses
 * @param {number} ties - Number of ties
 * @returns {number} Win percentage as decimal
 */
function calculateWinPercentage(wins, losses, ties = 0) {
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return (wins + (ties * 0.5)) / totalGames;
}

/**
 * Get coaching fit score for a coach with a team
 * @param {Object} coach - Coach object
 * @param {Object} team - Team object
 * @returns {number} Fit score (0-100)
 */
function calculateCoachingFit(coach, team) {
  if (!coach || !team || !team.culture) return 50;
  
  let fitScore = 50; // Base score
  const culture = team.culture;
  const preferences = culture.preferredCoachingStyle;
  
  try {
    // Personality fit
    if (coach.personality) {
      const aggressionDiff = Math.abs((coach.personality.aggression || 50) - preferences.personality.aggression);
      fitScore += (50 - aggressionDiff) * 0.3;
    }
    
    // Experience fit
    const coachExperience = coach.stats?.asHeadCoach?.seasons || 0;
    if (preferences.personality.experience === 'Veteran' && coachExperience >= 10) fitScore += 15;
    if (preferences.personality.experience === 'Young' && coachExperience <= 3) fitScore += 15;
    if (preferences.personality.experience === 'Mixed') fitScore += 5;
    
    // Success fit (teams want winners)
    const coachWinPct = coach.stats?.asHeadCoach?.regularSeason?.winPercentage || 0;
    fitScore += coachWinPct * 20;
    
    // Philosophy fit
    const teamValues = culture.values;
    if (coach.development && teamValues.playerDevelopment > 80) fitScore += 10;
    if (coach.innovation && teamValues.innovation > 80) fitScore += 10;
    
    return Math.max(0, Math.min(100, Math.round(fitScore)));
    
  } catch (error) {
    console.error('Error calculating coaching fit:', error);
    return 50;
  }
}

/**
 * Generate franchise legacy score
 * @param {Object} team - Team object
 * @returns {number} Legacy score (0-100)
 */
function calculateFranchiseLegacy(team) {
  if (!team || !team.franchiseHistory) return 0;
  
  const stats = team.franchiseHistory;
  let legacyScore = 0;
  
  // Super Bowl wins (most important)
  legacyScore += stats.championships.superBowls * 20;
  
  // Conference championships
  legacyScore += stats.championships.conferenceChampionships * 8;
  
  // Division titles
  legacyScore += stats.championships.divisionTitles * 3;
  
  // Overall win percentage
  legacyScore += stats.regularSeason.winPercentage * 25;
  
  // Playoff success
  if (stats.playoffs.appearances > 0) {
    legacyScore += stats.playoffs.winPercentage * 15;
  }
  
  // Longevity bonus
  if (stats.totalSeasons >= 50) legacyScore += 10;
  else if (stats.totalSeasons >= 25) legacyScore += 5;
  
  // Perfect seasons
  const perfectSeasons = stats.achievements.filter(a => a.type === 'Perfect Season').length;
  legacyScore += perfectSeasons * 15;
  
  // Outstanding seasons (15+ wins)
  const outstandingSeasons = stats.achievements.filter(a => a.type === 'Outstanding Season').length;
  legacyScore += outstandingSeasons * 2;
  
  return Math.max(0, Math.min(100, Math.round(legacyScore)));
}

/**
 * Get all-time team rankings
 * @param {Array} teams - Array of team objects
 * @returns {Object} Rankings object
 */
function calculateTeamRankings(teams) {
  if (!teams || teams.length === 0) return {};
  
  const rankings = {
    byWins: [...teams].sort((a, b) => {
      const aWins = a.franchiseHistory?.regularSeason?.wins || 0;
      const bWins = b.franchiseHistory?.regularSeason?.wins || 0;
      return bWins - aWins;
    }),
    
    byWinPercentage: [...teams].sort((a, b) => {
      const aWinPct = a.franchiseHistory?.regularSeason?.winPercentage || 0;
      const bWinPct = b.franchiseHistory?.regularSeason?.winPercentage || 0;
      return bWinPct - aWinPct;
    }),
    
    bySuperBowls: [...teams].sort((a, b) => {
      const aSB = a.franchiseHistory?.championships?.superBowls || 0;
      const bSB = b.franchiseHistory?.championships?.superBowls || 0;
      return bSB - aSB;
    }),
    
    byLegacy: [...teams].sort((a, b) => {
      return calculateFranchiseLegacy(b) - calculateFranchiseLegacy(a);
    })
  };
  
  return rankings;
}

// Make functions globally available
window.initializeTeamStatistics = initializeTeamStatistics;
window.initializeTeamCulture = initializeTeamCulture;
window.generatePreferredCoachingStyle = generatePreferredCoachingStyle;
window.updateTeamGameStats = updateTeamGameStats;
window.updateTeamSeasonStats = updateTeamSeasonStats;
window.addSeasonAchievements = addSeasonAchievements;
window.calculateCoachingFit = calculateCoachingFit;
window.calculateFranchiseLegacy = calculateFranchiseLegacy;
window.calculateTeamRankings = calculateTeamRankings;
window.calculateWinPercentage = calculateWinPercentage;
