// ui.js
'use strict';

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Team name mode helper
function listByMode(mode) {
  const T = window.Teams;
  return mode === 'real' ? T.TEAM_META_REAL || [] : T.TEAM_META_FICTIONAL || [];
}

function clampYear(v) {
  let y = parseInt(v, 10);
  if (!Number.isFinite(y)) y = YEAR_START;
  return Math.max(1930, Math.min(9999, y));
}

// --- Core UI functions ---
function show(route) {
  // ... (existing show function)
  if (route === 'trade') renderTradeUI();
  // ...
}

// ... (other existing ui.js functions: setStatus, fillTeamSelect, etc.)

// --- View Rendering Functions ---

// ... (renderHub, renderRoster, etc.)

// **FIX starts here: Added the missing trade UI functions**

function renderTradeUI() {
    const L = state.league;
    if (!L) return;
    const selA = $('#tradeA'), selB = $('#tradeB');

    if (!selA.dataset.filled) {
        fillTeamSelect(selA);
        selA.dataset.filled = '1';
        selA.value = (currentTeam() ? currentTeam().id : '0');
    }
    if (!selB.dataset.filled) {
        fillTeamSelect(selB);
        selB.dataset.filled = '1';
        selB.value = String((parseInt(selA.value, 10) + 1) % L.teams.length);
    }
    renderTradeLists();
}

function renderTradeLists() {
    const L = state.league;
    if (!L) return;
    const a = parseInt($('#tradeA').value, 10);
    const b = parseInt($('#tradeB').value, 10);
    listPlayers('#tradeListA', L.teams[a], 'A');
    listPlayers('#tradeListB', L.teams[b], 'B');
    listPicks('#pickListA', L.teams[a], 'A');
    listPicks('#pickListB', L.teams[b], 'B');
    $('#tradeExecute').disabled = true;
    $('#tradeInfo').textContent = 'Select players or picks on both sides, then validate.';
}

function listPlayers(rootSel, team, side) {
    const root = $(rootSel);
    root.innerHTML = '';
    team.roster.forEach(p => {
        const row = document.createElement('label');
        row.className = 'row';
        const cap = capHitFor(p, 0);
        row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="player" data-id="${p.id}" />
                         <div>${p.name} • ${p.pos}</div>
                         <div class="spacer"></div>
                         <div class="muted">OVR ${p.ovr} • Cap ${cap.toFixed(1)}M (${p.years}y)</div>`;
        root.appendChild(row);
    });
}

function listPicks(rootSel, team, side) {
    const root = $(rootSel);
    root.innerHTML = '';
    const now = state.league.year;
    team.picks.slice().sort((a, b) => a.year === b.year ? a.round - b.round : a.year - b.year).forEach(pk => {
        const row = document.createElement('label');
        row.className = 'row';
        row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="pick" data-id="${pk.id}" />
                         <div>Y${now + (pk.year - 1)} R${pk.round}</div>
                         <div class="spacer"></div>
                         <div class="muted">from ${pk.from}</div>`;
        root.appendChild(row);
    });
}
