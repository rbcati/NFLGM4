// simulation-and-styling-fixes.js - Fix week simulation and dropdown colors
'use strict';

console.log('🔧 Loading simulation and styling fixes...');

// Fix 1: Enhanced simulateWeek function with better error handling
window.simulateWeek = function() {
  console.log('🏈 Starting week simulation...');
  
  const L = state.league;
  
  if (!L) {
    console.error('❌ No league available for simulation');
    window.setStatus('Error: No league loaded');
    return;
  }
  
  if (!L.teams || L.teams.length === 0) {
    console.error('❌ No teams in league');
    window.setStatus('Error: No teams found');
    return;
  }
  
  try {
    console.log(`📅 Simulating week ${L.week} of season ${L.year}...`);
    window.setStatus(`Simulating week ${L.week}...`);
    
    // Get schedule in multiple formats for compatibility
    const scheduleWeeks = L.schedule?.weeks || L.schedule || [];
    if (!Array.isArray(scheduleWeeks)) {
      console.error('❌ Invalid schedule format:', typeof scheduleWeeks);
      window.setStatus('Error: Invalid schedule format');
      return;
    }
    
    console.log(`📋 Schedule has ${scheduleWeeks.length} weeks, currently on week ${L.week}`);
    
    // Check if season is complete
    if (L.week > scheduleWeeks.length) {
      console.log('🏆 Regular season complete!');
      window.setStatus('Regular season complete! Starting playoffs...');
      
      if (window.startPlayoffs) {
        window.startPlayoffs();
      } else {
        window.setStatus('Season complete! Check final standings.');
        location.hash = '#/standings';
      }
      return;
    }
    
    // Get current week games
    const weekIndex = L.week - 1;
    const weekData = scheduleWeeks[weekIndex];
    
    if (!weekData) {
      console.error(`❌ No data for week ${L.week}`);
      window.setStatus(`Error: No schedule data for week ${L.week}`);
      return;
    }
    
    const games = weekData.games || [];
    console.log(`🎮 Found ${games.length} games for week ${L.week}`);
    
    if (games.length === 0) {
      console.warn(`⚠️ No games for week ${L.week}, advancing week...`);
      L.week++;
      window.setStatus(`Week ${L.week - 1} had no games, advanced to week ${L.week}`);
      if (window.refreshAll) window.refreshAll();
      return;
    }
    
    const results = [];
    let gamesSimulated = 0;
    
    // Simulate each game
    games.forEach((game, gameIndex) => {
      try {
        // Handle bye weeks
        if (game.bye !== undefined) {
          const team = L.teams[game.bye];
          console.log(`😴 ${team?.name || 'Team'} has bye week`);
          results.push({
            id: `w${L.week}b${game.bye}`,
            bye: game.bye,
            week: L.week
          });
          return;
        }
        
        // Get teams for this game
        const homeTeam = L.teams[game.home];
        const awayTeam = L.teams[game.away];
        
        if (!homeTeam || !awayTeam) {
          console.warn(`⚠️ Invalid teams for game ${gameIndex}: home=${game.home}, away=${game.away}`);
          return;
        }
        
        // Simulate the game using available function
        let gameResult;
        if (window.simGameStats) {
          gameResult = window.simGameStats(homeTeam, awayTeam);
        } else {
          // Fallback simulation
          gameResult = simulateGameFallback(homeTeam, awayTeam);
        }
        
        const homeScore = gameResult.homeScore || 0;
        const awayScore = gameResult.awayScore || 0;
        
        // Update team records properly
        updateTeamRecords(homeTeam, awayTeam, homeScore, awayScore);
        
        // Store result
        results.push({
          id: `w${L.week}g${gameIndex}`,
          home: game.home,
          away: game.away,
          scoreHome: homeScore,
          scoreAway: awayScore,
          homeWin: homeScore > awayScore,
          week: L.week
        });
        
        gamesSimulated++;
        console.log(`🏈 ${awayTeam.abbr} ${awayScore} @ ${homeTeam.abbr} ${homeScore}`);
        
      } catch (gameError) {
        console.error(`❌ Error simulating game ${gameIndex}:`, gameError);
      }
    });
    
    // Store week results
    if (!L.resultsByWeek) L.resultsByWeek = {};
    L.resultsByWeek[L.week - 1] = results;
    
    // Advance to next week
    const completedWeek = L.week;
    L.week++;
    
    // Run weekly processes
    if (window.runWeeklyTraining) {
      try {
        window.runWeeklyTraining(L);
      } catch (trainingError) {
        console.warn('⚠️ Training error (non-fatal):', trainingError);
      }
    }
    
    // Update all team salary caps
    L.teams.forEach(team => {
      if (window.recalcCap) {
        window.recalcCap(L, team);
      }
    });
    
    // Save progress
    if (window.saveState) {
      window.saveState();
    }
    
    // Update UI
    if (window.refreshAll) {
      window.refreshAll();
    } else if (window.renderHub) {
      window.renderHub();
    }
    
    // Show success message
    window.setStatus(`✅ Week ${completedWeek} completed - ${gamesSimulated} games simulated`);
    
    // Navigate to hub to see results
    if (location.hash !== '#/hub') {
      location.hash = '#/hub';
    }
    
    console.log(`✅ Week ${completedWeek} simulation completed successfully`);
    
  } catch (error) {
    console.error('❌ Critical simulation error:', error);
    window.setStatus(`Simulation failed: ${error.message}`);
  }
};

