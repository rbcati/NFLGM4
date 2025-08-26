// events.js - Fixed Event Handling
'use strict';

function setupEventListeners() {
  console.log('Setting up event listeners...');

  // --- CLICK Event Delegation ---
  document.body.addEventListener('click', function(e) {
    const target = e.target;
    console.log('Click detected on:', target.id, target.className);

    // --- Navigation buttons ---
    if (target.classList.contains('nav-pill')) {
      e.preventDefault();
      const view = target.dataset.view;
      if (view) {
        location.hash = '#/' + view;
      }
    }

    // --- Onboarding Modal Buttons ---
    if (target.id === 'onboardStart') {
      console.log('Onboard start clicked');
      e.preventDefault();
      
      try {
        // Get the chosen game mode and role
        const gameModeEl = document.querySelector('input[name=gameMode]:checked');
        const gameMode = gameModeEl ? gameModeEl.value : 'gm';
        
        let playerRole = 'GM';
        if (gameMode === 'career') {
          const careerRoleEl = document.getElementById('careerRole');
          playerRole = careerRoleEl ? careerRoleEl.value : 'GM';
        }

        const namesModeEl = document.querySelector('input[name=namesMode]:checked');
        const chosenMode = namesModeEl ? namesModeEl.value : 'fictional';
        
        const teamSelect = document.getElementById('onboardTeam');
        const teamIdx = teamSelect ? parseInt(teamSelect.value || '0', 10) : 0;
        
        console.log('Starting game:', { gameMode, playerRole, chosenMode, teamIdx });
        
        // Update state
        state.userTeamId = teamIdx;
        state.namesMode = chosenMode;
        state.gameMode = gameMode;
        state.playerRole = playerRole;
        state.onboarded = true;

        // Create league
        console.log('Creating league...');
        if (window.makeLeague && window.listByMode) {
          state.league = window.makeLeague(window.listByMode(chosenMode));
          console.log('League created:', state.league);
        } else {
          console.error('makeLeague or listByMode function not available');
          window.setStatus('Error: Game initialization functions not loaded');
          return;
        }
        
        // Fill team selects
        if (window.fillTeamSelect) {
          const userTeamSelect = document.getElementById('userTeam');
          if (userTeamSelect) {
            window.fillTeamSelect(userTeamSelect);
            userTeamSelect.value = String(teamIdx);
          }
        }
        
        // Update team labels
        if (window.rebuildTeamLabels) {
          window.rebuildTeamLabels(chosenMode);
        }
        
        // Close modal and redirect
        window.closeOnboard();
        location.hash = '#/hub';
        window.setStatus(`Started as ${playerRole} of ${state.league.teams[teamIdx].name}!`);
        
        // Refresh all views
        if (window.refreshAll) {
          window.refreshAll();
        }
        
      } catch (error) {
        console.error('Error starting game:', error);
        window.setStatus('Error starting game: ' + error.message);
      }
    }

    if (target.id === 'onboardRandom') {
      console.log('Random team clicked');
      e.preventDefault();
      const teamSelect = document.getElementById('onboardTeam');
      if (teamSelect && teamSelect.options.length > 0) {
        const randomIndex = Math.floor(Math.random() * teamSelect.options.length);
        teamSelect.selectedIndex = randomIndex;
        window.setStatus('Random team selected: ' + teamSelect.options[randomIndex].text);
      }
    }

    // --- Save/Load buttons ---
    if (target.id === 'btnSave') {
      e.preventDefault();
      if (window.saveGame) {
        window.saveGame();
      } else {
        window.setStatus('Save function not available');
      }
    }

    if (target.id === 'btnLoad') {
      e.preventDefault();
      if (window.loadGame) {
        window.loadGame();
      } else {
        window.setStatus('Load function not available');
      }
    }

    if (target.id === 'btnNewLeague') {
      e.preventDefault();
      if (confirm('Start a new league? This will delete your current progress.')) {
        localStorage.removeItem(window.Constants?.GAME_CONFIG?.SAVE_KEY || 'nflGM4.league');
        location.reload();
      }
    }

    // --- Simulation buttons ---
    if (target.id === 'btnSimWeek') {
      e.preventDefault();
      console.log('Simulating week...');
      if (window.simulateWeek) {
        try {
          window.simulateWeek();
          window.setStatus('Week simulated successfully');
        } catch (error) {
          console.error('Error simulating week:', error);
          window.setStatus('Error simulating week');
        }
      } else {
        window.setStatus('Simulation function not available');
      }
    }

    // --- Roster management buttons ---
    if (target.id === 'btnRelease') {
      e.preventDefault();
      console.log('Release button clicked');
      
      const selectedCheckboxes = document.querySelectorAll('input[data-player-id]:checked');
      const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.playerId);
      
      if (selectedIds.length === 0) {
        window.setStatus('No players selected.');
        return;
      }

      // Check role permissions
      if (state.playerRole && state.playerRole !== 'GM') {
        const C = window.Constants;
        let canRelease = true;
        
        selectedIds.forEach(playerId => {
          const team = window.currentTeam();
          const player = team.roster.find(p => p.id === playerId);
          
          if (player) {
            const isOffensive = C.OFFENSIVE_POSITIONS.includes(player.pos);
            const hasPermission = state.playerRole === 'GM' || 
                                 (state.playerRole === 'OC' && isOffensive) || 
                                 (state.playerRole === 'DC' && !isOffensive);
            
            if (!hasPermission) {
              canRelease = false;
              window.setStatus(`As ${state.playerRole}, you cannot release ${player.pos}s.`);
              return;
            }
          }
        });
        
        if (!canRelease) return;
      }
      
      if (window.releaseSelected) {
        window.releaseSelected(selectedIds);
      } else {
        window.setStatus('Release function not available');
      }
    }

    if (target.id === 'btnSignFA') {
      e.preventDefault();
      const selectedRadio = document.querySelector('input[name=fa]:checked');
      if (!selectedRadio) {
        window.setStatus('No free agent selected.');
        return;
      }
      
      const playerIndex = parseInt(selectedRadio.value, 10);
      
      if (window.signFreeAgent) {
        window.signFreeAgent(playerIndex);
      } else {
        window.setStatus('Sign free agent function not available');
      }
    }

    // --- Trade buttons ---
    if (target.id === 'tradeValidate') {
      e.preventDefault();
      console.log('Validate trade clicked');
      if (window.validateTrade) {
        window.validateTrade();
      } else {
        window.setStatus('Trade validation not implemented');
      }
    }

    if (target.id === 'tradeExecute') {
      e.preventDefault();
      console.log('Execute trade clicked');
      if (window.executeTrade) {
        window.executeTrade();
      } else {
        window.setStatus('Trade execution not implemented');
      }
    }
  });

  // --- CHANGE Event Delegation ---
  document.body.addEventListener('change', function(e) {
    const target = e.target;

    // Show/hide career mode options
    if (target.name === 'gameMode') {
      const careerOptions = document.getElementById('careerOptions');
      if (careerOptions) {
        careerOptions.hidden = target.value !== 'career';
      }
    }

    // Update team list when names mode changes
    if (target.name === 'namesMode') {
      console.log('Names mode changed to:', target.value);
      state.namesMode = target.value;
      
      const teamSelect = document.getElementById('onboardTeam');
      if (teamSelect && window.listByMode) {
        teamSelect.innerHTML = '';
        const teams = window.listByMode(target.value);
        teams.forEach((team, i) => {
          const opt = document.createElement('option');
          opt.value = String(i);
          opt.textContent = `${team.abbr} — ${team.name}`;
          teamSelect.appendChild(opt);
        });
      }
    }

    // Handle team select changes
    if (target.id === 'userTeam') {
      const newTeamId = parseInt(target.value, 10);
      if (!isNaN(newTeamId)) {
        state.userTeamId = newTeamId;
        // Refresh views that depend on current team
        if (window.updateCapSidebar) window.updateCapSidebar();
      }
    }

    if (target.id === 'rosterTeam') {
      if (window.renderRoster) {
        window.renderRoster();
      }
    }

    if (target.id === 'tradeA' || target.id === 'tradeB') {
      if (window.renderTradeLists) {
        window.renderTradeLists();
      }
    }

    if (target.id === 'faTeam') {
      // Could trigger free agency filtering if implemented
    }
  });

  // --- Main URL Router ---
  window.addEventListener('hashchange', () => {
    const seg = location.hash.replace('#/', '') || 'hub';
    const validRoutes = window.Constants?.GAME_CONFIG?.ROUTES || 
                       ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings', 'hallOfFame', 'scouting'];
    const route = validRoutes.indexOf(seg) >= 0 ? seg : 'hub';
    
    console.log('Route change:', route);
    if (window.show) {
      window.show(route);
    }
  });

  console.log('Event listeners set up successfully');
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
  setupEventListeners();
}

// Make available globally
window.setupEventListeners = setupEventListeners;
