// missing-core-functions.js - Add this file to fix the missing functions
'use strict';

// Fix 1: State should be lowercase (already exists in state.js, just expose it properly)
window.State = window.state; // Alias for case sensitivity

// Fix 2: generateFreeAgents function (missing from freeAgency.js)
function generateFreeAgents() {
  console.log('Generating free agents...');
  
  if (!window.ensureFA) {
    console.error('ensureFA function not available');
    return [];
  }
  
  // Use the existing ensureFA function
  window.ensureFA();
  return state.freeAgents || [];
}

// Fix 3: listByMode function (should be in ui.js but let's ensure it exists)
function listByMode(mode) {
  if (!window.Teams) {
    console.error("Teams data has not loaded yet!");
    return [];
  }
  
  const T = window.Teams;
  const real = T.TEAM_META_REAL || [];
  const fict = T.TEAM_META_FICTIONAL || [];
  return mode === 'real' ? real : fict;
}

// Fix 4: saveState and loadState functions (aliases to existing functions)
function saveState() {
  console.log('Saving state...');
  if (window.saveGame) {
    return window.saveGame();
  } else {
    console.error('saveGame function not available');
    return false;
  }
}

function loadState() {
  console.log('Loading state...');
  if (window.loadGame) {
    return window.loadGame();
  } else {
    console.error('loadGame function not available');
    return false;
  }
}

// Fix 5: Additional missing functions that might be needed
function initializeGame() {
  console.log('Initializing game...');
  
  // Ensure all required objects exist
  if (!window.state) {
    window.state = {
      league: null,
      freeAgents: [],
      playoffs: null,
      namesMode: 'fictional',
      onboarded: false,
      pendingOffers: [],
      trainingPlan: null,
      userTeamId: 0,
      draftClass: [],
      gameMode: 'gm',
      playerRole: 'GM'
    };
  }
  
  // Initialize free agents if needed
  if (!state.freeAgents || state.freeAgents.length === 0) {
    generateFreeAgents();
  }
  
  return true;
}

// Fix 6: Ensure critical dependencies are met
function checkDependencies() {
  const required = [
    'Constants', 'Teams', 'Utils', 'state', 
    'makeLeague', 'show', 'setStatus'
  ];
  
  const missing = [];
  required.forEach(dep => {
    if (!window[dep]) {
      missing.push(dep);
    }
  });
  
  if (missing.length > 0) {
    console.error('Missing dependencies:', missing);
    return false;
  }
  
  return true;
}

// Fix 7: Safe initialization wrapper
function safeInitialize() {
  try {
    console.log('Running safe initialization...');
    
    // Check dependencies first
    if (!checkDependencies()) {
      console.error('Cannot initialize - missing dependencies');
      return false;
    }
    
    // Initialize game
    if (!initializeGame()) {
      console.error('Game initialization failed');
      return false;
    }
    
    console.log('Safe initialization completed successfully');
    return true;
    
  } catch (error) {
    console.error('Error during safe initialization:', error);
    return false;
  }
}

// Make all functions globally available
window.generateFreeAgents = generateFreeAgents;
window.listByMode = listByMode;
window.saveState = saveState;
window.loadState = loadState;
window.initializeGame = initializeGame;
window.checkDependencies = checkDependencies;
window.safeInitialize = safeInitialize;

// Auto-run safe initialization when this script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInitialize);
} else {
  safeInitialize();
}
