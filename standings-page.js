// coaching.js - Comprehensive Coaching Statistics System
'use strict';

/**
 * Initialize coaching stats for a coach
 * @param {Object} coach - Coach object
 * @returns {Object} Coach with initialized stats
 */
function initializeCoachingStats(coach) {
  if (!coach) return null;
  
  if (!coach.stats) {
    coach.stats = {
      asHeadCoach: {
        seasons: 0,
        regularSeason: {
          wins: 0,
          losses: 0,
          ties: 0,
          winPercentage: 0.0
        },
        playoffs: {
          wins: 0,
          losses: 0,
          winPercentage: 0.0,
          appearances: 0
        },
        championships: {
          superBowls: 0,
          conferenceChampionships: 0
        },
        teamHistory: [],
        bestSeason: {
          year: 0,
          team: '',
          wins: 0,
          losses: 17,
          ties: 0,
          winPercentage: 0.0
        },
        awards: []
      },
      asCoordinator: {
        OC: {
          seasons: 0,
          teams: [],
          pointsPerGame: [],
          rankings: [], // Offensive rankings by season
          awards: []
        },
        DC: {
          seasons: 0,
          teams: [],
          pointsAllowedPerGame: [],
          rankings: [], // Defensive rankings by season  
          awards: []
        }
      },
      careerStart: 0,
      totalSeasons: 0
    };
  }
  
  // Initialize career tracking
  if (!coach.careerHistory) {
    coach.careerHistory = [];
  }
  
  return coach;
}

/**
 * Update coaching stats after a regular season game
 * @param {Object} coach - Coach object
 * @param {Object} gameResult - Game result object
 * @param {Object} team - Team object
 */
function updateCoachingGameStats(coach, gameResult, team) {
  if (!coach || !gameResult || !coach.stats) return;
  
  try {
    const isHeadCoach = coach.position === 'HC' || coach.position === 'Head Coach';
    
    if (isHeadCoach) {
      const stats = coach.stats.asHeadCoach;
      
      if (gameResult.win) {
        stats.regularSeason.wins++;
      } else if (gameResult.tie) {
        stats.regularSeason.ties++;
      } else {
        stats.regularSeason.losses++;
      }
      
      // Update win percentage
      const totalGames = stats.regularSeason.wins + stats.regularSeason.losses + stats.regularSeason.ties;
      if (totalGames > 0) {
        stats.regularSeason.winPercentage = 
          (stats.regularSeason.wins + (stats.regularSeason.ties * 0.5)) / totalGames;
      }
    }
    
    // Track coordinator performance (points scored/allowed)
    if (coach.position === 'OC') {
      const coordinatorStats = coach.stats.asCoordinator.OC;
      if (!coordinatorStats.currentSeasonStats) {
        coordinatorStats.currentSeasonStats = { points: 0, games: 0 };
      }
      coordinatorStats.currentSeasonStats.points += (gameResult.pointsFor || 0);
      coordinatorStats.currentSeasonStats.games++;
    }
    
    if (coach.position === 'DC') {
      const coordinatorStats = coach.stats.asCoordinator.DC;
      if (!coordinatorStats.currentSeasonStats) {
        coordinatorStats.currentSeasonStats = { points: 0, games: 0 };
      }
      coordinatorStats.currentSeasonStats.points += (gameResult.pointsAgainst || 0);
      coordinatorStats.currentSeasonStats.games++;
    }
    
  } catch (error) {
    console.error('Error updating coaching game stats:', error);
  }
}

/**
 * Update coaching stats at the end of a season
 * @param {Object} coach - Coach object
 * @param {Object} seasonStats - Season statistics
 * @param {Object} team - Team object
 * @param {number} year - Season year
 */