/**
 * Fallback game simulation if main function isn't available
 */
function simulateGameFallback(homeTeam, awayTeam) {
  console.log(`🎲 Fallback simulation: ${awayTeam.name} @ ${homeTeam.name}`);
  
  // Simple simulation based on team strength
  const homeStrength = homeTeam.roster?.reduce((sum, p) => sum + (p.ovr || 75), 0) / (homeTeam.roster?.length || 1) || 75;
  const awayStrength = awayTeam.roster?.reduce((sum, p) => sum + (p.ovr || 75), 0) / (awayTeam.roster?.length || 1) || 75;
  
  // Home field advantage
  const homeAdvantage = 2.5;
  const strengthDiff = (homeStrength - awayStrength) + homeAdvantage;
  
  // Base scores
  let homeScore = 17 + Math.floor(Math.random() * 14); // 17-30
  let awayScore = 17 + Math.floor(Math.random() * 14); // 17-30
  
  // Adjust based on strength difference
  homeScore += Math.floor(strengthDiff / 3);
  awayScore -= Math.floor(strengthDiff / 3);
  
  // Add some randomness
  homeScore += Math.floor(Math.random() * 14); // 0-13 bonus
  awayScore += Math.floor(Math.random() * 14); // 0-13 bonus
  
  // Ensure minimum scores
  homeScore = Math.max(3, homeScore);
  awayScore = Math.max(3, awayScore);
  
  return { homeScore, awayScore };
}

/**
 * Update team records after a game
 */
function updateTeamRecords(homeTeam, awayTeam, homeScore, awayScore) {
  // Initialize record objects if they don't exist
  if (!homeTeam.record) {
    homeTeam.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0, streak: 0 };
  }
  if (!awayTeam.record) {
    awayTeam.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0, streak: 0 };
  }
  
  // Update wins/losses/ties
  if (homeScore > awayScore) {
    // Home team wins
    homeTeam.record.w++;
    awayTeam.record.l++;
    homeTeam.record.streak = (homeTeam.record.streak >= 0) ? homeTeam.record.streak + 1 : 1;
    awayTeam.record.streak = (awayTeam.record.streak <= 0) ? awayTeam.record.streak - 1 : -1;
  } else if (awayScore > homeScore) {
    // Away team wins
    awayTeam.record.w++;
    homeTeam.record.l++;
    awayTeam.record.streak = (awayTeam.record.streak >= 0) ? awayTeam.record.streak + 1 : 1;
    homeTeam.record.streak = (homeTeam.record.streak <= 0) ? homeTeam.record.streak - 1 : -1;
  } else {
    // Tie
    homeTeam.record.t++;
    awayTeam.record.t++;
    homeTeam.record.streak = 0;
    awayTeam.record.streak = 0;
  }
  
  // Update points for/against
  homeTeam.record.pf += homeScore;
  homeTeam.record.pa += awayScore;
  awayTeam.record.pf += awayScore;
  awayTeam.record.pa += homeScore;
  
  // Also maintain legacy format for compatibility
  homeTeam.wins = homeTeam.record.w;
  homeTeam.losses = homeTeam.record.l;
  homeTeam.ties = homeTeam.record.t;
  homeTeam.ptsFor = homeTeam.record.pf;
  homeTeam.ptsAgainst = homeTeam.record.pa;
  
  awayTeam.wins = awayTeam.record.w;
  awayTeam.losses = awayTeam.record.l;
  awayTeam.ties = awayTeam.record.t;
  awayTeam.ptsFor = awayTeam.record.pf;
  awayTeam.ptsAgainst = awayTeam.record.pa;
}

// Fix 2: Enhanced simulation button functionality
function setupSimulationButton() {
  const simButton = document.getElementById('btnSimWeek');
  if (simButton) {
    // Remove existing listeners to prevent duplicates
    simButton.removeEventListener('click', handleSimulateWeek);
    simButton.addEventListener('click', handleSimulateWeek);
  }
}

