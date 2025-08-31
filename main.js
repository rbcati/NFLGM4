'use strict';

/**
 * Main game controller. Merged from main.js, Missing-core-functions.js, Onboard-fix.js,
 * onboarding-modal-fix.js, and coaching-integration.js.
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
    if (!window.Teams) {
        console.error("Teams data has not loaded.");
        return [];
    }
    return mode === 'real' ? (window.Teams.real || []) : (window.Teams.fictional || []);
}

function currentTeam() {
    if (!state || !state.league || state.userTeamId === undefined) return null;
    return state.league.teams[state.userTeamId];
}

// --- ONBOARDING & NEW GAME LOGIC ---

function openOnboard() {
    try {
        const modal = document.getElementById('onboardModal');
        if (!modal) return;

        modal.hidden = false;
        modal.style.display = 'flex';

        const currentMode = document.querySelector('input[name="namesMode"]:checked')?.value || 'fictional';
        populateTeamDropdown(currentMode);
    } catch (error) {
        console.error('Error opening onboard modal:', error);
    }
}

function populateTeamDropdown(mode) {
    const teamSelect = document.getElementById('onboardTeam');
    if (!teamSelect) return;
    try {
        teamSelect.innerHTML = '';
        const teams = listByMode(mode);
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

function initNewGame() {
    try {
        const options = {
            gameMode: document.querySelector('input[name="gameMode"]:checked')?.value || 'gm',
            playerRole: document.getElementById('careerRole')?.value || 'GM',
            chosenMode: document.querySelector('input[name="namesMode"]:checked')?.value || 'fictional',
            teamIdx: document.getElementById('onboardTeam')?.value || '0'
        };

        console.log('Initializing new game with options:', options);
        window.state = window.State.init();

        state.onboarded = true;
        state.namesMode = options.chosenMode;
        state.gameMode = options.gameMode;
        state.playerRole = options.playerRole;
        state.userTeamId = parseInt(options.teamIdx, 10);
        state.player = { teamId: state.userTeamId };

        const teams = listByMode(state.namesMode);
        if (teams.length === 0) throw new Error('No teams available for league creation.');
        
        state.league = window.makeLeague(teams);
        if (!state.league) throw new Error('Failed to create league.');
        
        // --- Integrations from other modules ---
        if (window.ensureFA) window.ensureFA();
        if (window.generateCoaches) generateCoaches(state.league);
        // --- End Integrations ---

        saveState();
        const modal = document.getElementById('onboardModal');
        if (modal) modal.style.display = 'none';
        
        location.hash = '#/hub';
        refreshAll();
        const teamName = state.league.teams[state.userTeamId]?.name || 'your team';
        setStatus(`Welcome, GM of the ${teamName}!`);

    } catch (error) {
        console.error('Error in initNewGame:', error);
        setStatus(`Error creating new game: ${error.message}`);
    }
}


// --- GAME INITIALIZATION & LIFECYCLE ---

function init() {
    console.log('GAME INITIALIZATION SEQUENCE STARTED');
    try {
        // This function block contains merged logic from multiple fix files
        const savedState = loadState();

        if (savedState && savedState.onboarded && savedState.league) {
            console.log('Valid save file found. Loading game.');
            window.state = savedState;
             // Ensure new properties exist on older saves for compatibility
            if (!state.player) state.player = { teamId: state.userTeamId };
            if (!state.league.coaches && window.generateCoaches) generateCoaches(state.league);
        } else {
            console.log('No valid save file. Starting onboarding process.');
            window.state = State.init();
            openOnboard();
        }
        
        if (window.setupEventListeners) setupEventListeners();
        
        refreshAll();
        
        if (window.router) setTimeout(window.router, 50);

        console.log('GAME INITIALIZATION COMPLETE');
    } catch (error) {
        console.error('FATAL ERROR during initialization:', error);
        document.body.innerHTML = `<div class="card" style="padding: 2rem;"><h1>Fatal Error</h1><p>Could not initialize the game. Please check the console and try refreshing.</p></div>`;
    }
}

// A central function to call whenever the game state changes
function refreshAll() {
    if (!state.onboarded || !state.league) return;
    try {
        updateSidebar();
        const currentHash = location.hash.slice(2) || 'hub';
        if (window.renderView) window.renderView(currentHash);
    } catch (error) {
        console.error('Error refreshing all views:', error);
    }
}

function updateSidebar() {
    if (!state || !state.league || !state.league.teams) return;
    const team = currentTeam();
    if (!team) return;

    try {
        document.getElementById('seasonNow').textContent = state.league.year || '';
        document.getElementById('capUsed').textContent = `$${(team.capUsed || 0).toFixed(1)}M`;
        document.getElementById('capTotal').textContent = `$${(team.capTotal || 220).toFixed(1)}M`;
        document.getElementById('capRoom').textContent = `$${(team.capRoom || 0).toFixed(1)}M`;
        document.getElementById('deadCap').textContent = `$${(team.deadCap || 0).toFixed(1)}M`;

        const userTeamSelect = document.getElementById('userTeam');
        if (userTeamSelect && (!userTeamSelect.dataset.filled || userTeamSelect.options.length !== state.league.teams.length)) {
             if (window.fillTeamSelect) window.fillTeamSelect(userTeamSelect);
             userTeamSelect.dataset.filled = 'true';
        }
        userTeamSelect.value = state.userTeamId;
    } catch (error) {
        console.error('Error updating sidebar:', error);
    }
}

// --- START THE GAME ---
document.addEventListener('DOMContentLoaded', init);


// --- GLOBAL ACCESS ---
window.setStatus = setStatus;
window.refreshAll = refreshAll;
window.initNewGame = initNewGame;
window.populateTeamDropdown = populateTeamDropdown;
window.listByMode = listByMode;
window.openOnboard = openOnboard;
window.currentTeam = currentTeam;

// This is a large block of code merged from Missing-core-functions.js
// It ensures that even if other files fail to load, these critical functions exist.
(function safeInitializeMissingFunctions() {
    if (!window.Utils) {
        console.warn('Utils.js not found, creating fallback.');
        window.Utils = {
            rand: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
            uuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            })
        };
    }
    const requiredFunctions = {
        makeLeague: (teams) => {
            console.warn('Fallback makeLeague used.');
            return { teams: teams, year: 2025, week: 1, schedule: { weeks: [] }, resultsByWeek: [] };
        },
        generateProspects: () => { console.warn('Fallback generateProspects used.'); return []; },
        generateCoaches: () => { console.warn('Fallback generateCoaches used.'); },
        ensureFA: () => { console.warn('Fallback ensureFA used.'); },
        runWeeklyTraining: () => {},
        runOffseason: () => {},
        capHitFor: (player) => player.baseAnnual || 0,
        renderTrade: (container) => container.innerHTML = 'Trade view not loaded.',
        renderFreeAgency: (container) => container.innerHTML = 'Free Agency view not loaded.',
        renderDraft: (container) => container.innerHTML = 'Draft view not loaded.',
        renderScouting: (container) => container.innerHTML = 'Scouting view not loaded.',
        renderCoaching: (container) => container.innerHTML = 'Coaching view not loaded.',
        simulateWeek: () => { setStatus('Simulation logic not loaded.'); }
    };
    for (const funcName in requiredFunctions) {
        if (typeof window[funcName] !== 'function') {
            console.log(`Creating fallback for missing function: ${funcName}`);
            window[funcName] = requiredFunctions[funcName];
        }
    }
})();
