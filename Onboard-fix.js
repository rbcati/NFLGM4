// onboard-fix.js - Enhanced team selection with multiple fallbacks
'use strict';

/**
 * Enhanced listByMode function with multiple fallback options
 * @param {string} mode - 'fictional' or 'real'
 * @returns {Array} Array of team objects
 */
function listByMode(mode) {
  console.log('listByMode called with mode:', mode);
  
  // Try multiple sources for team data
  const sources = [
    // Try Teams object first (primary)
    () => window.Teams?.real || window.Teams?.fictional,
    // Try the TEAM_META properties (secondary)
    () => window.Teams?.TEAM_META_REAL || window.Teams?.TEAM_META_FICTIONAL,
    // Try Constants directly (tertiary)
    () => window.Constants?.TEAMS_REAL || window.Constants?.TEAMS_FICTIONAL,
    // Try Constants TEAM_META properties (quaternary)
    () => window.Constants?.TEAM_META_REAL || window.Constants?.TEAM_META_FICTIONAL
  ];
  
  let realTeams = null;
  let fictionalTeams = null;
  
  // Try each source until we find teams
  for (const getSource of sources) {
    try {
      const source = getSource();
      if (source) {
        // Found a source, now try to get both real and fictional teams
        if (window.Teams) {
          realTeams = window.Teams.real || window.Teams.TEAM_META_REAL || 
                     window.Constants?.TEAMS_REAL || window.Constants?.TEAM_META_REAL;
          fictionalTeams = window.Teams.fictional || window.Teams.TEAM_META_FICTIONAL || 
                          window.Constants?.TEAMS_FICTIONAL || window.Constants?.TEAM_META_FICTIONAL;
        }
        
        if (window.Constants) {
          realTeams = realTeams || window.Constants.TEAMS_REAL || window.Constants.TEAM_META_REAL;
          fictionalTeams = fictionalTeams || window.Constants.TEAMS_FICTIONAL || window.Constants.TEAM_META_FICTIONAL;
        }
        
        if (realTeams && fictionalTeams) {
          break;
        }
      }
    } catch (e) {
      console.warn('Error accessing team source:', e);
      continue;
    }
  }
  
  if (!realTeams || !fictionalTeams) {
    console.error("Could not find team data in any expected location!");
    console.log("Available objects:", {
      Teams: !!window.Teams,
      Constants: !!window.Constants,
      TeamsKeys: window.Teams ? Object.keys(window.Teams) : null,
      ConstantsKeys: window.Constants ? Object.keys(window.Constants) : null
    });
    return [];
  }
  
  const result = mode === 'real' ? realTeams : fictionalTeams;
  console.log(`Returning ${result.length} teams for ${mode} mode`);
  
  if (result.length === 0) {
    console.error(`No ${mode} teams found!`);
  }
  
  return result;
}

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
    
    // Initialize state.player if it doesn't exist
    if (!state.player) {
      state.player = { teamId: teamIdx };
    } else {
      state.player.teamId = teamIdx;
    }
    
    // Create league
    console.log('Creating league...');
    if (!window.makeLeague) {
      window.setStatus('Error: makeLeague function not loaded');
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
    
    // Generate initial free agents
    if (window.ensureFA) {
      window.ensureFA();
    } else if (window.generateFreeAgents) {
      window.generateFreeAgents();
    }
    
    // Close modal and show game
    closeOnboard();
    location.hash = '#/hub';
    window.setStatus(`Started as ${playerRole} of ${selectedTeamName}!`);
    
    // Save the game state
    if (window.saveState || window.saveGame) {
      (window.saveState || window.saveGame)();
    }
    
    // Refresh UI
    if (window.refreshAll) {
      window.refreshAll();
    } else if (window.renderHub) {
      window.renderHub();
    } else {
      // Fallback UI update
      updateBasicUI();
    }
    
    console.log('Game started successfully');
    
  } catch (error) {
    console.error('Error starting game:', error);
    window.setStatus('Error starting game: ' + error.message);
  }
}

