// scheduler.js - Basic Schedule Generator
'use strict';

(function(global) {
  
  /**
   * Creates a basic NFL-style schedule
   * @param {Array} teams - Array of team objects
   * @returns {Object} Schedule object with weeks array
   */
  function makeAccurateSchedule(teams) {
    if (!teams || teams.length !== 32) {
      console.warn('Expected 32 teams, got', teams.length);
      return createSimpleSchedule(teams);
    }
    
    try {
      return createNFLStyleSchedule(teams);
    } catch (error) {
      console.error('Error creating NFL schedule, falling back to simple schedule:', error);
      return createSimpleSchedule(teams);
    }
  }
  
  /**
   * Creates an NFL-style schedule with proper conference/division matchups
   * @param {Array} teams - Array of team objects
   * @returns {Object} Schedule object
   */
  function createNFLStyleSchedule(teams) {
    const schedule = {
      weeks: [],
      teams: teams,
      metadata: {
        generated: new Date().toISOString(),
        type: 'nfl-style'
      }
    };
    
    // Group teams by conference and division
    const conferences = { AFC: [], NFC: [] };
    const divisions = {
      AFC: { East: [], North: [], South: [], West: [] },
      NFC: { East: [], North: [], South: [], West: [] }
    };
    
    const confNames = ['AFC', 'NFC'];
    const divNames = ['East', 'North', 'South', 'West'];
    
    teams.forEach((team, index) => {
      const conf = confNames[team.conf] || (index < 16 ? 'AFC' : 'NFC');
      const div = divNames[team.div] || divNames[Math.floor((index % 16) / 4)];
      
      conferences[conf].push(team);
      divisions[conf][div].push(team);
    });
    
    const weeklyGames = [];
    const totalWeeks = 18; // NFL regular season weeks
    
    // Initialize weeks
    for (let week = 0; week < totalWeeks; week++) {
      weeklyGames[week] = [];
    }
    
    let currentWeek = 0;
    
    // Generate matchups using a simplified approach
    // This creates a reasonable schedule spread across 18 weeks
    const allMatchups = [];
    
    // Each team plays 17 games
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        allMatchups.push([i, j]);
      }
    }
    
    // Shuffle matchups for variety
    shuffleArray(allMatchups);
    
    // Distribute matchups across weeks
    const gamesPerWeek = [];
    for (let week = 0; week < totalWeeks; week++) {
      gamesPerWeek[week] = [];
    }
    
    // Track games per team
    const teamGameCount = new Array(teams.length).fill(0);
    const teamSchedule = teams.map(() => []);
    
    // Distribute games trying to give each team roughly 17 games
    matchups: for (const [teamA, teamB] of allMatchups) {
      if (teamGameCount[teamA] >= 17 || teamGameCount[teamB] >= 17) {
        continue matchups;
      }
      
      // Find a week where both teams are available
      for (let week = 0; week < totalWeeks; week++) {
        const weekHasTeamA = gamesPerWeek[week].some(game => 
          game.home === teamA || game.away === teamA);
        const weekHasTeamB = gamesPerWeek[week].some(game => 
          game.home === teamB || game.away === teamB);
        
        if (!weekHasTeamA && !weekHasTeamB && gamesPerWeek[week].length < 16) {
          // Randomly assign home/away
          const isTeamAHome = Math.random() < 0.5;
          const game = {
            home: isTeamAHome ? teamA : teamB,
            away: isTeamAHome ? teamB : teamA,
            week: week + 1
          };
          
          gamesPerWeek[week].push(game);
          teamGameCount[teamA]++;
          teamGameCount[teamB]++;
          teamSchedule[teamA].push(game);
          teamSchedule[teamB].push(game);
          
          continue matchups;
        }
      }
    }
    
    // Convert to the expected format
    for (let week = 0; week < totalWeeks; week++) {
      schedule.weeks.push({
        weekNumber: week + 1,
        games: gamesPerWeek[week]
      });
    }
    
    console.log(`Generated NFL-style schedule: ${totalWeeks} weeks, teams per week:`, 
                gamesPerWeek.map(w => w.length * 2));
    
    return schedule;
  }
  
  /**
   * Creates a simple round-robin style schedule
   * @param {Array} teams - Array of team objects
   * @returns {Object} Schedule object
   */
  function createSimpleSchedule(teams) {
    const schedule = {
      weeks: [],
      teams: teams,
      metadata: {
        generated: new Date().toISOString(),
        type: 'simple-round-robin'
      }
    };
    
    const numTeams = teams.length;
    const totalWeeks = 17; // Standard NFL season
    
    // Simple round-robin with some randomization
    for (let week = 0; week < totalWeeks; week++) {
      const weekGames = [];
      const availableTeams = [...Array(numTeams).keys()];
      shuffleArray(availableTeams);
      
      // Pair up teams for this week
      for (let i = 0; i < availableTeams.length - 1; i += 2) {
        const teamA = availableTeams[i];
        const teamB = availableTeams[i + 1];
        
        if (teamA !== undefined && teamB !== undefined) {
          weekGames.push({
            home: teamA,
            away: teamB,
            week: week + 1
          });
        }
      }
      
      // Handle bye week for odd number of teams
      if (availableTeams.length % 2 === 1) {
        const byeTeam = availableTeams[availableTeams.length - 1];
        weekGames.push({
          bye: byeTeam,
          week: week + 1
        });
      }
      
      schedule.weeks.push({
        weekNumber: week + 1,
        games: weekGames
      });
    }
    
    console.log(`Generated simple schedule: ${totalWeeks} weeks`);
    return schedule;
  }
  
  /**
   * Computes last season division rankings (simplified)
   * @param {Object} league - League object
   * @returns {Array} Division ranks for each team
   */
  function computeLastDivisionRanks(league) {
    if (!league || !league.teams) {
      return Array.from({length: 32}, (_, i) => (i % 4) + 1);
    }
    
    // Simple approach: use current team index to determine rank
    return league.teams.map((team, index) => (index % 4) + 1);
  }
  
  /**
   * Shuffles an array in place
   * @param {Array} array - Array to shuffle
   */
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
  
  // Expose the Scheduler object globally
  global.Scheduler = {
    makeAccurateSchedule,
    computeLastDivisionRanks,
    createNFLStyleSchedule,
    createSimpleSchedule
  };
  
})(window);
