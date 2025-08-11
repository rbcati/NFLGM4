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
  if (route === 'cap') renderCap();
  if (route === 'schedule') renderSchedule();
  if (route === 'standings') renderStandings();
  if (route === 'trade') renderTradeUI();
  if (route === 'freeagency') renderFreeAgency();
  if (route === 'draft') renderDraft();
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
  const L = state.league;
  if (!L) return;
  $('#hubSeason').textContent = L.year;
  $('#seasonNow').textContent = L.year;
  $('#hubWeek').textContent = L.week;
  $('#hubWeeks').textContent = (L.schedule.weeks || L.schedule).length;
  const games = ((L.schedule.weeks || L.schedule)[L.week - 1] || {}).games || [];
  $('#hubGames').textContent = games.length;

  const power = L.teams.map((t, i) => ({ i, score: t.rating + (t.record.pf - t.record.pa) / 20 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
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
  renderOffers();
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
  const teamId = parseInt(sel.value || $('#userTeam').value || '0', 10);
  const tm = L.teams[teamId];

  $('#rosterTitle').textContent = `Roster — ${tm.name} (${tm.abbr})`;
  const tbl = $('#rosterTable');
  tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base (M)</th><th>Bonus (tot)</th><th>Years</th><th>Cap Hit</th><th>Abilities</th><th>Status</th></tr></thead>';
  const tb = document.createElement('tbody');
  tm.roster.forEach(p => {
    const inj = p.injuryWeeks > 0 ? `Out ${p.injuryWeeks}w` : (p.fatigue > 0 ? `Fatigue ${p.fatigue}` : 'OK');
    const cap = capHitFor(p, 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><input type="checkbox" data-player-id="${p.id}"></td><td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${p.baseAnnual.toFixed(1)}</td><td>${p.signingBonus.toFixed(1)}</td><td>${p.years}</td><td>${cap.toFixed(1)}</td><td>${(p.abilities || []).join(', ')}</td><td>${inj}</td>`;
    tb.appendChild(tr);
  });
  tbl.appendChild(tb);

  const dc = autoDepthChart(tm);
  const box = $('#depthChart');
  box.innerHTML = '';
  Object.keys(dc).forEach(pos => {
    const list = dc[pos];
    const div = document.createElement('div');
    div.className = 'row';
    const names = list.map(p => `${p.name} (${p.ovr})`).join(', ');
    div.innerHTML = `<div><strong>${pos}</strong></div><div class="spacer"></div><div class="muted">${names}</div>`;
    box.appendChild(div);
  });

  updateCapSidebar();
  renderTrainingUI(tm);
}


function autoDepthChart(team) {
  const C = window.Constants;
  const byPos = {};
  C.POSITIONS.forEach(pos => { byPos[pos] = []; });
  team.roster.forEach(p => { byPos[p.pos].push(p); });
  C.POSITIONS.forEach(pos => { byPos[pos].sort((a, b) => b.ovr - a.ovr); });
  const depth = {};
  Object.keys(C.DEPTH_NEEDS).forEach(pos => {
    depth[pos] = byPos[pos].slice(0, C.DEPTH_NEEDS[pos]);
  });
  return depth;
}

function renderCap() {
    // ... (This function can be built from the logic in the original script.js)
}

function renderSchedule() {
    // ... (This function can be built from the logic in the original script.js)
}

function renderStandings() {
    // ... (This function can be built from the logic in the original script.js)
}

function renderPlayoffPicture() {
    // ... (This function can be built from the logic in the original script.js)
}

function renderTradeUI() {
    // ... (This function can be built from the logic in the original script.js)
}

function renderOffers() {
    // ... (This function can be built from the logic in the original script.js)
}

function renderPlayoffs() {
    // ... (This function can be built from the logic in the original script.js)
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
