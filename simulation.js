'use strict';

/**
 * Validates that required global dependencies are available
 * @returns {boolean} True if all dependencies are available
 */
function validateDependencies() {
  const missing = [];
  
  if (!window.Constants?.SIMULATION) missing.push('window.Constants.SIMULATION');
  if (!window.Utils) missing.push('window.Utils');
  if (!window.state?.league) missing.push('window.state.league');
  if (!window.setStatus) missing.push('window.setStatus');
  
  if (missing.length > 0) {
    console.error('Missing required dependencies:', missing);
    if (window.setStatus) {
      window.setStatus(`Error: Missing dependencies - ${missing.join(', ')}`);
    }
    return false;
  }
  
  return true;
}

/**
 * Applies the result of a simulated game to the teams' records.
 * @param {object} game - An object containing the home and away team objects.
 * @param {object} game.home - The home team object.
 * @param {object} game.away - The away team object.
 * @param {number} homeScore - The final score for the home team.
 * @param {number} awayScore - The final score for the away team.
 */
function applyResult(game, homeScore, awayScore) {
  // Validate inputs
  if (!game || typeof game !== 'object') {
    console.error("Invalid game object provided to applyResult");
    return;
  }
  
  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    console.error("Invalid scores provided to applyResult", { homeScore, awayScore });
    return;
  }
  
  const home = game.home;
  const away = game.away;

  // This check is important to prevent errors if teams are not found
  if (!home || !away) {
    console.error("Invalid team data provided to applyResult", game);
    return;
  }

  // Initialize records if they don't exist - more robust initialization
  const initializeTeamStats = (team) => {
    if (!team) return;
    team.wins = team.wins ?? 0;
    team.losses = team.losses ?? 0;
    team.ties = team.ties ?? 0;
    team.ptsFor = team.ptsFor ?? 0;
    team.ptsAgainst = team.ptsAgainst ?? 0;
  };
  
  initializeTeamStats(home);
  initializeTeamStats(away);

  // Update game scores if a game object is passed with schedule info
  if (game.hasOwnProperty('played')) {
    game.homeScore = homeScore;
    game.awayScore = awayScore;
    game.played = true;
  }

  // Update team records
  if (homeScore > awayScore) {
    home.wins++;
    away.losses++;
  } else if (awayScore > homeScore) {
    away.wins++;
    home.losses++;
  } else {
    home.ties++;
    away.ties++;
  }

  // Update points for and against
  home.ptsFor += homeScore;
  home.ptsAgainst += awayScore;
  away.ptsFor += awayScore;
  away.ptsAgainst += homeScore;
}

/**
 * Simulates game statistics for a single game between two teams.
 * @param {object} home - The home team object.
 * @param {object} away - The away team object.
 * @returns {object|null} An object with homeScore and awayScore, or null if error.
 */
function simGameStats(home, away) {
  try {
    // Validate dependencies
    if (!window.Constants?.SIMULATION || !window.Utils) {
      console.error('Missing simulation dependencies');
      return null;
    }
    
    const C = window.Constants.SIMULATION;
    const U = window.Utils;

    // Validate team inputs
    if (!home?.roster || !away?.roster || !Array.isArray(home.roster) || !Array.isArray(away.roster)) {
      console.error('Invalid team roster data:', { home: !!home?.roster, away: !!away?.roster });
      return null;
    }

    if (home.roster.length === 0 || away.roster.length === 0) {
      console.warn('Empty roster detected:', { homeRoster: home.roster.length, awayRoster: away.roster.length });
    }

    // Basic team strength from overall ratings with fallback
    const calculateStrength = (roster) => {
      if (!roster.length) return 50; // Default strength
      return roster.reduce((acc, p) => acc + (p.ovr || 50), 0) / roster.length;
    };

    const homeStrength = calculateStrength(home.roster);
    const awayStrength = calculateStrength(away.roster);

    // Add home advantage with fallback constants
    const HOME_ADVANTAGE = C.HOME_ADVANTAGE || 3;
    const BASE_SCORE_MIN = C.BASE_SCORE_MIN || 10;
    const BASE_SCORE_MAX = C.BASE_SCORE_MAX || 35;
    const SCORE_VARIANCE = C.SCORE_VARIANCE || 10;
    
    const strengthDiff = (homeStrength - awayStrength) + HOME_ADVANTAGE;

    // Simulate scores
    let homeScore = U.rand(BASE_SCORE_MIN, BASE_SCORE_MAX) + Math.round(strengthDiff / 5);
    let awayScore = U.rand(BASE_SCORE_MIN, BASE_SCORE_MAX) - Math.round(strengthDiff / 5);

    // Add some randomness
    homeScore += U.rand(0, SCORE_VARIANCE);
    awayScore += U.rand(0, SCORE_VARIANCE);

    // Ensure scores are non-negative
    homeScore = Math.max(0, homeScore);
    awayScore = Math.max(0, awayScore);

    // Simulate basic player stats (you can expand on this)
    [home, away].forEach((team, teamIndex) => {
      const score = teamIndex === 0 ? homeScore : awayScore;
      const qb = team.roster.find(p => p.pos === 'QB');
      if (qb) {
        const passYd = Math.round(score * U.rand(8, 12));
        const passTD = Math.floor(score / 10);
        if (!qb.stats) qb.stats = {};
        qb.stats.game = { passYd, passTD };
      }
    });

    return { homeScore, awayScore };
    
  } catch (error) {
    console.error('Error in simGameStats:', error);
    return null;
  }
}

/**
 * Simulates all games for the current week in the league.
 */
