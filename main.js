  'use strict';

/**
 * Enhanced Main Game Controller with improved performance and error handling
 */

class GameController {
    constructor() {
        this.domCache = new Map();
        this.eventListeners = new Map();
        this.initialized = false;
        this.initPromise = null;
    }

    // --- ENHANCED DOM OPERATIONS ---
    getElement(id, cache = true) {
        if (cache && this.domCache.has(id)) {
            const element = this.domCache.get(id);
            // Verify element is still in DOM
            if (document.contains(element)) {
                return element;
            }
            this.domCache.delete(id);
        }
        
        const element = document.getElementById(id);
        if (element && cache) {
            this.domCache.set(id, element);
        }
        return element;
    }

    clearDOMCache() {
        this.domCache.clear();
    }

    // --- IMPROVED STATUS SYSTEM ---
    setStatus(msg, type = 'info', duration = 4000) {
        const statusEl = this.getElement('statusMsg');
        if (!statusEl) {
            console.warn('Status element not found:', msg);
            return;
        }

        // Clear any existing timeout
        if (statusEl.timeoutId) {
            clearTimeout(statusEl.timeoutId);
        }

        statusEl.textContent = msg;
        statusEl.className = `status-message status-${type}`;
        statusEl.style.display = 'block';
        
        if (duration > 0) {
            statusEl.timeoutId = setTimeout(() => {
                if (statusEl.textContent === msg) {
                    statusEl.style.display = 'none';
                    statusEl.className = 'status-message';
                }
                statusEl.timeoutId = null;
            }, duration);
        }

        // Also log important messages
        if (type === 'error') {
            console.error('Status Error:', msg);
        } else if (type === 'warning') {
            console.warn('Status Warning:', msg);
        }
    }

    // --- ENHANCED HELPER FUNCTIONS ---
    listByMode(mode) {
        if (!window.Teams || typeof window.Teams !== 'object') {
            console.warn('Teams data not available');
            return [];
        }
        
        const teams = mode === 'real' ? window.Teams.real : window.Teams.fictional;
        return Array.isArray(teams) ? teams : [];
    }

    // Use global functions from ui.js instead of local duplicates

    calculateOverallRating(player) {
        if (!player || !player.ratings) {
            return 'N/A';
        }
        
        const ratings = player.ratings;
        let totalRating = 0;
        let ratingCount = 0;
        
        // Calculate average of all ratings
        Object.values(ratings).forEach(rating => {
            if (typeof rating === 'number' && rating > 0) {
                totalRating += rating;
                ratingCount++;
            }
        });
        
        if (ratingCount === 0) {
            return 'N/A';
        }
        
        return Math.round(totalRating / ratingCount);
    }

    // --- ROSTER MANAGEMENT ---
    // Note: renderRoster is implemented in ui.js to avoid conflicts
    async renderRoster() {
        // Delegate to the ui.js implementation
        if (window.renderRoster && window.renderRoster !== this.renderRoster) {
            window.renderRoster();
        } else {
            console.warn('renderRoster not available from ui.js');
        }
    }

