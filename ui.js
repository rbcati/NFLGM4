 'use strict';



/**

 * This is the complete, merged UI controller. It combines the user-provided ui.js

 * with all necessary rendering logic, routing, event setup, and CSS from all fix files.

 */



// --- CORE UI FUNCTIONS ---



// Merged from the user's provided ui.js file

window.show = function(viewId) {

  console.log('Showing view:', viewId);

  

  // Hide all views first

  document.querySelectorAll('.view').forEach(view => {

    view.hidden = true;

    view.style.display = 'none';

  });

  

  // Show target view

  const targetView = document.getElementById(viewId);

  if (targetView) {

    targetView.hidden = false;

    targetView.style.display = 'block';

    

    // Update navigation active state

    document.querySelectorAll('.nav-pill').forEach(pill => {

      const href = pill.getAttribute('href');

      const isActive = href === `#/${viewId}`;

      pill.setAttribute('aria-current', isActive ? 'page' : null);

    });

    

    console.log('✅ View shown successfully:', viewId);

  } else {

    console.error('❌ View not found:', viewId);

  }

};



// --- VIEW RENDERERS ---



// Merged from the user's provided ui.js file (with security fix applied)

window.renderRoster = function() {

  console.log('Rendering roster...');

  try {

    const L = state.league;

    if (!L) return;

    

    const teamSelect = document.getElementById('rosterTeam');

    if (teamSelect && !teamSelect.dataset.filled && window.fillTeamSelect) {

      window.fillTeamSelect(teamSelect);

      teamSelect.dataset.filled = '1';

    }

    

    const teamId = parseInt(teamSelect?.value || state.userTeamId || '0', 10);

    const team = L.teams[teamId];

    if (!team) return;



    const titleEl = document.getElementById('rosterTitle');

    if (titleEl) titleEl.textContent = `${team.name} Roster`;

    

    const rosterTable = document.getElementById('rosterTable');

    if (!rosterTable) return;



    rosterTable.innerHTML = `<thead><tr><th><input type="checkbox" id="selectAllPlayers"></th><th>Name</th><th>Pos</th><th>Age</th><th>OVR</th><th>Contract</th><th>Cap Hit</th><th>Abilities</th></tr></thead><tbody></tbody>`;

    const tbody = rosterTable.querySelector('tbody');



    if (!team.roster || team.roster.length === 0) {

      const tr = tbody.insertRow();

      const td = tr.insertCell();

      td.colSpan = 8;

      td.textContent = 'No players on roster';

      return;

    }

    

    team.roster.forEach(player => {

      const tr = tbody.insertRow();

      tr.dataset.playerId = player.id;

      const cellCheckbox = tr.insertCell();

      const checkbox = document.createElement('input');

      checkbox.type = 'checkbox';

      checkbox.name = 'playerSelect';

      checkbox.value = player.id;

      cellCheckbox.appendChild(checkbox);



      tr.insertCell().textContent = player.name;

      tr.insertCell().textContent = player.pos;

      tr.insertCell().textContent = player.age;

      tr.insertCell().textContent = player.ovr;

      tr.insertCell().textContent = `${player.years}yr / $${(player.baseAnnual || 0).toFixed(1)}M`;

      const capHit = window.capHitFor ? window.capHitFor(player, 0) : player.baseAnnual || 0;

      tr.insertCell().textContent = `$${capHit.toFixed(1)}M`;

      const abilities = (player.abilities || []).slice(0, 2).join(', ') || 'None';

      const cellAbilities = tr.insertCell();

      cellAbilities.className = 'abilities';

      cellAbilities.textContent = abilities;

    });

    

    setupRosterEvents();

  } catch (error) {

    console.error('Error rendering roster:', error);

  }

};



// Merged from the user's provided ui.js file

window.renderStandings = function() {

  console.log('Rendering standings...');

  try {

    const L = state.league;

    if (!L || !L.teams) return;

    

    const standingsWrap = document.getElementById('standingsWrap');

    if (!standingsWrap) return;

    

    const divisionNames = ['East', 'North', 'South', 'West'];

    const conferenceNames = ['AFC', 'NFC'];

    let html = '';

    

    conferenceNames.forEach((confName, confIndex) => {

      html += `<div class="conference"><h3>${confName}</h3><div class="divisions">`;

      divisionNames.forEach((divName, divIndex) => {

        const divTeams = L.teams.filter(t => t.conf === confIndex && t.div === divIndex);

        divTeams.sort((a, b) => {

          const aWins = a.record?.w || 0, bWins = b.record?.w || 0;

          if (aWins !== bWins) return bWins - aWins;

          const aDiff = (a.record?.pf || 0) - (a.record?.pa || 0);

          const bDiff = (b.record?.pf || 0) - (b.record?.pa || 0);

          return bDiff - aDiff;

        });

        html += `<div class="division"><h4>${divName}</h4><table class="table standings-table"><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>`;

        html += divTeams.map(team => {

          const r = team.record || {w:0,l:0,t:0,pf:0,pa:0};

          const diff = r.pf - r.pa;

          const isUser = team.id === (state.userTeamId || state.player?.teamId);

          return `<tr class="${isUser ? 'user-team' : ''}"><td>${team.name}${isUser ? ' (You)' : ''}</td><td>${r.w}</td><td>${r.l}</td><td>${r.t}</td><td>${r.pf}</td><td>${r.pa}</td><td>${diff >= 0 ? '+' : ''}${diff}</td></tr>`;

        }).join('');

        html += `</tbody></table></div>`;

      });

      html += '</div></div>';

    });

    standingsWrap.innerHTML = html;

  } catch (error) {

    console.error('Error rendering standings:', error);

  }

};



