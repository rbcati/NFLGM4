// simulation.js - Fixed simulateWeek function
'use strict';

function simulateWeek() {
  const L = state.league;
  
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
  
  try {
    console.log(`Simulating week ${L.week}...`);
    window.setStatus(`Simulating week ${L.week}...`);
    
    // Check if season is over
    if (L.week > scheduleWeeks.length) {
      console.log('Regular season complete, starting playoffs');
      window.setStatus('Regular season complete!');
      
      if (window.startPlayoffs) {
        window.startPlayoffs();
      } else {
        // Fallback if playoffs not implemented
        window.setStatus('Season complete! Check standings.');
        location.hash = '#/standings';
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
      if (window.renderHub) window.renderHub();
      return;
    }
    
    const results = [];
    let gamesSimulated = 0;
    
    // Simulate each game
    pairings.forEach((pair, index) => {
      // Handle bye weeks
      if (pair.bye !== undefined) {
        results.push({ 
          id: `w${L.week}b${pair.bye}`, 
          bye: pair.bye 
        });
        return;
      }
      
      // Validate team indices
      const home = L.teams[pair.home];
      const away = L.teams[pair.away];
      
      if (!home || !away) {
        console.warn('Invalid team IDs in pairing:', pair);
        window.setStatus(`Warning: Invalid teams in game ${index + 1}`);
        return;
      }
      
      // Simulate the game
      const gameScores = simGameStats(home, away);
      const sH = gameScores.homeScore;
      const sA = gameScores.awayScore;

      // Update player season stats from game stats
      [...home.roster, ...away.roster].forEach(p => {
        if (p && p.stats && p.stats.game) {
          if (!p.stats.season) p.stats.season = {};
          Object.keys(p.stats.game).forEach(key => {
            if (typeof p.stats.game[key] === 'number') {
              p.stats.season[key] = (p.stats.season[key] || 0) + p.stats.game[key];
            }
          });
        }
      });

      // Store game result
      results.push({ 
        id: `w${L.week}g${index}`, 
        home: pair.home, 
        away: pair.away, 
        scoreHome: sH, 
        scoreAway: sA, 
        homeWin: sH > sA 
      });
      
      // Apply result to team records
      applyResult(home, away, sH, sA);
      gamesSimulated++;
      
      console.log(`${away.name} ${sA} @ ${home.name} ${sH}`);
    });

    // Store results for the week
    if (!L.resultsByWeek) L.resultsByWeek = {};
    L.resultsByWeek[L.week - 1] = results;
    
    // Advance to next week
    const previousWeek = L.week;
    L.week++;
    
    // Run weekly training if available
    if (window.runWeeklyTraining) {
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
      if (window.renderHub) {
        window.renderHub();
      }
      if (window.updateCapSidebar) {
        window.updateCapSidebar();
      }
      
      // Show success message
      window.setStatus(`Week ${previousWeek} simulated - ${gamesSimulated} games completed`);
      
      // Auto-show results on hub
      if (location.hash !== '#/hub') {
        location.hash = '#/hub';
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
window.simulateWeek = simulateWeek;
