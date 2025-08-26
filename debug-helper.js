// debug-helper.js - Add this to help troubleshoot issues
(function() {
  'use strict';
  
  console.log('🔍 NFL GM Debug Helper loaded');
  
  // Debug functions
  window.debugNFLGM = {
    
    checkDependencies() {
      console.log('📋 Checking dependencies...');
      
      const required = {
        'Constants': window.Constants,
        'Teams': window.Teams,
        'Utils': window.Utils,
        'state': window.state,
        'makeLeague': window.makeLeague,
        'listByMode': window.listByMode,
        'openOnboard': window.openOnboard,
        'show': window.show,
        'setStatus': window.setStatus
      };
      
      const missing = [];
      const available = [];
      
      Object.keys(required).forEach(key => {
        if (required[key]) {
          available.push(key);
        } else {
          missing.push(key);
        }
      });
      
      console.log('✅ Available:', available);
      console.log('❌ Missing:', missing);
      
      return missing.length === 0;
    },
    
    checkModal() {
      console.log('🎭 Checking modal...');
      
      const modal = document.getElementById('onboardModal');
      const teamSelect = document.getElementById('onboardTeam');
      const startButton = document.getElementById('onboardStart');
      
      console.log('Modal element:', modal);
      console.log('Modal hidden:', modal?.hidden);
      console.log('Modal display style:', modal?.style?.display);
      console.log('Team select:', teamSelect);
      console.log('Team select options:', teamSelect?.options?.length);
      console.log('Start button:', startButton);
      
      if (modal && modal.hidden) {
        console.log('🔧 Attempting to show modal...');
        modal.hidden = false;
        modal.style.display = 'flex';
      }
    },
    
    forceShowModal() {
      console.log('🚀 Force showing modal...');
      if (window.openOnboard) {
        window.openOnboard();
      } else {
        console.error('openOnboard function not available');
      }
    },
    
    checkTeams() {
      console.log('🏈 Checking teams...');
      
      if (window.listByMode) {
        const fictional = window.listByMode('fictional');
        const real = window.listByMode('real');
        
        console.log('Fictional teams:', fictional.length);
        console.log('Real teams:', real.length);
        console.log('Sample fictional:', fictional[0]);
        console.log('Sample real:', real[0]);
      } else {
        console.error('listByMode function not available');
      }
    },
    
    simulateStart() {
      console.log('🎮 Simulating game start...');
      
      // Set up basic state
      if (!window.state) {
        window.state = {};
      }
      
      window.state.namesMode = 'fictional';
      window.state.userTeamId = 0;
      window.state.gameMode = 'gm';
      window.state.playerRole = 'GM';
      window.state.onboarded = false;
      
      // Try to create a league
      if (window.makeLeague && window.listByMode) {
        try {
          const teams = window.listByMode('fictional');
          console.log('Creating league with', teams.length, 'teams');
          const league = window.makeLeague(teams);
          window.state.league = league;
          window.state.onboarded = true;
          
          console.log('League created successfully:', league);
          
          // Try to show hub
          if (window.show) {
            window.show('hub');
          }
          
          if (window.refreshAll) {
            window.refreshAll();
          }
          
        } catch (error) {
          console.error('Error creating league:', error);
        }
      }
    },
    
    fullDiagnostic() {
      console.log('🔍 Running full diagnostic...');
      console.log('==========================================');
      
      this.checkDependencies();
      console.log('');
      this.checkModal();
      console.log('');
      this.checkTeams();
      console.log('');
      
      console.log('📊 State:', window.state);
      console.log('📊 Constants:', window.Constants ? 'loaded' : 'missing');
      console.log('📊 Teams data:', window.Teams ? 'loaded' : 'missing');
      
      console.log('==========================================');
      console.log('💡 To fix issues, try:');
      console.log('1. debugNFLGM.forceShowModal() - Force show the modal');
      console.log('2. debugNFLGM.simulateStart() - Skip modal and start game');
      console.log('3. Check browser console for errors');
      console.log('4. Make sure all JS files are loaded in correct order');
    },
    
    resetGame() {
      console.log('🔄 Resetting game...');
      const saveKey = window.Constants?.GAME_CONFIG?.SAVE_KEY || 'nflGM4.league';
      localStorage.removeItem(saveKey);
      location.reload();
    }
  };
  
  // Auto-run diagnostic in development
  setTimeout(() => {
    console.log('🚀 Auto-running diagnostic...');
    window.debugNFLGM.fullDiagnostic();
  }, 1000);
  
})();

// CSS to ensure modal is visible (add to your CSS file)
const debugCSS = `
.modal {
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  background: rgba(0, 0, 0, 0.8) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 9999 !important;
}

.modal[hidden] {
  display: none !important;
}

.modal-card {
  background: #1a1a1a !important;
  padding: 2rem !important;
  border-radius: 8px !important;
  max-width: 500px !important;
  width: 90% !important;
  color: white !important;
}

.modal-card h3 {
  margin-bottom: 1rem !important;
  color: white !important;
}

.modal-card .section {
  margin-bottom: 1rem !important;
}

.modal-card label {
  display: block !important;
  margin-bottom: 0.5rem !important;
  color: white !important;
}

.modal-card input[type="radio"] {
  margin-right: 0.5rem !important;
}

.modal-card select {
  width: 100% !important;
  padding: 0.5rem !important;
  margin-bottom: 0.5rem !important;
}

.modal-card button {
  padding: 0.5rem 1rem !important;
  margin: 0.25rem !important;
  cursor: pointer !important;
}

.row {
  display: flex !important;
  gap: 0.5rem !important;
  align-items: center !important;
}
`;
// Add this to debug-helper.js

