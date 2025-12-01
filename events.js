'use strict';

/**
 * Handles core game events (onboarding, saving, loading, simulating).
 */
let coreEventsBound = false;

function setupEventListeners() {
    if (coreEventsBound) {
        return;
    }
    coreEventsBound = true;

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
                if (window.state) {
                    window.state.namesMode = e.target.value;
                }
                if(window.populateTeamDropdown) populateTeamDropdown(e.target.value);
            });
        });
    }
}

function handleOnboardStart(e) {
    e.preventDefault();
    const chosenMode = document.querySelector('input[name="namesMode"]:checked')?.value || 'fictional';
    const teamIdx = document.getElementById('onboardTeam')?.value || '0';

    // Ensure the dropdown reflects the currently selected mode before starting
    if (window.populateTeamDropdown) {
        window.populateTeamDropdown(chosenMode);
    }

    const teams = (typeof window.listByMode === 'function') ? window.listByMode(chosenMode) : [];
    if (!teams.length) {
        window.setStatus?.('No teams available for selected mode. Please reload teams and try again.', 'error');
        console.error('Start Season blocked: no teams available for mode', chosenMode);
        return;
    }

    if (window.initNewGame) {
        initNewGame({ chosenMode, teamIdx });
    }
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
        if (window.clearSavedState) {
            window.clearSavedState();
        }
        if (window.State?.init) {
            window.state = window.State.init();
        }
        if (window.setActiveSaveSlot && window.state?.saveSlot) {
            window.setActiveSaveSlot(window.state.saveSlot);
        }
        if (window.renderSaveSlotInfo) {
            window.renderSaveSlotInfo();
        }
        window.openOnboard?.();
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
window.openOnboard = async function() {
    console.log('🎯 Opening onboarding modal...');
    const modal = document.getElementById('onboardModal');
    if (modal) {
        modal.hidden = false;
        modal.style.display = 'flex';

        // Ensure team data is available before populating the dropdown
        if (window.gameController?.ensureTeamsLoaded) {
            try {
                await window.gameController.ensureTeamsLoaded();
            } catch (error) {
                console.error('❌ Failed to load teams before onboarding:', error);
                window.setStatus?.('Teams data not available. Please reload.', 'error');
                return;
            }
        }

        // Populate team dropdown if not already done
        const teamSelect = document.getElementById('onboardTeam');
        if (teamSelect && window.populateTeamDropdown) {
            const selectedMode = document.querySelector('input[name="namesMode"]:checked')?.value || 'fictional';
            window.populateTeamDropdown(selectedMode);
        }

        console.log('✅ Onboarding modal opened');
    } else {
        console.error('❌ Onboarding modal not found');
    }
};