/**
 * Basic UI update as fallback
 */
function updateBasicUI() {
  try {
    const L = state.league;
    if (!L) return;
    
    // Update sidebar
    const seasonEl = document.getElementById('seasonNow') || document.getElementById('hubSeason');
    if (seasonEl) {
      seasonEl.textContent = L.year || '2025';
    }
    
    const weekEl = document.getElementById('hubWeek');
    if (weekEl) {
      weekEl.textContent = L.week || '1';
    }
    
    // Update team selector if available
    const userTeamSelect = document.getElementById('userTeam');
    if (userTeamSelect && L.teams) {
      userTeamSelect.innerHTML = '';
      L.teams.forEach((team, index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = team.name || `Team ${index + 1}`;
        if (index === (state.userTeamId || state.player?.teamId || 0)) {
          option.selected = true;
        }
        userTeamSelect.appendChild(option);
      });
    }
    
  } catch (error) {
    console.error('Error in basic UI update:', error);
  }
}

/**
 * Close the onboarding modal
 */
function closeOnboard() {
  const modal = document.getElementById('onboardModal');
  if (modal) {
    modal.hidden = true;
    modal.style.display = 'none';
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
    modalFunction: !!window.openOnboard,
    totalExpected: 32
  };
}

/**
 * Enhanced initialization that ensures team data is properly loaded
 */
function ensureTeamsLoaded() {
  console.log('🔍 Ensuring teams are loaded...');
  
  // Check if teams are properly loaded
  const fictional = listByMode('fictional');
  const real = listByMode('real');
  
  if (fictional.length === 0 || real.length === 0) {
    console.warn('⚠️ Teams not properly loaded, attempting to reload...');
    
    // Try to reload teams.js data
    if (window.Constants && window.Constants.TEAMS_REAL && window.Constants.TEAMS_FICTIONAL) {
      // Ensure Teams object exists with proper structure
      if (!window.Teams) {
        window.Teams = {};
      }
      
      window.Teams.real = window.Constants.TEAMS_REAL;
      window.Teams.fictional = window.Constants.TEAMS_FICTIONAL;
      window.Teams.TEAM_META_REAL = window.Constants.TEAMS_REAL;
      window.Teams.TEAM_META_FICTIONAL = window.Constants.TEAMS_FICTIONAL;
      
      console.log('✅ Teams reloaded successfully');
    } else {
      console.error('❌ Cannot reload teams - Constants data missing');
      return false;
    }
  } else {
    console.log('✅ Teams already loaded properly');
  }
  
  return true;
}

/**
 * Initialize the onboarding system with proper error handling
 */
function initializeOnboardingSystem() {
  try {
    console.log('🎯 Initializing onboarding system...');
    
    // Ensure teams are loaded first
    if (!ensureTeamsLoaded()) {
      console.error('❌ Cannot initialize onboarding - teams not loaded');
      return false;
    }
    
    // Test team selection
    const testResult = testTeamSelection();
    if (testResult.fictional === 0 || testResult.real === 0) {
      console.error('❌ Team selection test failed:', testResult);
      return false;
    }
    
    console.log('✅ Onboarding system initialized successfully');
    console.log('📊 Available teams:', testResult);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error initializing onboarding system:', error);
    return false;
  }
}

// Make functions globally available
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
window.populateTeamDropdown = populateTeamDropdown;
window.setupOnboardEventListeners = setupOnboardEventListeners;
window.handleGameStart = handleGameStart;
window.listByMode = listByMode; // Override with our enhanced version
window.testTeamSelection = testTeamSelection;
window.ensureTeamsLoaded = ensureTeamsLoaded;
window.initializeOnboardingSystem = initializeOnboardingSystem;

// Auto-initialize when this script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeOnboardingSystem);
} else {
  // Run initialization after a brief delay to ensure other scripts have loaded
  setTimeout(initializeOnboardingSystem, 100);
}

console.log('Onboard team selection fix loaded');
