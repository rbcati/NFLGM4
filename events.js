'use strict';

/**
 * Handles all user interactions and application routing.
 */

// --- ROUTING ---
// This function is called whenever the URL hash changes.
function router() {
    const path = location.hash || '#/hub';
    const viewName = path.slice(2);
    console.log('Route change:', viewName);
    
    // Tell ui.js to show the correct view container
    if (window.showView) window.showView(viewName);
    
    // Update the active state of the navigation pills
    document.querySelectorAll('.nav-pill').forEach(a => {
        a.setAttribute('aria-current', a.getAttribute('href') === path ? 'page' : null);
    });
    
    // Tell ui.js to render the content for that view
    if (window.renderView) window.renderView(viewName);
}

// --- CENTRAL EVENT LISTENER SETUP ---
// This single function sets up all the event listeners for the game.
function setupEventListeners() {
    console.log('Setting up event listeners...');

    // 1. Listen for URL changes to trigger the router
    window.addEventListener('hashchange', router);

    // 2. Use a single "delegated" click listener on the body for efficiency
    document.body.addEventListener('click', function(e) {
        const targetId = e.target.id;

        // Onboarding Modal Buttons
        if (targetId === 'onboardStart') return handleOnboardStart(e);
        if (targetId === 'onboardRandom') return handleRandomTeam(e);

        // Main Game Action Buttons
        if (targetId === 'btnSimWeek') return handleSimulateWeek(e);
        if (targetId === 'btnSave') return handleSaveGame(e);
        if (targetId === 'btnLoad') return handleLoadGame(e);
        if (targetId === 'btnNewLeague') return handleNewLeague(e);
    });

    // 3. Use a single "delegated" change listener for dropdowns and radios
    document.body.addEventListener('change', function(e) {
        const target = e.target;

        // Onboarding name mode radio buttons
        if (target.name === 'namesMode') {
            if (window.populateTeamDropdown) populateTeamDropdown(target.value);
        }
        
        // Schedule week dropdown
        if (target.id === 'scheduleWeekSelect') {
            if (window.renderScheduleContent) renderScheduleContent(target.value);
        }
    });
    
    console.log('Event listeners set up successfully.');
}

// --- SPECIFIC EVENT HANDLER FUNCTIONS ---

function handleOnboardStart(e) {
    e.preventDefault();
    console.log('Onboard Start button clicked.');
    if (window.initNewGame) {
        window.initNewGame(); // Calls the function in main.js
    }
}

function handleRandomTeam(e) {
    e.preventDefault();
    const teamSelect = document.getElementById('onboardTeam');
    if (teamSelect?.options.length > 0) {
        const randomIndex = Math.floor(Math.random() * teamSelect.options.length);
        teamSelect.selectedIndex = randomIndex;
    }
}

function handleSimulateWeek(e) {
    const button = e.target;
    button.disabled = true;
    button.textContent = 'Simulating...';
    
    // Use a short timeout to let the UI update before the potentially long simulation starts
    setTimeout(() => {
        try {
            if (window.simulateWeek) window.simulateWeek();
        } catch (error) {
            console.error("Simulation failed:", error);
            if(window.setStatus) setStatus("Error during simulation.");
        } finally {
            button.disabled = false;
            button.textContent = 'Simulate Week';
            // After sim, refresh everything
            if (window.refreshAll) refreshAll();
        }
    }, 10);
}

function handleSaveGame() {
    if (window.saveState) {
        const success = saveState();
        if(window.setStatus) setStatus(success ? 'Game saved!' : 'Save failed!');
    }
}

function handleLoadGame() {
    if (confirm('Load saved game? Any unsaved progress will be lost.')) {
        if (window.loadState) {
            const loaded = loadState();
            if (loaded) {
                window.state = loaded;
                if(window.setStatus) setStatus('Game loaded!');
                if (window.refreshAll) refreshAll();
                location.hash = '#/hub';
                router(); // Re-run router to render the newly loaded state
            } else {
                if(window.setStatus) setStatus('No save file found!');
            }
        }
    }
}

function handleNewLeague() {
    if (confirm('Start a new league? This will delete your current game.')) {
        localStorage.removeItem(window.Constants?.GAME_CONFIG?.SAVE_KEY || 'nflGM4.league');
        location.reload();
    }
}

// --- GLOBAL ACCESS ---
window.router = router;
window.setupEventListeners = setupEventListeners;
