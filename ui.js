// ui.js
'use strict';

// --- (Keep all existing helper functions like $, $$, listByMode, etc.) ---

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
  renderOffers();
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

    // Fill Team A dropdown and lock it to the user's team
    fillTeamSelect(selA);
    selA.value = userTeam.id;
    selA.disabled = true; // Lock the dropdown

    // Fill Team B dropdown with all other teams
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


// --- (Keep the other existing UI functions like renderTradeLists, renderDraft, openOnboard, etc.) ---
