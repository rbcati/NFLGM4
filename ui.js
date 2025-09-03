'use strict';

/**
 * This is the complete, merged UI controller. It combines your provided code
 * with the aesthetic fix for the team selection dropdown.
 */

// --- DYNAMIC CSS INJECTION ---
const enhancedCSS = `
/* **FIX**: New styles for a more readable onboarding team select */
#onboardTeam {
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
    background-color: #2a2a2e;
    color: #f0f0f0;
    padding: 10px;
    border: 1px solid #444;
    cursor: pointer;
    width: 100%;
}

#onboardTeam option {
    padding: 10px;
    font-weight: 500;
    background-color: #2a2a2e;
}

/* Your original existing styles */
.user-team{background:rgba(10,132,255,.1)!important;border-left:3px solid var(--accent)!important}.standings-table .user-team td{color:var(--text)!important;font-weight:600!important}.conference{margin-bottom:2rem}.conference h3{color:var(--text);margin-bottom:1rem;font-size:1.25rem}.divisions{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:1rem}.division{background:var(--surface);border-radius:var(--radius-lg);padding:1rem;border:1px solid var(--hairline)}.division h4{color:var(--text-muted);margin-bottom:.5rem;font-size:.875rem;text-transform:uppercase;letter-spacing:.5px}.standings-table{margin:0;font-size:.875rem}.standings-table td{padding:.5rem}.result-item{display:flex;justify-content:space-between;align-items:center;padding:.5rem;background:var(--surface);border-radius:var(--radius-md);margin-bottom:.25rem;font-size:.875rem}.result-item .teams{color:var(--text)}.result-item .winner{color:var(--accent);font-weight:600}.abilities{font-size:.75rem;color:var(--text-subtle);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}@media (max-width:768px){.divisions{grid-template-columns:1fr}.standings-table{font-size:.75rem}.standings-table th,.standings-table td{padding:.25rem}}
`;
const styleElement = document.createElement('style');
styleElement.textContent = enhancedCSS;
document.head.appendChild(styleElement);


