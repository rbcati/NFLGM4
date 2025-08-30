'use strict';

// --- CORE UI FUNCTIONS ---

/**
 * Displays a specific view container and hides all others.
 * @param {string} viewId - The ID of the view element to show.
 */
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.hidden = true;
    });
    const targetView = document.getElementById(viewId);
    if (targetView) {
        targetView.hidden = false;
    } else {
        console.error(`View not found: ${viewId}`);
        // Show hub as a fallback if view is not found
        document.getElementById('hub').hidden = false;
    }
}

/**
 * The main render controller. It clears the view and calls the specific
 * rendering function based on the view name.
 * @param {string} viewName - The name of the view to render (e.g., 'hub', 'roster').
 */
function renderView(viewName) {
    if (!state.league || !state.onboarded) {
        console.log('Cannot render view, game not ready.');
        return;
    }
    try {
        const viewContainer = document.getElementById(viewName);
        if (!viewContainer) return;

        viewContainer.innerHTML = ''; // Clear previous content before drawing new

        switch (viewName) {
            case 'hub':
                renderHub(viewContainer);
                break;
            case 'roster':
                renderRoster(viewContainer);
                break;
            case 'standings':
                renderStandings(viewContainer);
                break;
            case 'schedule':
                renderSchedule(viewContainer);
                break;
            case 'coaching':
                 if(window.renderCoaching) window.renderCoaching(viewContainer);
                 break;
            // Add stubs for other views to avoid errors
            case 'trade':
            case 'freeagency':
            case 'draft':
            case 'scouting':
            case 'settings':
            case 'hallOfFame':
                 viewContainer.innerHTML = `<div class="card"><h2>${viewName}</h2><p>This view is under construction.</p></div>`;
                 break;
            default:
                console.warn(`No renderer found for view: ${viewName}`);
                viewContainer.innerHTML = `<div class="card"><h2>404</h2><p>View not found.</p></div>`;
        }
    } catch (error) {
        console.error(`Error rendering view '${viewName}':`, error);
    }
}

/**
 * Fills any <select> element with a list of all teams in the league.
 * @param {HTMLElement} selectEl - The <select> element to populate.
 */
function fillTeamSelect(selectEl) {
    if (!selectEl || !state.league) return;
    selectEl.innerHTML = '';
    state.league.teams.forEach((team) => {
        const option = document.createElement('option');
        option.value = String(team.id);
        option.textContent = `${team.abbr} — ${team.name}`;
        selectEl.appendChild(option);
    });
    // Default to user's team if applicable
    if (selectEl.id.includes('user') || selectEl.id.includes('roster')) {
        selectEl.value = String(state.userTeamId);
    }
}


// --- INDIVIDUAL VIEW RENDERERS ---

function renderHub(container) {
    const L = state.league;
    const scheduleWeeks = L.schedule?.weeks || [];
    const currentWeekData = scheduleWeeks[L.week - 1] || { games: [] };

    // Power Rankings Logic
    const sortedTeams = [...L.teams].sort((a, b) => (b.record.w - a.record.w) || ((b.record.pf - b.record.pa) - (a.record.pf - a.record.pa)));
    const powerRankingHtml = sortedTeams.slice(0, 10).map((team, i) => {
        const isUser = team.id === state.userTeamId;
        return `<li class="${isUser ? 'user-team' : ''}">${i + 1}. ${team.name} (${team.record.w}-${team.record.l})</li>`;
    }).join('');

    // Last Week's Results Logic
    const lastWeekIndex = L.week - 2;
    const results = L.resultsByWeek?.[lastWeekIndex] || [];
    let resultsHtml = '<p class="muted">No recent results</p>';
    if (results.length > 0) {
        resultsHtml = results.slice(0, 8).map(result => {
            if (result.bye !== undefined) return `<div class="result-item">${L.teams[result.bye]?.name} - BYE</div>`;
            const home = L.teams[result.home];
            const away = L.teams[result.away];
            return `<div class="result-item"><span class="teams">${away.abbr} ${result.scoreAway} @ ${home.abbr} ${result.scoreHome}</span><span class="winner">${result.scoreHome > result.scoreAway ? home.abbr : away.abbr} wins</span></div>`;
        }).join('');
    }

    container.innerHTML = `
        <div class="card">
            <div class="row"><h2>League Hub</h2><div class="spacer"></div><div class="muted">Season <span>${L.year}</span></div></div>
            <div class="grid two">
              <div>
                <div>Week <span>${L.week}</span> of <span>${scheduleWeeks.length}</span></div>
                <div>Games this week: <span>${currentWeekData.games.length}</span></div>
                <div class="actions mt"><button id="btnSimWeek" class="btn primary">Simulate Week</button></div>
              </div>
              <div><h3>Power Ranking</h3><ol>${powerRankingHtml}</ol></div>
            </div>
        </div>
        <div class="card"><h3>Last Week Results</h3><div>${resultsHtml}</div></div>
    `;
}

function renderRoster(container) {
    const L = state.league;
    const team = L.teams[state.userTeamId]; // For now, always show user's team
    
    const rosterRows = team.roster.sort((a,b) => b.ovr - a.ovr).map(p => {
        const capHit = window.capHitFor ? window.capHitFor(p, 0) : p.baseAnnual || 0;
        return `
            <tr>
                <td>${p.name}</td>
                <td>${p.pos}</td>
                <td>${p.age}</td>
                <td>${p.ovr}</td>
                <td>${p.years}yr / $${(p.baseAnnual || 0).toFixed(1)}M</td>
                <td>$${capHit.toFixed(1)}M</td>
            </tr>
        `;
    }).join('');

    container.innerHTML = `
        <div class="card">
            <div class="row"><h2>${team.name} Roster</h2></div>
            <table class="table" id="rosterTable">
                <thead><tr><th>Name</th><th>Pos</th><th>Age</th><th>OVR</th><th>Contract</th><th>Cap Hit</th></tr></thead>
                <tbody>${rosterRows}</tbody>
            </table>
        </div>
    `;
}