function updateCoachingSeasonStats(coach, seasonStats, team, year) {
  if (!coach || !seasonStats || !team || !coach.stats) return;
  
  try {
    const isHeadCoach = coach.position === 'HC' || coach.position === 'Head Coach';
    
    if (isHeadCoach) {
      const stats = coach.stats.asHeadCoach;
      stats.seasons++;
      
      // Update team history
      let teamRecord = stats.teamHistory.find(th => th.team === team.abbr && th.endYear === undefined);
      
      if (!teamRecord) {
        teamRecord = {
          team: team.abbr,
          teamName: team.name,
          startYear: year,
          endYear: undefined,
          seasons: 0,
          wins: 0,
          losses: 0,
          ties: 0,
          playoffAppearances: 0,
          championships: 0,
          superBowls: 0
        };
        stats.teamHistory.push(teamRecord);
      }
      
      teamRecord.seasons++;
      teamRecord.wins += seasonStats.wins || 0;
      teamRecord.losses += seasonStats.losses || 0;
      teamRecord.ties += seasonStats.ties || 0;
      
      // Check if this is the best season
      const currentWinPct = calculateWinPercentage(seasonStats.wins, seasonStats.losses, seasonStats.ties);
      const bestWinPct = calculateWinPercentage(stats.bestSeason.wins, stats.bestSeason.losses, stats.bestSeason.ties);
      
      if (currentWinPct > bestWinPct) {
        stats.bestSeason = {
          year: year,
          team: team.abbr,
          teamName: team.name,
          wins: seasonStats.wins || 0,
          losses: seasonStats.losses || 0,
          ties: seasonStats.ties || 0,
          winPercentage: currentWinPct
        };
      }
      
      // Add season awards
      if (seasonStats.wins >= 15) {
        stats.awards.push({
          year: year,
          team: team.abbr,
          award: '15+ Win Season',
          details: `${seasonStats.wins}-${seasonStats.losses}-${seasonStats.ties || 0}`
        });
      }
      
      if (seasonStats.wins >= 16) {
        stats.awards.push({
          year: year,
          team: team.abbr,
          award: 'Outstanding Season',
          details: `${seasonStats.wins}-${seasonStats.losses}-${seasonStats.ties || 0}`
        });
      }
    }
    
    // Handle coordinator season stats
    if (coach.position === 'OC') {
      const coordinatorStats = coach.stats.asCoordinator.OC;
      coordinatorStats.seasons++;
      
      if (coordinatorStats.currentSeasonStats) {
        const ppg = coordinatorStats.currentSeasonStats.points / coordinatorStats.currentSeasonStats.games;
        coordinatorStats.pointsPerGame.push({
          year: year,
          team: team.abbr,
          ppg: Math.round(ppg * 10) / 10
        });
        
        // Calculate offensive ranking (simplified)
        const ranking = calculateOffensiveRanking(team, ppg);
        coordinatorStats.rankings.push({
          year: year,
          team: team.abbr,
          ranking: ranking,
          ppg: Math.round(ppg * 10) / 10
        });
        
        // Reset for next season
        coordinatorStats.currentSeasonStats = null;
      }
      
      if (!coordinatorStats.teams.includes(team.abbr)) {
        coordinatorStats.teams.push(team.abbr);
      }
    }
    
    if (coach.position === 'DC') {
      const coordinatorStats = coach.stats.asCoordinator.DC;
      coordinatorStats.seasons++;
      
      if (coordinatorStats.currentSeasonStats) {
        const papg = coordinatorStats.currentSeasonStats.points / coordinatorStats.currentSeasonStats.games;
        coordinatorStats.pointsAllowedPerGame.push({
          year: year,
          team: team.abbr,
          papg: Math.round(papg * 10) / 10
        });
        
        // Calculate defensive ranking (simplified)
        const ranking = calculateDefensiveRanking(team, papg);
        coordinatorStats.rankings.push({
          year: year,
          team: team.abbr,
          ranking: ranking,
          papg: Math.round(papg * 10) / 10
        });
        
        // Reset for next season
        coordinatorStats.currentSeasonStats = null;
      }
      
      if (!coordinatorStats.teams.includes(team.abbr)) {
        coordinatorStats.teams.push(team.abbr);
      }
    }
    
    // Update career history
    coach.careerHistory.push({
      year: year,
      team: team.abbr,
      teamName: team.name,
      position: coach.position,
      record: seasonStats,
      awards: (seasonStats.awards || []).slice()
    });
    
    coach.stats.totalSeasons++;
    
  } catch (error) {
    console.error('Error updating coaching season stats:', error);
  }
}

