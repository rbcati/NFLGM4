'use strict';

// --- ROUTING ---
function router() {
    const path = location.hash || '#/hub';
    
    // Hide all views
    document.querySelectorAll('.view').forEach(v => v.hidden = true);
    
    // Show active view
    const viewName = path.slice(2); // Remove #/
    const activeView = document.getElementById(viewName);
    if (activeView) {
        activeView.hidden = false;
    }
    
    // Update nav
    document.querySelectorAll('.nav-pill').forEach(a => {
        const isActive = a.getAttribute('href') === path;
        a.setAttribute('aria-current', isActive ? 'page' : null);
    });
    
    console.log('Route change:', viewName);
    
    // Render the appropriate view
    if (state.league && state.onboarded) {
        switch(viewName) {
            case 'hub':
                if (window.renderHub) window.renderHub();
                break;
            case 'roster':
                if (window.renderRoster) window.renderRoster();
                break;
            case 'standings':
                if (window.renderStandings) window.renderStandings();
                break;
            case 'freeagency':
                if (window.renderFreeAgency) window.renderFreeAgency();
                break;
        }
    }
}

// --- STATUS MANAGEMENT ---
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

// --- EVENT SETUP ---
function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Global click handler using delegation
    document.body.addEventListener('click', function(e) {
        const target = e.target;
        const targetId = target.id;
        
        console.log('Click detected on:', targetId || target.className);

        // Handle onboarding start
        if (targetId === 'onboardStart') {
            console.log('Onboard start clicked');
            handleOnboardStart(e);
            return;
        }
        
        // Handle simulation
        if (targetId === 'btnSimWeek') {
            console.log('Simulating week...');
            if (window.simulateWeekAndUpdate) {
                window.simulateWeekAndUpdate();
            } else if (window.simulateWeek) {
                window.simulateWeek();
                if (window.refreshAll) window.refreshAll();
            }
            return;
        }
        
        // Handle save/load
        if (targetId === 'btnSave') {
            console.log('Save clicked');
            if (window.saveState) {
                const success = window.saveState();
                setStatus(success ? 'Game saved!' : 'Save failed!');
            }
            return;
        }
        
        if (targetId === 'btnLoad') {
            console.log('Load clicked');
            if (window.loadState) {
                const loaded = window.loadState();
                if (loaded) {
                    window.state = loaded;
                    setStatus('Game loaded!');
                    if (window.refreshAll) window.refreshAll();
                } else {
                    setStatus('No save file found!');
                }
            }
            return;
        }
        
        // Handle new league
        if (targetId === 'btnNewLeague') {
            console.log('New league clicked');
            if (confirm('Start a new league? This will delete your current save.')) {
                localStorage.removeItem(window.SAVE_KEY || 'nflGM4.league');
                location.reload();
            }
            return;
        }
        
        // Handle free agency signing
        if (targetId === 'btnSignFA') {
            console.log('Sign FA clicked');
            if (window.signFreeAgent) {
                window.signFreeAgent();
            }
            return;
        }
        
        // Handle random team selection
        if (targetId === 'onboardRandom') {
            e.preventDefault();
            const teamSelect = document.getElementById('onboardTeam');
            if (teamSelect && teamSelect.options.length > 0) {
                const randomIndex = Math.floor(Math.random() * teamSelect.options.length);
                teamSelect.selectedIndex = randomIndex;
                setStatus('Random team selected: ' + teamSelect.options[randomIndex].text);
            }
            return;
        }
    });

    // Handle radio button changes
    document.addEventListener('change', function(e) {
        const target = e.target;
        
        // Names mode change
        if (target.name === 'namesMode') {
            console.log('Names mode changed to:', target.value);
            state.namesMode = target.value;
            
            if (window.populateTeamDropdown) {
                window.populateTeamDropdown(target.value);
            }
        }
        
        // Game mode change  
        if (target.name === 'gameMode') {
            console.log('Game mode changed to:', target.value);
            const careerOptions = document.getElementById('careerOptions');
            if (careerOptions) {
                careerOptions.hidden = target.value !== 'career';
            }
        }
        
        // Free agency player selection
        if (target.name === 'fa') {
            const btnSign = document.getElementById('btnSignFA');
            if (btnSign) {
                btnSign.disabled = false;
            }
        }
    });

    // Handle navigation
    window.addEventListener('hashchange', router);
    
    // Initial route
    router();
    
    console.log('Event listeners set up successfully');
}

/**
 * Handle onboarding start with proper validation
 */