function handleSimulateWeek() {
  console.log('🎯 Simulate button clicked');
  
  if (!state.league) {
    window.setStatus('❌ No league loaded - start a new game first');
    return;
  }
  
  // Disable button temporarily to prevent double-clicks
  const simButton = document.getElementById('btnSimWeek');
  if (simButton) {
    simButton.disabled = true;
    simButton.textContent = 'Simulating...';
  }
  
  try {
    window.simulateWeek();
  } catch (error) {
    console.error('❌ Simulation error:', error);
    window.setStatus('Simulation failed: ' + error.message);
  }
  
  // Re-enable button
  setTimeout(() => {
    if (simButton) {
      simButton.disabled = false;
      simButton.textContent = 'Simulate Week';
    }
  }, 1000);
}

// Fix 3: Better styling for dropdowns and form elements
const improvedCSS = `
/* Enhanced Form Styling */
select, input[type="text"], input[type="number"] {
  background: #1e2328 !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #e6edf3 !important;
  padding: 12px 16px !important;
  border-radius: 12px !important;
  font-size: 14px !important;
  font-family: inherit !important;
  transition: all 200ms ease !important;
  min-height: 44px !important;
}

select:focus, input:focus {
  outline: none !important;
  border-color: #0a84ff !important;
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.1) !important;
  background: #242a30 !important;
}

select:hover, input:hover {
  border-color: rgba(255, 255, 255, 0.3) !important;
  background: #242a30 !important;
}

/* Option styling for better readability */
select option {
  background: #1e2328 !important;
  color: #e6edf3 !important;
  padding: 8px !important;
  border: none !important;
}

/* Enhanced Modal Styling */
.modal-card {
  background: linear-gradient(145deg, #161b22, #1e2328) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
}

.modal-card h3 {
  color: #e6edf3 !important;
  font-size: 1.5rem !important;
  margin-bottom: 1.5rem !important;
  text-align: center !important;
}

.modal-card .section {
  margin-bottom: 1.5rem !important;
}

.modal-card label {
  display: block !important;
  color: #e6edf3 !important;
  font-weight: 600 !important;
  margin-bottom: 8px !important;
  font-size: 14px !important;
}

/* Radio button styling */
input[type="radio"] {
  appearance: none !important;
  width: 18px !important;
  height: 18px !important;
  border: 2px solid rgba(255, 255, 255, 0.3) !important;
  border-radius: 50% !important;
  margin-right: 8px !important;
  position: relative !important;
  cursor: pointer !important;
  transition: all 200ms ease !important;
}

input[type="radio"]:checked {
  border-color: #0a84ff !important;
  background: #0a84ff !important;
}

input[type="radio"]:checked::after {
  content: '' !important;
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  background: white !important;
  position: absolute !important;
  top: 3px !important;
  left: 3px !important;
}

/* Enhanced Button Styling */
.btn {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  color: #e6edf3 !important;
  padding: 12px 20px !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  cursor: pointer !important;
  transition: all 200ms ease !important;
  min-height: 44px !important;
}

.btn:hover {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.1)) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
  transform: translateY(-1px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

.btn.primary {
  background: linear-gradient(135deg, #0a84ff, #409cff) !important;
  border-color: #0a84ff !important;
  color: white !important;
  box-shadow: 0 2px 8px rgba(10, 132, 255, 0.3) !important;
}

.btn.primary:hover {
  background: linear-gradient(135deg, #409cff, #66b3ff) !important;
  box-shadow: 0 6px 20px rgba(10, 132, 255, 0.4) !important;
}

.btn.danger {
  background: linear-gradient(135deg, #ff453a, #ff6b5a) !important;
  border-color: #ff453a !important;
  color: white !important;
}

.btn:disabled {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  transform: none !important;
  background: rgba(255, 255, 255, 0.05) !important;
}

/* Better Table Styling for Game Info */
.table {
  background: rgba(30, 35, 40, 0.8) !important;
  backdrop-filter: blur(10px) !important;
}

.table th {
  background: rgba(40, 46, 54, 0.9) !important;
  color: #e6edf3 !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.5px !important;
  font-size: 12px !important;
}

.table td {
  color: #9fb0c2 !important;
  background: rgba(22, 27, 34, 0.3) !important;
}

.table tbody tr:hover {
  background: rgba(255, 255, 255, 0.05) !important;
}

/* Status Message Styling */
#statusMsg {
  background: linear-gradient(135deg, #0a84ff, #409cff) !important;
  color: white !important;
  padding: 12px 16px !important;
  border-radius: 12px !important;
  font-weight: 600 !important;
  box-shadow: 0 4px 12px rgba(10, 132, 255, 0.3) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

/* Improved Row Styling */
.row {
  align-items: center !important;
  gap: 12px !important;
}

/* Better Modal Layout */
.modal-card .row {
  justify-content: space-between !important;
  align-items: center !important;
}

.modal-card .row label {
  margin-bottom: 0 !important;
  white-space: nowrap !important;
}

/* Team Selection Specific Fixes */
#onboardTeam, #rosterTeam, #faTeam, #userTeam {
  background: #242a30 !important;
  border: 2px solid rgba(255, 255, 255, 0.2) !important;
  color: #e6edf3 !important;
  font-weight: 500 !important;
  min-width: 200px !important;
}

#onboardTeam:focus, #rosterTeam:focus, #faTeam:focus, #userTeam:focus {
  border-color: #0a84ff !important;
  background: #2a3038 !important;
  box-shadow: 0 0 0 3px rgba(10, 132, 255, 0.2) !important;
}

/* Better spacing in modal */
.modal-card .section {
  padding: 16px 0 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.modal-card .section:last-child {
  border-bottom: none !important;
}

/* Loading indicator for simulation */
.simulating {
  position: relative !important;
  overflow: hidden !important;
}

.simulating::after {
  content: '' !important;
  position: absolute !important;
  top: 0 !important;
  left: -100% !important;
  width: 100% !important;
  height: 100% !important;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent) !important;
  animation: shimmer 1.5s infinite !important;
}

@keyframes shimmer {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* User team highlighting */
.user-team {
  background: linear-gradient(135deg, rgba(10, 132, 255, 0.1), rgba(10, 132, 255, 0.05)) !important;
  border-left: 3px solid #0a84ff !important;
  position: relative !important;
}

.user-team::before {
  content: '👤' !important;
  position: absolute !important;
  left: 8px !important;
  top: 50% !important;
  transform: translateY(-50%) !important;
  font-size: 12px !important;
}

.user-team td:first-child {
  padding-left: 32px !important;
  font-weight: 600 !important;
  color: #e6edf3 !important;
}

/* Responsive improvements */
@media (max-width: 768px) {
  .modal-card {
    margin: 16px !important;
    padding: 20px !important;
  }
  
  .modal-card .row {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 8px !important;
  }
  
  select, input {
    min-width: 100% !important;
  }
}
`;

