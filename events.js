'use strict';

// --- ROUTING ---
// Basic hash-based router
function router() {
    // Default route
    const path = location.hash || '#/hub';

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });

    // Show active page
    const pageId = `page${path.charAt(2).toUpperCase() + path.slice(3)}`;
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
    }

    // Update nav link styles
    document.querySelectorAll('#main-nav a').forEach(a => {
        if (a.href.endsWith(path)) {
            a.classList.add('active');
        } else {
            a.classList.remove('active');
        }
    });

    console.log(`Route change: ${path.substring(2)}`);
}


// --- EVENT LISTENERS ---

// Set status message
function setStatus(msg, duration = 3000) {
    const el = document.getElementById('status-bar'); // Assuming you have a status bar element
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
        modal.style.display = 'flex';
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
        const targetId = target.id;
        const classList = target.classList;
        console.log('Click detected on:', targetId || classList.toString());

        // --- ONBOARDING, SIM, AND THEME BUTTONS ---
        switch (targetId) {
            case 'onboardStart':
                console.log('Onboard start clicked');
                const options = {
                    gameMode: 'gm',
                    playerRole: 'GM',
                    chosenMode: document.getElementById('onboardMode').value,
                    teamIdx: document.getElementById('onboardTeam').value
                };
                if (window.initNewGame) initNewGame(options);
                return; // Stop further processing

            case 'btnSimWeek':
                console.log('Simulating week...');
                if (window.simulateWeekAndUpdate) simulateWeekAndUpdate();
                return;

            case 'btnThemeToggle':
                console.log('Toggling theme...');
                if (UI.toggleTheme) UI.toggleTheme();
                return;
        }

        // --- OTHER CLICK ACTIONS FROM YOUR ORIGINAL FILE ---
        if (classList.contains('btnSimSeason')) {
            console.log('Sim season clicked (not implemented)');
            setStatus('Simulate season not yet implemented.');
        }
        else if (classList.contains('btnSignPlayer')) {
            const playerId = target.dataset.playerId;
            console.log(`Sign player ${playerId} clicked`);
        }
        else if (classList.contains('btnReleasePlayer')) {
            const playerId = target.dataset.playerId;
            console.log(`Release player ${playerId} clicked`);
        }
        else if (classList.contains('btnProposeTrade')) {
            console.log('Propose trade clicked');
        }
        else if (classList.contains('btnHireStaff')) {
            const staffId = target.dataset.staffId;
            console.log(`Hire staff ${staffId} clicked`);
        }
        else if (classList.contains('btnMakePick')) {
            console.log('Make draft pick clicked');
        }
        else if (classList.contains('close-modal') || classList.contains('close-button')) {
            const modal = target.closest('.modal-backdrop');
            if (modal) {
                modal.style.display = 'none';
            }
        }
    });

    // --- SPECIFIC LISTENERS ---

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
    // Call router on initial load as well
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', router);
    } else {
        router();
    }

    console.log('Event listeners set up successfully');
}

// Make functions globally accessible
window.setupEventListeners = setupEventListeners;
window.setStatus = setStatus;
window.router = router;