// Merged from the user's provided ui.js file

window.renderHub = function() {

  console.log('Rendering hub...');

  try {

    const L = state.league;

    if (!L) return;



    ['hubSeason', 'seasonNow'].forEach(id => {

      const el = document.getElementById(id);

      if (el) el.textContent = L.year || '2025';

    });

    const weekEl = document.getElementById('hubWeek');

    if (weekEl) weekEl.textContent = L.week || '1';

    const weeksEl = document.getElementById('hubWeeks');

    if (weeksEl) weeksEl.textContent = L.schedule?.weeks?.length || 18;

    const gamesEl = document.getElementById('hubGames');

    if (gamesEl) {

      const currentWeek = (L.schedule?.weeks || L.schedule || [])[L.week - 1];

      gamesEl.textContent = currentWeek?.games?.length || 0;

    }

    const powerEl = document.getElementById('hubPower');

    if (powerEl && L.teams) {

      const sortedTeams = [...L.teams].sort((a, b) => {

        const aWins = a.record?.w || 0, bWins = b.record?.w || 0;

        if (aWins !== bWins) return bWins - aWins;

        const aDiff = (a.record?.pf || 0) - (a.record?.pa || 0);

        const bDiff = (b.record?.pf || 0) - (b.record?.pa || 0);

        return bDiff - aDiff;

      });

      powerEl.innerHTML = sortedTeams.slice(0, 10).map((team, i) => {

        const r = team.record || {w:0,l:0,t:0};

        const isUser = team.id === (state.userTeamId || state.player?.teamId);

        return `<li class="${isUser ? 'user-team' : ''}">${i + 1}. ${team.name} (${r.w}-${r.l}${r.t > 0 ? `-${r.t}` : ''})</li>`;

      }).join('');

    }

    renderLastWeekResults();

  } catch (error) {

    console.error('Error rendering hub:', error);

  }

};



// Merged from the user's provided ui.js file

function renderLastWeekResults() {

  try {

    const L = state.league;

    const resultsEl = document.getElementById('hubResults');

    if (!resultsEl || !L.resultsByWeek) return;

    

    const lastWeek = Math.max(0, L.week - 2);

    const results = L.resultsByWeek[lastWeek] || [];

    

    if (results.length === 0) {

      resultsEl.innerHTML = '<p class="muted">No recent results</p>';

      return;

    }

    

    resultsEl.innerHTML = results.slice(0, 8).map(result => {

      if (result.bye !== undefined) return `<div class="result-item">${L.teams[result.bye]?.name || 'Team'} - BYE</div>`;

      const home = L.teams[result.home], away = L.teams[result.away];

      if (!home || !away) return '';

      const winner = result.scoreHome > result.scoreAway ? home : away;

      return `<div class="result-item"><span class="teams">${away.abbr} ${result.scoreAway} @ ${home.abbr} ${result.scoreHome}</span><span class="winner">${winner.abbr} wins</span></div>`;

    }).join('');

  } catch (error) {

    console.error('Error rendering results:', error);

  }

}



// Merged from the user's provided ui.js file

window.renderTrade = function() {

  console.log('Rendering trade view (placeholder)...');

  const teamASelect = document.getElementById('tradeA');

  const teamBSelect = document.getElementById('tradeB');

  if (teamASelect && !teamASelect.dataset.filled && window.fillTeamSelect) {

    window.fillTeamSelect(teamASelect);

    teamASelect.dataset.filled = '1';

  }

  if (teamBSelect && !teamBSelect.dataset.filled && window.fillTeamSelect) {

    window.fillTeamSelect(teamBSelect);

    teamBSelect.dataset.filled = '1';

  }

};





// --- ROUTING & EVENT HANDLING (from user's ui.js) ---



