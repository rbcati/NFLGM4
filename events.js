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
// events.js
'use strict';

function setupEventListeners() {
  // --- CLICK Event Delegation ---
  document.body.addEventListener('click', function(e) {
    const target = e.target;

    // --- Onboarding Modal Buttons ---
    if (target.id === 'onboardStart') {
      // **THE UPGRADE:** Read the chosen game mode and role
      const gameMode = ($('input[name=gameMode]:checked') || {}).value || 'gm';
      const playerRole = (gameMode === 'career') ? $('#careerRole').value : 'GM';

      const chosenMode = ($('input[name=namesMode]:checked') || {}).value || 'fictional';
      const teamIdx = parseInt($('#onboardTeam').value || '0', 10);
      
      state.userTeamId = teamIdx;
      state.namesMode = chosenMode;
      state.gameMode = gameMode;
      state.playerRole = playerRole;

      state.league = makeLeague(listByMode(chosenMode));
      state.onboarded = true;
      
      fillTeamSelect($('#userTeam'));
      $('#userTeam').value = String(teamIdx);
      
      rebuildTeamLabels(chosenMode);
      closeOnboard();
      location.hash = '#/hub';
      setStatus(`Started as ${playerRole}!`);
      refreshAll();
    }
    // ... (rest of the click handlers remain the same)
  });

  // --- CHANGE Event Delegation ---
  document.body.addEventListener('change', function(e) {
    const target = e.target;

    // **THE UPGRADE:** Show/hide the coordinator dropdown
    if (target.name === 'gameMode') {
        const careerOptions = $('#careerOptions');
        if (target.value === 'career') {
            careerOptions.hidden = false;
        } else {
            careerOptions.hidden = true;
        }
    }
    // ... (rest of the change handlers remain the same)
  });

  // --- Main URL Router ---
  window.addEventListener('hashchange', () => {
    const seg = location.hash.replace('#/', '') || 'hub';
    show(routes.indexOf(seg) >= 0 ? seg : 'hub');
  });
}
