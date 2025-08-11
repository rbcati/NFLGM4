/// events.js
'use strict';

function setupEventListeners() {
  // --- CLICK Event Delegation ---
  // This single, powerful listener handles all clicks on the page
  document.body.addEventListener('click', function(e) {
    const target = e.target;

    // --- Navigation Pills ---
    const navPill = target.closest('.nav-pill');
    if (navPill) {
      e.preventDefault(); // Stop the link from trying to navigate normally
      const viewId = navPill.dataset.view;
      if (viewId) {
        // Update the URL hash, which our router will listen for
        location.hash = `#/${viewId}`;
      }
      return; // Stop further processing for this click
    }

    // --- Onboarding Modal Buttons ---
    if (target.id === 'onboardStart') {
      const chosenMode = ($('input[name=namesMode]:checked') || {}).value || 'fictional';
      const teamIdx = parseInt($('#onboardTeam').value || '0', 10);
      
      // **THE FIX:** Remember the chosen team ID in our global state
      state.userTeamId = teamIdx;

      state.namesMode = chosenMode;
      state.league = makeLeague(listByMode(chosenMode));
      state.onboarded = true;
      
      fillTeamSelect($('#userTeam'));
      $('#userTeam').value = String(teamIdx); // Set the dropdown to the chosen team
      
      rebuildTeamLabels(chosenMode);
      closeOnboard();
      location.hash = '#/hub';
      setStatus('Season started');
      refreshAll();
    }
    if (target.id === 'onboardClose') {
      closeOnboard();
    }
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
    
    // --- Roster, Trade, and Free Agency Buttons ---
    if (target.id === 'btnRelease') releaseSelected();
    if (target.id === 'btnSetTraining') setTrainingPlan();
    if (target.id === 'btnSignFA') signFreeAgent();
    if (target.id === 'tradeValidate') validateTrade();
    if (target.id === 'tradeExecute') executeTrade();

    // --- Settings Button ---
    if (target.id === 'btnApplyNamesMode') {
        const mode = document.querySelector('input[name="settingsNamesMode"]:checked')?.value || 'fictional';
        state.namesMode = mode;
        rebuildTeamLabels(mode);
        refreshAll();
        setStatus('Team names updated to ' + mode);
    }
  });

  // --- CHANGE Event Delegation ---
  // This single listener handles all dropdown changes
  document.body.addEventListener('change', function(e) {
    const target = e.target;

    if (target.id === 'userTeam') {
        state.userTeamId = parseInt(target.value, 10); // Remember the new selection
        renderHub();
        renderRoster();
        updateCapSidebar();
    }
    if (target.id === 'rosterTeam') {
        renderRoster();
    }
    if (target.id === 'tradeA' || target.id === 'tradeB') {
        renderTradeLists();
    }
    if (target.id === 'draftTeam') {
        renderDraft();
    }
  });

  // --- Main URL Router ---
  // This listens for the hash change triggered by our nav pills
  window.addEventListener('hashchange', () => {
    const seg = location.hash.replace('#/', '') || 'hub';
    show(routes.indexOf(seg) >= 0 ? seg : 'hub');
  });
}
