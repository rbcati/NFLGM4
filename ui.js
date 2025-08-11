// ui.js
'use strict';

// (All the existing functions like $, $$, show, listByMode, etc. are here)
// ...

function renderHub() { /* ... */ }
function updateCapSidebar() { /* ... */ }
function renderRoster() { /* ... */ }
function renderStandings() { /* ... */ }
function renderTradeUI() { /* ... */ }
function renderTradeLists() { /* ... */ }
function renderOffers() { /* ... */ }
function openOnboard() { /* ... */ }
function closeOnboard() { /* ... */ }

function renderSchedule() {
    const L = state.league;
    if (!L) return;
    const week = L.week;
    const scheduleData = L.schedule.weeks[week - 1] || {};
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

function renderCap() { /* ... */ }
function renderPlayoffs() { /* ... */ }


// **THE FIX:** The export block at the bottom is now complete.
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
window.renderStandings = renderStandings;
window.openOnboard = openOnboard;
window.closeOnboard = closeOnboard;
window.renderOffers = renderOffers;
window.renderSchedule = renderSchedule; // <-- Added
window.renderCap = renderCap;           // <-- Added
window.renderPlayoffs = renderPlayoffs; // <-- Added
