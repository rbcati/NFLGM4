// ui.js
'use strict';

// (Keep all existing helper functions: $, $$, listByMode, etc.)
// ...

function renderRoster() {
  const L = state.league;
  if (!L) return;
  const sel = $('#rosterTeam');
  // **THE FIX:** The dropdown now correctly defaults to your chosen team.
  if(!sel.dataset.filled) {
      fillTeamSelect(sel);
      sel.value = state.userTeamId; // Default to user's team
      sel.dataset.filled = '1';
  }
  const teamId = parseInt(sel.value, 10);
  const tm = L.teams[teamId];

  $('#rosterTitle').textContent = `Roster — ${tm.name} (${tm.abbr})`;
  const tbl = $('#rosterTable');
  tbl.innerHTML = '<thead><tr><th>Name</th><th>POS</th><th>OVR</th><th>Age</th><th>Cap Hit</th><th>Years</th></tr></thead>';
  const tb = document.createElement('tbody');
  tm.roster.forEach(p => {
    const cap = capHitFor(p, 0);
    tr.innerHTML = `<td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${p.age}</td><td>${cap.toFixed(1)}M</td><td>${p.years}</td>`;
  });
  tbl.appendChild(tb);
  updateCapSidebar();
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
    
    renderTradeLists(); // This will now work correctly
}

function renderTradeLists() {
    const L = state.league;
    if (!L) return;
    const teamA_id = parseInt($('#tradeA').value, 10);
    const teamB_id = parseInt($('#tradeB').value, 10);
    const teamA = L.teams[teamA_id];
    const teamB = L.teams[teamB_id];

    // **THE FIX:** This function is now fully implemented.
    listPlayers('#tradeListA', teamA, 'A');
    listPlayers('#pickListA', teamA, 'A');
    listPlayers('#tradeListB', teamB, 'B');
    listPlayers('#pickListB', teamB, 'B');

    $('#tradeExecute').disabled = true;
    $('#tradeInfo').textContent = 'Select assets, validate, and execute.';
}

function listPlayers(rootSel, team, side) {
    const root = $(rootSel);
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
    root.innerHTML = '';
    team.picks.forEach(pk => {
        const row = document.createElement('label');
        row.className = 'row trade-asset';
        row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="pick" data-id="${pk.id}" /> <span>${pk.year} Round ${pk.round} (from ${pk.from})</span>`;
        root.appendChild(row);
    });
}


function renderStandings() {
    const L = state.league;
    if (!L) return;
    const C = window.Constants;
    const wrap = $('#standingsWrap');
    wrap.innerHTML = '';

    // **THE FIX:** Standings are now a detailed, single table.
    const allTeams = [...L.teams];
    allTeams.sort((a, b) => {
        if (a.record.w !== b.record.w) return b.record.w - a.record.w;
        return (a.record.pf - a.record.pa) - (b.record.pf - b.record.pa);
    });

    let tableHtml = `<table class="table"><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>DIFF</th><th>STRK</th><th>DIV</th><th>HOME</th><th>AWAY</th></tr></thead><tbody>`;
    allTeams.forEach(t => {
        const pct = t.record.w + t.record.l + t.record.t === 0 ? '.000' : (t.record.w / (t.record.w + t.record.l)).toFixed(3).substring(1);
        const diff = t.record.pf - t.record.pa;
        tableHtml += `<tr>
            <td>${t.name}</td>
            <td>${t.record.w}</td><td>${t.record.l}</td><td>${t.record.t}</td>
            <td>${pct}</td>
            <td>${t.record.pf}</td><td>${t.record.pa}</td>
            <td>${diff > 0 ? '+' : ''}${diff}</td>
            <td>${t.record.streak > 0 ? 'W' : 'L'}${Math.abs(t.record.streak)}</td>
            <td>${t.record.divW}-${t.record.divL}</td>
            <td>${t.record.homeW}-${t.record.homeL}</td>
            <td>${t.record.awayW}-${t.record.awayL}</td>
        </tr>`;
    });
    tableHtml += '</tbody></table>';
    wrap.innerHTML = tableHtml;
}

function renderHub() {
    // ... (logic for hub season, week, etc.)
    
    // **THE FIX:** Game results are now in a clean grid.
    const res = L.resultsByWeek[L.week - 2] || [];
    const box = $('#hubResults');
    box.innerHTML = '';
    const resultsGrid = document.createElement('div');
    resultsGrid.className = 'results-grid';
    res.forEach(g => {
        if (g.bye) return;
        const home = L.teams[g.home];
        const away = L.teams[g.away];
        const winner = g.homeWin ? home : away;
        const loser = g.homeWin ? away : home;
        const winnerScore = g.homeWin ? g.scoreHome : g.scoreAway;
        const loserScore = g.homeWin ? g.scoreAway : g.scoreHome;

        const resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <div class="game-winner"><strong>${winner.name}</strong> defeated ${loser.name}</div>
            <div class="game-score">${winnerScore} - ${loserScore}</div>
        `;
        resultsGrid.appendChild(resultCard);
    });
    box.appendChild(resultsGrid);

    updateCapSidebar();
}

// (Make sure all the window.function assignments are at the bottom of the file)