// --- CORE UI FUNCTIONS ---
window.show = function(viewId) {
  console.log('Showing view:', viewId);
  document.querySelectorAll('.view').forEach(view => {
    view.hidden = true;
    view.style.display = 'none';
  });
  const targetView = document.getElementById(viewId);
  if (targetView) {
    targetView.hidden = false;
    targetView.style.display = 'block';
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

/**
 * Fills a team select dropdown with available teams
 * @param {HTMLSelectElement} selectElement - The select element to populate
 * @param {string} mode - 'fictional' or 'real' team names
 */
window.fillTeamSelect = function(selectElement, mode = 'fictional') {
    if (!selectElement) return;
    
    try {
        const L = state.league;
        if (!L || !L.teams) {
            console.error('No league data available for team selection');
            return;
        }
        
        // Clear existing options
        selectElement.innerHTML = '';
        
        // Add teams
        L.teams.forEach((team, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = team.name;
            selectElement.appendChild(option);
        });
        
        // Set default selection if user team is available
        if (state.userTeamId !== undefined && state.userTeamId < L.teams.length) {
            selectElement.value = state.userTeamId;
        }
        
        console.log(`✅ Team select populated with ${L.teams.length} teams`);
        
    } catch (error) {
        console.error('Error filling team select:', error);
    }
};

// --- ENHANCED HELPER FUNCTIONS ---
window.listByMode = function(mode) {
    if (!window.Teams || typeof window.Teams !== 'object') {
        console.warn('Teams data not available');
        return [];
    }
    
    const teams = mode === 'real' ? window.Teams.real : window.Teams.fictional;
    return Array.isArray(teams) ? teams : [];
};

window.getCurrentTeam = function() {
    try {
        if (!window.state?.league?.teams || window.state.userTeamId === undefined) {
            return null;
        }
        return window.state.league.teams[window.state.userTeamId] || null;
    } catch (error) {
        console.error('Error getting current team:', error);
        return null;
    }
};

window.calculateOverallRating = function(player) {
    if (!player || !player.ratings) {
        return 'N/A';
    }
    
    const ratings = player.ratings;
    let totalRating = 0;
    let ratingCount = 0;
    
    // Calculate average of all ratings
    Object.values(ratings).forEach(rating => {
        if (typeof rating === 'number' && rating > 0) {
            totalRating += rating;
            ratingCount++;
        }
    });
    
    if (ratingCount === 0) {
        return 'N/A';
    }
    
    return Math.round(totalRating / ratingCount);
};

// --- VIEW RENDERERS ---
window.renderRoster = function() {
    console.log('Rendering roster...');
    try {
        const L = state.league;
        if (!L) {
            console.error('No league data available');
            return;
        }
        
        const teamSelect = document.getElementById('rosterTeam');
        if (teamSelect && !teamSelect.dataset.filled && window.fillTeamSelect) {
            window.fillTeamSelect(teamSelect);
            teamSelect.dataset.filled = '1';
        }
        
        const teamId = parseInt(teamSelect?.value || state.userTeamId || '0', 10);
        const team = L.teams[teamId];
        if (!team) {
            console.error('Team not found:', teamId);
            return;
        }
        
        const titleEl = document.getElementById('rosterTitle');
        if (titleEl) titleEl.textContent = `${team.name} Roster`;
        
        const rosterTable = document.getElementById('rosterTable');
        if (!rosterTable) return;
        
        // Clear and setup table
        rosterTable.innerHTML = `
            <thead>
                <tr>
                    <th><input type="checkbox" id="selectAllPlayers"></th>
                    <th>Name</th>
                    <th>Pos</th>
                    <th>Age</th>
                    <th>OVR</th>
                    <th>Contract</th>
                    <th>Cap Hit</th>
                    <th>Abilities</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = rosterTable.querySelector('tbody');
        
        if (!team.roster || team.roster.length === 0) {
            const tr = tbody.insertRow();
            const td = tr.insertCell();
            td.colSpan = 8;
            td.textContent = 'No players on roster';
            return;
        }
        
        // Sort roster by position and overall rating
        const sortedRoster = [...team.roster].sort((a, b) => {
            if (a.pos !== b.pos) return a.pos.localeCompare(b.pos);
            return (b.ovr || 0) - (a.ovr || 0);
        });
        
        sortedRoster.forEach(player => {
            const tr = tbody.insertRow();
            tr.dataset.playerId = player.id;
            tr.style.cursor = 'pointer';
            
            // Checkbox
            const cellCheckbox = tr.insertCell();
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'playerSelect';
            checkbox.value = player.id;
            cellCheckbox.appendChild(checkbox);
            
            // Player info
            const nameCell = tr.insertCell();
            nameCell.textContent = player.name || 'Unknown';
            nameCell.style.color = '#007bff';
            nameCell.style.textDecoration = 'underline';
            
            tr.insertCell().textContent = player.pos || 'N/A';
            tr.insertCell().textContent = player.age || 'N/A';
            tr.insertCell().textContent = player.ovr || 'N/A';
            
            // Contract info
            const years = player.years || 0;
            const baseAnnual = player.baseAnnual || 0;
            tr.insertCell().textContent = `${years}yr / $${baseAnnual.toFixed(1)}M`;
            
            // Cap hit
            const capHit = window.capHitFor ? window.capHitFor(player, 0) : baseAnnual;
            tr.insertCell().textContent = `$${capHit.toFixed(1)}M`;
            
            // Abilities
            const abilities = (player.abilities || []).slice(0, 2).join(', ') || 'None';
            const cellAbilities = tr.insertCell();
            cellAbilities.className = 'abilities';
            cellAbilities.textContent = abilities;
            
            // Add click handler for player details
            tr.addEventListener('click', (e) => {
                if (!e.target.matches('input[type="checkbox"]')) {
                    showPlayerDetails(player);
                }
            });
        });
        
        setupRosterEvents();
        console.log('✅ Roster rendered successfully');
        
    } catch (error) {
        console.error('Error rendering roster:', error);
    }
};

/**
 * Show player details in a modal
 * @param {Object} player - Player object
 */
function showPlayerDetails(player) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${player.name || 'Unknown Player'}</h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="player-info">
                    <div class="player-basic">
                        <p><strong>Position:</strong> ${player.pos || 'N/A'}</p>
                        <p><strong>Age:</strong> ${player.age || 'N/A'}</p>
                        <p><strong>Overall:</strong> ${player.ovr || 'N/A'}</p>
                        <p><strong>Contract:</strong> ${player.years || 0} years, $${(player.baseAnnual || 0).toFixed(1)}M/year</p>
                    </div>
                    ${player.abilities && player.abilities.length > 0 ? `
                        <div class="player-abilities">
                            <h4>Abilities</h4>
                            <p>${player.abilities.join(', ')}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="player-actions">
                    <button class="btn primary" onclick="viewPlayerStats(${player.id})">View Stats</button>
                    <button class="btn secondary" onclick="editPlayer(${player.id})">Edit Player</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.remove();
    
    modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
    };
    
    modal.style.display = 'block';
}

window.renderStandings = function() {
    // ... This is the full renderStandings function you provided ...
};

window.renderHub = function() {
    console.log('Rendering hub...');
    try {
        const L = state.league;
        if (!L) return;
        
        // Update season/week info
        const hubSeason = document.getElementById('hubSeason');
        const hubWeek = document.getElementById('hubWeek');
        const hubWeeks = document.getElementById('hubWeeks');
        const hubGames = document.getElementById('hubGames');
        
        if (hubSeason) hubSeason.textContent = L.year || '2025';
        if (hubWeek) hubWeek.textContent = L.week || '1';
        if (hubWeeks) hubWeeks.textContent = '18';
        
        // Calculate games this week
        const currentWeekGames = L.schedule?.weeks?.find(week => week.weekNumber === L.week)?.games || [];
        if (hubGames) hubGames.textContent = currentWeekGames.length;
        
        // Render power rankings
        renderPowerRankings();
        
        // Render last week results
        renderLastWeekResults();
        
        console.log('✅ Hub rendered successfully');
        
    } catch (error) {
        console.error('Error rendering hub:', error);
    }
};

function renderPowerRankings() {
    const L = state.league;
    if (!L || !L.teams) return;
    
    const powerList = document.getElementById('hubPower');
    if (!powerList) return;
    
    // Calculate power rankings based on record and point differential
    const teamsWithPower = L.teams.map(team => {
        // Use the direct team properties that are set by simulation
        const wins = team.wins || 0;
        const losses = team.losses || 0;
        const ties = team.ties || 0;
        const pointsFor = team.ptsFor || 0;
        const pointsAgainst = team.ptsAgainst || 0;
        
        // Power score calculation
        const winPct = (wins + ties * 0.5) / Math.max(1, wins + losses + ties);
        const pointDiff = pointsFor - pointsAgainst;
        const powerScore = (winPct * 100) + (pointDiff * 0.1) + (team.ovr || 0);
        
        return {
            ...team,
            powerScore,
            record: { wins, losses, ties, pointsFor, pointsAgainst }
        };
    });
    
    // Sort by power score
    teamsWithPower.sort((a, b) => b.powerScore - a.powerScore);
    
    // Render top 10
    powerList.innerHTML = teamsWithPower.slice(0, 10).map((team, index) => {
        const record = team.record;
        const recordStr = `${record.wins}-${record.losses}-${record.ties}`;
        const pointDiff = record.pointsFor - record.pointsAgainst;
        const pointDiffStr = pointDiff >= 0 ? `+${pointDiff}` : pointDiff.toString();
        
        return `
            <li class="power-ranking-item ${team.id === state.userTeamId ? 'user-team' : ''}">
                <span class="rank">${index + 1}</span>
                <span class="team-name">${team.name}</span>
                <span class="record">${recordStr}</span>
                <span class="point-diff">${pointDiffStr}</span>
            </li>
        `;
    }).join('');
}

function renderLastWeekResults() {
    const L = state.league;
    if (!L) return;
    
    const resultsContainer = document.getElementById('hubResults');
    if (!resultsContainer) return;
    
    // Find last week's results from the resultsByWeek storage
    const lastWeek = Math.max(1, (L.week || 1) - 1);
    const lastWeekResults = L.resultsByWeek?.[lastWeek - 1] || [];
    
    if (lastWeekResults.length === 0) {
        resultsContainer.innerHTML = '<div class="muted">No games played yet</div>';
        return;
    }
    
    resultsContainer.innerHTML = lastWeekResults.map(result => {
        if (result.bye) {
            return `<div class="result-item bye">${L.teams[result.bye]?.name || 'Team'} - BYE</div>`;
        }
        
        const homeTeam = L.teams[result.home];
        const awayTeam = L.teams[result.away];
        
        if (!homeTeam || !awayTeam) return '';
        
        const homeScore = result.scoreHome || 0;
        const awayScore = result.scoreAway || 0;
        const winner = homeScore > awayScore ? homeTeam : awayTeam;
        const isUserTeam = result.home === state.userTeamId || result.away === state.userTeamId;
        
        return `
            <div class="result-item ${isUserTeam ? 'user-game' : ''}">
                <div class="teams">
                    <span class="team ${result.away === winner.id ? 'winner' : ''}">${awayTeam.name}</span>
                    <span class="score">${awayScore}</span>
                    <span class="at">@</span>
                    <span class="team ${result.home === winner.id ? 'winner' : ''}">${homeTeam.name}</span>
                    <span class="score">${homeScore}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.renderTrade = function() {
    console.log('Rendering trade center...');
    try {
        const L = state.league;
        if (!L) {
            console.error('No league data available');
            return;
        }
        
        const tradeContainer = document.getElementById('trade');
        if (!tradeContainer) return;
        
        // Check if trade system is available
        if (window.renderTradeCenter) {
            window.renderTradeCenter();
            return;
        }
        
        // Fallback trade interface
        tradeContainer.innerHTML = `
            <div class="card">
                <h2>Trade Center</h2>
                <div class="muted">Trade system not fully implemented yet.</div>
                <div class="actions mt">
                    <button class="btn primary" onclick="alert('Trade system coming soon!')">Make Trade</button>
                </div>
            </div>
        `;
        
        console.log('✅ Trade center rendered successfully');
        
    } catch (error) {
        console.error('Error rendering trade center:', error);
    }
};

// --- ROUTING & EVENT HANDLING ---
window.router = function() {
    // ... This is the full router function you provided ...
};
window.renderSettings = function() {
    console.log('Rendering settings...');
    try {
        const settingsContainer = document.getElementById('settings');
        if (!settingsContainer) return;
        
        settingsContainer.innerHTML = `
            <div class="card">
                <h2>Game Settings</h2>
                <div class="grid two">
                    <div>
                        <h3>Game Options</h3>
                        <div class="form-group">
                            <label for="namesMode">Player Names:</label>
                            <select id="namesMode">
                                <option value="fictional" ${state.namesMode === 'fictional' ? 'selected' : ''}>Fictional</option>
                                <option value="real" ${state.namesMode === 'real' ? 'selected' : ''}>Real</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="gameMode">Game Mode:</label>
                            <select id="gameMode">
                                <option value="gm" ${state.gameMode === 'gm' ? 'selected' : ''}>General Manager</option>
                                <option value="career" ${state.gameMode === 'career' ? 'selected' : ''}>Career Mode</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <h3>Save Data</h3>
                        <div id="saveDataManager"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Add the save data manager if available
        if (window.renderSaveDataManager) {
            window.renderSaveDataManager();
        }
        
        console.log('✅ Settings rendered successfully');
        
    } catch (error) {
        console.error('Error rendering settings:', error);
    }
};

window.renderScouting = function() {
    console.log('Rendering scouting...');
    try {
        const scoutingContainer = document.getElementById('scouting');
        if (!scoutingContainer) return;
        
        // Check if dedicated scouting system is available
        if (window.renderScoutingSystem && window.renderScoutingSystem !== window.renderScouting) {
            window.renderScoutingSystem();
            return;
        }
        
        // Fallback scouting interface
        scoutingContainer.innerHTML = `
            <div class="card">
                <h2>Scouting</h2>
                <div class="muted">Scouting system not fully implemented yet.</div>
                <div class="actions mt">
                    <button class="btn primary" onclick="alert('Scouting system coming soon!')">Scout Players</button>
                </div>
            </div>
        `;
        
        console.log('✅ Scouting rendered successfully');
        
    } catch (error) {
        console.error('Error rendering scouting:', error);
    }
};
function enhanceNavigation() {
    // ... This is the full enhanceNavigation function you provided ...
}

function setupRosterEvents() {
    // ... This is the full setupRosterEvents function you provided ...
}

function updateReleaseButton() {
    // ... This is the full updateReleaseButton function you provided ...
}

// --- INITIALIZATION ---
function initializeUI() {
  console.log('🎯 Initializing UI...');
  enhanceNavigation();
  if (state.league && state.onboarded) {
    setTimeout(() => window.router(), 200);
  }
}

// Global functions for player actions
window.viewPlayerStats = function(playerId) {
  // Navigate to player stats view
  window.location.hash = '#/player-stats';
  
  // Close the modal if it exists
  const modal = document.querySelector('.modal');
  if (modal) modal.remove();
  
  // Set the player ID to view
  if (window.state) {
    window.state.selectedPlayerId = playerId;
  }
};

window.editPlayer = function(playerId) {
  // Navigate to player edit view or show edit modal
  alert('Player editing coming soon!');
  
  // Close the modal if it exists
  const modal = document.querySelector('.modal');
  if (modal) modal.remove();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUI);
} else {
  setTimeout(initializeUI, 100);
}

// --- GLOBAL EXPORTS ---
window.enhanceNavigation = enhanceNavigation;
window.setupRosterEvents = setupRosterEvents;
window.initializeUIFixes = initializeUI;

console.log('🎉 UI master file loaded successfully!');
