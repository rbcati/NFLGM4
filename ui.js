// ui.js
'use strict';

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Team name mode helper
function listByMode(mode) {
  if (!window.Teams) {
    console.error("Teams data has not loaded yet!");
    return [];
  }
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
  document.querySelectorAll('.view').forEach(v => {
    v.hidden = true;
  });

  const viewToShow = document.getElementById(route);
  if (viewToShow) {
    viewToShow.hidden = false;
  }

  document.querySelectorAll('.nav-pill').forEach(a => {
    a.setAttribute('aria-current', a.dataset.view === route ? 'page' : null);
  });

  if (route === 'hub') renderHub();
  if (route === 'roster') renderRoster();
  if (route === 'standings') renderStandings();
  if (route === 'trade') renderTradeUI();
  if (route === 'freeagency') renderFreeAgency();
  if (route === 'draft') renderDraft();
  if (route === 'scouting') renderScouting();
  if (route === 'hallOfFame') renderHallOfFame();
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
  const gamesThisWeek = ((L.schedule.weeks || L.schedule)[L.week - 1] || {}).games || [];
  $('#hubGames').textContent = gamesThisWeek.length;

  const res = L.resultsByWeek[L.week - 2] || [];
  const box = $('#hubResults');
  box.innerHTML = '';
  const userTeamId = currentTeam().id;

  let userGame = null;
  let otherGames = [];
  res.forEach(g => {
      if (g.home === userTeamId || g.away === userTeamId) {
          userGame = g;
      } else {
          otherGames.push(g);
      }
  });

  const resultsGrid = document.createElement('div');
  resultsGrid.className = 'results-grid';
  const sortedGames = userGame ? [userGame, ...otherGames] : otherGames;

  sortedGames.forEach(g => {
      if (g.bye) return;
      const home = L.teams[g.home];
      const away = L.teams[g.away];
      const winner = g.homeWin ? home : away;
      const loser = g.homeWin ? away : home;
      const winnerScore = g.homeWin ? g.scoreHome : g.scoreAway;
      const loserScore = g.homeWin ? g.scoreAway : g.scoreHome;

      const resultCard = document.createElement('div');
      resultCard.className = 'result-card clickable';
      resultCard.dataset.gameId = g.id;
      resultCard.innerHTML = `
          <div class="game-winner"><strong>${winner.name}</strong> defeated ${loser.name}</div>
          <div class="game-score">${winnerScore} - ${loserScore}</div>
      `;
      resultsGrid.appendChild(resultCard);
  });
  box.appendChild(resultsGrid);
  updateCapSidebar();
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
      sel.value = state.userTeamId;
      sel.dataset.filled = '1';
  }
  const teamId = parseInt(sel.value, 10);
  const tm = L.teams[teamId];

  $('#rosterTitle').textContent = `Roster — ${tm.name} (${tm.abbr})`;
  const tbl = $('#rosterTable');
  tbl.innerHTML = '<thead><tr><th>Name</th><th>POS</th><th>OVR</th><th>Age</th><th>Cap Hit</th><th>Years</th></tr></thead>';
  const tb = document.createElement('tbody');
  tm.roster.sort((a,b) => b.ovr - a.ovr).forEach(p => {
    const cap = capHitFor(p, 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${p.age}</td><td>${cap.toFixed(1)}M</td><td>${p.years}</td>`;
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
        const confContainer = document.createElement('div');
        confContainer.className = 'conference-container';
        const confName = C.CONF_NAMES[conf];
        confContainer.innerHTML = `<h2>${confName}</h2>`;

        for (let div = 0; div < 4; div++) {
            const divName = C.DIV_NAMES[div];
            const teamsInDiv = L.teams.filter(t => t.conf === conf && t.div === div);
            
            teamsInDiv.sort((a, b) => {
                if (a.record.w !== b.record.w) return b.record.w - a.record.w;
                return (b.record.pf - b.record.pa) - (a.record.pf - a.record.pa);
            });

            let tableHtml = `<div class="card"><h4>${divName}</h4><table class="table">
                <thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PF</th><th>PA</th></tr></thead>
                <tbody>`;
            teamsInDiv.forEach(t => {
                tableHtml += `<tr>
                    <td>${t.name}</td>
                    <td>${t.record.w}</td><td>${t.record.l}</td><td>${t.record.t}</td>
                    <td>${t.record.pf}</td><td>${t.record.pa}</td>
                </tr>`;
            });
            tableHtml += '</tbody></table></div>';
            confContainer.innerHTML += tableHtml;
        }
        wrap.appendChild(confContainer);
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
    const L = state.league;
    if (!L) return;
    const teamA_id = parseInt($('#tradeA').value, 10);
    const teamB_id = parseInt($('#tradeB').value, 10);
    const teamA = L.teams[teamA_id];
    const teamB = L.teams[teamB_id];

    listPlayers('#tradeListA', teamA, 'A');
    listPicks('#pickListA', teamA, 'A');
    listPlayers('#tradeListB', teamB, 'B');
    listPicks('#pickListB', teamB, 'B');

    $('#tradeExecute').disabled = true;
    $('#tradeInfo').textContent = 'Select assets, validate, and execute.';
}

function listPlayers(rootSel, team, side) {
    const root = $(rootSel);
    if (!root) return;
    root.innerHTML = '';
    team.roster.forEach(p => {
        const row = document.createElement('label');
        row.className = 'row trade-asset';
        row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="player" data-id="${p.id}" /> <span>${p.name} (${p.pos}, ${p.ovr})</span>`;
        root.appendChild(row);
    });
}

