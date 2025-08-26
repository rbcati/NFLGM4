'use strict';

// --- UTILITY FUNCTIONS ---
const $ = (id) => document.getElementById(id);
const show = (id) => $(id).style.display = 'flex'; // Use flex for modal centering
const hide = (id) => $(id).style.display = 'none';

/**
 * Toggles the theme between light and dark mode.
 */
function toggleTheme() {
    const body = document.body;
    body.classList.toggle('dark-mode');
    // Save the user's preference
    if (body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
}

/**
 * Applies the saved theme on page load.
 */
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

// --- VIEW RENDERING ---

function renderHub() {
    const L = state.league;
    const playerTeam = L.teams[state.player.teamId];
    const currentWeek = L.week;
    $('hubTeamName').innerText = `${playerTeam.name} (${playerTeam.wins}-${playerTeam.losses}${player-team.ties > 0 ? `-${player-team.ties}` : ''})`;
    $('hubTeamInfo').innerText = `Year: ${L.year} | Week: ${currentWeek}`;
    const scheduleWeeks = L.schedule.weeks || L.schedule;
    const weekIndex = currentWeek - 1;
    const scheduleContainer = $('hubSchedule');
    scheduleContainer.innerHTML = '<h3>This Week</h3>';
    if (weekIndex < scheduleWeeks.length) {
        const weeklyGames = scheduleWeeks[weekIndex].games;
        const playerGame = weeklyGames.find(g => g.home === state.player.teamId || g.away === state.player.teamId);
        if (playerGame) {
            const opponentId = playerGame.home === state.player.teamId ? playerGame.away : playerGame.home;
            const opponent = L.teams[opponentId];
            scheduleContainer.innerHTML += `<div class="game-card"><div class="team-abbr">${L.teams[playerGame.away].abbr}</div> <div class="game-info">@</div><div class="team-abbr">${L.teams[playerGame.home].abbr}</div></div>`;
        } else {
            scheduleContainer.innerHTML += `<div class="game-card"><p>BYE WEEK</p></div>`;
        }
    } else {
        scheduleContainer.innerHTML += `<div class="game-card"><p>Season Over</p></div>`;
    }
    renderMiniStandings('hubStandings');
}

function renderMiniStandings(targetId) {
    const L = state.league;
    const playerTeam = L.teams[state.player.teamId];
    const teamsInDiv = L.teams.filter(t => t.conf === playerTeam.conf && t.div === playerTeam.div);
    teamsInDiv.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.ptsFor - b.ptsAgainst) - (a.ptsFor - a.ptsAgainst);
    });
    const container = $(targetId);
    container.innerHTML = '<h3>Division Standings</h3>';
    const table = document.createElement('table');
    table.className = 'standings-table mini-standings';
    table.innerHTML = `<thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th></tr></thead>
        <tbody>${teamsInDiv.map(t => `<tr class="${t.id === state.player.teamId ? 'player-team' : ''}"><td>${t.name}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.ties}</td></tr>`).join('')}</tbody>`;
    container.appendChild(table);
}

function renderStandings() {
    const L = state.league;
    if (!L) return;
    const container = $('pageStandings');
    container.innerHTML = '<h2>League Standings</h2>';
    const conferences = [{ name: 'AFC', teams: L.teams.filter(t => t.conf === 0) }, { name: 'NFC', teams: L.teams.filter(t => t.conf === 1) }];
    conferences.forEach(conf => {
        const confContainer = document.createElement('div');
        confContainer.className = 'conference-container';
        confContainer.innerHTML = `<h3>${conf.name}</h3>`;
        for (let i = 0; i < 4; i++) {
            const divTeams = conf.teams.filter(t => t.div === i);
            divTeams.sort((a, b) => {
                if (b.wins !== a.wins) return b.wins - a.wins;
                return (b.ptsFor - b.ptsAgainst) - (a.ptsFor - a.ptsAgainst);
            });
            const divContainer = document.createElement('div');
            divContainer.className = 'division-container';
            const table = document.createElement('table');
            table.className = 'standings-table';
            table.innerHTML = `<caption>${Constants.DIVISIONS[i]}</caption><thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead>
                <tbody>${divTeams.map(t => `<tr class="${t.id === state.player.teamId ? 'player-team' : ''}"><td>${t.name}</td><td>${t.wins}</td><td>${t.losses}</td><td>${t.ties}</td><td>${t.ptsFor}</td><td>${t.ptsAgainst}</td><td>${t.ptsFor - t.ptsAgainst}</td></tr>`).join('')}</tbody>`;
            divContainer.appendChild(table);
            confContainer.appendChild(divContainer);
        }
        container.appendChild(confContainer);
    });
}

