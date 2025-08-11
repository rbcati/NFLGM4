// draft.js
'use strict';

function renderDraft() {
  const L = state.league;
  if (!L) return;

  const sel = $('#draftTeam');
  if (!sel) return;

  if (!sel.dataset.filled) {
    fillTeamSelect(sel);
    sel.dataset.filled = '1';
  }

  const teamId = parseInt(sel.value || (currentTeam() ? currentTeam().id : '0'), 10);
  sel.value = teamId;
  const t = L.teams[teamId];
  const now = L.year;

  const box = $('#draftPicks');
  if (!box) return;
  box.innerHTML = '';
  t.picks.slice().sort((a, b) => a.year === b.year ? a.round - b.round : a.year - b.year).forEach(pk => {
    const div = document.createElement('div');
    div.className = 'row';
    const v = pickValue(pk);
    div.innerHTML = `<div class="badge">Y${now + (pk.year - 1)} R${pk.round}</div><div class="spacer"></div><div class="muted">from ${pk.from}</div><div class="muted">value ${v.toFixed(1)}</div>`;
    box.appendChild(div);
  });
}

// **THE FIX:** Make the renderDraft function globally available from this file.
window.renderDraft = renderDraft;
