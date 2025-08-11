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

// --- Core UI functions ---
function show(route) {
  routes.forEach(r => {
    const el = $('#' + r);
    if (el) el.hidden = (r !== route);
  });

  if (route === 'hub') renderHub();
  if (route === 'roster') renderRoster();
  if (route === 'cap') renderCap();
  if (route === 'schedule') renderSchedule();
  if (route === 'standings') renderStandings();
  if (route === 'trade') renderTradeUI();
  if (route === 'freeagency') renderFreeAgency();

  if (route === 'playoffs') renderPlayoffs();
  if (route === 'settings') {
    const y = (state.league && state.league.year) ? state.league.year : YEAR_START;
    const el = $('#settingsYear');
    if (el) el.value = y;
  }
}

function setStatus(msg) {
  const el = $('#statusMsg');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { el.textContent = ''; }, 2000);
}

function fillTeamSelect(sel) {
  if (!state.league) return;
  const L = state.league;
  const C = window.Constants;
  sel.innerHTML = '';
  L.teams.forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    const confTxt = C.CONF_NAMES[t.conf] + ' ' + C.DIV_NAMES[t.div];
    opt.textContent = `${t.abbr} — ${t.name} (${confTxt})`;
    sel.appendChild(opt);
  });
}

function currentTeam() {
  const L = state.league;
  if (!L) return null;
  const idx = parseInt($('#userTeam').value || '0', 10);
  return L.teams[idx];
}

function rebuildTeamLabels(mode) {
    const L = state.league;
    const meta = listByMode(mode);
    if (!L || !L.teams || !meta || L.teams.length !== meta.length) return;
    for (let i = 0; i < L.teams.length; i++) {
      const src = meta[i], dst = L.teams[i];
      dst.abbr = src.abbr;
      dst.name = src.name;
      dst.conf = src.conf;
      dst.div  = src.div;
    }
}

// --- View Rendering Functions ---

function renderHub() {
    // ... function content
}

function updateCapSidebar() {
    // ... function content
}

function renderRoster() {
    // ... function content
}


function autoDepthChart(team) {
    // ... function content
}

function renderCap() {
    // ... function content
}

function renderSchedule() {
    // ... function content
}

function renderStandings() {
    // ... function content
}

function renderPlayoffPicture() {
    // ... function content
}

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
    // ... function content
}

function listPlayers(rootSel, team, side) {
    // ... function content
}

function listPicks(rootSel, team, side) {
    // ... function content
}

function renderOffers() {
    // ... function content
}

function renderPlayoffs() {
    // ... function content
}

function openOnboard() {
  const modal = $('#onboardModal'); if (!modal) return;
  modal.hidden = false;
  const sel = $('#onboardTeam');
  sel.innerHTML = '';
  listByMode(state.namesMode).forEach((t, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = `${t.abbr} — ${t.name}`;
    sel.appendChild(opt);
  });
  const y = $('#onboardYear'); if (y) y.value = YEAR_START;
}

function closeOnboard() {
  const m = $('#onboardModal');
  if (m) m.hidden = true;
}


// **THE FIX: Make functions globally available**
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
window.renderDraft = renderDraft;
window.renderStandings = renderStandings;
window.renderFreeAgency = renderFreeAgency;
window.renderSchedule = renderSchedule;
window.renderCap = renderCap;
window.renderPlayoffs = renderPlayoffs;
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
