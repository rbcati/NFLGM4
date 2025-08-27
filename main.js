'use strict';

console.log('Main.js loading...');

/**
 * Refreshes all primary UI components after a state change.
 */
function refreshAll() {
    console.log('Refreshing all views...');
    try {
        if (state.onboarded && state.league) {
            // Update sidebar info
            updateSidebar();
            
            // Update current view
            const currentHash = location.hash.slice(2) || 'hub';
            if (window.show) {
                window.show(currentHash);
            }
            
            // Refresh specific views
            if (window.renderHub && currentHash === 'hub') {
                window.renderHub();
            }
            if (window.renderRoster && currentHash === 'roster') {
                window.renderRoster();
            }
            if (window.renderStandings && currentHash === 'standings') {
                window.renderStandings();
            }
            if (window.renderFreeAgency && currentHash === 'freeagency') {
                window.renderFreeAgency();
            }
            
            console.log('All views refreshed successfully');
        }
    } catch (error) {
        console.error('Error refreshing views:', error);
    }
}

/**
 * Update sidebar with current game info
 */
function updateSidebar() {
    try {
        const L = state.league;
        const team = window.currentTeam();
        
        if (L) {
            // Update season/year display
            const seasonEl = document.getElementById('seasonNow');
            if (seasonEl) {
                seasonEl.textContent = L.year || YEAR_START;
            }
            
            // Update week display  
            const weekEl = document.getElementById('hubWeek');
            if (weekEl) {
                weekEl.textContent = L.week || 1;
            }
        }
        
        if (team) {
            // Update cap info
            const capUsedEl = document.getElementById('capUsed');
            const capTotalEl = document.getElementById('capTotal');
            const capRoomEl = document.getElementById('capRoom');
            const deadCapEl = document.getElementById('deadCap');
            
            if (capUsedEl) capUsedEl.textContent = `$${(team.capUsed || 0).toFixed(1)}M`;
            if (capTotalEl) capTotalEl.textContent = `$${(team.capTotal || 220).toFixed(1)}M`;
            if (capRoomEl) capRoomEl.textContent = `$${(team.capRoom || 0).toFixed(1)}M`;
            if (deadCapEl) deadCapEl.textContent = `$${(team.deadCap || 0).toFixed(1)}M`;
        }
        
        // Update team selector
        if (window.fillTeamSelect) {
            const userTeamSelect = document.getElementById('userTeam');
            if (userTeamSelect && L && L.teams) {
                window.fillTeamSelect(userTeamSelect);
            }
        }
        
    } catch (error) {
        console.error('Error updating sidebar:', error);
    }
}

/**
 * Initialize a new game based on onboarding choices
 * @param {Object} options - Onboarding options
 */
function initNewGame(options) {
    console.log('Initializing new game with options:', options);
    
    try {
        // Reset to fresh state
        if (window.State && window.State.init) {
            window.state = window.State.init();
        } else {
            // Fallback state initialization
            window.state = {
                league: null,
                freeAgents: [],
                playoffs: null,
                namesMode: 'fictional',
                onboarded: false,
                userTeamId: 0,
                gameMode: 'gm',
                playerRole: 'GM',
                player: { teamId: 0 }
            };
        }
        
        // Apply options
        state.onboarded = true;
        state.namesMode = options.chosenMode || 'fictional';
        state.gameMode = options.gameMode || 'gm';
        state.playerRole = options.playerRole || 'GM';
        state.userTeamId = parseInt(options.teamIdx, 10) || 0;
        state.player.teamId = state.userTeamId;

        // Create the league
        if (window.makeLeague && window.listByMode) {
            const teams = window.listByMode(state.namesMode);
            if (teams.length === 0) {
                window.setStatus('Error: No teams available for league creation');
                return;
            }
            
            console.log('Creating league with', teams.length, 'teams');
            state.league = window.makeLeague(teams);
            
            if (!state.league) {
                window.setStatus('Error: Failed to create league');
                return;
            }
            
            console.log('League created successfully');
        } else {
            window.setStatus('Error: League creation functions not available');
            return;
        }

        // Generate initial free agents
        if (window.ensureFA) {
            window.ensureFA();
        } else if (window.generateFreeAgents) {
            window.generateFreeAgents();
        }

        // Save and update UI
        saveState();
        
        // Hide onboard modal
        const modal = document.getElementById('onboardModal');
        if (modal) {
            modal.hidden = true;
            modal.style.display = 'none';
        }
        
        refreshAll();
        location.hash = '#/hub';
        
        window.setStatus('New league created successfully!');
        
    } catch (error) {
        console.error('Error in initNewGame:', error);
        window.setStatus('Error creating new game: ' + error.message);
    }
}

/**
 * Simulate a week and update the UI
 */
function simulateWeekAndUpdate() {
    try {
        if (window.simulateWeek) {
            window.simulateWeek();
        } else {
            window.setStatus('Simulation function not available');
            return;
        }
        
        // Refresh UI after simulation
        refreshAll();
        
        // Save progress
        saveState();
        
    } catch (error) {
        console.error('Error in simulateWeekAndUpdate:', error);
        window.setStatus('Error during week simulation');
    }
}

