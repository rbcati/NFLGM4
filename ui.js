// ui.js - Consolidated and Fixed
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
  if (!Number.isFinite(y)) y = window.Constants?.GAME_CONFIG?.YEAR_START || 2025;
  return Math.max(1930, Math.min(9999, y));
}

// --- Core UI functions ---

function show(route) {
  try {
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

    // Route-specific rendering
    const renderActions = {
      hub: renderHub,
      roster: renderRoster, 
      standings: renderStandings,
      trade: renderTradeUI,
      freeagency: renderFreeAgency,
      draft: renderDraft,
      scouting: renderScouting,
      hallOfFame: renderHallOfFame,
      settings: renderSettings
    };

    const renderFn = renderActions[route];
    if (renderFn) {
      renderFn();
    }
  } catch (error) {
    console.error(`Error showing route ${route}:`, error);
    setStatus(`Error loading ${route} view`);
  }
}

function setStatus(msg) {
  const el = $('#statusMsg');
  if (!el) return;
  el.textContent = msg;
  setTimeout(() => { 
    if (el) el.textContent = ''; 
  }, 2000);
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
  
  try {
    $('#hubSeason').textContent = L.year;
    $('#seasonNow').textContent = L.year;
    $('#hubWeek').textContent = L.week;
    $('#hubWeeks').textContent = (L.schedule.weeks || L.schedule).length;
    
    const gamesThisWeek = ((L.schedule.weeks || L.schedule)[L.week - 1] || {}).games || [];
    $('#hubGames').textContent = gamesThisWeek.length;

    const res = L.resultsByWeek[L.week - 2] || [];
    const box = $('#hubResults');
    if (!box) return;
    
    box.innerHTML = '';
    const userTeamId = currentTeam()?.id;

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
      if (!home || !away) return;
      
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
  } catch (error) {
    console.error('Error rendering hub:', error);
  }
}

function updateCapSidebar() {
  try {
    const t = currentTeam();
    if (!t || !window.recalcCap) return;
    
    window.recalcCap(state.league, t);
    const safeGet = (id, fallback = '0.0') => {
      const el = $(id);
      return el ? el : { textContent: fallback };
    };
    
    safeGet('#capUsed').textContent = `${t.capUsed.toFixed(1)} M`;
    safeGet('#capTotal').textContent = `${t.capTotal.toFixed(1)} M`;
    safeGet('#deadCap').textContent = `${(t.deadCap || 0).toFixed(1)} M`;
    safeGet('#capRoom').textContent = `${(t.capTotal - t.capUsed).toFixed(1)} M`;
  } catch (error) {
    console.error('Error updating cap sidebar:', error);
  }
}