/**
 * Update coaching playoff statistics
 * @param {Object} coach - Coach object
 * @param {Object} playoffResult - Playoff result
 * @param {number} year - Season year
 */
function updateCoachingPlayoffStats(coach, playoffResult, year) {
  if (!coach || !playoffResult || !coach.stats) return;
  
  try {
    const isHeadCoach = coach.position === 'HC' || coach.position === 'Head Coach';
    
    if (isHeadCoach) {
      const stats = coach.stats.asHeadCoach;
      const playoffStats = stats.playoffs;
      
      // Update playoff appearances
      if (playoffResult.madePlayoffs) {
        playoffStats.appearances++;
        
        // Update current team record
        const currentTeamRecord = stats.teamHistory[stats.teamHistory.length - 1];
        if (currentTeamRecord) {
          currentTeamRecord.playoffAppearances++;
        }
      }
      
      // Update playoff wins/losses
      if (playoffResult.wins) playoffStats.wins += playoffResult.wins;
      if (playoffResult.losses) playoffStats.losses += playoffResult.losses;
      
      // Update win percentage
      const totalPlayoffGames = playoffStats.wins + playoffStats.losses;
      if (totalPlayoffGames > 0) {
        playoffStats.winPercentage = playoffStats.wins / totalPlayoffGames;
      }
      
      // Championship tracking
      if (playoffResult.wonConferenceChampionship) {
        stats.championships.conferenceChampionships++;
        stats.awards.push({
          year: year,
          team: playoffResult.team,
          award: 'Conference Championship',
          details: 'Won conference championship game'
        });
        
        if (currentTeamRecord) {
          currentTeamRecord.championships++;
        }
      }
      
      if (playoffResult.wonSuperBowl) {
        stats.championships.superBowls++;
        stats.awards.push({
          year: year,
          team: playoffResult.team,
          award: 'Super Bowl Champion',
          details: 'Won Super Bowl'
        });
        
        if (currentTeamRecord) {
          currentTeamRecord.superBowls++;
        }
      }
    }
    
  } catch (error) {
    console.error('Error updating coaching playoff stats:', error);
  }
}

/**
 * Promote a coordinator to head coach
 * @param {Object} coordinator - Coordinator being promoted
 * @param {Object} newTeam - Team hiring the coordinator
 * @param {number} year - Year of promotion
 */
