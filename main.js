// main.js
;(function () {
  'use strict';

  // Global error handler
  window.addEventListener('error', function (e) {
    try {
      const div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#3b0d0d;color:#fff;padding:8px 12px;font-family:system-ui;box-shadow:0 2px 6px rgba(0,0,0,.4)';
      div.textContent = 'JS error: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '');
      document.body.appendChild(div);
    } catch (_) {}
  });

  // This function is useful for refreshing the UI after loading a game
  function refreshAll() {
    fillTeamSelect($('#userTeam'));
    // Make sure the dropdown reflects the loaded team
    if (state.league && currentTeam()) {
        $('#userTeam').value = (state.league.teams.findIndex(t => t.abbr === currentTeam().abbr) || 0);
    }
    rebuildTeamLabels(state.namesMode);
    renderHub();
    renderRoster();
    renderStandings();
    renderDraft();
    updateCapSidebar();
  }

  // --- Game State Management ---
  function saveGame() {
    const payload = JSON.stringify({
      league: state.league,
      freeAgents: state.freeAgents,
      playoffs: state.playoffs,
      namesMode: state.namesMode,
      onboarded: state.onboarded,
      pendingOffers: state.pendingOffers
    });
    localStorage.setItem(SAVE_KEY, payload);
    setStatus('Saved');
  }

  function loadGame() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { setStatus('Nothing to load'); return; }
    let obj = {};
    try { obj = JSON.parse(raw) || {}; } catch (e) { obj = {}; }
    state.league = obj.league || makeLeague(listByMode(state.namesMode));
    state.freeAgents = obj.freeAgents || [];
    state.playoffs = obj.playoffs || null;
    state.namesMode = obj.namesMode || state.namesMode;
    state.onboarded = !!obj.onboarded;
    state.pendingOffers = obj.pendingOffers || [];
    refreshAll();
    setStatus('Loaded');
  }

  // --- App Initialization ---
  function init() {
    const savedState = localStorage.getItem(SAVE_KEY);
    // If a saved game exists and the user has completed onboarding, load it
    if (savedState && JSON.parse(savedState).onboarded) {
      loadGame();
    } else {
      // Otherwise, show the new user setup
      openOnboard();
    }
    // Set up all the button clicks and event handlers
    setupEventListeners();
    // Show the correct view based on the URL hash
    const hash = location.hash.replace('#/','') || 'hub';
    show(routes.indexOf(hash) >= 0 ? hash : 'hub');
  }

  // Make key functions globally available so they can be called from events.js
  window.saveGame = saveGame;
  window.loadGame = loadGame;
  window.refreshAll = refreshAll;

  // Initial call to start the application
  init();

})();
