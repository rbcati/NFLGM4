'use strict';

/**
 * Handles core game events (onboarding, saving, loading, simulating).
 */
function setupEventListeners() {
    console.log('Setting up core event listeners...');
    let isSimulating = false; // Flag to prevent double simulation

    document.body.addEventListener('click', function(e) {
        const targetId = e.target.id;

        // Onboarding
        if (targetId === 'onboardStart') return handleOnboardStart(e);

        // Core Actions
        if (targetId === 'btnSave') return saveState();
        if (targetId === 'btnLoad') return handleLoadGame(e);
        if (targetId === 'btnNewLeague') return handleNewLeague(e);
        if (targetId === 'btnRelease') return handleReleasePlayers(e);
        if (targetId === 'btnSimPlayoff') return handleSimulatePlayoff(e);
        
        // **FIXED**: Debounced simulate week handler
        if (targetId === 'btnSimWeek') {
            if (isSimulating) return; // Prevent clicks while a sim is in progress
            isSimulating = true;
            handleSimulateWeek(e.target).finally(() => {
                isSimulating = false; // Re-enable clicks after sim is complete
            });
        }
    });

    // Onboarding radio buttons
    const namesModeRadios = document.querySelectorAll('input[name="namesMode"]');
    if (namesModeRadios) {
        namesModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if(window.populateTeamDropdown) populateTeamDropdown(e.target.value);
            });
        });
    }
}

function handleOnboardStart(e) {
    e.preventDefault();
    const options = {
        chosenMode: document.querySelector('input[name="namesMode"]:checked')?.value || 'fictional',
        teamIdx: document.getElementById('onboardTeam')?.value || '0'
    };
    if (window.initNewGame) initNewGame(options);
}

async function handleSimulateWeek(button) {
    if (button) {
        button.disabled = true;
        button.textContent = 'Simulating...';
    }
    await new Promise(resolve => setTimeout(resolve, 50));
    if (window.simulateWeek) {
        window.simulateWeek();
    }
    if (button) {
        button.disabled = false;
        button.textContent = 'Simulate Week';
    }
}

function handleLoadGame() {
    if (confirm('Load saved game? This will overwrite any unsaved progress.')) {
        const loadedState = loadState();
        if (loadedState) {
            window.state = loadedState;
            location.reload();
        } else {
            setStatus('No save file found!');
        }
    }
}

function handleNewLeague() {
    if (confirm('Are you sure you want to start a new league? Your current game will be deleted.')) {
        localStorage.removeItem('nflGM4.league');
        location.reload();
    }
}

function handleReleasePlayers(e) {
    e.preventDefault();
    
    // Get selected players
    const selectedCheckboxes = document.querySelectorAll('.player-select:checked');
    if (selectedCheckboxes.length === 0) {
        window.setStatus('No players selected for release.');
        return;
    }
    
    const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (confirm(`Are you sure you want to release ${selectedIds.length} player(s)? This action cannot be undone.`)) {
        if (window.releaseSelected) {
            window.releaseSelected(selectedIds);
        } else {
            window.setStatus('Release functionality not available.');
        }
    }
}

function handleSimulatePlayoff(e) {
    e.preventDefault();
    
    if (window.simPlayoffWeek) {
        window.simPlayoffWeek();
    } else {
        window.setStatus('Playoff simulation not available.');
    }
}

window.setupEventListeners = setupEventListeners;

// Add missing openOnboard function
window.openOnboard = function() {
    console.log('🎯 Opening onboarding modal...');
    const modal = document.getElementById('onboardModal');
    if (modal) {
        modal.hidden = false;
        modal.style.display = 'flex';
        
        // Populate team dropdown if not already done
        const teamSelect = document.getElementById('onboardTeam');
        if (teamSelect && window.populateTeamDropdown) {
            window.populateTeamDropdown('fictional');
        }
        
        console.log('✅ Onboarding modal opened');
    } else {
        console.error('❌ Onboarding modal not found');
    }
};