function promoteCoordinatorToHeadCoach(coordinator, newTeam, year) {
  if (!coordinator || !newTeam) return null;
  
  try {
    // Initialize coaching stats if not present
    initializeCoachingStats(coordinator);
    
    // End current coordinator tenure
    const currentTeamRecord = coordinator.stats.teamHistory[coordinator.stats.teamHistory.length - 1];
    if (currentTeamRecord && !currentTeamRecord.endYear) {
      currentTeamRecord.endYear = year - 1;
    }
    
    // Change position
    const oldPosition = coordinator.position;
    coordinator.position = 'HC';
    coordinator.currentTeam = newTeam.abbr;
    
    // Add promotion to career history
    coordinator.careerHistory.push({
      year: year,
      event: 'promotion',
      from: oldPosition,
      to: 'HC',
      fromTeam: coordinator.currentTeam,
      toTeam: newTeam.abbr,
      toTeamName: newTeam.name
    });
    
    // Add to awards
    coordinator.stats.asHeadCoach.awards.push({
      year: year,
      team: newTeam.abbr,
      award: 'Head Coach Promotion',
      details: `Promoted from ${oldPosition} to Head Coach`
    });
    
    console.log(`${coordinator.name} promoted from ${oldPosition} to HC of ${newTeam.name}`);
    
    return coordinator;
    
  } catch (error) {
    console.error('Error promoting coordinator:', error);
    return coordinator;
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
 * Calculate offensive ranking (simplified)
 * @param {Object} team - Team object
 * @param {number} ppg - Points per game
 * @returns {number} Ranking (1-32)
 */
function calculateOffensiveRanking(team, ppg) {
  // Simplified ranking based on points per game
  // In a full implementation, this would compare against all teams
  if (ppg >= 28) return Math.floor(Math.random() * 5) + 1; // Top 5
  if (ppg >= 24) return Math.floor(Math.random() * 10) + 6; // 6-15
  if (ppg >= 20) return Math.floor(Math.random() * 10) + 16; // 16-25
  return Math.floor(Math.random() * 7) + 26; // 26-32
}

/**
 * Calculate defensive ranking (simplified)
 * @param {Object} team - Team object
 * @param {number} papg - Points allowed per game
 * @returns {number} Ranking (1-32, lower papg = better ranking)
 */
function calculateDefensiveRanking(team, papg) {
  // Simplified ranking based on points allowed per game
  if (papg <= 17) return Math.floor(Math.random() * 5) + 1; // Top 5
  if (papg <= 21) return Math.floor(Math.random() * 10) + 6; // 6-15
  if (papg <= 25) return Math.floor(Math.random() * 10) + 16; // 16-25
  return Math.floor(Math.random() * 7) + 26; // 26-32
}

/**
 * Get coaching Hall of Fame candidates
 * @param {Array} allCoaches - Array of all coaches
 * @returns {Array} Hall of Fame worthy coaches
 */
function getCoachingHallOfFame(allCoaches) {
  if (!allCoaches || allCoaches.length === 0) return [];
  
  return allCoaches.filter(coach => {
    if (!coach.stats || !coach.stats.asHeadCoach) return false;
    
    const stats = coach.stats.asHeadCoach;
    let hofScore = 0;
    
    // Super Bowl wins (most important)
    hofScore += stats.championships.superBowls * 50;
    
    // Conference championships
    hofScore += stats.championships.conferenceChampionships * 25;
    
    // Regular season wins
    hofScore += stats.regularSeason.wins * 1;
    
    // Win percentage bonus (minimum 5 seasons)
    if (stats.seasons >= 5) {
      if (stats.regularSeason.winPercentage >= 0.700) hofScore += 30;
      else if (stats.regularSeason.winPercentage >= 0.650) hofScore += 20;
      else if (stats.regularSeason.winPercentage >= 0.600) hofScore += 10;
    }
    
    // Longevity bonus
    if (stats.seasons >= 15) hofScore += 20;
    else if (stats.seasons >= 10) hofScore += 10;
    
    // Playoff success
    if (stats.playoffs.appearances >= 8) hofScore += 15;
    if (stats.playoffs.winPercentage >= 0.600 && stats.playoffs.wins >= 10) hofScore += 15;
    
    // Outstanding seasons (15+ wins)
    const outstandingSeasons = stats.awards.filter(a => a.award === '15+ Win Season').length;
    hofScore += outstandingSeasons * 5;
    
    // Hall of Fame threshold
    return hofScore >= 100;
  });
}

/**
 * Render coaching statistics page
 */
function renderCoachingStats() {
  console.log('Rendering coaching statistics...');
  console.log('State:', state);
  console.log('League:', state.league);
  
  const L = state.league;
  if (!L) {
    console.warn('No league data available for coaching stats');
    const coachingContent = document.getElementById('coaching-content');
    if (coachingContent) {
      coachingContent.innerHTML = `
        <div class="coaching-empty">
          <h3>No League Data</h3>
          <p>Please start a new league or load an existing one to view coaching statistics.</p>
        </div>
      `;
    }
    return;
  }
  
  console.log('Teams in league:', L.teams?.length);
  console.log('First team staff:', L.teams?.[0]?.staff);
  
  try {
    // Get all coaches (head coaches and coordinators)
    const allCoaches = [];
    
    L.teams.forEach(team => {
      if (team.staff) {
        if (team.staff.headCoach) {
          initializeCoachingStats(team.staff.headCoach);
          allCoaches.push({...team.staff.headCoach, currentTeam: team.abbr, currentTeamName: team.name});
        }
        if (team.staff.offCoordinator) {
          initializeCoachingStats(team.staff.offCoordinator);
          allCoaches.push({...team.staff.offCoordinator, currentTeam: team.abbr, currentTeamName: team.name});
        }
        if (team.staff.defCoordinator) {
          initializeCoachingStats(team.staff.defCoordinator);
          allCoaches.push({...team.staff.defCoordinator, currentTeam: team.abbr, currentTeamName: team.name});
        }
      } else {
        console.warn(`Team ${team.name} has no staff data`);
      }
    });
    
    if (allCoaches.length === 0) {
      console.warn('No coaches found in league');
      const coachingContent = document.getElementById('coaching-content');
      if (coachingContent) {
        coachingContent.innerHTML = `
          <div class="coaching-empty">
            <h3>No Coaches Found</h3>
            <p>No coaching staff has been generated for this league yet.</p>
          </div>
        `;
      }
      return;
    }
    
    // Add user coach if in career mode
    if (state.playerRole && state.playerRole !== 'GM') {
      try {
        const userTeam = window.currentTeam();
        if (userTeam) {
          const userCoach = {
            name: 'You',
            position: state.playerRole === 'OC' ? 'OC' : 'DC',
            currentTeam: userTeam.abbr,
            currentTeamName: userTeam.name,
            isUser: true
          };
          initializeCoachingStats(userCoach);
          allCoaches.unshift(userCoach); // Put user first
        }
      } catch (error) {
        console.warn('Could not add user coach:', error);
      }
    }
    
    const coachingContent = document.getElementById('coaching-content');
    if (!coachingContent) {
      console.error('Coaching content area not found');
      return;
    }
    
    coachingContent.innerHTML = `
      <div class="coaching-tabs">
        <button class="tab-btn active" data-tab="active">Active Coaches</button>
        <button class="tab-btn" data-tab="hof">Hall of Fame</button>
        <button class="tab-btn" data-tab="records">Records</button>
      </div>
      
      <div id="coaching-tab-content">
        ${renderActiveCoaches(allCoaches)}
      </div>
    `;
    
    // Set up tab switching
    const tabButtons = coachingContent.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tabContent = document.getElementById('coaching-tab-content');
        
        if (tab === 'active') {
          tabContent.innerHTML = renderActiveCoaches(allCoaches);
        } else if (tab === 'hof') {
          tabContent.innerHTML = renderCoachingHallOfFame(allCoaches);
        } else if (tab === 'records') {
          tabContent.innerHTML = renderCoachingRecords(allCoaches);
        }
      });
    });
    
  } catch (error) {
    console.error('Error rendering coaching stats:', error);
  }
}

