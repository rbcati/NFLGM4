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
  // Hide all views first
  document.querySelectorAll('.view').forEach(v => {
    v.hidden = true;
  });

  // Show the correct view
  const viewToShow = document.getElementById(route);
  if (viewToShow) {
    viewToShow.hidden = false;
  }

  // Update nav pill active state
  document.querySelectorAll('.nav-pill').forEach(a => {
    a.setAttribute('aria-current', a.dataset.view === route ? 'page' : null);
  });

  // Call the specific render function for the view
  if (route === 'hub') renderHub();
  if (route === 'roster') renderRoster();
  if (route === 'standings') renderStandings();
  if (route === 'trade') renderTradeUI();
  if (route === 'freeagency') renderFreeAgency();
  if (route === 'draft') renderDraft();
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
  if (!state.league || !sel) return;
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
    if (!state.league) return null;
    const teamId = state.userTeamId !== undefined ? state.userTeamId : 0;
    return state.league.teams[teamId];
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

// --- View Rendering Functions ---

function renderHub() {
  const L = state.league;
  if (!L) return;
  $('#hubSeason').textContent = L.year;
  $('#seasonNow').textContent = L.year;
  $('#hubWeek').textContent = L.week;
  $('#hubWeeks').textContent = (L.schedule.weeks || L.schedule).length;
  const games = ((L.schedule.weeks || L.schedule)[L.week - 1] || {}).games || [];
  $('#hubGames').textContent = games.length;

  const power = L.teams.map((t, i) => ({ i, score: t.rating + (t.record.pf - t.record.pa) / 20 }))
    .sort((a, b) => b.score - a.score).slice(0, 10);
  const ol = $('#hubPower');
  ol.innerHTML = '';
  power.forEach(row => {
    const li = document.createElement('li');
    li.textContent = L.teams[row.i].name;
    ol.appendChild(li);
  });

  const res = L.resultsByWeek[L.week - 2] || [];
  const box = $('#hubResults');
  box.innerHTML = '';
  res.forEach(g => {
    if (g.bye) return;
    const t1 = L.teams[g.home].abbr, t2 = L.teams[g.away].abbr;
    const div = document.createElement('div');
    div.className = 'row';
    div.innerHTML = `<div>${t2} ${g.scoreAway} at ${t1} ${g.scoreHome}</div><div class="spacer"></div><div class="muted">${g.homeWin ? L.teams[g.home].name : L.teams[g.away].name} wins</div>`;
    box.appendChild(div);
  });
  updateCapSidebar();
  // renderOffers();
}

function updateCapSidebar() {
  const t = currentTeam();
  if (!t) return;
  recalcCap(state.league, t);
  $('#capUsed').textContent = `${t.capUsed.toFixed(1)} M`;
  $('#capTotal').textContent = `${t.capTotal.toFixed(1)} M`;
  $('#deadCap').textContent = `${(t.deadCap || 0).toFixed(1)} M`;
  $('#capRoom').textContent = `${(t.capTotal - t.capUsed).toFixed(1)} M`;
}

function renderRoster() {
  const L = state.league;
  if (!L) return;
  const sel = $('#rosterTeam');
  if(!sel.dataset.filled) {
      fillTeamSelect(sel);
      sel.dataset.filled = '1';
  }
  const teamId = parseInt(sel.value || (currentTeam() ? currentTeam().id : '0'), 10);
  sel.value = teamId;
  const tm = L.teams[teamId];

  $('#rosterTitle').textContent = `Roster — ${tm.name} (${tm.abbr})`;
  const tbl = $('#rosterTable');
  tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Cap Hit</th><th>Years</th></tr></thead>';
  const tb = document.createElement('tbody');
  tm.roster.forEach(p => {
    const cap = capHitFor(p, 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="checkbox" data-player-id="${p.id}"></td><td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${cap.toFixed(1)}M</td><td>${p.years}</td>`;
    tb.appendChild(tr);
  });
  tbl.appendChild(tb);
  updateCapSidebar();
}

function renderStandings() {
    const L = state.league;
    if (!L) return;
    const C = window.Constants;
    const wrap = $('#standingsWrap');
    wrap.innerHTML = '';
    for (let conf = 0; conf < 2; conf++) {
        for (let div = 0; div < 4; div++) {
            const card = document.createElement('div');
            card.className = 'card';
            const title = `${C.CONF_NAMES[conf]} ${C.DIV_NAMES[div]}`;
            const teamsInDiv = L.teams.filter(t => t.conf === conf && t.div === div);
            teamsInDiv.sort((a, b) => b.record.w - a.record.w);
            let tableHtml = `<table class="table"><thead><tr><th>${title}</th><th>W</th><th>L</th><th>T</th></tr></thead><tbody>`;
            teamsInDiv.forEach(t => {
                tableHtml += `<tr><td>${t.name}</td><td>${t.record.w}</td><td>${t.record.l}</td><td>${t.record.t}</td></tr>`;
            });
            tableHtml += '</tbody></table>';
            card.innerHTML = tableHtml;
            wrap.appendChild(card);
        }
    }
}

function renderTradeUI() {
    const L = state.league;
    if (!L) return;
    const selA = $('#tradeA'), selB = $('#tradeB');
    const userTeam = currentTeam();

    fillTeamSelect(selA);
    selA.value = userTeam.id;
    selA.disabled = true;

    selB.innerHTML = '';
    L.teams.forEach(t => {
        if (t.id !== userTeam.id) {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = t.name;
            selB.appendChild(opt);
        }
    });
    
    renderTradeLists();
}

function renderTradeLists() {
    /* Implementation needed */
}

function renderOffers() {
    /* Implementation needed */
}

function renderSchedule() {
    const L = state.league;
    if (!L) return;
    const week = L.week;
    const scheduleData = (L.schedule.weeks || L.schedule)[week - 1] || {};
    const games = scheduleData.games || [];
    const box = $('#scheduleList');
    if (!box) return;
    box.innerHTML = '';

    games.forEach((g, idx) => {
        const home = L.teams[g.home];
        const away = L.teams[g.away];
        const div = document.createElement('div');
        div.className = 'row';
        div.innerHTML = `<div>Game ${idx + 1}: ${away.name} at ${home.name}</div>`;
        box.appendChild(div);
    });
}

function renderCap() { /* Stub */ }
function renderPlayoffs() { /* Stub */ }

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

// --- Make functions globally available ---
window.show = show;
window.setStatus = setStatus;
window.fillTeamSelect = fillTeamSelect;
window.currentTeam = currentTeam;
window.rebuildTeamLabels = rebuildTeamLabels;
window.renderHub = renderHub;
window.updateCapSidebar = updateCapSidebar;
window.renderRoster = renderRoster;
window.renderStandings = renderStandings;
window.renderTradeUI = renderTradeUI;
window.renderTradeLists = renderTradeLists;
window.renderOffers = renderOffers;
window.renderSchedule = renderSchedule;
window.renderCap = renderCap;
window.renderPlayoffs = renderPlayoffs;
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
