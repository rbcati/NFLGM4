'use strict';

/**
 * Handles core game events (onboarding, saving, loading, simulating).
 */
function setupEventListeners() {
    console.log('Setting up core event listeners...');

    // Use a flag to prevent double clicks during simulation
    let isSimulating = false;

    document.body.addEventListener('click', function(e) {
        const targetId = e.target.id;

        if (targetId === 'onboardStart') return handleOnboardStart(e);
        if (targetId === 'btnSave') return saveState();
        if (targetId === 'btnLoad') return handleLoadGame(e);
        if (targetId === 'btnNewLeague') return handleNewLeague(e);
        
        // **FIXED**: Debounced simulate week handler
        if (targetId === 'btnSimWeek') {
            if (isSimulating) return; // Prevent clicks while a sim is in progress
            isSimulating = true;
            handleSimulateWeek(e.target).finally(() => {
                isSimulating = false; // Re-enable clicks after sim is complete
            });
        }
    });

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
        gameMode: document.querySelector('input[name="gameMode"]:checked')?.value || 'gm',
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

    // Use a timeout to allow the UI to update before the simulation starts
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

window.setupEventListeners = setupEventListeners;