window.debugNFLGM = {
  ...window.debugNFLGM, // Keep existing debug functions
  
  // New simulation debugging function
  checkSimulation() {
    console.log('🏈 Checking simulation setup...');
    console.log('==========================================');
    
    const L = state.league;
    if (!L) {
      console.error('❌ No league found');
      return false;
    }
    
    console.log('✅ League found:', L.year, 'Week', L.week);
    
    // Check schedule
    if (!L.schedule) {
      console.error('❌ No schedule found');
      return false;
    }
    
    const scheduleWeeks = L.schedule.weeks || L.schedule;
    if (!Array.isArray(scheduleWeeks)) {
      console.error('❌ Schedule is not an array:', typeof scheduleWeeks);
      return false;
    }
    
    console.log('✅ Schedule found:', scheduleWeeks.length, 'weeks');
    
    // Check current week
    const currentWeekIndex = L.week - 1;
    if (currentWeekIndex >= scheduleWeeks.length) {
      console.log('⚠️ Current week beyond schedule (season over?)');
      return false;
    }
    
    const currentWeek = scheduleWeeks[currentWeekIndex];
    if (!currentWeek || !currentWeek.games) {
      console.error('❌ Current week has no games:', currentWeek);
      return false;
    }
    
    console.log('✅ Current week games:', currentWeek.games.length);
    
    // Check teams
    if (!L.teams || !Array.isArray(L.teams)) {
      console.error('❌ No teams array found');
      return false;
    }
    
    console.log('✅ Teams found:', L.teams.length);
    
    // Check first few games
    console.log('📋 Sample games for current week:');
    currentWeek.games.slice(0, 3).forEach((game, i) => {
      if (game.bye !== undefined) {
        console.log(`  Game ${i + 1}: Team ${game.bye} has BYE`);
      } else {
        const home = L.teams[game.home];
        const away = L.teams[game.away];
        if (home && away) {
          console.log(`  Game ${i + 1}: ${away.name} @ ${home.name}`);
        } else {
          console.error(`  Game ${i + 1}: Invalid teams - home: ${game.home}, away: ${game.away}`);
        }
      }
    });
    
    // Check simulation functions
    const requiredFunctions = ['simGameStats', 'applyResult', 'simulateWeek'];
    const missingFunctions = requiredFunctions.filter(fn => !window[fn]);
    
    if (missingFunctions.length > 0) {
      console.error('❌ Missing simulation functions:', missingFunctions);
      return false;
    }
    
    console.log('✅ All simulation functions available');
    
    // Test game simulation (dry run)
    try {
      const testGame = currentWeek.games.find(g => g.bye === undefined);
      if (testGame) {
        const home = L.teams[testGame.home];
        const away = L.teams[testGame.away];
        if (home && away) {
          console.log('🧪 Testing game simulation...');
          const result = window.simGameStats(home, away);
          console.log('✅ Test simulation result:', result);
        }
      }
    } catch (error) {
      console.error('❌ Simulation test failed:', error);
      return false;
    }
    
    console.log('==========================================');
    console.log('✅ Simulation setup looks good!');
    console.log('💡 Try running: debugNFLGM.forceSimulate()');
    
    return true;
  },
  
  // Force simulate current week with detailed logging
  forceSimulate() {
    console.log('🚀 Force simulating week...');
    
    if (!this.checkSimulation()) {
      console.error('❌ Simulation check failed');
      return;
    }
    
    try {
      window.simulateWeek();
      console.log('✅ Simulation completed');
    } catch (error) {
      console.error('❌ Simulation failed:', error);
    }
  },
  
  // Check current league state
  checkLeagueState() {
    console.log('📊 League State:');
    const L = state.league;
    if (!L) {
      console.log('❌ No league');
      return;
    }
    
    console.log('Year:', L.year);
    console.log('Week:', L.week);
    console.log('Teams:', L.teams?.length || 0);
    console.log('Schedule weeks:', L.schedule?.weeks?.length || L.schedule?.length || 0);
    console.log('Results stored:', Object.keys(L.resultsByWeek || {}).length, 'weeks');
    
    // Show team records
    console.log('📋 Team Records (top 5):');
    if (L.teams) {
      const sortedTeams = [...L.teams].sort((a, b) => b.record.w - a.record.w);
      sortedTeams.slice(0, 5).forEach((team, i) => {
        console.log(`  ${i + 1}. ${team.name}: ${team.record.w}-${team.record.l}-${team.record.t}`);
      });
    }
  }
};
// Inject debug CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = debugCSS;
document.head.appendChild(styleSheet);
