'use strict';

/**
 * Main game controller. This version is simplified to prevent conflicts with ui.js.
 */

// --- CORE HELPER FUNCTIONS ---
function setStatus(msg, duration = 4000) {
    console.log('Status:', msg);
    const statusEl = document.getElementById('statusMsg');
    if (statusEl) {
        statusEl.textContent = msg;
        statusEl.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                if (statusEl.textContent === msg) {
                    statusEl.style.display = 'none';
                }
            }, duration);
        }
    }
}

function listByMode(mode) {
    if (!window.Teams) return [];
    return mode === 'real' ? (window.Teams.real || []) : (window.Teams.fictional || []);
}

function currentTeam() {
    if (!state || !state.league || state.userTeamId === undefined) return null;
    return state.league.teams[state.userTeamId];
}

// --- ONBOARDING & NEW GAME LOGIC ---
function openOnboard() {
    const modal = document.getElementById('onboardModal');
    if (!modal) return;
    modal.hidden = false;
    modal.style.display = 'flex';
    if(window.populateTeamDropdown) populateTeamDropdown('fictional');
}

function initNewGame(options) {
    try {
        console.log('Initializing new game with options:', options);
        window.state = window.State.init();

        state.onboarded = true;
        state.namesMode = options.chosenMode;
        state.gameMode = options.gameMode;
        state.userTeamId = parseInt(options.teamIdx, 10);
        state.player = { teamId: state.userTeamId };

        const teams = listByMode(state.namesMode);
        if (teams.length === 0) throw new Error('No teams for league creation.');
        
        state.league = window.makeLeague(teams);
        if (!state.league) throw new Error('Failed to create league.');

        if (window.ensureFA) window.ensureFA();

        saveState();
        const modal = document.getElementById('onboardModal');
        if (modal) modal.style.display = 'none';
        
        location.hash = '#/hub'; // Go to hub after creation
        if (window.initializeUIFixes) window.initializeUIFixes(); // Re-init UI for new game

    } catch (error) {
        console.error('Error in initNewGame:', error);
        setStatus(`Error creating new game: ${error.message}`);
    }
}

// --- GAME INITIALIZATION ---
function init() {
    console.log('Main.js: Initializing game...');
    try {
        const savedState = loadState();
        if (savedState && savedState.onboarded) {
            window.state = savedState;
        } else {
            window.state = State.init();
            openOnboard();
        }
        
        // Let other files handle their own event setup
        if (window.setupEventListeners) setupEventListeners();
        // The ui.js file has its own initialization which handles routing
        // We don't need to call router() here.

    } catch (error) {
        console.error('FATAL ERROR during initialization:', error);
    }
}

document.addEventListener('DOMContentLoaded', init);

// --- GLOBAL ACCESS ---
window.setStatus = setStatus;
window.listByMode = listByMode;
window.currentTeam = currentTeam;
window.initNewGame = initNewGame;
