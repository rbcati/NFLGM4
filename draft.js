// draft.js
'use strict';

function renderDraft() {
  const sel = $('#draftTeam');
  if (!sel.dataset.filled) {
    fillTeamSelect(sel);
    sel.dataset.filled = '1';
    sel.addEventListener('change', renderDraft); // Re-render when team changes
  }

  const teamId = parseInt(sel.value || $('#userTeam').value || '0', 10);
  sel.value = teamId; // Ensure dropdown is synced
  const t = state.league.teams[teamId];
  const now = state.league.year;

  const box = $('#draftPicks');
  box.innerHTML = '';
  t.picks.slice().sort((a, b) => a.year === b.year ? a.round - b.round : a.year - b.year).forEach(pk => {
    const div = document.createElement('div');
    div.className = 'row';
    const v = pickValue(pk);
    div.innerHTML = `<div class="badge">Y${now + (pk.year - 1)} R${pk.round}</div><div class="spacer"></div><div class="muted">from ${pk.from}</div><div class="muted">value ${v.toFixed(1)}</div>`;
    box.appendChild(div);
  });
}