function renderStandings(container) {
    const L = state.league;
    const confNames = ['AFC', 'NFC'];
    const divNames = ['East', 'North', 'South', 'West'];

    let html = '';
    confNames.forEach((confName, confIndex) => {
        html += `<div class="conference"><h3>${confName}</h3><div class="divisions">`;
        divNames.forEach((divName, divIndex) => {
            const divTeams = L.teams.filter(t => t.conf === confIndex && t.div === divIndex);
            divTeams.sort((a, b) => (b.record.w - a.record.w) || ((b.record.pf - b.record.pa) - (a.record.pf - a.record.pa)));
            
            const tableRows = divTeams.map(team => {
                const isUser = team.id === state.userTeamId;
                return `<tr class="${isUser ? 'user-team' : ''}"><td>${team.name}</td><td>${team.record.w}</td><td>${team.record.l}</td><td>${team.record.t}</td></tr>`;
            }).join('');

            html += `
                <div class="division">
                    <h4>${divName}</h4>
                    <table class="table standings-table">
                        <thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th></tr></thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            `;
        });
        html += '</div></div>';
    });
    container.innerHTML = `<div class="card"><h2>Standings</h2><div id="standingsWrap">${html}</div></div>`;
}

function renderSchedule(container) {
    container.innerHTML = `
        <div class="card">
            <div class="row">
              <h2>Schedule & Results</h2>
              <div class="spacer"></div>
              <label for="scheduleWeekSelect">Week</label>
              <select id="scheduleWeekSelect"></select>
            </div>
            <div id="scheduleContent" class="mt"></div>
        </div>
    `;
    
    const weekSelect = document.getElementById('scheduleWeekSelect');
    const L = state.league;
    const totalWeeks = L.schedule?.weeks?.length || 18;

    for (let w = 1; w <= totalWeeks; w++) {
        const option = document.createElement('option');
        option.value = String(w);
        option.textContent = `Week ${w}`;
        weekSelect.appendChild(option);
    }
    weekSelect.value = String(L.week);
    
    // The event listener for this is in events.js to keep concerns separate
    renderScheduleContent(L.week); // Initial render
}

function renderScheduleContent(week) {
    const scheduleContent = document.getElementById('scheduleContent');
    if (!scheduleContent) return;

    const L = state.league;
    const weekIndex = parseInt(week, 10) - 1;
    const weekData = L.schedule.weeks[weekIndex];
    const results = L.resultsByWeek?.[weekIndex] || [];
    const isCompleted = weekIndex < L.week - 1;

    if (!weekData) {
        scheduleContent.innerHTML = '<p class="muted">No schedule data for this week.</p>';
        return;
    }
    
    const gamesHtml = weekData.games.map(game => {
        if (game.bye !== undefined) {
            return `<div class="game-card bye-week">${L.teams[game.bye].name} - BYE</div>`;
        }
        const home = L.teams[game.home];
        const away = L.teams[game.away];
        const result = results.find(r => r.home === game.home && r.away === game.away);
        
        if (isCompleted && result) {
            return `<div class="game-card completed">${away.abbr} ${result.scoreAway} @ ${home.abbr} ${result.scoreHome}</div>`;
        } else {
            return `<div class="game-card upcoming">${away.name} (${away.record.w}-${away.record.l}) @ ${home.name} (${home.record.w}-${home.record.l})</div>`;
        }
    }).join('');
    
    scheduleContent.innerHTML = `<div class="games-grid">${gamesHtml}</div>`;
}


// --- DYNAMIC CSS INJECTION ---
// Merged from fix files to ensure UI looks correct without extra files.
const uiCss = `
.user-team { background: rgba(10, 132, 255, 0.1) !important; border-left: 3px solid var(--accent) !important; font-weight: bold; }
.conference { margin-bottom: 2rem; }
.conference h3 { margin-bottom: 1rem; }
.divisions { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
.division { background: var(--surface); border-radius: var(--radius-lg); padding: 1rem; border: 1px solid var(--hairline); }
.division h4 { color: var(--text-muted); margin-bottom: 0.5rem; text-transform: uppercase; }
.result-item { display: flex; justify-content: space-between; padding: 0.5rem; background: var(--surface); border-radius: var(--radius-md); margin-bottom: 0.25rem; }
.games-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.game-card { background: var(--surface); border-radius: var(--radius-md); padding: 1rem; border: 1px solid var(--hairline); text-align: center; }
.game-card.completed { border-left: 3px solid var(--success); }
.game-card.upcoming { border-left: 3px solid var(--accent); }
.game-card.bye-week { color: var(--text-muted); }
.nav-pill[aria-current="page"] { background: var(--accent); color: white; }
`;
const styleElement = document.createElement('style');
styleElement.textContent = uiCss;
document.head.appendChild(styleElement);


// --- GLOBAL ACCESS ---
// Make key functions available to other files like main.js and events.js
window.showView = showView;
window.renderView = renderView;
window.fillTeamSelect = fillTeamSelect;
window.renderScheduleContent = renderScheduleContent;
