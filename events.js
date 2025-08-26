'use strict';

// --- ROUTING ---
// Basic hash-based router
function router() {
    // Default route
    const path = location.hash || '#/hub';

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.style.display = 'none';
    });

    // Show active page
    const activePage = document.querySelector(path.replace('#', '#page'));
    if (activePage) {
        activePage.style.display = 'block';
    }

    // Update nav link styles
    document.querySelectorAll('#main-nav a').forEach(a => {
        if (a.href.endsWith(path)) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });

    // Log route change
    console.log(`Route change: ${path.substring(2)}`);
}


// --- EVENT LISTENERS ---

// Set status message
function setStatus(msg, duration = 3000) {
    const el = document.getElementById('status-bar');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(() => {
            el.style.display = 'none';
        }, duration);
    }
}

// Show news modal
function showNews(newsItem) {
    const modal = document.getElementById('newsModal');
    if (modal) {
        document.getElementById('newsModalTitle').textContent = newsItem.title;
        document.getElementById('newsModalContent').textContent = newsItem.content;
        modal.style.display = 'block';
    }
}

// Close news modal
function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// --- SETUP ---
function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Delegated event listener for the entire body
    document.body.addEventListener('click', e => {
        const target = e.target;
        const classList = target.classList;
        console.log('Click detected on:', target.id || classList.toString());

        // --- THE FIX IS HERE ---
        // Onboarding "Start Season" button
        if (target.id === 'onboardStart') {
            console.log('Onboard start clicked');
            const options = {
                gameMode: 'gm',
                playerRole: 'GM',
                chosenMode: document.getElementById('onboardMode').value,
                teamIdx: document.getElementById('onboardTeam').value
            };
            console.log('Starting game:', options);
            if (window.initNewGame) {
                initNewGame(options);
            } else {
                console.error('initNewGame function not found!');
            }
            return; // Stop further processing
        }
        // --- END FIX ---

        // Simulation buttons
        if (classList.contains('btnSimWeek')) {
            console.log('Simulating week...');
            if (window.simulateWeekAndUpdate) {
                simulateWeekAndUpdate();
            } else {
                console.error('simulateWeekAndUpdate function not found!');
            }
        } else if (classList.contains('btnSimSeason')) {
            // Placeholder for sim season functionality
            console.log('Sim season clicked (not implemented)');
            setStatus('Simulate season not yet implemented.');
        }

        // Navigation links (handled by hashchange)

        // Player actions
        else if (classList.contains('btnSignPlayer')) {
            const playerId = target.dataset.playerId;
            console.log(`Sign player ${playerId} clicked`);
            // Placeholder for signing logic
        } else if (classList.contains('btnReleasePlayer')) {
            const playerId = target.dataset.playerId;
            console.log(`Release player ${playerId} clicked`);
            // Placeholder for release logic
        }

        // Trade actions
        else if (classList.contains('btnProposeTrade')) {
            console.log('Propose trade clicked');
            // Placeholder for trade logic
        }

        // Staff actions
        else if (classList.contains('btnHireStaff')) {
            const staffId = target.dataset.staffId;
            console.log(`Hire staff ${staffId} clicked`);
            // Placeholder for hiring logic
        }

        // Draft actions
        else if (classList.contains('btnMakePick')) {
            console.log('Make draft pick clicked');
            // Placeholder for draft logic
        }

        // Modal close buttons
        else if (classList.contains('close-modal')) {
            const modal = target.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });

    // Specific listeners for non-delegated events

    // Team mode selection (real vs. fictional)
    const onboardModeSelect = document.getElementById('onboardMode');
    if (onboardModeSelect) {
        onboardModeSelect.addEventListener('change', e => {
            state.namesMode = e.target.value;
            const teamsByMode = listByMode(state.namesMode);
            document.getElementById('onboardTeam').innerHTML = teamsByMode.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
        });
    }

    // Handle initial route and hash changes for navigation
    window.addEventListener('hashchange', router);
    window.addEventListener('DOMContentLoaded', router);

    console.log('Event listeners set up successfully');
}

// Make functions globally accessible
window.setupEventListeners = setupEventListeners;
window.setStatus = setStatus;
window.router = router;