    // --- HUB RENDERING ---
    async renderHub() {
        try {
            console.log('Rendering hub...');
            
            const hubContainer = this.getElement('hub');
            if (!hubContainer) {
                console.warn('Hub container not found');
                return;
            }
            
            // Enhanced hub content with simulate league button
            hubContainer.innerHTML = `
                <div class="card">
                    <h2>Team Hub</h2>
                    <div class="grid two">
                        <div>
                            <h3>Quick Actions</h3>
                            <div class="actions">
                                <button class="btn primary" onclick="location.hash='#/roster'">View Roster</button>
                                <button class="btn" onclick="location.hash='#/schedule'">View Schedule</button>
                                <button class="btn" onclick="location.hash='#/trade'">Trade Center</button>
                                <button class="btn" onclick="location.hash='#/freeagency'">Free Agency</button>
                                <button class="btn" onclick="location.hash='#/draft'">Draft</button>
                            </div>
                        </div>
                        <div>
                            <h3>League Actions</h3>
                            <div class="actions">
                                <button class="btn primary" id="btnSimWeek" onclick="handleSimulateWeek()">Simulate Week</button>
                                <button class="btn" id="btnSimSeason" onclick="handleSimulateSeason()">Simulate Season</button>
                                <button class="btn" onclick="location.hash='#/standings'">View Standings</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <h3>Team Status</h3>
                        <div id="teamStatus">
                            <p>Team information will be displayed here</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Add event listeners for simulate buttons
            const btnSimWeek = hubContainer.querySelector('#btnSimWeek');
            const btnSimSeason = hubContainer.querySelector('#btnSimSeason');
            
            if (btnSimWeek) {
                btnSimWeek.addEventListener('click', () => this.handleSimulateWeek());
            }
            
            if (btnSimSeason) {
                btnSimSeason.addEventListener('click', () => this.handleSimulateSeason());
            }
            
            console.log('✅ Hub rendered successfully');
            
        } catch (error) {
            console.error('Error rendering hub:', error);
            this.setStatus('Failed to render hub', 'error');
        }
    }

    // --- SIMULATION FUNCTIONS ---
    handleSimulateWeek() {
        try {
            console.log('Simulating week...');
            this.setStatus('Simulating week...', 'info');
            
            // Basic week simulation
            if (window.state?.league) {
                const L = window.state.league;
                if (L.week < 18) {
                    L.week++;
                    this.setStatus(`Advanced to week ${L.week}`, 'success');
                    
                    // Re-render hub to show updated week
                    setTimeout(() => this.renderHub(), 1000);
                } else {
                    this.setStatus('Season complete!', 'success');
                }
            } else {
                this.setStatus('No league data available', 'error');
            }
            
        } catch (error) {
            console.error('Error simulating week:', error);
            this.setStatus('Failed to simulate week', 'error');
        }
    }

    handleSimulateSeason() {
        try {
            console.log('Simulating season...');
            this.setStatus('Simulating season...', 'info');
            
            // Basic season simulation
            if (window.state?.league) {
                const L = window.state.league;
                L.week = 18;
                this.setStatus('Season completed!', 'success');
                
                // Re-render hub to show updated week
                setTimeout(() => this.renderHub(), 1000);
            } else {
                this.setStatus('No league data available', 'error');
            }
            
        } catch (error) {
            console.error('Error simulating season:', error);
            this.setStatus('Failed to simulate season', 'error');
        }
    }

    // --- ENHANCED GAME RESULTS DISPLAY ---
    async renderGameResults() {
        try {
            console.log('Rendering enhanced game results...');
            
            const L = window.state.league;
            if (!L || !L.resultsByWeek) {
                console.warn('No game results available');
                return;
            }

            const hubResults = this.getElement('hubResults');
            if (!hubResults) return;

            // Get last week results
            const lastWeek = L.week > 1 ? L.week - 1 : 1;
            const weekResults = L.resultsByWeek[lastWeek];
            
            if (!weekResults || weekResults.length === 0) {
                hubResults.innerHTML = '<p class="muted">No results available for last week</p>';
                return;
            }

            let resultsHTML = '';
            weekResults.forEach(result => {
                if (result.bye) {
                    // Bye week
                    const byeTeams = result.bye.map(teamId => {
                        const team = L.teams[teamId];
                        return team ? team.name : 'Unknown Team';
                    }).join(', ');
                    
                    resultsHTML += `
                        <div class="result-item bye-week" data-week="${lastWeek}">
                            <div class="bye-teams">${byeTeams} - BYE</div>
                        </div>
                    `;
                } else {
                    // Game result
                    const homeTeam = L.teams[result.home];
                    const awayTeam = L.teams[result.away];
                    
                    if (homeTeam && awayTeam) {
                        const homeWin = result.homeWin;
                        const homeScore = result.scoreHome || 0;
                        const awayScore = result.scoreAway || 0;
                        
                        resultsHTML += `
                            <div class="result-item game-result" data-week="${lastWeek}" data-home="${result.home}" data-away="${result.away}">
                                <div class="game-teams">
                                    <span class="away-team ${!homeWin ? 'winner' : ''}">${awayTeam.name}</span>
                                    <span class="at">@</span>
                                    <span class="home-team ${homeWin ? 'winner' : ''}">${homeTeam.name}</span>
                                </div>
                                <div class="game-score">
                                    <span class="away-score ${!homeWin ? 'winner' : ''}">${awayScore}</span>
                                    <span class="score-separator">-</span>
                                    <span class="home-score ${homeWin ? 'winner' : ''}">${homeScore}</span>
                                </div>
                                <div class="game-result-indicator">
                                    ${homeWin ? 'Home Win' : 'Away Win'}
                                </div>
                            </div>
                        `;
                    }
                }
            });

            hubResults.innerHTML = resultsHTML;

            // Make game results clickable
            if (window.gameResultsViewer) {
                window.gameResultsViewer.makeGameResultsClickable();
            }

            console.log('✅ Enhanced game results rendered successfully');
            
        } catch (error) {
            console.error('Error rendering game results:', error);
        }
    }

    // --- ENHANCED SCHEDULE DISPLAY ---
    async renderSchedule() {
        try {
            console.log('Rendering enhanced schedule...');
            
            // Refresh schedule viewer if available
            if (window.scheduleViewer) {
                window.scheduleViewer.refresh();
            }

            console.log('✅ Enhanced schedule rendered successfully');
            
        } catch (error) {
            console.error('Error rendering schedule:', error);
        }
    }

    // --- ROBUST ONBOARDING ---
    async openOnboard() {
        try {
            const modal = this.getElement('onboardModal');
            if (!modal) {
                throw new Error('Onboarding modal not found');
            }

            modal.hidden = false;
            modal.style.display = 'flex';
            
            // Ensure teams are loaded before populating dropdown
            await this.ensureTeamsLoaded();
            this.populateTeamDropdown('fictional');
            
        } catch (error) {
            console.error('Error opening onboarding:', error);
            this.setStatus('Failed to open game setup', 'error');
        }
    }

    async ensureTeamsLoaded() {
        if (!window.Teams) {
            // Try to load teams data
            if (typeof window.loadTeamsData === 'function') {
                try {
                    await window.loadTeamsData();
                } catch (error) {
                    console.error('Failed to load teams data:', error);
                    throw new Error('Teams data unavailable');
                }
            } else {
                throw new Error('Teams data and loader not available');
            }
        }
    }

    populateTeamDropdown(mode) {
        const teamSelect = this.getElement('onboardTeam');
        if (!teamSelect) {
            console.error('Team select element not found');
            return false;
        }

        try {
            // Clear existing options efficiently
            teamSelect.innerHTML = '';
            
            const teams = this.listByMode(mode);
            if (teams.length === 0) {
                const option = document.createElement('option');
                option.textContent = 'No teams available';
                option.disabled = true;
                teamSelect.appendChild(option);
                return false;
            }

            // Use DocumentFragment for better performance
            const fragment = document.createDocumentFragment();
            teams.forEach((team, index) => {
                if (team && team.name && team.abbr) {
                    const option = document.createElement('option');
                    option.value = String(index);
                    option.textContent = `${team.abbr} — ${team.name}`;
                    fragment.appendChild(option);
                }
            });
            
            teamSelect.appendChild(fragment);
            return true;
            
        } catch (error) {
            console.error('Error populating team dropdown:', error);
            this.setStatus('Failed to load team list', 'error');
            return false;
        }
    }

    // --- ENHANCED GAME INITIALIZATION ---
    async initNewGame(options) {
        try {
            // Validate options
            if (!options || typeof options !== 'object') {
                throw new Error('Invalid game options');
            }

            const { chosenMode, teamIdx } = options;
            if (!chosenMode || teamIdx === undefined) {
                throw new Error('Missing required game options');
            }

            // Initialize state with validation
            if (!window.State?.init) {
                throw new Error('State system not available');
            }

            window.state = window.State.init();
            window.state.onboarded = true;
            window.state.namesMode = chosenMode;
            window.state.userTeamId = parseInt(teamIdx, 10);
            
            if (isNaN(window.state.userTeamId)) {
                throw new Error('Invalid team selection');
            }

            window.state.player = { teamId: window.state.userTeamId };

            // Create league with error handling
            const teams = this.listByMode(window.state.namesMode);
            if (teams.length === 0) {
                throw new Error('No teams available for selected mode');
            }

            if (!window.makeLeague) {
                throw new Error('League creation system not available');
            }

            window.state.league = window.makeLeague(teams);
            
            // Initialize other systems
            if (window.ensureFA) {
                try {
                    window.ensureFA();
                } catch (error) {
                    console.warn('Failed to initialize free agency:', error);
                }
            }

            // Save state
            const saveResult = await this.saveGameState();
            if (!saveResult.success) {
                console.warn('Failed to save initial game state:', saveResult.error);
            }

            // Close modal and navigate
            const modal = this.getElement('onboardModal');
            if (modal) {
                modal.style.display = 'none';
            }

            location.hash = '#/hub';
            
            // Initialize UI
            if (window.initializeUIFixes) {
                window.initializeUIFixes();
            }

            this.setStatus('New game created successfully!', 'success', 3000);
            
        } catch (error) {
            console.error('Error in initNewGame:', error);
            this.setStatus(`Failed to create new game: ${error.message}`, 'error');
            throw error;
        }
    }

    // --- ROBUST INITIALIZATION ---
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = this._performInit();
        return this.initPromise;
    }

    async _performInit() {
        console.log('GameController: Initializing...');
        
        try {
            // Load saved state
            const loadResult = await this.loadGameState();
            
            if (loadResult.success && loadResult.gameData?.onboarded) {
                window.state = loadResult.gameData;
                this.setStatus('Game loaded successfully', 'success', 2000);
            } else {
                // Initialize new game state
                if (!window.State?.init) {
                    throw new Error('State system not loaded');
                }
                
                window.state = window.State.init();
                await this.openOnboard();
            }

            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI fixes
            if (window.initializeUIFixes) {
                window.initializeUIFixes();
            }

            // Setup auto-save
            this.setupAutoSave();

            this.initialized = true;
            console.log('✅ GameController initialized successfully');
            
        } catch (error) {
            console.error('FATAL ERROR during initialization:', error);
            this.setStatus(`Initialization failed: ${error.message}`, 'error', 10000);
            
            // Try to recover with minimal state
            try {
                window.state = { onboarded: false };
                await this.openOnboard();
            } catch (recoveryError) {
                console.error('Recovery failed:', recoveryError);
                this.setStatus('Game failed to start. Please refresh the page.', 'error', 0);
            }
        }
    }

    // --- EVENT MANAGEMENT ---
    setupEventListeners() {
        // Clean up existing listeners first
        this.removeAllEventListeners();

        // Add new listeners with proper cleanup tracking
        this.addEventListener(window, 'beforeunload', this.handleBeforeUnload.bind(this));
        this.addEventListener(window, 'hashchange', this.handleHashChange.bind(this));
        
        // Memory cleanup on visibility change
        this.addEventListener(document, 'visibilitychange', () => {
            if (document.hidden) {
                this.clearDOMCache();
            }
        });
    }

    addEventListener(element, event, handler) {
        const key = `${element.constructor.name}_${event}`;
        if (this.eventListeners.has(key)) {
            element.removeEventListener(event, this.eventListeners.get(key));
        }
        element.addEventListener(event, handler);
        this.eventListeners.set(key, handler);
    }

    removeAllEventListeners() {
        this.eventListeners.forEach((handler, key) => {
            const [elementType, event] = key.split('_');
            const element = elementType === 'Window' ? window : document;
            element.removeEventListener(event, handler);
        });
        this.eventListeners.clear();
    }

    handleBeforeUnload(event) {
        if (window.state?.needsSave) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    handleHashChange() {
        try {
            const hash = location.hash.slice(2) || 'hub';
            if (window.router && typeof window.router === 'function') {
                window.router(hash);
            }
        } catch (error) {
            console.error('Error handling hash change:', error);
        }
    }

    // --- AUTO-SAVE SYSTEM ---
    setupAutoSave() {
        // Clear any existing auto-save
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        // Auto-save every 5 minutes
        this.autoSaveInterval = setInterval(() => {
            if (window.state?.onboarded && window.state?.needsSave) {
                this.saveGameState().then(result => {
                    if (result.success) {
                        window.state.needsSave = false;
                        console.log('Auto-save completed');
                    }
                }).catch(error => {
                    console.error('Auto-save failed:', error);
                });
            }
        }, 5 * 60 * 1000);
    }

    // --- ENHANCED SAVE/LOAD ---
    async saveGameState(stateToSave = null) {
        try {
            if (window.saveState && typeof window.saveState === 'function') {
                const result = window.saveState(stateToSave);
                return result;
            } else {
                throw new Error('Save system not available');
            }
        } catch (error) {
            console.error('Save failed:', error);
            return { success: false, error: error.message };
        }
    }

    async loadGameState() {
        try {
            if (window.loadState && typeof window.loadState === 'function') {
                const gameData = window.loadState();
                if (gameData) {
                    return { success: true, gameData };
                } else {
                    return { success: false, error: 'No save data found' };
                }
            } else {
                throw new Error('Load system not available');
            }
        } catch (error) {
            console.error('Load failed:', error);
            return { success: false, error: error.message };
        }
    }

    // --- ROUTER FUNCTION ---
    router(viewName = null) {
        if (!viewName) {
            viewName = location.hash.slice(2) || 'hub';
        }
        
        console.log('🔄 Router navigating to:', viewName);
        
        // Handle different views
        switch(viewName) {
            case 'hub':
                if (this.renderHub) this.renderHub();
                break;
            case 'roster':
                if (this.renderRoster) this.renderRoster();
                break;
            case 'schedule':
                if (this.renderSchedule) this.renderSchedule();
                break;
            case 'game-results':
                if (this.renderGameResults) this.renderGameResults();
                break;
            default:
                console.log('No renderer for view:', viewName);
        }
    }

    // --- IMPROVED REFRESH SYSTEM ---
    async refreshAll() {
        if (!window.state?.onboarded || !window.state?.league) {
            console.warn('Cannot refresh - game not properly initialized');
            return;
        }

        try {
            // Clear DOM cache to ensure fresh elements
            this.clearDOMCache();
            
            // Refresh current view
            const currentHash = location.hash.slice(2) || 'hub';
            this.router(currentHash);
            
        } catch (error) {
            console.error('Error in refreshAll:', error);
            this.setStatus('Failed to refresh display', 'error');
        }
    }

    // --- ENHANCED SAFETY NET ---
    initializeSafetyNet() {
        const requiredFunctions = {
            makeLeague: (teams) => ({
                teams: teams || [],
                year: 2025,
                week: 1,
                schedule: { weeks: [] },
                standings: { divisions: {} }
            }),
            generateProspects: () => [],
            generateCoaches: () => {
                // Generate basic coaching staff for teams
                if (!window.state?.league?.teams) return {};
                
                const coaches = {};
                window.state.league.teams.forEach(team => {
                    if (!team.staff) {
                        team.staff = {
                            headCoach: {
                                name: `Coach ${team.name}`,
                                position: 'HC',
                                experience: 1,
                                rating: 70
                            },
                            offCoordinator: {
                                name: `OC ${team.name}`,
                                position: 'OC',
                                experience: 1,
                                rating: 65
                            },
                            defCoordinator: {
                                name: `DC ${team.name}`,
                                position: 'DC',
                                experience: 1,
                                rating: 65
                            }
                        };
                    }
                });
                return coaches;
            }
        };
        
        // Make functions globally available
        Object.entries(requiredFunctions).forEach(([name, func]) => {
            if (!window[name]) {
                window[name] = func;
            }
        });
    }
}

// Create and initialize the game controller
const gameController = new GameController();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        gameController.init();
    });
} else {
    gameController.init();
}

// Make controller globally available
window.gameController = gameController;

// Make all necessary functions globally available
window.initNewGame = gameController.initNewGame.bind(gameController);
window.saveGameState = gameController.saveGameState.bind(gameController);
window.loadGameState = gameController.loadGameState.bind(gameController);
window.setStatus = gameController.setStatus.bind(gameController);
window.router = gameController.router.bind(gameController);
window.renderRoster = gameController.renderRoster.bind(gameController);
window.renderHub = gameController.renderHub.bind(gameController);
window.renderGameResults = gameController.renderGameResults.bind(gameController);
window.renderSchedule = gameController.renderSchedule.bind(gameController);
window.getElement = gameController.getElement.bind(gameController);
window.listByMode = gameController.listByMode.bind(gameController);
window.populateTeamDropdown = gameController.populateTeamDropdown.bind(gameController);
window.calculateOverallRating = gameController.calculateOverallRating.bind(gameController);

// Note: Team rating functions are defined in team-ratings.js
// Note: Trade, Settings, Playoffs, Scouting functions are defined in their respective files

console.log('✅ GameController functions exported globally');
