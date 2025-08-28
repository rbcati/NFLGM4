// onboarding-modal-fix.js - Fix for team selection during onboarding
'use strict';

console.log('🔧 Loading onboarding modal fix...');

/**
 * Enhanced fillTeamSelect that works both during onboarding and after league creation
 * @param {HTMLElement} selectEl - Select element to fill
 * @param {boolean} includeAll - Whether to include "All Teams" option
 * @param {string} mode - Team mode ('fictional' or 'real') for onboarding
 */
window.fillTeamSelect = function(selectEl, includeAll = false, mode = null) {
  if (!selectEl) return;
  
  let teams = null;
  
  // Try to get teams from league first (after game starts)
  const L = state.league;
  if (L && L.teams) {
    teams = L.teams;
    console.log('Using teams from league:', teams.length);
  } 
  // Fallback to raw team data (during onboarding)
  else if (mode) {
    teams = window.listByMode(mode);
    console.log('Using raw team data for mode:', mode, teams.length);
  }
  // Try current state mode
  else if (state.namesMode) {
    teams = window.listByMode(state.namesMode);
    console.log('Using teams from state mode:', state.namesMode, teams.length);
  }
  // Final fallback
  else {
    teams = window.listByMode('fictional');
    console.log('Using fictional teams as fallback:', teams.length);
  }
  
  if (!teams || teams.length === 0) {
    console.warn('No teams available for team select');
    selectEl.innerHTML = '<option value="">No teams available</option>';
    return;
  }
  
  selectEl.innerHTML = '';
  
  if (includeAll) {
    const allOption = document.createElement('option');
    allOption.value = '-1';
    allOption.textContent = 'All Teams';
    selectEl.appendChild(allOption);
  }
  
  teams.forEach((team, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${team.abbr} — ${team.name}`;
    selectEl.appendChild(option);
  });
  
  // Set to user's team by default (if league exists)
  if (L && L.teams) {
    const userTeamId = state.userTeamId || state.player?.teamId || 0;
    selectEl.value = String(userTeamId);
  }
  
  console.log('✅ Team select populated with', teams.length, 'teams');
};

/**
 * Fixed openOnboard function that properly populates team dropdown
 */
window.openOnboard = function() {
  try {
    console.log('Opening onboarding modal...');
    
    const modal = document.getElementById('onboardModal');
    if (!modal) {
      console.error('Onboard modal not found');
      return;
    }
    
    // Show the modal
    modal.hidden = false;
    modal.style.display = 'flex';
    
    // Initialize with default mode
    if (!state.namesMode) {
      state.namesMode = 'fictional';
    }
    
    // Set the correct radio button
    const fictionalRadio = document.querySelector('input[name="namesMode"][value="fictional"]');
    const realRadio = document.querySelector('input[name="namesMode"][value="real"]');
    
    if (state.namesMode === 'real' && realRadio) {
      realRadio.checked = true;
    } else if (fictionalRadio) {
      fictionalRadio.checked = true;
      state.namesMode = 'fictional';
    }
    
    // Populate team dropdown using the enhanced fillTeamSelect
    const teamSelect = document.getElementById('onboardTeam');
    if (teamSelect) {
      window.fillTeamSelect(teamSelect, false, state.namesMode);
    }
    
    // Set up event listeners for the modal
    setupOnboardEventListeners();
    
    console.log('✅ Onboarding modal opened successfully');
    
  } catch (error) {
    console.error('Error opening onboard modal:', error);
  }
};

/**
 * Enhanced event listener setup for onboarding
 */
function setupOnboardEventListeners() {
  console.log('Setting up onboard event listeners...');
  
  // Names mode change event
  const namesModeRadios = document.querySelectorAll('input[name="namesMode"]');
  namesModeRadios.forEach(radio => {
    // Remove existing listeners to prevent duplicates
    radio.removeEventListener('change', handleNamesModeChange);
    radio.addEventListener('change', handleNamesModeChange);
  });
  
  // Game mode change event
  const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
  gameModeRadios.forEach(radio => {
    radio.removeEventListener('change', handleGameModeChange);
    radio.addEventListener('change', handleGameModeChange);
  });
  
  // Random team button
  const randomButton = document.getElementById('onboardRandom');
  if (randomButton) {
    randomButton.removeEventListener('click', handleRandomTeam);
    randomButton.addEventListener('click', handleRandomTeam);
  }
  
  // Start button
  const startButton = document.getElementById('onboardStart');
  if (startButton) {
    startButton.removeEventListener('click', handleGameStartClick);
    startButton.addEventListener('click', handleGameStartClick);
  }
  
  console.log('✅ Onboard event listeners set up successfully');
}

/**
 * Handle names mode change
 */
function handleNamesModeChange(e) {
  console.log('Names mode changed to:', e.target.value);
  state.namesMode = e.target.value;
  
  // Re-populate team dropdown
  const teamSelect = document.getElementById('onboardTeam');
  if (teamSelect) {
    window.fillTeamSelect(teamSelect, false, e.target.value);
  }
}

/**
 * Handle game mode change
 */
function handleGameModeChange(e) {
  console.log('Game mode changed to:', e.target.value);
  const careerOptions = document.getElementById('careerOptions');
  if (careerOptions) {
    careerOptions.hidden = e.target.value !== 'career';
  }
}

/**
 * Handle random team selection
 */
function handleRandomTeam(e) {
  e.preventDefault();
  const teamSelect = document.getElementById('onboardTeam');
  if (teamSelect && teamSelect.options.length > 0) {
    const randomIndex = Math.floor(Math.random() * teamSelect.options.length);
    teamSelect.selectedIndex = randomIndex;
    const selectedTeam = teamSelect.options[randomIndex].text;
    window.setStatus(`Random team selected: ${selectedTeam}`);
  }
}

/**
 * Handle start button click
 */
function handleGameStartClick(e) {
  e.preventDefault();
  
  console.log('🎮 Starting game from onboarding...');
  
  try {
    // Get form values
    const gameModeEl = document.querySelector('input[name="gameMode"]:checked');
    const namesModeEl = document.querySelector('input[name="namesMode"]:checked');
    const teamSelect = document.getElementById('onboardTeam');
    const careerRoleEl = document.getElementById('careerRole');
    
    // Validate required elements
    if (!teamSelect || teamSelect.options.length === 0) {
      window.setStatus('Error: No teams available to select');
      return;
    }
    
    // Build options
    const gameOptions = {
      gameMode: gameModeEl ? gameModeEl.value : 'gm',
      playerRole: 'GM',
      chosenMode: namesModeEl ? namesModeEl.value : 'fictional',
      teamIdx: teamSelect.value || '0'
    };
    
    // Handle career mode role
    if (gameOptions.gameMode === 'career' && careerRoleEl) {
      gameOptions.playerRole = careerRoleEl.value;
    }
    
    console.log('Game options:', gameOptions);
    
    // Validate team selection
    const teams = window.listByMode(gameOptions.chosenMode);
    const teamIdx = parseInt(gameOptions.teamIdx, 10);
    
    if (isNaN(teamIdx) || teamIdx < 0 || teamIdx >= teams.length) {
      window.setStatus('Error: Invalid team selection');
      return;
    }
    
    const selectedTeam = teams[teamIdx];
    console.log('Selected team:', selectedTeam);
    
    // Initialize the game
    if (window.initNewGame) {
      window.initNewGame(gameOptions);
    } else {
      // Fallback initialization
      startGameFallback(gameOptions, teams);
    }
    
  } catch (error) {
    console.error('Error starting game from onboarding:', error);
    window.setStatus('Error starting game: ' + error.message);
  }
}

/**
 * Fallback game start if initNewGame isn't available
 */
function startGameFallback(options, teams) {
  try {
    console.log('🔄 Using fallback game start...');
    
    // Update state
    state.gameMode = options.gameMode;
    state.playerRole = options.playerRole;
    state.namesMode = options.chosenMode;
    state.userTeamId = parseInt(options.teamIdx, 10);
    state.onboarded = true;
    
    // Ensure player object exists
    if (!state.player) {
      state.player = {};
    }
    state.player.teamId = state.userTeamId;
    
    // Create league
    if (window.makeLeague) {
      console.log('Creating league with', teams.length, 'teams');
      state.league = window.makeLeague(teams);
      
      if (!state.league) {
        throw new Error('League creation failed');
      }
    } else {
      throw new Error('makeLeague function not available');
    }
    
    // Generate free agents
    if (window.ensureFA) {
      window.ensureFA();
    }
    
    // Close modal
    const modal = document.getElementById('onboardModal');
    if (modal) {
      modal.hidden = true;
      modal.style.display = 'none';
    }
    
    // Save game
    if (window.saveState) {
      window.saveState();
    }
    
    // Navigate to hub and refresh UI
    location.hash = '#/hub';
    
    if (window.refreshAll) {
      window.refreshAll();
    } else {
      // Basic UI refresh
      if (window.router) {
        window.router();
      }
    }
    
    const teamName = teams[state.userTeamId]?.name || 'Unknown Team';
    window.setStatus(`✅ Game started! You are the ${options.playerRole} of ${teamName}`);
    
    console.log('✅ Fallback game start completed successfully');
    
  } catch (error) {
    console.error('Fallback game start failed:', error);
    window.setStatus('Failed to start game: ' + error.message);
  }
}

/**
 * Force show modal (for debugging)
 */
window.forceShowOnboardModal = function() {
  console.log('🚀 Force showing onboarding modal...');
  
  const modal = document.getElementById('onboardModal');
  if (!modal) {
    console.error('Modal not found');
    return;
  }
  
  // Force show
  modal.hidden = false;
  modal.style.display = 'flex';
  
  // Force populate team dropdown
  const teamSelect = document.getElementById('onboardTeam');
  if (teamSelect) {
    window.fillTeamSelect(teamSelect, false, 'fictional');
  }
  
  // Set up events
  setupOnboardEventListeners();
  
  console.log('✅ Modal force-shown');
};

/**
 * Quick test function
 */
window.testOnboardModal = function() {
  console.log('🧪 Testing onboard modal...');
  
  const modal = document.getElementById('onboardModal');
  const teamSelect = document.getElementById('onboardTeam');
  
  console.log('Modal found:', !!modal);
  console.log('Team select found:', !!teamSelect);
  console.log('Team options:', teamSelect?.options?.length || 0);
  
  if (teamSelect) {
    console.log('Sample teams:', Array.from(teamSelect.options).slice(0, 3).map(o => o.textContent));
  }
  
  const teams = window.listByMode('fictional');
  console.log('Available teams:', teams.length);
  
  return {
    modal: !!modal,
    teamSelect: !!teamSelect,
    optionsCount: teamSelect?.options?.length || 0,
    teamsAvailable: teams.length
  };
};

// Auto-initialize when loaded
setTimeout(() => {
  console.log('🎯 Auto-fixing onboarding modal...');
  
  // Check if we need to show the modal
  if (!state.onboarded || !state.league) {
    window.forceShowOnboardModal();
  }
}, 1000);

console.log('✅ Onboarding modal fix loaded!');
