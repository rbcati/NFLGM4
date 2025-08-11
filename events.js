// events.js
'use strict';

function releaseSelected() {
  const team = currentTeam();
  if (!team) return;
  const ids = $$('input[data-player-id]:checked').map(x => x.dataset.playerId);
  if (!ids.length) { setStatus('Select players to release.'); return; }

  const isPost = $('#postJune1').checked;
  ids.forEach(pid => {
    const p = team.roster.find(x => x.id === pid);
    if (p) releaseWithProration(state.league, team, p, isPost);
  });

  recalcCap(state.league, team);
  setStatus(isPost ? 'Released with post-June 1 split.' : 'Released with acceleration.');
  renderRoster();
}

function setupEventListeners() {
  // Main Navigation
  window.addEventListener('hashchange', () => {
    const seg = location.hash.replace('#/', '') || 'hub';
    show(routes.indexOf(seg) >= 0 ? seg : 'hub');
  });

  // Sidebar controls
  $('#btnSave').onclick = saveGame;
  $('#btnLoad').onclick = loadGame;
  $('#btnNewLeague').onclick = () => {
    if (confirm('Start a new league, clears progress')) {
      state.onboarded = false;
      openOnboard();
    }
  };
  $('#userTeam').addEventListener('change', () => {
      // When user team changes, refresh all relevant views
      renderHub();
      renderRoster();
      updateCapSidebar();
  });

  // Hub controls
  $('#btnSimWeek').onclick = () => {
    if (!state.onboarded) { openOnboard(); return; }
    simulateWeek();
  };
   $('#btnSimSeason').onclick = () => {
    if (!state.onboarded) { openOnboard(); return; }
    // Add logic to sim entire season here if desired
    setStatus('Sim Season functionality not yet implemented.');
  };

  // Roster controls
  $('#rosterTeam').addEventListener('change', renderRoster);
  // Using event delegation for dynamically created button
  document.body.addEventListener('click', e => {
    if (e.target.id === 'btnRelease') {
      releaseSelected();
    }
  });


  // Trade controls
  $('#tradeA').addEventListener('change', renderTradeLists);
  $('#tradeB').addEventListener('change', renderTradeLists);
  $('#tradeValidate').onclick = validateTrade;
  $('#tradeExecute').onclick = executeTrade;
  $('#btnSuggest').onclick = () => { /* ... Add trade suggestion logic ... */ };


  // Free Agency controls
  $('#faTeam').addEventListener('change', renderFreeAgency);
  $('#btnSignFA').onclick = signFreeAgent;

  // Onboarding Modal controls
  $('#onboardClose').onclick = closeOnboard;
  $('#onboardRandom').onclick = () => {
    const sel = $('#onboardTeam');
    sel.value = String(Math.floor(Math.random() * (listByMode(state.namesMode).length)));
  };
  $('#onboardStart').onclick = () => {
    const chosenMode = ($('input[name=namesMode]:checked') || {}).value || 'fictional';
    state.namesMode = chosenMode;
    const startYear = clampYear($('#onboardYear').value || YEAR_START);
    state.league = makeLeague(listByMode(chosenMode));
    state.league.year = startYear;
    state.onboarded = true;
    const teamIdx = parseInt($('#onboardTeam').value || '0', 10);
    const userSel = $('#userTeam');
    fillTeamSelect(userSel);
    userSel.value = String(teamIdx);
    rebuildTeamLabels(chosenMode);
    closeOnboard();
    location.hash = '#/hub';
    setStatus('Season started');
    refreshAll();
  };

  // Settings controls
  $('#btnApplyNamesMode').onclick = () => { /* ... */ };
  $('#btnApplyYear').onclick = () => { /* ... */ };

}