/**
 * Main initialization function
 */
function init() {
    console.log('Initializing game...');
    
    try {
        // Apply saved theme
        if (window.applySavedTheme) {
            window.applySavedTheme();
        }
        
        // Load saved state
        let savedState = null;
        if (window.loadState) {
            savedState = window.loadState();
        }

        if (savedState && savedState.onboarded && savedState.league) {
            console.log('Valid save found, loading game...');
            
            // Validate and migrate if necessary
            if (window.State && window.State.validate) {
                const validation = window.State.validate(savedState);
                if (!validation.valid) {
                    console.warn('Save validation failed, migrating...', validation.errors);
                    savedState = window.State.migrate(savedState);
                }
            }
            
            window.state = savedState;
            
            // Backwards compatibility
            if (!state.player && state.userTeamId !== undefined) {
                state.player = { teamId: state.userTeamId };
            }
            if (!state.freeAgents) state.freeAgents = [];
            
            refreshAll();
            
            // Navigate to correct page
            if (window.router) {
                window.router();
            }
            
        } else {
            console.log('No valid save found, starting onboarding...');
            
            // Initialize fresh state
            if (window.State && window.State.init) {
                window.state = window.State.init();
            } else if (!window.state) {
                window.state = {
                    league: null,
                    freeAgents: [],
                    playoffs: null,
                    namesMode: 'fictional',
                    onboarded: false,
                    userTeamId: 0,
                    gameMode: 'gm',
                    playerRole: 'GM',
                    player: { teamId: 0 }
                };
            }
            
            // Show onboarding
            if (window.openOnboard) {
                window.openOnboard();
            } else {
                console.error('openOnboard function not available');
                window.setStatus('Error: Cannot start onboarding');
            }
        }

        // Set up event listeners
        if (window.setupEventListeners) {
            window.setupEventListeners();
        }
        
        console.log('Game initialization complete');
        
    } catch (error) {
        console.error('Error in init:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: red;">
                <h1>Initialization Error</h1>
                <p>Could not start the game: ${error.message}</p>
                <button onclick="location.reload()" style="padding: 10px; margin-top: 10px;">
                    Reload Page
                </button>
            </div>
        `;
    }
}

/**
 * Set status message
 * @param {string} msg - Status message
 * @param {number} duration - Duration in milliseconds
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
    
    // Also update any other status displays
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        statusBar.textContent = msg;
        statusBar.style.display = 'block';
        
        if (duration > 0) {
            setTimeout(() => {
                statusBar.style.display = 'none';
            }, duration);
        }
    }
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM ready, checking dependencies...');
    
    // Check critical dependencies with better error messages
    const criticalDeps = {
        'Constants': window.Constants,
        'Teams': window.Teams,
        'Utils': window.Utils,
        'listByMode': window.listByMode,
        'State': window.State
    };
    
    const missing = [];
    Object.keys(criticalDeps).forEach(dep => {
        if (!criticalDeps[dep]) {
            missing.push(dep);
        }
    });

    if (missing.length > 0) {
        console.error('FATAL: Missing critical dependencies:', missing);
        
        // Try to show a helpful error message
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #ff6b6b; background: #1a1a1a; min-height: 100vh;">
                <h1 style="margin-bottom: 20px;">🔧 Loading Error</h1>
                <p style="margin-bottom: 20px; font-size: 18px;">
                    Could not load essential game files. Missing: <strong>${missing.join(', ')}</strong>
                </p>
                <p style="margin-bottom: 20px; color: #9fb0c2;">
                    Please check that all JavaScript files are loaded in the correct order.
                </p>
                <button onclick="location.reload()" 
                        style="padding: 12px 24px; background: #0a84ff; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
                    Reload Page
                </button>
                <div style="margin-top: 30px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 8px; text-align: left; max-width: 600px; margin-left: auto; margin-right: auto;">
                    <h3 style="margin-bottom: 10px;">🩺 Quick Diagnosis:</h3>
                    <ul style="text-align: left; color: #9fb0c2;">
                        <li>Check browser console for script loading errors</li>
                        <li>Ensure all .js files are in the same directory as index.html</li>
                        <li>Verify script tags are in the correct order in index.html</li>
                        <li>Try opening in a different browser or incognito mode</li>
                    </ul>
                </div>
            </div>
        `;
        return;
    }
    
    console.log('✅ All dependencies loaded successfully');
    console.log('🚀 Proceeding with initialization');
    
    // Brief delay to ensure everything is settled
    setTimeout(init, 100);
});

// Make functions globally available
window.refreshAll = refreshAll;
window.initNewGame = initNewGame;
window.simulateWeekAndUpdate = simulateWeekAndUpdate;
window.setStatus = setStatus;
window.updateSidebar = updateSidebar;

console.log('Main.js loaded');
console.log('Main.js loaded');