/**
 * Render active coaches table
 * @param {Array} coaches - Array of coach objects
 * @returns {string} HTML string
 */
function renderActiveCoaches(coaches) {
  const headCoaches = coaches.filter(c => c.position === 'HC' || c.position === 'Head Coach');
  const coordinators = coaches.filter(c => c.position === 'OC' || c.position === 'DC');
  
  return `
    <div class="coaching-section">
      <h3>Head Coaches</h3>
      <table class="coaching-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Team</th>
            <th>Seasons</th>
            <th>W-L-T</th>
            <th>Win %</th>
            <th>Playoff Record</th>
            <th>Super Bowls</th>
            <th>Conf. Championships</th>
          </tr>
        </thead>
        <tbody>
          ${headCoaches.map(coach => renderCoachRow(coach, 'HC')).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="coaching-section">
      <h3>Coordinators</h3>
      <table class="coaching-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Team</th>
            <th>Seasons</th>
            <th>Avg PPG/PAPG</th>
            <th>Best Ranking</th>
            <th>HC Experience</th>
          </tr>
        </thead>
        <tbody>
          ${coordinators.map(coach => renderCoachRow(coach, 'COORD')).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render individual coach row
 * @param {Object} coach - Coach object
 * @param {string} type - 'HC' or 'COORD'
 * @returns {string} HTML string
 */
function renderCoachRow(coach, type) {
  const userClass = coach.isUser ? ' class="user-row"' : '';
  
  if (type === 'HC') {
    const stats = coach.stats.asHeadCoach;
    const record = `${stats.regularSeason.wins}-${stats.regularSeason.losses}-${stats.regularSeason.ties}`;
    const winPct = (stats.regularSeason.winPercentage * 100).toFixed(1);
    const playoffRecord = `${stats.playoffs.wins}-${stats.playoffs.losses}`;
    
    return `
      <tr${userClass}>
        <td>${coach.name}${coach.isUser ? ' (You)' : ''}</td>
        <td>${coach.currentTeamName}</td>
        <td>${stats.seasons}</td>
        <td>${record}</td>
        <td>${winPct}%</td>
        <td>${playoffRecord}</td>
        <td>${stats.championships.superBowls}</td>
        <td>${stats.championships.conferenceChampionships}</td>
      </tr>
    `;
  } else {
    const coordStats = coach.stats.asCoordinator[coach.position] || {};
    const avgStat = coach.position === 'OC' ? 
      calculateAverage(coordStats.pointsPerGame, 'ppg') :
      calculateAverage(coordStats.pointsAllowedPerGame, 'papg');
    const bestRanking = calculateBestRanking(coordStats.rankings);
    const hcExperience = coach.stats.asHeadCoach.seasons;
    
    return `
      <tr${userClass}>
        <td>${coach.name}${coach.isUser ? ' (You)' : ''}</td>
        <td>${coach.position}</td>
        <td>${coach.currentTeamName}</td>
        <td>${coordStats.seasons || 0}</td>
        <td>${avgStat.toFixed(1)}</td>
        <td>${bestRanking > 0 ? `#${bestRanking}` : 'N/A'}</td>
        <td>${hcExperience > 0 ? `${hcExperience} seasons` : 'None'}</td>
      </tr>
    `;
  }
}

/**
 * Render coaching hall of fame
 * @param {Array} coaches - Array of coach objects
 * @returns {string} HTML string
 */
function renderCoachingHallOfFame(coaches) {
  const hofCoaches = getCoachingHallOfFame(coaches);
  
  if (hofCoaches.length === 0) {
    return '<div class="coaching-section"><p>No coaches have achieved Hall of Fame status yet.</p></div>';
  }
  
  return `
    <div class="coaching-section">
      <h3>Coaching Hall of Fame</h3>
      ${hofCoaches.map(coach => `
        <div class="hof-coach-card">
          <h4>${coach.name}</h4>
          <div class="hof-stats">
            <div class="hof-stat">
              <span class="stat-value">${coach.stats.asHeadCoach.regularSeason.wins}</span>
              <span class="stat-label">Career Wins</span>
            </div>
            <div class="hof-stat">
              <span class="stat-value">${(coach.stats.asHeadCoach.regularSeason.winPercentage * 100).toFixed(1)}%</span>
              <span class="stat-label">Win Percentage</span>
            </div>
            <div class="hof-stat">
              <span class="stat-value">${coach.stats.asHeadCoach.championships.superBowls}</span>
              <span class="stat-label">Super Bowls</span>
            </div>
            <div class="hof-stat">
              <span class="stat-value">${coach.stats.asHeadCoach.seasons}</span>
              <span class="stat-label">Seasons</span>
            </div>
          </div>
          <div class="team-history">
            <h5>Team History:</h5>
            ${coach.stats.asHeadCoach.teamHistory.map(th => 
              `<span class="team-stint">${th.team} (${th.startYear}-${th.endYear || 'present'}): ${th.wins}-${th.losses}-${th.ties}</span>`
            ).join(', ')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render coaching records
 * @param {Array} coaches - Array of coach objects
 * @returns {string} HTML string
 */
function renderCoachingRecords(coaches) {
  const records = calculateCoachingRecords(coaches);
  
  return `
    <div class="coaching-section">
      <h3>Coaching Records</h3>
      <div class="records-grid">
        <div class="record-card">
          <h4>Most Career Wins</h4>
          <ol>
            ${records.mostWins.slice(0, 5).map(r => 
              `<li>${r.name}: ${r.value} wins</li>`
            ).join('')}
          </ol>
        </div>
        
        <div class="record-card">
          <h4>Highest Win Percentage (min. 5 seasons)</h4>
          <ol>
            ${records.bestWinPct.slice(0, 5).map(r => 
              `<li>${r.name}: ${(r.value * 100).toFixed(1)}%</li>`
            ).join('')}
          </ol>
        </div>
        
        <div class="record-card">
          <h4>Most Super Bowl Wins</h4>
          <ol>
            ${records.mostSuperBowls.slice(0, 5).map(r => 
              `<li>${r.name}: ${r.value} titles</li>`
            ).join('')}
          </ol>
        </div>
        
        <div class="record-card">
          <h4>Best Single Season</h4>
          <ol>
            ${records.bestSeason.slice(0, 5).map(r => 
              `<li>${r.name}: ${r.record} (${r.year})</li>`
            ).join('')}
          </ol>
        </div>
      </div>
    </div>
  `;
}

/**
 * Calculate various coaching records
 * @param {Array} coaches - Array of coach objects
 * @returns {Object} Object containing different record categories
 */
function calculateCoachingRecords(coaches) {
  const records = {
    mostWins: [],
    bestWinPct: [],
    mostSuperBowls: [],
    bestSeason: []
  };
  
  coaches.forEach(coach => {
    const stats = coach.stats.asHeadCoach;
    
    // Most wins
    records.mostWins.push({
      name: coach.name,
      value: stats.regularSeason.wins
    });
    
    // Best win percentage (minimum 5 seasons)
    if (stats.seasons >= 5) {
      records.bestWinPct.push({
        name: coach.name,
        value: stats.regularSeason.winPercentage
      });
    }
    
    // Most Super Bowls
    if (stats.championships.superBowls > 0) {
      records.mostSuperBowls.push({
        name: coach.name,
        value: stats.championships.superBowls
      });
    }
    
    // Best season
    if (stats.bestSeason.wins > 0) {
      records.bestSeason.push({
        name: coach.name,
        record: `${stats.bestSeason.wins}-${stats.bestSeason.losses}-${stats.bestSeason.ties}`,
        value: stats.bestSeason.winPercentage,
        year: stats.bestSeason.year,
        team: stats.bestSeason.team
      });
    }
  });
  
  // Sort each category
  records.mostWins.sort((a, b) => b.value - a.value);
  records.bestWinPct.sort((a, b) => b.value - a.value);
  records.mostSuperBowls.sort((a, b) => b.value - a.value);
  records.bestSeason.sort((a, b) => b.value - a.value);
  
  return records;
}

// Helper functions
function calculateAverage(dataArray, key) {
  if (!dataArray || dataArray.length === 0) return 0;
  const sum = dataArray.reduce((acc, item) => acc + item[key], 0);
  return sum / dataArray.length;
}

function calculateBestRanking(rankings) {
  if (!rankings || rankings.length === 0) return 0;
  return Math.min(...rankings.map(r => r.ranking));
}

// Make functions globally available
window.initializeCoachingStats = initializeCoachingStats;
window.updateCoachingGameStats = updateCoachingGameStats;
window.updateCoachingSeasonStats = updateCoachingSeasonStats;
window.updateCoachingPlayoffStats = updateCoachingPlayoffStats;
window.promoteCoordinatorToHeadCoach = promoteCoordinatorToHeadCoach;
window.calculateWinPercentage = calculateWinPercentage;
window.getCoachingHallOfFame = getCoachingHallOfFame;
window.renderCoachingStats = renderCoachingStats;

/**
 * Main coaching system entry point
 * This function renders the main coaching interface
 */
function renderCoaching() {
    // Check if we have a content area to render into
    const content = document.getElementById('content');
    if (!content) {
        console.error('Content area not found for coaching interface');
        return;
    }
    
    // Render the main coaching stats interface
    renderCoachingStats();
}

// Expose the main coaching function globally
window.renderCoaching = renderCoaching;