function simulateWeek() {
  try {
    // Validate all dependencies first
    if (!validateDependencies()) {
      return;
    }
    
    const L = window.state.league;

    // Enhanced validation
    if (!L) {
      console.error('No league available for simulation');
      window.setStatus('Error: No league loaded');
      return;
    }

    if (!L.schedule) {
      console.error('No schedule available for simulation');
      window.setStatus('Error: No schedule found');
      return;
    }

    // Handle both schedule formats (legacy compatibility)
    const scheduleWeeks = L.schedule.weeks || L.schedule;
    if (!scheduleWeeks || !Array.isArray(scheduleWeeks)) {
      console.error('Invalid schedule format for simulation');
      window.setStatus('Error: Invalid schedule format');
      return;
    }

    // Ensure week is properly initialized
    if (!L.week || typeof L.week !== 'number') {
      L.week = 1;
      console.log('Initialized league week to 1');
    }

    console.log(`Simulating week ${L.week}...`);
    window.setStatus(`Simulating week ${L.week}...`);

    // Check if season is over
    if (L.week > scheduleWeeks.length) {
      console.log('Regular season complete, starting playoffs');
      window.setStatus('Regular season complete!');

      if (typeof window.startPlayoffs === 'function') {
        window.startPlayoffs();
      } else {
        // Fallback if playoffs not implemented
        window.setStatus('Season complete! Check standings.');
        if (window.location) {
          window.location.hash = '#/standings';
        }
      }
      return;
    }

    // Get current week's games
    const weekIndex = L.week - 1;
    const weekData = scheduleWeeks[weekIndex];

    if (!weekData) {
      console.error(`No data found for week ${L.week}`);
      window.setStatus(`Error: No data for week ${L.week}`);
      return;
    }

    const pairings = weekData.games || [];
    console.log(`Found ${pairings.length} games for week ${L.week}`);

    if (pairings.length === 0) {
      console.warn(`No games scheduled for week ${L.week}`);
      window.setStatus(`No games scheduled for week ${L.week}`);
      // Still advance the week
      L.week++;
      if (typeof window.renderHub === 'function') {
        window.renderHub();
      }
      return;
    }

    const results = [];
    let gamesSimulated = 0;

    // Simulate each game
    pairings.forEach((pair, index) => {
      try {
        // Handle bye weeks
        if (pair.bye !== undefined) {
          results.push({
            id: `w${L.week}b${pair.bye}`,
            bye: pair.bye
          });
          return;
        }

        // Validate team indices
        if (!L.teams || !Array.isArray(L.teams)) {
          console.error('Invalid teams array in league');
          return;
        }
        
        const home = L.teams[pair.home];
        const away = L.teams[pair.away];

        if (!home || !away) {
          console.warn('Invalid team IDs in pairing:', pair);
          window.setStatus(`Warning: Invalid teams in game ${index + 1}`);
          return;
        }

        // Simulate the game
        const gameScores = simGameStats(home, away);
        
        if (!gameScores) {
          console.error(`Failed to simulate game ${index + 1}`);
          return;
        }
        
        const sH = gameScores.homeScore;
        const sA = gameScores.awayScore;

        // Update player season stats from game stats
        const updatePlayerStats = (roster) => {
          if (!Array.isArray(roster)) return;
          
          roster.forEach(p => {
            if (p && p.stats && p.stats.game) {
              if (!p.stats.season) p.stats.season = {};
              Object.keys(p.stats.game).forEach(key => {
                if (typeof p.stats.game[key] === 'number') {
                  p.stats.season[key] = (p.stats.season[key] || 0) + p.stats.game[key];
                }
              });
            }
          });
        };
        
        updatePlayerStats(home.roster);
        updatePlayerStats(away.roster);

        // Store game result
        results.push({
          id: `w${L.week}g${index}`,
          home: pair.home,
          away: pair.away,
          scoreHome: sH,
          scoreAway: sA,
          homeWin: sH > sA
        });

        // Create a game object with the actual teams to pass to applyResult
        const game = { home: home, away: away };
        applyResult(game, sH, sA);
        gamesSimulated++;

        console.log(`${away.name || `Team ${pair.away}`} ${sA} @ ${home.name || `Team ${pair.home}`} ${sH}`);
        
      } catch (gameError) {
        console.error(`Error simulating game ${index + 1}:`, gameError);
        window.setStatus(`Error in game ${index + 1}: ${gameError.message}`);
      }
    });

    // Store results for the week
    if (!L.resultsByWeek) L.resultsByWeek = {};
    L.resultsByWeek[L.week - 1] = results;

    // Advance to next week
    const previousWeek = L.week;
    L.week++;

    // Run weekly training if available
    if (typeof window.runWeeklyTraining === 'function') {
      try {
        window.runWeeklyTraining(L);
      } catch (trainingError) {
        console.error('Error in weekly training:', trainingError);
        // Don't stop simulation for training errors
      }
    }

    console.log(`Week ${previousWeek} simulation complete - ${gamesSimulated} games simulated`);

    // Update UI to show results
    try {
      if (typeof window.renderHub === 'function') {
        window.renderHub();
      }
      if (typeof window.updateCapSidebar === 'function') {
        window.updateCapSidebar();
      }

      // Show success message
      window.setStatus(`Week ${previousWeek} simulated - ${gamesSimulated} games completed`);

      // Auto-show results on hub
      if (window.location && window.location.hash !== '#/hub') {
        window.location.hash = '#/hub';
      }

    } catch (uiError) {
      console.error('Error updating UI after simulation:', uiError);
      window.setStatus(`Week simulated but UI update failed`);
    }

  } catch (error) {
    console.error('Error in simulateWeek:', error);
    window.setStatus(`Simulation error: ${error.message}`);
  }
}

// Make sure function is available globally
if (typeof window !== 'undefined') {
  window.simulateWeek = simulateWeek;
  window.simGameStats = simGameStats;
  window.applyResult = applyResult;
}