function renderRoster() {
    const playerTeam = state.league.teams[state.player.teamId];
    const container = $('pageRoster');
    container.innerHTML = `<h2>${playerTeam.name} Roster</h2>`;
    const table = document.createElement('table');
    table.className = 'roster-table';
    table.innerHTML = `<thead><tr><th>Name</th><th>Pos</th><th>Age</th><th>OVR</th><th>Pot</th></tr></thead>
        <tbody>${playerTeam.roster.map((p, index) => `<tr data-player-id="${index}"><td>${p.name}</td><td>${p.pos}</td><td>${p.age}</td><td>${p.ovr}</td><td>${p.pot}</td></tr>`).join('')}</tbody>`;
    container.appendChild(table);
    table.querySelectorAll('tbody tr').forEach(row => {
        row.addEventListener('click', () => {
            const playerId = row.dataset.playerId;
            showPlayerModal(playerTeam.roster[playerId]);
        });
    });
}

function showPlayerModal(player) {
    const modal = $('playerModal');
    const content = $('playerModalContent');
    content.innerHTML = `<div class="player-modal-header"><h3>${player.name}</h3><span class="close-button" id="closePlayerModal">&times;</span></div>
        <div class="player-modal-body">
            <div class="player-info"><p><strong>Position:</strong> ${player.pos}</p><p><strong>Age:</strong> ${player.age}</p><p><strong>Overall:</strong> ${player.ovr}</p><p><strong>Potential:</strong> ${player.pot}</p></div>
            <h4>Attributes</h4><div class="player-attributes">${Object.entries(player.ratings).map(([key, value]) => `<div class="attribute"><span class="name">${key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span><span class="value">${value}</span></div>`).join('')}</div>
            <h4>Season Stats</h4><div class="player-stats">${player.stats && player.stats.season ? Object.entries(player.stats.season).map(([key, value]) => `<div class="attribute"><span class="name">${key.replace(/([A-Z])/g, ' $1').toUpperCase()}</span><span class="value">${value}</span></div>`).join('') : '<p>No stats recorded yet.</p>'}</div>
        </div>`;
    show('playerModal');
    $('closePlayerModal').addEventListener('click', () => hide('playerModal'));
    window.addEventListener('click', (event) => { if (event.target === modal) { hide('playerModal'); } });
}

function renderFreeAgency() {
    const container = $('pageFreeAgency');
    container.innerHTML = `<h2>Free Agents</h2>`;
    state.freeAgents.sort((a, b) => b.ovr - a.ovr);
    const table = document.createElement('table');
    table.className = 'roster-table';
    table.innerHTML = `<thead><tr><th>Name</th><th>Pos</th><th>Age</th><th>OVR</th><th>Asking</th></tr></thead>
        <tbody>${state.freeAgents.slice(0, 100).map(p => `<tr><td>${p.name}</td><td>${p.pos}</td><td>${p.age}</td><td>${p.ovr}</td><td>$${(p.demand / 1000000).toFixed(1)}M</td></tr>`).join('')}</tbody>`;
    container.appendChild(table);
}

function renderDraft() {
    $('pageDraft').innerHTML = `<h2>NFL Draft</h2><p class="placeholder-text">The draft functionality is currently under construction.</p>`;
}

function renderScouting() {
    $('pageScouting').innerHTML = `<h2>Scouting</h2><p class="placeholder-text">Scouting functionality is currently under construction.</p>`;
}

function openOnboard() {
    const teamSelect = $('onboardTeam');
    const teamsByMode = listByMode(state.namesMode || 'fictional');
    teamSelect.innerHTML = teamsByMode.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    show('onboardModal');
}

// --- INITIALIZATION ---
window.UI = {
    renderHub, renderRoster, renderStandings, renderFreeAgency, renderDraft, renderScouting,
    openOnboard, show, hide, toggleTheme, applySavedTheme
};

