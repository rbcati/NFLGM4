// main.js
// main.js
;(function () {
  'use strict';

  // (Global error handler remains the same)
  // ...

  function refreshAll() {
    // **THE FIX:** The logic to set the dropdown is now simpler and correct.
    fillTeamSelect($('#userTeam'));
    if (state.league && state.userTeamId !== undefined) {
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
      league: state.league,
      freeAgents: state.freeAgents,
      playoffs: state.playoffs,
      namesMode: state.namesMode,
      onboarded: state.onboarded,
      pendingOffers: state.pendingOffers,
      userTeamId: state.userTeamId // Save the user's team
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
    state.userTeamId = obj.userTeamId || 0; // Load the user's team
    refreshAll();
    setStatus('Loaded');
  }

  // (init function remains the same)
  // ...
  
  // Make key functions globally available
  window.saveGame = saveGame;
  window.loadGame = loadGame;
  window.refreshAll = refreshAll;

  document.addEventListener('DOMContentLoaded', init);

})();
