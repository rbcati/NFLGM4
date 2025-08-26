'use strict';

console.log('Main.js loading...');

// --- GLOBAL STATE & INITIALIZATION ---
let state = {};

/**
 * Refreshes all primary UI components after a state change.
 */
function refreshAllViews() {
    console.log('Refreshing all views...');
    try {
        if (state.onboarded) {
            UI.renderHub();
            UI.renderRoster();
            UI.renderStandings();
            UI.renderFreeAgency();
            UI.renderDraft();
            UI.renderScouting();
            // Add other view updates here as they are built
        }
        console.log('All views refreshed successfully');
    } catch (error) {
        console.error('Error refreshing views:', error);
    }
}

/**
 * Initializes a new game state based on user's onboarding choices.
 * @param {object} options - The choices from the onboarding modal.
 */
function initNewGame(options) {
    console.log('Initializing new game...');
    state = window.State.init(); // Reset state to a fresh copy
    state.onboarded = true;
    state.player.teamId = parseInt(options.teamIdx, 10);
    state.namesMode = options.chosenMode;

    // Create the league with teams and schedule
    state.league = makeLeague(state.namesMode);

    // Generate initial pool of free agents
    state.freeAgents = generateFreeAgents(150);

    saveState();
    UI.hide('onboardModal');
    refreshAllViews();
    location.hash = '#/hub'; // Navigate to the main hub
}

/**
 * The main game loop/entry point.
 */
function init() {
    console.log('Initializing game...');
    
    // Apply the user's saved theme (light/dark) first
    UI.applySavedTheme(); 
    
    // Load game state from localStorage
    const savedState = loadState();

    if (savedState && savedState.onboarded) {
        console.log('Valid save found, loading game...');
        state = savedState;
        // Backwards compatibility checks for older save files
        if (!state.player) state.player = { teamId: 0 };
        if (!state.freeAgents) state.freeAgents = [];
        
        refreshAllViews();
        router(); // Route to the correct page based on hash
    } else {
        console.log('No valid save found, starting new game...');
        state = window.State.init(); // Initialize a clean state
        UI.openOnboard();
    }

    // Set up all event listeners for the app
    setupEventListeners();
}

/**
 * A wrapper function to simulate a week and then update the UI.
 */
function simulateWeekAndUpdate() {
    simulateWeek(); // This function is from simulation.js
    
    // After simulation, refresh the views that depend on game results
    UI.renderHub();
    UI.renderStandings();
    
    saveState(); // Save progress after the week is done
}

// --- DOMContentLoaded ---
// This ensures the script runs only after the entire page is loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Critical dependency check to prevent the game from starting in a broken state.
    const dependencies = ['State', 'Constants', 'Teams', 'makeLeague', 'UI', 'generateFreeAgents', 'simulateWeek', 'listByMode', 'setupEventListeners', 'saveState', 'loadState'];
    const missing = dependencies.filter(dep => typeof window[dep] === 'undefined');

    if (missing.length > 0) {
        console.error('FATAL: Missing critical dependencies:', missing);
        document.body.innerHTML = `<div style="padding: 20px; text-align: center; color: red;">
            <h1>Error</h1>
            <p>Could not load essential game files. Please check the console for details. Missing: ${missing.join(', ')}</p>
        </div>`;
        return;
    }
    
    console.log('All dependencies loaded, proceeding with initialization');
    init();
});

console.log('Main.js loaded');

