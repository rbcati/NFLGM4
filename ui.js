const enhancedCSS = `
/* New styles for a more readable onboarding team select */
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

/* Existing styles */
.user-team {
  background: rgba(10,132,255,.1) !important;
  border-left: 3px solid var(--accent) !important;
}

.standings-table .user-team td {
  color: var(--text) !important;
  font-weight: 600 !important;
}

.conference {
  margin-bottom: 2rem;
}

.conference h3 {
  color: var(--text);
  margin-bottom: 1rem;
  font-size: 1.25rem;
}

.divisions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.division {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 1rem;
  border: 1px solid var(--hairline);
}

.division h4 {
  color: var(--text-muted);
  margin-bottom: .5rem;
  font-size: .875rem;
  text-transform: uppercase;
  letter-spacing: .5px;
}

.standings-table {
  margin: 0;
  font-size: .875rem;
}

.standings-table td {
  padding: .5rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: .5rem;
  background: var(--surface);
  border-radius: var(--radius-md);
  margin-bottom: .25rem;
  font-size: .875rem;
}

.result-item .teams {
  color: var(--text);
}

.result-item .winner {
  color: var(--accent);
  font-weight: 600;
}

.abilities {
  font-size: .75rem;
  color: var(--text-subtle);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .divisions {
    grid-template-columns: 1fr;
  }
  .standings-table {
    font-size: .75rem;
  }
  .standings-table th,
  .standings-table td {
    padding: .25rem;
  }
}

/* Trade center asset styles */
.asset-item {
  background: var(--surface);
  padding: 4px 6px;
  margin: 2px 0;
  cursor: pointer;
  border-radius: 4px;
  font-size: 0.875rem;
}

.asset-item.selected {
  background-color: var(--accent);
  color: var(--on-accent, #fff);
}
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
// 🏆 ENHANCED: Refactored fillTeamSelect for better error handling and team abbreviation display
window.fillTeamSelect = function(selectElement, mode = 'fictional') {
  try {
    if (!selectElement) {
      console.error('fillTeamSelect: No select element provided');
      return false;
    }

    if (!window.listByMode) {
      console.error('fillTeamSelect: listByMode function not available');
      return false;
    }

    const teams = window.listByMode(mode);
    if (!teams || teams.length === 0) {
      console.error('fillTeamSelect: No teams available for mode:', mode);
      return false;
    }

    // Clear existing options
    selectElement.innerHTML = '';

    // Add team options
    teams.forEach((team, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = `${team.abbr} — ${team.name}`;
      selectElement.appendChild(option);
    });

    // Set default selection
    if (window.state?.userTeamId !== undefined && window.state.userTeamId < teams.length) {
      selectElement.value = String(window.state.userTeamId);
    } else {
      selectElement.value = '0';
    }

    console.log(`✅ fillTeamSelect: Populated ${teams.length} teams for mode: ${mode}`);
    return true;

  } catch (error) {
    console.error('Error in fillTeamSelect:', error);
    return false;
  }
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
        const L = window.state?.league;
        if (!L) {
            console.error('No league data available');
            return;
        }
        
        const teamSelect = document.getElementById('rosterTeam');
        // Ensure team select is filled only once
        if (teamSelect && !teamSelect.dataset.filled && window.fillTeamSelect) {
            window.fillTeamSelect(teamSelect);
            teamSelect.dataset.filled = '1';
            
            // Add change event listener for team selection
            if (!teamSelect.dataset.hasChangeListener) {
                teamSelect.addEventListener('change', window.handleTeamSelectionChange);
                teamSelect.dataset.hasChangeListener = '1';
            }
        }
        
        const preferredTeamId = window.state?.viewTeamId ?? window.state?.userTeamId;
        const teamId = parseInt(teamSelect?.value || preferredTeamId || '0', 10);
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
            // nameCell.style.color and text-decoration removed, handled by CSS fix
            
            tr.insertCell().textContent = player.pos || 'N/A';
            tr.insertCell().textContent = player.age || 'N/A';
            tr.insertCell().textContent = player.ovr || 'N/A';
            
            // Contract info
            const years = player.years || 0;
            const baseAnnual = player.baseAnnual || 0;
            tr.insertCell().textContent = `${years}yr / $${baseAnnual.toFixed(1)}M`;
            
            // Cap hit
            // Assuming window.capHitFor is defined elsewhere for full calculation
            const capHit = window.capHitFor ? window.capHitFor(player, 0) : baseAnnual;
            tr.insertCell().textContent = `$${capHit.toFixed(1)}M`;
            
            // Abilities
            const abilities = (player.abilities || []).slice(0, 2).join(', ') || 'None';
            const cellAbilities = tr.insertCell();
            cellAbilities.className = 'abilities';
            cellAbilities.textContent = abilities;
            
            // Add click handler for player details
            tr.addEventListener('click', (e) => {
                // Ensure clicking the checkbox doesn't trigger details
                if (!e.target.matches('input[type="checkbox"]')) {
                    showPlayerDetails(player);
                }
            });
        });
        
        // Assuming these functions are defined elsewhere or not strictly needed for this file's logic
        if (typeof setupRosterEvents === 'function') {
            setupRosterEvents();
        }
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
    // 🏆 ENHANCED: Added a ratings grid for better display of specific stats
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${player.name || 'Unknown Player'} <span class="muted-tag">${player.pos || 'N/A'} (OVR ${player.ovr || 'N/A'})</span></h2>
                <span class="close">&times;</span>
            </div>
            <div class="modal-body">
                <div class="player-info grid two">
                    <div class="player-basic">
                        <h4>Basic Info</h4>
                        <p><strong>Age:</strong> ${player.age || 'N/A'}</p>
                        <p><strong>Contract:</strong> ${player.years || 0} years, $${(player.baseAnnual || 0).toFixed(1)}M/year</p>
                        <p><strong>Cap Hit (Current):</strong> $${(window.capHitFor ? window.capHitFor(player, 0) : player.baseAnnual || 0).toFixed(1)}M</p>
                    </div>
                    ${player.ratings ? `
                        <div class="player-ratings">
                            <h4>Ratings Breakdown</h4>
                            <div class="ratings-grid">
                            ${Object.entries(player.ratings).map(([rating, value]) => `
                                <div class="rating-item">
                                    <span class="rating-name">${rating.toUpperCase()}:</span>
                                    <span class="rating-value">${value}</span>
                                </div>
                            `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
                ${player.abilities && player.abilities.length > 0 ? `
                    <div class="player-abilities mt">
                        <h4>Abilities/Traits</h4>
                        <p class="trait-list">${player.abilities.join(', ')}</p>
                    </div>
                ` : ''}
                <div class="player-actions mt">
                    <button class="btn primary" onclick="window.viewPlayerStats('${player.id}')">View Stats</button>
                    <button class="btn secondary" onclick="window.editPlayer('${player.id}')">Edit Player</button>
                </div>
            </div>
        </div>
    `;
    
    // Add temporary modal styles for the enhanced content
    const tempModalStyles = document.createElement('style');
    tempModalStyles.textContent = `
        .modal {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
        }
        .modal-content {
            background: var(--background, #111111); padding: 20px; border-radius: 12px; width: 90%; max-width: 700px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
        }
        .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--hairline); padding-bottom: 10px; margin-bottom: 15px; }
        .modal-header h2 { margin: 0; color: var(--text); font-size: 1.5rem; }
        .modal-header .muted-tag { font-size: 0.9rem; color: var(--text-muted); font-weight: 400; margin-left: 10px; }
        .close { cursor: pointer; font-size: 1.5rem; color: var(--text-muted); }
        .player-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .player-basic p { margin: 5px 0; font-size: 0.95rem; }
        .player-ratings h4, .player-abilities h4 { color: var(--accent); margin-top: 0; margin-bottom: 10px; }
        .ratings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 15px; font-size: 0.9rem; }
        .rating-item { display: flex; justify-content: space-between; }
        .rating-value { font-weight: 600; color: var(--text); }
        .trait-list { font-style: italic; color: var(--text); }
        .mt { margin-top: 20px; }
        .player-actions button { margin-right: 10px; padding: 8px 15px; border: none; border-radius: 6px; cursor: pointer; }
        .player-actions .primary { background: var(--accent); color: var(--on-accent, #fff); }
        .player-actions .secondary { background: var(--surface-secondary, #333); color: var(--text); }
        @media (max-width: 600px) { .player-info { grid-template-columns: 1fr; } }
    `;
    document.head.appendChild(tempModalStyles);

    document.body.appendChild(modal);
    
    // Close modal functionality
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.remove();
        tempModalStyles.remove();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            tempModalStyles.remove();
        }
    };
    
    modal.style.display = 'flex'; // Use flex to center
}

// window.renderStandings remains the same structure
window.renderStandings = function() {
    // ... This is where the renderStandings function goes ...
    // Placeholder to keep context
    console.log('Rendering Standings...'); 
    // This function needs the full logic from your game files.
};

window.renderHub = function() {
    console.log('Rendering hub...');
    try {
        const L = window.state?.league;
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
        
        // Render team ratings overview (assuming renderLeagueTeamRatings exists)
        if (window.renderLeagueTeamRatings) {
            window.renderLeagueTeamRatings(L, 'leagueTeamRatings');
        }
        
        // Render last week results
        renderLastWeekResults();
        
        console.log('✅ Hub rendered successfully');
        
    } catch (error) {
        console.error('Error rendering hub:', error);
    }
};

function renderPowerRankings() {
    const L = window.state?.league;
    if (!L || !L.teams) return;
    
    const powerList = document.getElementById('hubPower');
    if (!powerList) return;
    
    // Calculate power rankings based on record and point differential
    const teamsWithPower = L.teams.map(team => {
        // Use the team.record structure that is actually used
        const wins = team.record?.w || team.wins || 0;
        const losses = team.record?.l || team.losses || 0;
        const ties = team.record?.t || team.ties || 0;
        const pointsFor = team.record?.pf || team.ptsFor || 0;
        const pointsAgainst = team.record?.pa || team.ptsAgainst || 0;
        
        // Power score calculation using team ratings
        const winPct = (wins + ties * 0.5) / Math.max(1, wins + losses + ties);
        const pointDiff = pointsFor - pointsAgainst;
        
        // Use team ratings if available, otherwise fall back to individual player ratings
        let teamRating = 0;
        if (team.overallRating) {
            teamRating = team.overallRating;
        } else if (team.ovr) {
            teamRating = team.ovr;
        } else {
            // Calculate team rating on the fly
            if (window.calculateTeamRating) {
                const ratings = window.calculateTeamRating(team);
                teamRating = ratings.overall;
            } else {
                // Fallback: calculate basic rating from roster
                if (team.roster && team.roster.length > 0) {
                    const avgOvr = team.roster.reduce((sum, player) => sum + (player.ovr || 0), 0) / team.roster.length;
                    teamRating = Math.round(avgOvr);
                } else {
                    teamRating = 50; // Default rating for teams without roster data
                }
            }
        }
        
        // Simplified power score calculation
        const powerScore = (winPct * 100) + (pointDiff * 0.1) + teamRating; 
        
        return {
            ...team,
            powerScore,
            record: { w: wins, l: losses, t: ties, pf: pointsFor, pa: pointsAgainst } // Re-include full record
        };
    });
    
    // Sort by power score
    teamsWithPower.sort((a, b) => b.powerScore - a.powerScore);
    
    // Render top 10
    powerList.innerHTML = teamsWithPower.slice(0, 10).map((team, index) => {
        const record = team.record;
        const recordStr = `${record.w}-${record.l}-${record.t}`;
        const pointDiff = record.pf - record.pa;
        const pointDiffStr = pointDiff >= 0 ? `+${pointDiff}` : pointDiff.toString();
        
        // 🏆 ENHANCED: Use the 'user-team' class we fixed in CSS
        return `
            <li class="power-ranking-item ${team.id === window.state?.userTeamId ? 'user-team' : ''}">
                <span class="rank">${index + 1}</span>
                <span class="team-name">${team.name}</span>
                <span class="record">${recordStr}</span>
                <span class="point-diff">${pointDiffStr}</span>
            </li>
        `;
    }).join('');
}

function renderLastWeekResults() {
    const L = window.state?.league;
    if (!L) return;
    
    const resultsContainer = document.getElementById('hubResults');
    if (!resultsContainer) return;
    
    // Find last week's results from the resultsByWeek storage
    const lastWeek = Math.max(1, (L.week || 1) - 1);
    // Note: Assuming L.resultsByWeek is an array indexed by week (0-indexed for Week 1)
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
        const isUserTeam = result.home === window.state?.userTeamId || result.away === window.state?.userTeamId;
        
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
        const L = window.state?.league;
        if (!L) {
            console.error('No league data available');
            return;
        }
        
        const tradeContainer = document.getElementById('trade');
        if (!tradeContainer) return;
        
        // Check if trade system is available (will use the full renderTradeCenter below if the DOM elements exist)
        if (window.renderTradeCenter && document.getElementById('tradeValidate')) {
            window.renderTradeCenter();
            return;
        }
        
        // Fallback trade interface if no DOM structure or engine function is found
        tradeContainer.innerHTML = `
            <div class="card">
                <h2>Trade Center</h2>
                <div class="muted">Trade system not fully implemented yet or required DOM elements are missing.</div>
                <div class="actions mt">
                    <button class="btn primary" onclick="alert('Trade system coming soon!')">Make Trade</button>
                </div>
            </div>
        `;
        
        console.log('✅ Trade center rendered successfully (Fallback)');
        
    } catch (error) {
        console.error('Error rendering trade center:', error);
    }
};

// window.router remains the same structure
window.router = function() {
    // ... This is where the router function goes ...
    // Placeholder to keep context
    console.log('Running router...'); 
    // This function needs the full logic from your game files.
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
                                <option value="fictional" ${window.state?.namesMode === 'fictional' ? 'selected' : ''}>Fictional</option>
                                <option value="real" ${window.state?.namesMode === 'real' ? 'selected' : ''}>Real</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="gameMode">Game Mode:</label>
                            <select id="gameMode">
                                <option value="gm" ${window.state?.gameMode === 'gm' ? 'selected' : ''}>General Manager</option>
                                <option value="career" ${window.state?.gameMode === 'career' ? 'selected' : ''}>Career Mode</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="settingTheme">Theme:</label>
                            <select id="settingTheme">
                                <option value="dark" ${window.state?.theme !== 'light' ? 'selected' : ''}>Dark</option>
                                <option value="light" ${window.state?.theme === 'light' ? 'selected' : ''}>Light</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="settingSalaryCap" ${window.state?.settings?.salaryCapEnabled !== false ? 'checked' : ''}> Salary Cap Enabled</label>
                        </div>
                        <div class="form-group">
                            <label><input type="checkbox" id="settingCoachFiring" ${window.state?.settings?.allowCoachFiring !== false ? 'checked' : ''}> Coaches can be fired</label>
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

        const themeSelect = settingsContainer.querySelector('#settingTheme');
        const salaryCapToggle = settingsContainer.querySelector('#settingSalaryCap');
        const coachFiringToggle = settingsContainer.querySelector('#settingCoachFiring');

        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                if (!window.state) return;
                window.state.theme = e.target.value;
                if (window.applyTheme) window.applyTheme(window.state.theme);
                if (window.saveState) window.saveState();
            });
        }

        if (salaryCapToggle) {
            salaryCapToggle.addEventListener('change', (e) => {
                if (!window.state?.settings) return;
                window.state.settings.salaryCapEnabled = e.target.checked;
                if (window.saveState) window.saveState();
            });
        }

        if (coachFiringToggle) {
            coachFiringToggle.addEventListener('change', (e) => {
                if (!window.state?.settings) return;
                window.state.settings.allowCoachFiring = e.target.checked;
                if (window.saveState) window.saveState();
            });
        }

        console.log('✅ Settings rendered successfully');

    } catch (error) {
        console.error('Error rendering settings:', error);
    }
};

window.renderSaveDataManager = function() {
    const manager = document.getElementById('saveDataManager');
    if (!manager) return;

    const slots = (typeof window.listSaveSlots === 'function') ? window.listSaveSlots() : Array.from({ length: 5 }, () => null);
    const activeSlot = window.state?.saveSlot || (window.getActiveSaveSlot ? window.getActiveSaveSlot() : 1);

    const rows = slots.map((slotMeta, idx) => {
        const slotNumber = idx + 1;
        if (!slotMeta) {
            return `<div class="save-slot ${slotNumber === activeSlot ? 'active' : ''}">` +
                `<div><strong>Slot ${slotNumber}</strong> — Empty</div>` +
                `<button class="btn" data-slot="${slotNumber}">Switch to Slot</button>` +
            `</div>`;
        }

        const lastSaved = slotMeta.lastSaved ? new Date(slotMeta.lastSaved).toLocaleString() : 'Unknown';
        const teamLabel = slotMeta.team || 'Unknown team';
        return `<div class="save-slot ${slotNumber === activeSlot ? 'active' : ''}">` +
            `<div><strong>Slot ${slotNumber}</strong> — ${teamLabel} (Season ${slotMeta.season})</div>` +
            `<div class="muted small">Saved: ${lastSaved}</div>` +
            `<button class="btn" data-slot="${slotNumber}">Switch to Slot</button>` +
        `</div>`;
    }).join('');

    manager.innerHTML = `<div class="save-slot-list">${rows}</div>`;

    manager.querySelectorAll('button[data-slot]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slot = parseInt(e.target.getAttribute('data-slot'), 10);
            if (window.switchSaveSlot) {
                window.switchSaveSlot(slot);
            }
        });
    });
};

window.renderSaveSlotInfo = function() {
    const select = document.getElementById('saveSlotSelect');
    const info = document.getElementById('saveSlotInfo');
    const activeSlot = window.state?.saveSlot || (window.getActiveSaveSlot ? window.getActiveSaveSlot() : 1);

    if (select) {
        select.value = String(activeSlot);
    }

    if (!info) return;

    const meta = (typeof window.getSaveMetadata === 'function') ? window.getSaveMetadata(activeSlot) : null;
    if (!meta) {
        info.textContent = `Slot ${activeSlot}: Empty`;
        return;
    }
    const lastSaved = meta.lastSaved ? new Date(meta.lastSaved).toLocaleString() : 'Unknown';
    const teamLabel = meta.team || 'Unknown team';
    info.textContent = `Slot ${activeSlot}: ${teamLabel} (Season ${meta.season}) — Saved ${lastSaved}`;
};

window.bindSaveSlotSelect = function() {
    const select = document.getElementById('saveSlotSelect');
    if (!select) return;

    select.addEventListener('change', (e) => {
        const slot = parseInt(e.target.value, 10);
        if (window.switchSaveSlot) {
            window.switchSaveSlot(slot);
        }
    });
};

// Add team selection change handler for roster view
window.handleTeamSelectionChange = function() {
    console.log('🔄 Team selection changed');
    const teamSelect = document.getElementById('rosterTeam');
    if (teamSelect) {
        const selectedTeamId = parseInt(teamSelect.value);

        if (!isNaN(selectedTeamId) && window.state?.league?.teams) {
            // Track which team is being viewed without changing the actual user team selection
            window.state.viewTeamId = selectedTeamId;
            
            if (window.renderRoster) {
                console.log('Calling renderRoster...');
                window.renderRoster();
            } else {
                console.log('renderRoster function not available');
            }
        } else {
            console.log('Invalid team selection or league not ready');
        }
    } else {
        console.log('Team select element not found');
    }
};

// Alias for trade navigation; router expects openTradeCenter
window.openTradeCenter = function() {
    if (typeof window.renderTradeCenter === 'function') {
        window.renderTradeCenter();
    } else {
        console.warn('openTradeCenter: renderTradeCenter not available');
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

// 🏆 NOTE: enhanceNavigation, setupRosterEvents, updateReleaseButton are assumed to be defined elsewhere
function enhanceNavigation() {
    // ... Function body for navigation enhancement ...
    console.log('Navigation enhancement called.');
}

function setupRosterEvents() {
    // ... Function body for roster events setup ...
    console.log('Roster events setup called.');
}

function updateReleaseButton() {
    // ... Function body for update release button ...
    console.log('Update release button called.');
}


// --- INITIALIZATION ---
function initializeUI() {
  console.log('🎯 Initializing UI...');
  enhanceNavigation();
  if (window.renderSaveSlotInfo) {
    window.renderSaveSlotInfo();
  }
  if (window.bindSaveSlotSelect) {
    window.bindSaveSlotSelect();
  }
  if (window.state?.league && window.state?.onboarded) {
    // Use hash to route on startup
    const initialView = window.location.hash ? window.location.hash.substring(2) : 'hub';
    window.show(initialView);
    // If router is defined, run it after a short delay
    if (typeof window.router === 'function') {
        setTimeout(() => window.router(), 200); 
    }
  }
}

// Global functions for player actions
window.viewPlayerStats = function(playerId) {
  console.log('🔍 viewPlayerStats called with ID:', playerId);
  
  // Try to show player stats directly using the player stats viewer
  if (window.playerStatsViewer && window.playerStatsViewer.showPlayerStats) {
    window.playerStatsViewer.showPlayerStats(playerId);
  } else if (window.playerStatsViewer) {
    // Fallback: create a simple modal
    showSimplePlayerStats(playerId);
  } else {
    console.warn('Player stats viewer not available. Using simple fallback.');
    showSimplePlayerStats(playerId);
  }
};

// Fallback function for when player stats viewer isn't ready
function showSimplePlayerStats(playerId) {
  console.log('Using fallback player stats display for ID:', playerId);
  
  // Find player in current team roster
  if (!window.state?.league?.teams || window.state.userTeamId === undefined) {
    alert('No league data available');
    return;
  }
  
  // Search all teams since userTeamId might be changed in Roster view
  let player = null;
  for (const team of window.state.league.teams) {
      if (team.roster) {
          player = team.roster.find(p => p.id === playerId);
          if (player) break;
      }
  }
  
  if (!player) {
    alert('Player not found');
    return;
  }
  
  // Create simple modal (This is a simplified version of the one used in showPlayerDetails)
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${player.name} - Statistics</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="stats-section">
          <h3>Player Information</h3>
          <p><strong>Position:</strong> ${player.pos || 'N/A'}</p>
          <p><strong>Age:</strong> ${player.age || 'N/A'}</p>
          <p><strong>Overall:</strong> ${player.ovr || 'N/A'}</p>
        </div>
        ${player.ratings ? `
        <div class="stats-section mt">
          <h3>Ratings</h3>
          <div class="ratings-grid">
            ${Object.entries(player.ratings).map(([rating, value]) => `
              <div class="rating-item">
                <span class="rating-name">${rating.toUpperCase()}:</span>
                <span class="rating-value">${value}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Temporary modal styles (reused from showPlayerDetails, ensure it's removed on close)
  const tempModalStyles = document.createElement('style');
  tempModalStyles.textContent = `
    .modal {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 1000;
    }
    .modal-content {
        background: var(--background, #111111); padding: 20px; border-radius: 12px; width: 90%; max-width: 500px; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--hairline); padding-bottom: 10px; margin-bottom: 15px; }
    .modal-header h2 { margin: 0; color: var(--text); font-size: 1.5rem; }
    .close { cursor: pointer; font-size: 1.5rem; color: var(--text-muted); }
    .ratings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px 15px; font-size: 0.9rem; }
    .rating-item { display: flex; justify-content: space-between; }
    .rating-value { font-weight: 600; color: var(--text); }
    .mt { margin-top: 20px; }
  `;
  document.head.appendChild(tempModalStyles);
  
  // Add close functionality
  const closeBtn = modal.querySelector('.close');
  closeBtn.onclick = () => {
    modal.remove();
    tempModalStyles.remove();
  };
  modal.onclick = (e) => {
    if (e.target === modal) {
        modal.remove();
        tempModalStyles.remove();
    }
  };
  
  document.body.appendChild(modal);
  modal.style.display = 'flex';
}

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

/**
 * Renders the full trade center: lets users pick players/picks, validates trades,
 * and executes them via the trade engine.
 */
window.renderTradeCenter = function () {
  console.log('Rendering Trade Center…');

  const L = window.state?.league;
  if (!L || !Array.isArray(L.teams)) {
    console.error('renderTradeCenter: no league/teams');
    return;
  }

  const userTeamId = window.state?.userTeamId ?? 0;
  const userTeam = L.teams[userTeamId];
  if (!userTeam) {
    console.error('renderTradeCenter: user team not found', userTeamId);
    return;
  }

  const tradeContainer = document.getElementById('trade');
  if (!tradeContainer) {
    console.error('renderTradeCenter: #trade not found');
    return;
  }

  const selectA     = document.getElementById('tradeA');
  const selectB     = document.getElementById('tradeB');
  const listA       = document.getElementById('tradeListA');
  const listB       = document.getElementById('tradeListB');
  const pickListA   = document.getElementById('pickListA');
  const pickListB   = document.getElementById('pickListB');
  const btnValidate = document.getElementById('tradeValidate');
  const btnExecute  = document.getElementById('tradeExecute');
  const info        = document.getElementById('tradeInfo');

  if (!selectA || !selectB || !listA || !listB || !pickListA || !pickListB || !btnValidate || !btnExecute || !info) {
    // This happens if the HTML structure for the trade view is missing/incomplete
    console.error('renderTradeCenter: missing one or more trade DOM elements. Falling back.');
    tradeContainer.innerHTML = `<div class="card"><h2 class="error">Trade Center Error</h2><p>Missing required HTML elements. Please check the trade view structure.</p></div>`;
    return;
  }

  // Avoid re-attaching listeners on every navigation
  if (!tradeContainer._tradeState) {
    tradeContainer._tradeState = {
      fromAssets: [],
      toAssets: []
    };
  }
  const state = tradeContainer._tradeState;

  // --- 1) Setup YOUR TEAM select (tradeA) ---

  selectA.innerHTML = '';
  const optA = document.createElement('option');
  optA.value = String(userTeamId);
  optA.textContent = userTeam.name || 'Your Team';
  selectA.appendChild(optA);
  selectA.value = String(userTeamId);
  selectA.disabled = true; // keep as your controlled team

  // --- 2) Setup OPPONENT TEAM select (tradeB) ---

  selectB.innerHTML = '';
  L.teams.forEach((t, idx) => {
    if (!t) return;
    if (idx === userTeamId) return; // skip your own team
    const opt = document.createElement('option');
    opt.value = String(idx);
    opt.textContent = t.name || `Team ${idx}`;
    selectB.appendChild(opt);
  });
  selectB.disabled = false;

  if (!selectB.options.length) {
    info.textContent = 'No other teams available to trade with.';
    btnValidate.disabled = true;
    btnExecute.disabled = true;
    return;
  }

  if (!selectB.value && selectB.options.length > 0) {
    selectB.value = selectB.options[0].value;
  }

  // --- 3) Helpers for asset selection ---

  function clearSelections() {
    state.fromAssets = [];
    state.toAssets = [];
    btnExecute.disabled = true;
    info.textContent = '';
    // also clear visual selection
    tradeContainer.querySelectorAll('.asset-item.selected').forEach(el => {
      el.classList.remove('selected');
    });
  }

  function toggleAsset(targetArray, asset, element) {
    const idx = targetArray.findIndex(a =>
      a.kind === asset.kind &&
      (a.playerId
        ? a.playerId === asset.playerId
        : (a.year === asset.year && a.round === asset.round))
    );

    if (idx === -1) {
      targetArray.push(asset);
      element.classList.add('selected');
    } else {
      targetArray.splice(idx, 1);
      element.classList.remove('selected');
    }

    btnExecute.disabled = true; // force re-validate after any change
    info.textContent = 'Selections changed. Re-validate trade.';
  }

  function renderTeamLists() {
    const oppId = parseInt(selectB.value, 10);
    const oppTeam = L.teams[oppId];
    if (!oppTeam) {
      console.error('renderTradeCenter: opponent team not found', oppId);
      return;
    }

    listA.innerHTML = '<h4>Your Players</h4>';
    listB.innerHTML = '<h4>Their Players</h4>';
    pickListA.innerHTML = '<h4>Your Picks</h4>';
    pickListB.innerHTML = '<h4>Their Picks</h4>';
    
    // Clear selection state and visuals for the new opponent
    clearSelections();

    function renderRosterList(team, container, isUserSide) {
      (team.roster || []).forEach(player => {
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.textContent = `${player.name} (${player.pos || 'POS'} • OVR ${player.ovr ?? 'N/A'})`;

        const asset = { kind: 'player', playerId: player.id };

        item.addEventListener('click', () => {
          if (isUserSide) {
            toggleAsset(state.fromAssets, asset, item);
          } else {
            toggleAsset(state.toAssets, asset, item);
          }
        });

        container.appendChild(item);
      });
    }

    function renderPickList(team, container, isUserSide) {
      // Assuming team.picks is an array of {year, round}
      (team.picks || []).forEach(pk => { 
        const item = document.createElement('div');
        item.className = 'asset-item';
        item.textContent = `${pk.year} Round ${pk.round}`;

        const asset = { kind: 'pick', year: pk.year, round: pk.round };

        item.addEventListener('click', () => {
          if (isUserSide) {
            toggleAsset(state.fromAssets, asset, item);
          } else {
            toggleAsset(state.toAssets, asset, item);
          }
        });

        container.appendChild(item);
      });
    }

    renderRosterList(userTeam, listA, true);
    renderRosterList(oppTeam, listB, false);
    renderPickList(userTeam, pickListA, true);
    renderPickList(oppTeam, pickListB, false);
  }

  // Initial render
  clearSelections();
  renderTeamLists();

  // --- 4) When you change the CPU team, re-render lists ---

  if (!selectB._hasTradeListener) {
    selectB.addEventListener('change', () => {
      // Reset selections so stale assets don't carry over between teams
      clearSelections();
      renderTeamLists();
    });
    selectB._hasTradeListener = true;
  }

  // --- 5) Validate and Execute buttons ---

  if (!btnValidate._hasTradeListener) {
    btnValidate.addEventListener('click', () => {
      const oppId = parseInt(selectB.value, 10);
      if (isNaN(oppId)) {
        info.textContent = 'Select a team to trade with.';
        return;
      }

      if (!state.fromAssets.length && !state.toAssets.length) {
        info.textContent = 'Select at least one player or pick on either side.';
        return;
      }

      // 🏆 CRITICAL: Check for evaluateTrade function existence (assumed to be loaded)
      if (typeof window.evaluateTrade !== 'function') {
        info.textContent = 'Trade engine not loaded.';
        return;
      }

      const evalResult = window.evaluateTrade(
        userTeamId,
        oppId,
        state.fromAssets,
        state.toAssets
      );

      if (!evalResult) {
        info.textContent = 'Unable to evaluate trade. Check asset types.';
        btnExecute.disabled = true;
        return;
      }

      const from = evalResult.fromValue;
      const to   = evalResult.toValue;
      const cpuLossLimit = -15; // Assuming the rule is -15

      // Show results clearly (ADHD friendly!)
      info.innerHTML =
        `You Give (Value): <span style="font-weight:700; color: #ff9900;">${from.give.toFixed(1)}</span> ` +
        `| You Get (Value): <span style="font-weight:700; color: var(--accent);">${from.get.toFixed(1)}</span>. ` +
        `<br>Net Gain: <span style="font-weight:700; color: ${from.delta >= 0 ? '#3c9' : '#f66'};">${from.delta.toFixed(1)}</span>. ` +
        `CPU's Net: ${to.delta.toFixed(1)} (Must be > ${cpuLossLimit}).`;

      btnExecute.disabled = to.delta < cpuLossLimit;
      if (!btnExecute.disabled) {
          info.innerHTML += '<br>✅ **Trade is viable!** Hit Execute.'
      } else {
          info.innerHTML += '<br>❌ **Trade rejected by CPU rules.** Try adding more assets.'
      }
    });
    btnValidate._hasTradeListener = true;
  }

  if (!btnExecute._hasTradeListener) {
    btnExecute.addEventListener('click', () => {
      const oppId = parseInt(selectB.value, 10);
      if (isNaN(oppId)) return;

      // 🏆 CRITICAL: Check for proposeUserTrade function existence (assumed to be loaded)
      if (typeof window.proposeUserTrade !== 'function') {
        info.textContent = 'Trade engine not loaded.';
        return;
      }

      // Check if validation was skipped (must re-validate)
      if (btnExecute.disabled && info.textContent.indexOf('viable') === -1) {
          info.textContent = 'Must validate trade before executing!';
          return;
      }
      
      const result = window.proposeUserTrade(oppId, state.fromAssets, state.toAssets, {
        cpuLossLimit: -15
      });

      if (!result || !result.accepted) {
        info.textContent = 'Trade rejected by CPU. (Check console for details).';
        btnExecute.disabled = true;
        return;
      }

      info.textContent = 'Trade completed! 🥳 Time to check the roster.';
      clearSelections();
      // league mutated in-place by trade.js; just re-render lists
      renderTeamLists();
      // Trigger a global update if available
      if (typeof window.updateAllViews === 'function') {
          window.updateAllViews();
      }
    });
    btnExecute._hasTradeListener = true;
  }

  console.log('✅ Trade Center rendered');
};
// --- GLOBAL EXPORTS ---
window.enhanceNavigation = enhanceNavigation;
window.setupRosterEvents = setupRosterEvents;
window.initializeUIFixes = initializeUI;
window.renderPowerRankings = renderPowerRankings;

console.log('🎉 UI master file loaded successfully!');
