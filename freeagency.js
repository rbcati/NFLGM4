// freeAgency.js
'use strict';

function ensureFA() {   const positions = getPositionalNeeds(); // Smarter FA pool
}
  if (state.freeAgents.length) return;
  const C = window.Constants;
  const U = window.Utils;

  for (let i = 0; i < 120; i++) {
    const pos = U.choice(C.POSITIONS);
    const p = makePlayer(pos);
    p.years = 0;
    p.yearsTotal = 2;
    p.baseAnnual = Math.round(p.baseAnnual * 0.9 * 10) / 10;
    p.signingBonus = Math.round((p.baseAnnual * p.yearsTotal * 0.4) * 10) / 10;
    p.guaranteedPct = 0.5;
    tagAbilities(p);
    state.freeAgents.push(p);
  }
  state.freeAgents.sort((a, b) => b.ovr - a.ovr);
}

function renderFreeAgency() {
  ensureFA();
  const L = state.league;
  const tbl = $('#faTable');
  if (!tbl) return; // Guard clause
  tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base</th><th>Bonus</th><th>Years</th><th>Abilities</th></tr></thead>';
  const tb = document.createElement('tbody');
  state.freeAgents.forEach((p, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="radio" name="fa" value="${i}"></td><td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${p.baseAnnual.toFixed(1)}</td><td>${p.signingBonus.toFixed(1)}</td><td>${p.yearsTotal}</td><td>${(p.abilities || []).join(', ')}</td>`;
    tb.appendChild(tr);
  });
  tbl.appendChild(tb);

  const sel = $('#faTeam');
  if (sel && !sel.dataset.filled) {
    fillTeamSelect(sel);
    sel.dataset.filled = '1';
  }
  if ($('#btnSignFA')) {
    $('#btnSignFA').disabled = true;
  }
  tbl.addEventListener('change', function(e) {
    if (e.target && e.target.name === 'fa' && $('#btnSignFA')) $('#btnSignFA').disabled = false;
  }, { once: true });
}

function signFreeAgent() {
  class ContractNegotiator {
    static negotiate(player, team) {
        const marketValue = calculateMarketValue(player);
        const teamCap = team.capTotal - team.capUsed;
        // ... negotiation logic
    const idx = Number(($('input[name=fa]:checked') || {}).value);
    if (Number.isNaN(idx)) return;

    const L = state.league;
    const teamId = parseInt($('#faTeam').value || $('#userTeam').value, 10);
    const tm = L.teams[teamId];
    const p = state.freeAgents[idx];
    p.years = p.yearsTotal;

    const capAfter = tm.capUsed + capHitFor(p, 0);
    if (capAfter > tm.capTotal) {
      setStatus('Cap exceeded. Release or trade first.');
      return;
    }

    tm.roster.push(p);
    tm.roster.sort((a, b) => b.ovr - a.ovr);
    state.freeAgents.splice(idx, 1);
    recalcCap(L, tm);
    renderFreeAgency();
    setStatus('Signed free agent');
}

// Make the public functions available to other scripts
window.renderFreeAgency = renderFreeAgency;
window.signFreeAgent = signFreeAgent;