// Inject the enhanced CSS
const styleElement = document.createElement('style');
styleElement.textContent = improvedCSS;
document.head.appendChild(styleElement);

// Fix 4: Debug simulation function
window.debugSimulation = function() {
  console.log('🔍 Debug: Testing simulation components...');
  
  const L = state.league;
  if (!L) {
    console.log('❌ No league');
    return false;
  }
  
  console.log('✅ League found:', L.year, 'Week', L.week);
  console.log('✅ Teams:', L.teams.length);
  console.log('✅ Schedule weeks:', L.schedule?.weeks?.length || 0);
  
  // Test current week
  const scheduleWeeks = L.schedule?.weeks || L.schedule || [];
  const currentWeek = scheduleWeeks[L.week - 1];
  
  if (!currentWeek) {
    console.log('❌ No current week data');
    return false;
  }
  
  console.log('✅ Current week games:', currentWeek.games?.length || 0);
  
  // Show sample games
  const games = currentWeek.games || [];
  games.slice(0, 3).forEach((game, i) => {
    if (game.bye !== undefined) {
      const team = L.teams[game.bye];
      console.log(`Game ${i + 1}: ${team?.name || 'Team'} has BYE`);
    } else {
      const home = L.teams[game.home];
      const away = L.teams[game.away];
      console.log(`Game ${i + 1}: ${away?.name || 'Away'} @ ${home?.name || 'Home'}`);
    }
  });
  
  return true;
};

// Fix 5: Test simulation function
window.testSimulation = function() {
  console.log('🧪 Testing simulation...');
  
  if (!window.debugSimulation()) {
    return false;
  }
  
  try {
    console.log('🎲 Running simulation test...');
    window.simulateWeek();
    console.log('✅ Simulation test completed');
    return true;
  } catch (error) {
    console.error('❌ Simulation test failed:', error);
    return false;
  }
};

// Auto-setup when loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSimulationButton);
} else {
  setupSimulationButton();
}

// Make functions globally available
window.simulateGameFallback = simulateGameFallback;
window.updateTeamRecords = updateTeamRecords;
window.setupSimulationButton = setupSimulationButton;
window.handleSimulateWeek = handleSimulateWeek;

console.log('✅ Simulation and styling fixes loaded!');
