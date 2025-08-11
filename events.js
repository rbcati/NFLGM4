// events.js
'use strict';

function setupEventListeners() {
  // Single, powerful event listener for the entire document
  document.addEventListener('click', function(e) {
    const target = e.target;

    // --- Navigation Pills ---
    const navPill = target.closest('.nav-pill');
    if (navPill) {
      e.preventDefault(); // Stop the link from trying to navigate normally
      const viewId = navPill.dataset.view;
      if (viewId) {
        // Update the URL hash to trigger the router
        location.hash = `#/${viewId}`;
      }
      return; // Stop further processing
    }

    // --- Onboarding Modal Buttons ---
    if (target.id === 'onboardStart') {
      const chosenMode = ($('input[name=namesMode]:checked') || {}).value || 'fictional';
      state.namesMode = chosenMode;
      state.league = makeLeague(listByMode(chosenMode));
      state.onboarded = true;
      const teamIdx = parseInt($('#onboardTeam').value || '0', 10);
      fillTeamSelect($('#userTeam'));
      $('#userTeam').value = String(teamIdx);
      rebuildTeamLabels(chosenMode);
      closeOnboard();
      location.hash = '#/hub';
      setStatus('Season started');
      refreshAll();
    }
    if (target.id === 'onboardClose') closeOnboard();
    if (target.id === 'onboardRandom') {
      const sel = $('#onboardTeam');
      sel.value = String(Math.floor(Math.random() * (listByMode(state.namesMode).length)));
    }

    // --- Sidebar and Sim Buttons ---
    if (target.id === 'btnSave') saveGame();
    if (target.id === 'btnLoad') loadGame();
    if (target.id === 'btnNewLeague') {
      if (confirm('Start a new league, clearing progress?')) {
        state.onboarded = false;
        openOnboard();
      }
    }
    if (target.id === 'btnSimWeek' || target.id === 'btnSimWeek2') {
      if (!state.onboarded) { openOnboard(); return; }
      simulateWeek();
    }

    // --- Roster Buttons ---
    if (target.id === 'btnRelease') releaseSelected();
    if (target.id === 'btnSetTraining') setTrainingPlan();
    
    // --- Free Agency & Trade Buttons ---
    if (target.id === 'btnSignFA') signFreeAgent();
    if (target.id === 'tradeValidate') validateTrade();
    if (target.id === 'tradeExecute') executeTrade();

    // --- Settings Buttons ---
    if (target.id === 'btnApplyNamesMode') {
        const mode = document.querySelector('input[name="settingsNamesMode"]:checked')?.value || 'fictional';
        state.namesMode = mode;
        rebuildTeamLabels(mode);
        refreshAll();
        setStatus('Team names updated to ' + mode);
    }
  });

  // --- Dropdown 'change' events ---
  // These are separate because they are not click events
  $('#userTeam').addEventListener('change', () => {
      renderHub();
      renderRoster();
      updateCapSidebar();
  });
  $('#rosterTeam').addEventListener('change', renderRoster);
  $('#tradeA').addEventListener('change', renderTradeLists);
  $('#tradeB').addEventListener('change', renderTradeLists);
  $('#draftTeam').addEventListener('change', renderDraft);

  // --- Main URL Router ---
  // This listens for the hash change triggered by our nav pills
  window.addEventListener('hashchange', () => {
    const seg = location.hash.replace('#/', '') || 'hub';
    show(routes.indexOf(seg) >= 0 ? seg : 'hub');
  });
}
