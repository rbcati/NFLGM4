'use strict';

console.log('Main.js loading...');

// --- GLOBAL STATE & INITIALIZATION ---
let state = {};

/**
 * Refreshes all primary UI components.
 */
function refreshAllViews() {
    console.log('Refreshing all views...');
    try {
        if (state.onboarded) {
            UI.renderHub();
            UI.renderRoster();
            UI.renderStandings(); // Ensure standings are rendered
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
 * Initializes a new game state.
 * @param {object} options - Onboarding options.
 */
function initNewGame(options) {
    console.log('Initializing new game...');
    state = window.State.init(); // Reset state
    state.onboarded = true;
    state.player.teamId = parseInt(options.teamIdx, 10);
    state.namesMode = options.chosenMode;

    // Create the league
    const league = makeLeague(state.namesMode);
    state.league = league;

    // Generate free agents
    state.freeAgents = generateFreeAgents(150);

    saveState();
    hide('onboardModal');
    refreshAllViews();
    location.hash = '#/hub'; // Go to hub after setup
}

// --- ROUTING ---
const routes = {
    '#/hub': 'pageHub',
    '#/roster': 'pageRoster',
    '#/standings': 'pageStandings',
    '#/schedule': 'pageSchedule',
    '#/freeagency': 'pageFreeAgency',
    '#/draft': 'pageDraft',
    '#/scouting': 'pageScouting'
};

function router() {
    const path = location.hash || '#/hub';
    const pageId = routes[path];

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('#main-nav a').forEach(a => a.classList.remove('active'));

    if (pageId) {
        const page = $(pageId);
        const navLink = $(`nav-${path.substring(2)}`);
        if (page) page.classList.add('active');
        if (navLink) navLink.classList.add('active');
    }
}

// --- MAIN GAME LOGIC ---
function init() {
    console.log('Initializing game...');
    
    // Load game state from localStorage
    const savedState = loadState();

    if (savedState && savedState.onboarded) {
        console.log('Valid save found, loading game...');
        state = savedState;
        // Ensure all necessary properties exist
        if (!state.player) state.player = { teamId: 0 };
        if (!state.freeAgents) state.freeAgents = [];
        
        refreshAllViews();
        router(); // Route to the correct page
    } else {
        console.log('No valid save found, starting new game...');
        state = window.State.init(); // Initialize a clean state
        UI.openOnboard();
    }

    // Set up event listeners
    window.addEventListener('hashchange', router);
    setupEventListeners();
}

/**
 * A wrapper to simulate a week and then update the UI.
 */
function simulateWeekAndUpdate() {
    simulateWeek(); // This function is from simulation.js
    
    // After simulation, refresh the data-driven views
    UI.renderHub();
    UI.renderStandings();
    
    saveState(); // Save progress
}


// --- DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    // Dependency check
    const dependencies = ['State', 'Constants', 'Teams', 'makeLeague', 'UI', 'generateFreeAgents', 'simulateWeek'];
    const missing = dependencies.filter(dep => typeof window[dep] === 'undefined');

    if (missing.length > 0) {
        console.error('FATAL: Missing critical dependencies:', missing);
        // Display a user-friendly error message on the screen
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