function handleOnboardStart(e) {
    e.preventDefault();
    console.log('Processing onboard start...');
    
    try {
        // Get form values safely
        const gameModeEl = document.querySelector('input[name="gameMode"]:checked');
        const namesModeEl = document.querySelector('input[name="namesMode"]:checked');
        const teamSelect = document.getElementById('onboardTeam');
        const careerRoleEl = document.getElementById('careerRole');
        
        // Validate required elements exist
        if (!teamSelect) {
            setStatus('Error: Team selection not found');
            console.error('Team select element missing');
            return;
        }
        
        if (teamSelect.options.length === 0) {
            setStatus('Error: No teams available');
            console.error('No teams in dropdown');
            return;
        }
        
        // Build options object
        const options = {
            gameMode: gameModeEl ? gameModeEl.value : 'gm',
            playerRole: 'GM',
            chosenMode: namesModeEl ? namesModeEl.value : 'fictional',
            teamIdx: teamSelect.value || '0'
        };
        
        // Handle career mode role
        if (options.gameMode === 'career' && careerRoleEl) {
            options.playerRole = careerRoleEl.value;
        }
        
        console.log('Onboard options:', options);
        
        // Validate team selection
        const teams = window.listByMode(options.chosenMode);
        const teamIdx = parseInt(options.teamIdx, 10);
        
        if (isNaN(teamIdx) || teamIdx < 0 || teamIdx >= teams.length) {
            setStatus('Error: Invalid team selection');
            console.error('Invalid team index:', teamIdx, 'out of', teams.length);
            return;
        }
        
        const selectedTeam = teams[teamIdx];
        console.log('Selected team:', selectedTeam);
        
        // Initialize the game
        if (window.initNewGame) {
            window.initNewGame(options);
        } else {
            // Fallback initialization
            initGameFallback(options, teams);
        }
        
    } catch (error) {
        console.error('Error in handleOnboardStart:', error);
        setStatus('Error starting game: ' + error.message);
    }
}

/**
 * Fallback game initialization if main function isn't available
 */
function initGameFallback(options, teams) {
    try {
        console.log('Using fallback initialization...');
        
        // Update state
        state.gameMode = options.gameMode;
        state.playerRole = options.playerRole;
        state.namesMode = options.chosenMode;
        state.userTeamId = parseInt(options.teamIdx, 10);
        state.onboarded = true;
        
        // Ensure player object exists
        if (!state.player) {
            state.player = {};
        }
        state.player.teamId = state.userTeamId;
        
        // Create league
        if (window.makeLeague) {
            console.log('Creating league with', teams.length, 'teams');
            state.league = window.makeLeague(teams);
            
            if (state.league) {
                console.log('✅ League created successfully');
            } else {
                throw new Error('League creation failed');
            }
        } else {
            throw new Error('makeLeague function not available');
        }
        
        // Generate free agents
        if (window.ensureFA) {
            window.ensureFA();
        } else if (window.generateFreeAgents) {
            window.generateFreeAgents();
        }
        
        // Close modal
        const modal = document.getElementById('onboardModal');
        if (modal) {
            modal.hidden = true;
            modal.style.display = 'none';
        }
        
        // Save game
        if (window.saveState) {
            window.saveState();
        }
        
        // Navigate to hub
        location.hash = '#/hub';
        
        // Refresh UI
        if (window.refreshAll) {
            window.refreshAll();
        }
        
        const teamName = teams[state.userTeamId]?.name || 'Unknown Team';
        setStatus(`Game started! You are the ${options.playerRole} of ${teamName}`);
        
        console.log('✅ Fallback initialization completed');
        // Add simulateWeek function for advancing the simulation by one week
window.simulateWeek = function() {
    if (!window.simulationState) {
        window.simulationState = { currentDate: new Date() };
    }

    const currentDate = window.simulationState.currentDate;
    currentDate.setDate(currentDate.getDate() + 7);
    window.simulationState.currentDate = currentDate;

    console.log(`Simulated week. New date: ${currentDate.toDateString()}`);

    // Additional weekly update logic here (refresh UI, update stats, etc.)
};

    } catch (error) {
        console.error('Fallback initialization failed:', error);
        setStatus('Failed to start game: ' + error.message);
    }
}

// Make functions globally available
window.setupEventListeners = setupEventListeners;
window.setStatus = setStatus;
window.router = router;
window.handleOnboardStart = handleOnboardStart;
window.initGameFallback = initGameFallback;