function listPicks(rootSel, team, side) {
    const root = $(rootSel);
    if (!root) return;
    root.innerHTML = '';
    team.picks.sort((a,b) => a.year - b.year || a.round - b.round).forEach(pk => {
        const row = document.createElement('label');
        row.className = 'row trade-asset';
        row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="pick" data-id="${pk.id}" /> <span>${pk.year} Round ${pk.round} (from ${pk.from})</span>`;
        root.appendChild(row);
    });
}

function renderSchedule() { /* Stub for now */ }
function renderOffers() { /* Stub for now */ }
function renderCap() { /* Stub for now */ }
function renderPlayoffs() { /* Stub for now */ }
function renderFreeAgency() { /* Stub for now */ }

function renderScouting() {
    $('#draftYear').textContent = state.draftClass[0].year;
    const box = $('#scoutingList');
    box.innerHTML = '';
    state.draftClass.forEach(rookie => {
        const card = document.createElement('div');
        card.className = 'rookie-card';
        const ovrDisplay = rookie.scouted ? rookie.ovr : rookie.potentialRange;
        card.innerHTML = `
            <div class="rookie-name">${rookie.name}</div>
            <div class="rookie-details">${rookie.pos} | Age: ${rookie.age}</div>
            <div class="rookie-potential">Potential: ${ovrDisplay}</div>
            <button class="btn scout-btn" data-player-id="${rookie.id}" ${rookie.scouted ? 'disabled' : ''}>
                ${rookie.scouted ? 'Scouted' : 'Scout (1pt)'}
            </button>
        `;
        box.appendChild(card);
    });
}

function renderHallOfFame() {
    const L = state.league;
    if (!L) return;
    const box = $('#hofList');
    box.innerHTML = '';

    if (L.hallOfFame.length === 0) {
        box.innerHTML = '<p class="muted">The Hall of Fame is currently empty.</p>';
        return;
    }

    L.hallOfFame.sort((a,b) => a.name.localeCompare(b.name)).forEach(player => {
        const card = document.createElement('div');
        card.className = 'hof-card';
        const championships = player.awards.filter(a => a.award === 'Super Bowl Champion').length;
        card.innerHTML = `
            <div class="hof-name">${player.name}</div>
            <div class="hof-details">${player.pos}</div>
            <div class="hof-career">
                <strong>Career Highlights:</strong>
                <div>Pass Yds: ${player.stats.career.passYd || 0}</div>
                <div>Rush Yds: ${player.stats.career.rushYd || 0}</div>
                <div>Championships: ${championships}</div>
            </div>
        `;
        box.appendChild(card);
    });
}

function showBoxScore(gameId) {
    const L = state.league;
    const game = L.resultsByWeek[L.week - 2].find(g => g.id === gameId);
    if (!game) return;

    const home = L.teams[game.home];
    const away = L.teams[game.away];
    
    $('#boxScoreTitle').textContent = `${away.name} @ ${home.name}`;
    const content = $('#boxScoreContent');
    content.innerHTML = `
        <div>
            <h4>${away.name} Passing</h4>
            <p>${away.roster.find(p=>p.stats.game.passYd)?.name || 'N/A'}: ${away.roster.find(p=>p.stats.game.passYd)?.stats.game.passYd || 0} yds, ${away.roster.find(p=>p.stats.game.passTD)?.stats.game.passTD || 0} TD</p>
            <h4>Rushing</h4>
            <p>${away.roster.find(p=>p.stats.game.rushYd)?.name || 'N/A'}: ${away.roster.find(p=>p.stats.game.rushYd)?.stats.game.rushYd || 0} yds, ${away.roster.find(p=>p.stats.game.rushTD)?.stats.game.rushTD || 0} TD</p>
        </div>
        <div>
            <h4>${home.name} Passing</h4>
            <p>${home.roster.find(p=>p.stats.game.passYd)?.name || 'N/A'}: ${home.roster.find(p=>p.stats.game.passYd)?.stats.game.passYd || 0} yds, ${home.roster.find(p=>p.stats.game.passTD)?.stats.game.passTD || 0} TD</p>
            <h4>Rushing</h4>
            <p>${home.roster.find(p=>p.stats.game.rushYd)?.name || 'N/A'}: ${home.roster.find(p=>p.stats.game.rushYd)?.stats.game.rushYd || 0} yds, ${home.roster.find(p=>p.stats.game.rushTD)?.stats.game.rushTD || 0} TD</p>
        </div>
    `;
    $('#boxScoreModal').hidden = false;
}

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
window.renderScouting = renderScouting;
window.renderHallOfFame = renderHallOfFame;
window.showBoxScore = showBoxScore;
window.renderFreeAgency = renderFreeAgency;
window.renderDraft = renderDraft;


// ui.js
'use strict';

// DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

// Team name mode helper
function listByMode(mode) {
  if (!window.Teams) { return []; }
  const T = window.Teams;
  const real = T.TEAM_META_REAL || [];
  const fict = T.TEAM_META_FICTIONAL || [];
  return mode === 'real' ? real : fict;
}

// --- Core UI functions ---

function show(route) {
  document.querySelectorAll('.view').forEach(v => { v.hidden = true; });
  const viewToShow = document.getElementById(route);
  if (viewToShow) { viewToShow.hidden = false; }
  document.querySelectorAll('.nav-pill').forEach(a => { a.setAttribute('aria-current', a.dataset.view === route ? 'page' : null); });

  if (route === 'hub') renderHub();
  if (route === 'roster') renderRoster();
  if (route === 'standings') renderStandings();
  // ... etc. for all views
}

function setStatus(msg) {
  const el = $('#statusMsg');
  if (el) el.textContent = msg;
  setTimeout(() => { if (el) el.textContent = ''; }, 2000);
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
    // ... function content
}

function renderHub() { /* ... function content ... */ }
function updateCapSidebar() { /* ... function content ... */ }
function renderRoster() { /* ... function content ... */ }
function renderStandings() { /* ... function content ... */ }

function openOnboard() {
    const modal = $('#onboardModal'); if (!modal) return;
    modal.hidden = false;
    const sel = $('#onboardTeam');
    if (!sel) return;
    sel.innerHTML = '';
    const teams = listByMode(state.namesMode);
    teams.forEach((t, i) => {
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

// **THE FIX:** The complete export block to make all functions public.
window.show = show;
window.setStatus = setStatus;
window.fillTeamSelect = fillTeamSelect;
window.currentTeam = currentTeam;
window.rebuildTeamLabels = rebuildTeamLabels;
window.renderHub = renderHub;
window.updateCapSidebar = updateCapSidebar;
window.renderRoster = renderRoster;
window.renderStandings = renderStandings;
// ... Add ALL other render functions here
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
