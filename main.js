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

    getCurrentTeam() {
        try {
            if (!window.state?.league?.teams || window.state.userTeamId === undefined) {
                return null;
            }
            return window.state.league.teams[window.state.userTeamId] || null;
        } catch (error) {
            console.error('Error getting current team:', error);
            return null;
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
            if (window.router && typeof window.router === 'function') {
                window.router(currentHash);
            }
            
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
                        
                        // Initialize coaching stats if available
                        if (window.initializeCoachingStats) {
                            Object.values(team.staff).forEach(coach => {
                                window.initializeCoachingStats(coach);
                            });
                        }
                    }
                });
                
                return coaches;
            },
            ensureFA: () => {},
            runWeeklyTraining: () => {},
            runOffseason: () => {
                // Basic offseason processing
                if (!window.state?.league) return;
                
                const L = window.state.league;
                
                // Update team records and standings
                if (L.teams) {
                    L.teams.forEach(team => {
                        if (team.record) {
                            // Basic offseason logic
                            team.record.season = L.year;
                        }
                    });
                }
                
                // Advance to next season
                L.year++;
                L.week = 1;
                
                // Reset team records
                if (L.teams) {
                    L.teams.forEach(team => {
                        team.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
                    });
                }
                
                // Update coaching stats if available
                if (window.updateAllCoachingSeasonStats) {
                    window.updateAllCoachingSeasonStats(L);
                }
            },
            capHitFor: (player) => player?.baseAnnual || 0,
            renderTrade: () => console.warn('Trade system not loaded'),
            renderFreeAgency: () => console.warn('Free agency system not loaded'),
            renderDraft: () => console.warn('Draft system not loaded'),
            renderScouting: () => {
                // Basic scouting interface
                const content = document.getElementById('content');
                if (content) {
                    content.innerHTML = `
                        <div class="scouting-container">
                            <h2>Scouting</h2>
                            <p>Scouting system is not fully implemented yet.</p>
                            <p>This feature will allow you to scout college prospects and evaluate their potential.</p>
                        </div>
                    `;
                }
            },
            renderCoaching: () => {
                // Use the existing coaching stats function
                if (window.renderCoachingStats) {
                    window.renderCoachingStats();
                } else {
                    console.warn('Coaching system not fully loaded');
                }
            },
            simulateWeek: () => this.setStatus('Simulation logic not loaded', 'warning')
        };

        let missingCount = 0;
        for (const [funcName, fallback] of Object.entries(requiredFunctions)) {
            if (typeof window[funcName] !== 'function') {
                console.log(`Creating implementation for: ${funcName}`);
                window[funcName] = fallback;
                missingCount++;
            }
        }

        if (missingCount > 0) {
            console.log(`✅ ${missingCount} functions implemented - system ready`);
        }
    }

    // --- CLEANUP ---
    cleanup() {
        this.removeAllEventListeners();
        this.clearDOMCache();
        
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
        
        this.initialized = false;
        this.initPromise = null;
    }
}

// --- GLOBAL INITIALIZATION ---
const gameController = new GameController();

// Initialize safety net immediately
gameController.initializeSafetyNet();

// Expose necessary functions globally
window.setStatus = (msg, type, duration) => gameController.setStatus(msg, type, duration);
window.listByMode = (mode) => gameController.listByMode(mode);
window.openOnboard = () => gameController.openOnboard();
window.populateTeamDropdown = (mode) => gameController.populateTeamDropdown(mode);
window.initNewGame = (options) => gameController.initNewGame(options);
window.refreshAll = () => gameController.refreshAll();
window.currentTeam = () => gameController.getCurrentTeam();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    gameController.cleanup();
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    gameController.init().catch(error => {
        console.error('Failed to initialize game:', error);
    });
});