function renderRoster() {
  const L = state.league;
  if (!L) return;
  
  try {
    const sel = $('#rosterTeam');
    if (sel && !sel.dataset.filled) {
      fillTeamSelect(sel);
      sel.value = state.userTeamId;
      sel.dataset.filled = '1';
    }
    
    const teamId = parseInt(sel?.value || '0', 10);
    const tm = L.teams[teamId];
    if (!tm) return;

    const title = $('#rosterTitle');
    if (title) title.textContent = `Roster — ${tm.name} (${tm.abbr})`;
    
    const tbl = $('#rosterTable');
    if (!tbl) return;
    
    tbl.innerHTML = '<thead><tr><th>Name</th><th>POS</th><th>OVR</th><th>Age</th><th>Cap Hit</th><th>Years</th></tr></thead>';
    const tb = document.createElement('tbody');
    
    tm.roster.sort((a,b) => b.ovr - a.ovr).forEach(p => {
      const cap = window.capHitFor ? window.capHitFor(p, 0) : 0;
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${p.age}</td><td>${cap.toFixed(1)}M</td><td>${p.years}</td>`;
      tb.appendChild(tr);
    });
    
    tbl.appendChild(tb);
    updateCapSidebar();
  } catch (error) {
    console.error('Error rendering roster:', error);
  }
}

function renderStandings() {
  const L = state.league;
  if (!L) return;
  
  try {
    const C = window.Constants;
    const wrap = $('#standingsWrap');
    if (!wrap) return;
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
  } catch (error) {
    console.error('Error rendering standings:', error);
  }
}

function renderTradeUI() {
  const L = state.league;
  if (!L) return;
  
  try {
    const selA = $('#tradeA'), selB = $('#tradeB');
    const userTeam = currentTeam();
    if (!userTeam || !selA || !selB) return;

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
  } catch (error) {
    console.error('Error rendering trade UI:', error);
  }
}

function renderTradeLists() {
  try {
    const L = state.league;
    if (!L) return;
    
    const teamA_id = parseInt($('#tradeA')?.value || '0', 10);
    const teamB_id = parseInt($('#tradeB')?.value || '0', 10);
    const teamA = L.teams[teamA_id];
    const teamB = L.teams[teamB_id];

    if (!teamA || !teamB) return;

    listPlayers('#tradeListA', teamA, 'A');
    listPicks('#pickListA', teamA, 'A');
    listPlayers('#tradeListB', teamB, 'B');
    listPicks('#pickListB', teamB, 'B');

    const executeBtn = $('#tradeExecute');
    const infoDiv = $('#tradeInfo');
    if (executeBtn) executeBtn.disabled = true;
    if (infoDiv) infoDiv.textContent = 'Select assets, validate, and execute.';
  } catch (error) {
    console.error('Error rendering trade lists:', error);
  }
}

function listPlayers(rootSel, team, side) {
  const root = $(rootSel);
  if (!root || !team.roster) return;
  
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
  if (!root || !team.picks) return;
  
  root.innerHTML = '';
  team.picks.sort((a,b) => a.year - b.year || a.round - b.round).forEach(pk => {
    const row = document.createElement('label');
    row.className = 'row trade-asset';
    row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="pick" data-id="${pk.id}" /> <span>${pk.year} Round ${pk.round} (from ${pk.from})</span>`;
    root.appendChild(row);
  });
}

function renderSettings() {
  const y = (state.league && state.league.year) ? state.league.year : window.Constants?.GAME_CONFIG?.YEAR_START || 2025;
  const el = $('#settingsYear');
  if (el) el.value = y;
}

function renderScouting() {
  try {
    if (!state.draftClass || state.draftClass.length === 0) return;
    
    $('#draftYear').textContent = state.draftClass[0]?.year || 'TBD';
    const box = $('#scoutingList');
    if (!box) return;
    
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
  } catch (error) {
    console.error('Error rendering scouting:', error);
  }
}

function renderHallOfFame() {
  try {
    const L = state.league;
    if (!L) return;
    
    const box = $('#hofList');
    if (!box) return;
    box.innerHTML = '';

    if (!L.hallOfFame || L.hallOfFame.length === 0) {
      box.innerHTML = '<p class="muted">The Hall of Fame is currently empty.</p>';
      return;
    }

    L.hallOfFame.sort((a,b) => a.name.localeCompare(b.name)).forEach(player => {
      const card = document.createElement('div');
      card.className = 'hof-card';
      const championships = player.awards?.filter(a => a.award === 'Super Bowl Champion').length || 0;
      card.innerHTML = `
        <div class="hof-name">${player.name}</div>
        <div class="hof-details">${player.pos}</div>
        <div class="hof-career">
          <strong>Career Highlights:</strong>
          <div>Pass Yds: ${player.stats?.career?.passYd || 0}</div>
          <div>Rush Yds: ${player.stats?.career?.rushYd || 0}</div>
          <div>Championships: ${championships}</div>
        </div>
      `;
      box.appendChild(card);
    });
  } catch (error) {
    console.error('Error rendering hall of fame:', error);
  }
}

// Stub implementations for missing render functions
function renderSchedule() { console.log('Schedule rendering not yet implemented'); }
function renderOffers() { console.log('Offers rendering not yet implemented'); }
function renderCap() { console.log('Cap rendering not yet implemented'); }
function renderPlayoffs() { console.log('Playoffs rendering not yet implemented'); }
function renderFreeAgency() { 
  if (window.renderFreeAgency) {
    window.renderFreeAgency();
  } else {
    console.log('Free agency rendering not yet implemented'); 
  }
}
function renderDraft() {
  if (window.renderDraft) {
    window.renderDraft();
  } else {
    console.log('Draft rendering not yet implemented'); 
  }
}

// Modal functions
function openOnboard() {
  try {
    const modal = $('#onboardModal'); 
    if (!modal) return;
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
  } catch (error) {
    console.error('Error opening onboard modal:', error);
  }
}

function closeOnboard() {
  const modal = $('#onboardModal');
  if (modal) modal.hidden = true;
}

function showBoxScore(gameId) {
  try {
    const L = state.league;
    if (!L || !L.resultsByWeek) return;
    
    const game = L.resultsByWeek[L.week - 2]?.find(g => g.id === gameId);
    if (!game) return;

    const home = L.teams[game.home];
    const away = L.teams[game.away];
    if (!home || !away) return;
    
    const titleEl = $('#boxScoreTitle');
    if (titleEl) titleEl.textContent = `${away.name} @ ${home.name}`;
    
    const content = $('#boxScoreContent');
    if (content) {
      content.innerHTML = `
        <div>
          <h4>${away.name} Stats</h4>
          <p>Passing: ${away.roster.find(p => p.stats?.game?.passYd)?.stats?.game?.passYd || 0} yds</p>
          <p>Rushing: ${away.roster.find(p => p.stats?.game?.rushYd)?.stats?.game?.rushYd || 0} yds</p>
        </div>
        <div>
          <h4>${home.name} Stats</h4>
          <p>Passing: ${home.roster.find(p => p.stats?.game?.passYd)?.stats?.game?.passYd || 0} yds</p>
          <p>Rushing: ${home.roster.find(p => p.stats?.game?.rushYd)?.stats?.game?.rushYd || 0} yds</p>
        </div>
      `;
    }
    
    const modal = $('#boxScoreModal');
    if (modal) modal.hidden = false;
  } catch (error) {
    console.error('Error showing box score:', error);
  }
}

// Export all functions to global scope
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
window.renderSchedule = renderSchedule;
window.renderOffers = renderOffers;
window.renderCap = renderCap;
window.renderPlayoffs = renderPlayoffs;
window.renderFreeAgency = renderFreeAgency;
window.renderDraft = renderDraft;
window.renderScouting = renderScouting;
window.renderHallOfFame = renderHallOfFame;
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
window.showBoxScore = showBoxScore;
