// ui.js
'use strict';

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Team name mode helper
function listByMode(mode) {
  const T = window.Teams;
  const real = T.TEAM_META_REAL || [];
  const fict = T.TEAM_META_FICTIONAL || [];
  return mode === 'real' ? real : fict;
}

function clampYear(v) {
  let y = parseInt(v, 10);
  if (!Number.isFinite(y)) y = YEAR_START;
  return Math.max(1930, Math.min(9999, y));
}

// Core UI functions
function show(route) {
  routes.forEach(r => {
    const el = $('#' + r);
    if (el) el.hidden = (r !== route);
  });

  if (route === 'hub') renderHub();
  if (route === 'roster') renderRoster();
  if (route === 'standings') renderStandings();
  if (route === 'trade') renderTradeUI();
  // ... and so on for all your views
}

function setStatus(msg) {
  const el = $('#statusMsg');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 2000);
}

function fillTeamSelect(sel) {
  if (!state.league || !sel) return; // Guard clause
  const L = state.league;
  const C = window.Constants;
  sel.innerHTML = '';
  L.teams.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    const confTxt = (C.CONF_NAMES[t.conf] || '') + ' ' + (C.DIV_NAMES[t.div] || '');
    opt.textContent = `${t.abbr} — ${t.name} (${confTxt.trim()})`;
    sel.appendChild(opt);
  });
}

function currentTeam() {
  const L = state.league;
  if (!L) return null;
  const userTeamSelect = $('#userTeam');
  if (!userTeamSelect) return L.teams[0]; // Fallback
  const idx = parseInt(userTeamSelect.value || '0', 10);
  return L.teams[idx];
}

function rebuildTeamLabels(mode) {
    const L = state.league;
    const meta = listByMode(mode);
    if (!L || !L.teams || !meta || L.teams.length !== meta.length) return;
    for (let i = 0; i < L.teams.length; i++) {
      const src = meta[i], dst = L.teams[i];
      if(src && dst) {
        dst.abbr = src.abbr;
        dst.name = src.name;
        dst.conf = src.conf;
        dst.div  = src.div;
      }
    }
}

// --- View Rendering Functions (stubs, to be filled) ---
function renderHub() { /* ... content from previous turn ... */ }
function updateCapSidebar() { /* ... content from previous turn ... */ }
function renderRoster() { /* ... content from previous turn ... */ }
function renderStandings() { /* ... content from previous turn ... */ }
function renderTradeUI() { /* ... content from previous turn ... */ }
function renderTradeLists() { /* ... content from previous turn ... */ }
function renderOffers() { /* ... content from previous turn ... */ }
function openOnboard() {
    const modal = $('#onboardModal'); if (!modal) return;
    modal.hidden = false;
    const sel = $('#onboardTeam');
    if (!sel) return;
    sel.innerHTML = '';
    listByMode(state.namesMode).forEach((t, i) => {
        const opt = document.createElement('option');
        opt.value = String(i);
        opt.textContent = `${t.abbr} — ${t.name}`;
        sel.appendChild(opt);
    });
}
function closeOnboard() {
    const modal = $('#onboardModal');
    if (modal) modal.hidden = true;
}


// **THE FIX: Add this entire block to the very bottom of your ui.js file**
// This makes the functions available to other scripts.
window.show = show;
window.setStatus = setStatus;
window.fillTeamSelect = fillTeamSelect;
window.currentTeam = currentTeam;
window.rebuildTeamLabels = rebuildTeamLabels;
window.renderHub = renderHub;
window.updateCapSidebar = updateCapSidebar;
window.renderRoster = renderRoster;
window.renderTradeUI = renderTradeUI;
window.renderTradeLists = renderTradeLists;
window.renderStandings = renderStandings;
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
window.renderOffers = renderOffers;
// Add any other render functions that need to be globally accessible here
