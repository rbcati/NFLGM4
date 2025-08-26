// onboard-fix.js - Add this new file to fix team selection in onboarding
'use strict';

/**
 * Enhanced onboarding modal with working team selection
 */
function openOnboard() {
  try {
    console.log('Opening onboarding modal...');
    
    const modal = document.getElementById('onboardModal'); 
    if (!modal) {
      console.error('Onboard modal not found');
      return;
    }
    
    // Show the modal
    modal.hidden = false;
    
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
    
    // Populate team dropdown
    populateTeamDropdown(state.namesMode);
    
    // Set up event listeners for the modal
    setupOnboardEventListeners();
    
    console.log('Onboarding modal opened successfully');
    
  } catch (error) {
    console.error('Error opening onboard modal:', error);
  }
}

/**
 * Populate the team dropdown with teams for the selected mode
 * @param {string} mode - 'fictional' or 'real'
 */
function populateTeamDropdown(mode) {
  console.log('Populating team dropdown for mode:', mode);
  
  const teamSelect = document.getElementById('onboardTeam');
  if (!teamSelect) {
    console.error('Team select element not found');
    return;
  }
  
  try {
    // Clear existing options
    teamSelect.innerHTML = '';
    
    // Get teams for the selected mode
    const teams = listByMode(mode);
    console.log(`Found ${teams.length} teams for ${mode} mode`);
    
    if (teams.length === 0) {
      console.error('No teams found for mode:', mode);
      teamSelect.innerHTML = '<option value="">No teams available</option>';
      return;
    }
    
    // Add teams to dropdown
    teams.forEach((team, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${team.abbr} — ${team.name}`;
      teamSelect.appendChild(option);
    });
    
    // Select first team by default
    teamSelect.selectedIndex = 0;
    
    console.log('Team dropdown populated successfully');
    
  } catch (error) {
    console.error('Error populating team dropdown:', error);
    teamSelect.innerHTML = '<option value="">Error loading teams</option>';
  }
}

/**
 * Set up event listeners for the onboarding modal
 */
function setupOnboardEventListeners() {
  console.log('Setting up onboard event listeners...');
  
  // Names mode change event
  const namesModeRadios = document.querySelectorAll('input[name="namesMode"]');
  namesModeRadios.forEach(radio => {
    radio.addEventListener('change', function(e) {
      console.log('Names mode changed to:', e.target.value);
      state.namesMode = e.target.value;
      populateTeamDropdown(e.target.value);
    });
  });
  
  // Game mode change event
  const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
  gameModeRadios.forEach(radio => {
    radio.addEventListener('change', function(e) {
      console.log('Game mode changed to:', e.target.value);
      const careerOptions = document.getElementById('careerOptions');
      if (careerOptions) {
        careerOptions.hidden = e.target.value !== 'career';
      }
    });
  });
  
  // Random team button
  const randomButton = document.getElementById('onboardRandom');
  if (randomButton) {
    randomButton.addEventListener('click', function(e) {
      e.preventDefault();
      const teamSelect = document.getElementById('onboardTeam');
      if (teamSelect && teamSelect.options.length > 0) {
        const randomIndex = Math.floor(Math.random() * teamSelect.options.length);
        teamSelect.selectedIndex = randomIndex;
        const selectedTeam = teamSelect.options[randomIndex].text;
        window.setStatus(`Random team selected: ${selectedTeam}`);
      }
    });
  }
  
  // Start button
  const startButton = document.getElementById('onboardStart');
  if (startButton) {
    startButton.addEventListener('click', function(e) {
      e.preventDefault();
      handleGameStart();
    });
  }
  
  console.log('Onboard event listeners set up successfully');
}

/**
 * Handle starting the game
 */
function handleGameStart() {
  console.log('Starting game...');
  
  try {
    // Get selected values
    const gameModeEl = document.querySelector('input[name="gameMode"]:checked');
    const gameMode = gameModeEl ? gameModeEl.value : 'gm';
    
    let playerRole = 'GM';
    if (gameMode === 'career') {
      const careerRoleEl = document.getElementById('careerRole');
      playerRole = careerRoleEl ? careerRoleEl.value : 'GM';
    }
    
    const namesModeEl = document.querySelector('input[name="namesMode"]:checked');
    const chosenMode = namesModeEl ? namesModeEl.value : 'fictional';
    
    const teamSelect = document.getElementById('onboardTeam');
    if (!teamSelect || teamSelect.options.length === 0) {
      window.setStatus('Error: No teams available to select');
      return;
    }
    
    const teamIdx = parseInt(teamSelect.value || '0', 10);
    const selectedTeamName = teamSelect.options[teamSelect.selectedIndex]?.text || 'Unknown Team';
    
    console.log('Game settings:', {
      gameMode,
      playerRole,
      chosenMode,
      teamIdx,
      selectedTeamName
    });
    
    // Validate team selection
    const teams = listByMode(chosenMode);
    if (teamIdx < 0 || teamIdx >= teams.length) {
      window.setStatus('Error: Invalid team selection');
      return;
    }
    
    // Update state
    state.userTeamId = teamIdx;
    state.namesMode = chosenMode;
    state.gameMode = gameMode;
    state.playerRole = playerRole;
    state.onboarded = true;
    
    // Create league
    console.log('Creating league...');
    if (!window.makeLeague || !window.listByMode) {
      window.setStatus('Error: Game initialization functions not loaded');
      return;
    }
    
    state.league = window.makeLeague(teams);
    if (!state.league) {
      window.setStatus('Error: Failed to create league');
      return;
    }
    
    console.log('League created:', state.league);
    
    // Set up UI
    if (window.fillTeamSelect) {
      const userTeamSelect = document.getElementById('userTeam');
      if (userTeamSelect) {
        window.fillTeamSelect(userTeamSelect);
        userTeamSelect.value = String(teamIdx);
      }
    }
    
    if (window.rebuildTeamLabels) {
      window.rebuildTeamLabels(chosenMode);
    }
    
    // Close modal and show game
    closeOnboard();
    location.hash = '#/hub';
    window.setStatus(`Started as ${playerRole} of ${selectedTeamName}!`);
    
    // Refresh UI
    if (window.refreshAll) {
      window.refreshAll();
    } else if (window.renderHub) {
      window.renderHub();
    }
    
    console.log('Game started successfully');
    
  } catch (error) {
    console.error('Error starting game:', error);
    window.setStatus('Error starting game: ' + error.message);
  }
}

/**
 * Enhanced listByMode function with better error handling
 * @param {string} mode - 'fictional' or 'real'
 * @returns {Array} Array of team objects
 */
function listByMode(mode) {
  console.log('listByMode called with mode:', mode);
  
  if (!window.Teams) {
    console.error("Teams data has not loaded yet!");
    return [];
  }
  
  const T = window.Teams;
  
  // Check if team data exists
  if (!T.TEAM_META_REAL || !T.TEAM_META_FICTIONAL) {
    console.error("Team metadata is missing!", T);
    return [];
  }
  
  const real = T.TEAM_META_REAL || [];
  const fictional = T.TEAM_META_FICTIONAL || [];
  
  const result = mode === 'real' ? real : fictional;
  console.log(`Returning ${result.length} teams for ${mode} mode`);
  
  return result;
}

/**
 * Close the onboarding modal
 */
function closeOnboard() {
  const modal = document.getElementById('onboardModal');
  if (modal) {
    modal.hidden = true;
  }
}

/**
 * Test function to check if team selection is working
 */
function testTeamSelection() {
  console.log('🧪 Testing team selection...');
  
  // Test fictional teams
  const fictional = listByMode('fictional');
  console.log('Fictional teams:', fictional.length, fictional.slice(0, 3));
  
  // Test real teams
  const real = listByMode('real');
  console.log('Real teams:', real.length, real.slice(0, 3));
  
  // Test modal functions
  console.log('Testing modal functions...');
  if (window.openOnboard) {
    console.log('✅ openOnboard function available');
  } else {
    console.log('❌ openOnboard function missing');
  }
  
  return {
    fictional: fictional.length,
    real: real.length,
    modalFunction: !!window.openOnboard
  };
}

// Make functions globally available
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
window.populateTeamDropdown = populateTeamDropdown;
window.setupOnboardEventListeners = setupOnboardEventListeners;
window.handleGameStart = handleGameStart;
window.listByMode = listByMode;
window.testTeamSelection = testTeamSelection;

console.log('Onboard team selection fix loaded');
