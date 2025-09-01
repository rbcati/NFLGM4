'use strict';

/**
 * Handles core game events (onboarding, saving, loading, simulating).
 */
function setupEventListeners() {
    console.log('Setting up core event listeners...');

    document.body.addEventListener('click', function(e) {
        const targetId = e.target.id;

        if (targetId === 'onboardStart') return handleOnboardStart(e);
        if (targetId === 'btnSimWeek') return handleSimulateWeek(e);
        if (targetId === 'btnSave') return saveState();
        if (targetId === 'btnLoad') return handleLoadGame(e);
        if (targetId === 'btnNewLeague') return handleNewLeague(e);
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

// **FIXED**: This function no longer calls router(), preventing the double sim.
// The simulation.js file will now be responsible for refreshing the UI.
function handleSimulateWeek() {
    if (window.simulateWeek) {
        window.simulateWeek();
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
