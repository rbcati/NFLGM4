// events.js
'use strict';

function setupEventListeners() {
  // --- CLICK Event Delegation ---
  document.body.addEventListener('click', function(e) {
    const target = e.target;

    // --- Navigation Pills ---
    const navPill = target.closest('.nav-pill');
    if (navPill) {
      e.preventDefault();
      const viewId = navPill.dataset.view;
      if (viewId) {
        location.hash = `#/${viewId}`;
      }
      return;
    }

    // --- Onboarding Modal Buttons ---
    if (target.id === 'onboardStart') {
      const chosenMode = ($('input[name=namesMode]:checked') || {}).value || 'fictional';
      const teamIdx = parseInt($('#onboardTeam').value || '0', 10);
      
      state.userTeamId = teamIdx; // Correctly store the chosen team ID
      state.namesMode = chosenMode;
      state.league = makeLeague(listByMode(chosenMode));
      state.onboarded = true;
      
      fillTeamSelect($('#userTeam'));
      $('#userTeam').value = String(teamIdx);
      
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
  });

  // --- CHANGE Event Delegation ---
  document.body.addEventListener('change', function(e) {
    const target = e.target;
    if (target.id === 'userTeam') {
        state.userTeamId = parseInt(target.value, 10);
        refreshAll();
    }
  });

  // --- Main URL Router ---
  window.addEventListener('hashchange', () => {
    const seg = location.hash.replace('#/', '') || 'hub';
    show(routes.indexOf(seg) >= 0 ? seg : 'hub');
  });
}
