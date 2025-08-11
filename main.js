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

  function refreshAll() {
    fillTeamSelect($('#userTeam'));
    if (state.league && state.userTeamId !== undefined) {
        // **THE FIX:** Corrected the typo from 'userTteamId' to 'userTeamId'
        $('#userTeam').value = state.userTeamId;
    }
    rebuildTeamLabels(state.namesMode);
    renderHub();
    renderRoster();
    renderStandings();
    renderDraft();
    updateCapSidebar();
  }

  function saveGame() {
    const payload = JSON.stringify({
      league: state.league, freeAgents: state.freeAgents, playoffs: state.playoffs,
      namesMode: state.namesMode, onboarded: state.onboarded,
      pendingOffers: state.pendingOffers, userTeamId: state.userTeamId
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
    state.namesMode = obj.namesMode || 'fictional';
    state.onboarded = !!obj.onboarded;
    state.pendingOffers = obj.pendingOffers || [];
    state.userTeamId = obj.userTeamId || 0;
    refreshAll();
    setStatus('Loaded');
  }

  function init() {
    const savedState = localStorage.getItem(SAVE_KEY);
    if (savedState && JSON.parse(savedState).onboarded) {
      loadGame();
    } else {
      openOnboard();
    }
    setupEventListeners();
    const hash = location.hash.replace('#/','') || 'hub';
    show(routes.indexOf(hash) >= 0 ? hash : 'hub');
  }

  // Make key functions globally available
  window.saveGame = saveGame;
  window.loadGame = loadGame;
  window.refreshAll = refreshAll;

  // This ensures 'init' is called only after the entire HTML page is loaded and ready.
  document.addEventListener('DOMContentLoaded', init);

})();
