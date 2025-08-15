// main.js
;(function () {
  'use strict';

  function refreshAll() {
    fillTeamSelect($('#userTeam'));
    if (state.league && state.userTeamId !== undefined) {
        $('#userTeam').value = state.userTeamId; // Correct variable
    }
    rebuildTeamLabels(state.namesMode);
    renderHub();
    renderRoster();
    renderStandings();
    renderDraft();
    updateCapSidebar();
  }

  function function saveGame() {
    const saveData = {
        version: '1.0.0',
        timestamp: Date.now(),
        data: state,
        checksum: generateChecksum(state)
    };
    const payload = JSON.stringify({
      league: state.league, freeAgents: state.freeAgents, playoffs: state.playoffs,
      namesMode: state.namesMode, onboarded: state.onboarded,
      pendingOffers: state.pendingOffers, userTeamId: state.userTeamId
    });
    localStorage.setItem(SAVE_KEY, payload);
    setStatus('Saved');
  }

  function loadGame() {   const raw = localStorage.getItem(SAVE_KEY);
    const saveData = JSON.parse(raw);
    if (saveData.version !== CURRENT_VERSION) {
        migrateData(saveData);
    }
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

  window.saveGame = saveGame;
  window.loadGame = loadGame;
  window.refreshAll = refreshAll;

  document.addEventListener('DOMContentLoaded', init);

})();
