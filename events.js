// events.js
'use strict';

function setupEventListeners() {
  // Use event delegation for all dynamic content
  document.body.addEventListener('click', function(e) {
    const target = e.target;

    // --- Onboarding Modal Buttons ---
    if (target.id === 'onboardStart') {
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
      if (confirm('Start a new league, clears progress')) {
        state.onboarded = false;
        openOnboard();
      }
    }
    if (target.id === 'btnSimWeek' || target.id === 'btnSimWeek2') {
      if (!state.onboarded) { openOnboard(); return; }
      simulateWeek();
    }

    // --- Roster Buttons ---
    if (target.id === 'btnRelease') {
      releaseSelected();
    }
    if (target.id === 'btnSetTraining') {
        setTrainingPlan();
    }

    // --- Trade Buttons ---
    if (target.id === 'tradeValidate') validateTrade();
    if (target.id === 'tradeExecute') executeTrade();
    
    // --- Free Agency Buttons ---
    if(target.id === 'btnSignFA') signFreeAgent();

  });

  // --- Dropdown change events ---
  $('#userTeam').addEventListener('change', () => {
      renderHub();
      renderRoster();
      updateCapSidebar();
  });
  $('#rosterTeam').addEventListener('change', renderRoster);
  $('#tradeA').addEventListener('change', renderTradeLists);
  $('#tradeB').addEventListener('change', renderTradeLists);
  $('#draftTeam').addEventListener('change', renderDraft);

  // --- Main Navigation ---
  window.addEventListener('hashchange', () => {
    const seg = location.hash.replace('#/', '') || 'hub';
    show(routes.indexOf(seg) >= 0 ? seg : 'hub');
  });
}