window.router = function() {

  const path = location.hash || '#/hub';

  const viewName = path.slice(2);

  console.log('🧭 Routing to:', viewName);

  

  window.show(viewName);

  

  if (!state.league || !state.onboarded) return;

  

  try {

    // This router contains calls to functions in other files

    // which is correct. The render functions in this file are the

    // core ones. Other files add their own.

    switch(viewName) {

      case 'hub': if (window.renderHub) window.renderHub(); break;

      case 'roster': if (window.renderRoster) window.renderRoster(); break;

      case 'standings': if (window.renderStandings) window.renderStandings(); break;

      case 'freeagency': if (window.renderFreeAgency) window.renderFreeAgency(); break;

      case 'draft': if (window.renderDraft) window.renderDraft(); break;

      case 'scouting': if (window.renderDraft) window.renderDraft(); break;

      case 'trade': if (window.renderTrade) window.renderTrade(); break;

      case 'coaching': if (window.renderCoachingStats) window.renderCoachingStats(); break;

      default: console.log('No specific renderer for view:', viewName);

    }

  } catch (error) {

    console.error('Error rendering view:', viewName, error);

  }

};



function enhanceNavigation() {

  console.log('🧭 Enhancing navigation...');

  window.removeEventListener('hashchange', window.router);

  window.addEventListener('hashchange', window.router);

  document.addEventListener('click', function(e) {

    if (e.target.classList.contains('nav-pill')) {

      e.preventDefault();

      const href = e.target.getAttribute('href');

      if (href && href.startsWith('#/')) location.hash = href;

    }

  });

  setTimeout(() => window.router(), 100);

}



function setupRosterEvents() {

  const selectAllEl = document.getElementById('selectAllPlayers');

  if (selectAllEl) {

    selectAllEl.addEventListener('change', function() {

      document.querySelectorAll('input[name="playerSelect"]').forEach(cb => cb.checked = this.checked);

      updateReleaseButton();

    });

  }

  document.querySelectorAll('input[name="playerSelect"]').forEach(cb => cb.addEventListener('change', updateReleaseButton));

  const releaseBtn = document.getElementById('btnRelease');

  if (releaseBtn) {

    releaseBtn.addEventListener('click', function() {

      const selected = Array.from(document.querySelectorAll('input[name="playerSelect"]:checked')).map(cb => cb.value);

      if (selected.length === 0) return setStatus('No players selected');

      if (confirm(`Release ${selected.length} player(s)?`)) {

        if (window.releaseSelected) window.releaseSelected(selected);

        else setStatus('Release function not available');

      }

    });

  }

}



function updateReleaseButton() {

  const releaseBtn = document.getElementById('btnRelease');

  const selectedCount = document.querySelectorAll('input[name="playerSelect"]:checked').length;

  if (releaseBtn) {

    releaseBtn.disabled = selectedCount === 0;

    releaseBtn.textContent = selectedCount > 0 ? `Release ${selectedCount} Player(s)` : 'Release Selected';

  }

}



// --- DYNAMIC CSS INJECTION ---

const enhancedCSS = `.user-team{background:rgba(10,132,255,.1)!important;border-left:3px solid var(--accent)!important}.standings-table .user-team td{color:var(--text)!important;font-weight:600!important}.conference{margin-bottom:2rem}.conference h3{color:var(--text);margin-bottom:1rem;font-size:1.25rem}.divisions{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem}.division{background:var(--surface);border-radius:var(--radius-lg);padding:1rem;border:1px solid var(--hairline)}.division h4{color:var(--text-muted);margin-bottom:.5rem;font-size:.875rem;text-transform:uppercase;letter-spacing:.5px}.standings-table{margin:0;font-size:.875rem}.standings-table td{padding:.5rem}.result-item{display:flex;justify-content:space-between;align-items:center;padding:.5rem;background:var(--surface);border-radius:var(--radius-md);margin-bottom:.25rem;font-size:.875rem}.result-item .teams{color:var(--text)}.result-item .winner{color:var(--accent);font-weight:600}.abilities{font-size:.75rem;color:var(--text-subtle);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media (max-width:768px){.divisions{grid-template-columns:1fr}.standings-table{font-size:.75rem}.standings-table th,.standings-table td{padding:.25rem}}`;

const styleElement = document.createElement('style');

styleElement.textContent = enhancedCSS;

document.head.appendChild(styleElement);



// --- INITIALIZATION ---

function initializeUI() {

  console.log('🎯 Initializing UI...');

  enhanceNavigation();

  if (state.league && state.onboarded) {

    setTimeout(() => window.router(), 200);

  }

}



if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', initializeUI);

} else {

  setTimeout(initializeUI, 100);

}

window.show = function(viewId) {

  // Hide ALL views first

  document.querySelectorAll('.view').forEach(view => {

    view.hidden = true;

    view.style.display = 'none';

  });

  

  // Show the target view

  const targetView = document.getElementById(viewId);

  if (targetView) {

    targetView.hidden = false;

    targetView.style.display = 'block';

  }

};

// --- GLOBAL EXPORTS ---

window.enhanceNavigation = enhanceNavigation;

window.setupRosterEvents = setupRosterEvents;

window.initializeUIFixes = initializeUI;



console.log('🎉 UI master file loaded successfully!');
