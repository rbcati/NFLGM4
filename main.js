'use strict';

/**
 * Main game initialization and setup.
 */

// --- CORE HELPER FUNCTIONS ---

/**
 * Sets a status message in the UI.
 * @param {string} msg - The message to display.
 * @param {number} [duration=3000] - How long to display the message in ms.
 */
function setStatus(msg, duration = 3000) {
    console.log('Status:', msg);
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) {
        statusEl.textContent = msg;
        statusEl.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, duration);
        }
    }
}

/**
 * Gets a list of teams based on the selected mode ('fictional' or 'real').
 * @param {string} mode - The team mode.
 * @returns {Array} An array of team objects.
 */
function listByMode(mode) {
    if (!window.Teams) {
        console.error("Teams data has not loaded yet!");
        return [];
    }
    return mode === 'real' ? (window.Teams.real || []) : (window.Teams.fictional || []);
}

// --- ONBOARDING & NEW GAME ---

/**
 * Opens and prepares the onboarding modal for starting a new game.
 */
function openOnboard() {
    try {
        console.log('Opening onboarding modal...');
        const modal = document.getElementById('onboardModal');
        if (!modal) return console.error('Onboard modal not found');

        modal.hidden = false;
        modal.style.display = 'flex';

        state.namesMode = state.namesMode || 'fictional';
        const radio = document.querySelector(`input[name="namesMode"][value="${state.namesMode}"]`);
        if (radio) radio.checked = true;

        populateTeamDropdown(state.namesMode);
    } catch (error) {
        console.error('Error opening onboard modal:', error);
    }
}

/**
 * Fills the onboarding team selection dropdown.
 * @param {string} mode - 'fictional' or 'real' mode.
 */
function populateTeamDropdown(mode) {
    const teamSelect = document.getElementById('onboardTeam');
    if (!teamSelect) return;
    try {
        teamSelect.innerHTML = '';
        const teams = listByMode(mode);
        if (teams.length === 0) {
            teamSelect.innerHTML = '<option value="">No teams available</option>';
            return;
        }
        teams.forEach((team, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = `${team.abbr} — ${team.name}`;
            teamSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating team dropdown:', error);
    }
}

/**
 * Initializes a new game based on user choices from the onboarding modal.
 * @param {object} options - The chosen game options.
 */
function initNewGame(options) {
    try {
        console.log('Initializing new game with options:', options);
        // Reset state
        window.state = window.State.init();

        // Apply options
        state.onboarded = true;
        state.namesMode = options.chosenMode || 'fictional';
        state.gameMode = options.gameMode || 'gm';
        state.playerRole = options.playerRole || 'GM';
        state.userTeamId = parseInt(options.teamIdx, 10) || 0;
        state.player.teamId = state.userTeamId;

        const teams = listByMode(state.namesMode);
        if (teams.length === 0) throw new Error('No teams available for league creation');
        
        state.league = window.makeLeague(teams);
        if (!state.league) throw new Error('Failed to create league');
        
        if (window.ensureFA) window.ensureFA();

        saveState();
        const modal = document.getElementById('onboardModal');
        if (modal) modal.hidden = true;
        
        location.hash = '#/hub';
        refreshAll();
        setStatus('New league created successfully!');
    } catch (error) {
        console.error('Error in initNewGame:', error);
        setStatus(`Error creating new game: ${error.message}`);
    }
}

// --- GAME INITIALIZATION ---

/**
 * Main initialization function, called on page load.
 */
function init() {
    console.log('Initializing game...');
    try {
        const savedState = loadState();

        if (savedState && savedState.onboarded && savedState.league) {
            console.log('Valid save found, loading game...');
            window.state = savedState;
        } else {
            console.log('No valid save found, starting onboarding...');
            window.state = State.init();
            openOnboard();
        }
        
        setupEventListeners();
        refreshAll();
        
        // Initial route call
        if (window.router) setTimeout(window.router, 100);

        console.log('Game initialization complete');
    } catch (error) {
        console.error('Critical Error in init():', error);
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;"><h1>Initialization Error</h1><p>Could not start the game: ${error.message}</p></div>`;
    }
}

/**
 * Refreshes all primary UI components after a state change.
 */
function refreshAll() {
    if (!state.onboarded || !state.league) return;
    try {
        console.log('Refreshing all views...');
        updateSidebar();
        const currentHash = location.hash.slice(2) || 'hub';
        if (window.renderView) window.renderView(currentHash);
    } catch (error) {
        console.error('Error refreshing views:', error);
    }
}

/**
 * Updates the sidebar with current game info.
 */
function updateSidebar() {
    const L = state.league;
    const team = window.currentTeam();
    if (!L || !team) return;

    try {
        document.getElementById('seasonNow').textContent = L.year || '';
        document.getElementById('capUsed').textContent = `$${(team.capUsed || 0).toFixed(1)}M`;
        document.getElementById('capTotal').textContent = `$${(team.capTotal || 220).toFixed(1)}M`;
        document.getElementById('capRoom').textContent = `$${(team.capRoom || 0).toFixed(1)}M`;
        document.getElementById('deadCap').textContent = `$${(team.deadCap || 0).toFixed(1)}M`;

        const userTeamSelect = document.getElementById('userTeam');
        if (userTeamSelect && (!userTeamSelect.dataset.filled || userTeamSelect.options.length !== L.teams.length)) {
             if (window.fillTeamSelect) window.fillTeamSelect(userTeamSelect);
             userTeamSelect.dataset.filled = 'true';
        }
        userTeamSelect.value = state.userTeamId;

    } catch (error) {
        console.error('Error updating sidebar:', error);
    }
}


// --- LOAD DEPENDENCIES & START ---

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, starting initialization...');
    // A small delay to ensure all scripts have parsed
    setTimeout(init, 100); 
});

// Make key functions globally available
window.setStatus = setStatus;
window.initNewGame = initNewGame;
window.refreshAll = refreshAll;
window.listByMode = listByMode;
window.populateTeamDropdown = populateTeamDropdown;
window.openOnboard = openOnboard;
