// ui-fixes.js - Complete fix for navigation and rendering
'use strict';

console.log('🔧 Loading UI fixes...');

// Fix 1: Correct show function that matches HTML structure
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

// Fix 2: Corrected renderRoster function
window.renderRoster = function() {
  console.log('Rendering roster...');
  
  try {
    const L = state.league;
    if (!L) {
      console.error('No league available');
      return;
    }
    
    // Get team selection
    const teamSelect = document.getElementById('rosterTeam');
    if (teamSelect && !teamSelect.dataset.filled && window.fillTeamSelect) {
      window.fillTeamSelect(teamSelect);
      teamSelect.dataset.filled = '1';
    }
    
    const teamId = parseInt(teamSelect?.value || state.userTeamId || '0', 10);
    const team = L.teams[teamId];
    
    if (!team) {
      console.error('No team found for roster');
      return;
    }
    
    // Update title
    const titleEl = document.getElementById('rosterTitle');
    if (titleEl) {
      titleEl.textContent = `${team.name} Roster`;
    }
    
    // Render roster table - target correct element
    const rosterTable = document.getElementById('rosterTable');
    if (!rosterTable) {
      console.error('Roster table element not found');
      return;
    }
    
    if (!team.roster || team.roster.length === 0) {
      rosterTable.innerHTML = '<tr><td colspan="8">No players on roster</td></tr>';
      return;
    }
    
    // Build table with proper headers and data
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
      <tbody>
        ${team.roster.map((player, index) => {
          const capHit = window.capHitFor ? window.capHitFor(player, 0) : player.baseAnnual || 0;
          const abilities = (player.abilities || []).slice(0, 2).join(', ') || 'None';
          const contract = `${player.years}yr / $${(player.baseAnnual || 0).toFixed(1)}M`;
          
          return `
            <tr data-player-id="${player.id}">
              <td><input type="checkbox" name="playerSelect" value="${player.id}"></td>
              <td>${player.name}</td>
              <td>${player.pos}</td>
              <td>${player.age}</td>
              <td>${player.ovr}</td>
              <td>${contract}</td>
              <td>$${capHit.toFixed(1)}M</td>
              <td class="abilities">${abilities}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;
    
    // Set up release button functionality
    setupRosterEvents();
    
    console.log('✅ Roster rendered successfully');
    
  } catch (error) {
    console.error('Error rendering roster:', error);
    const rosterTable = document.getElementById('rosterTable');
    if (rosterTable) {
      rosterTable.innerHTML = '<tr><td colspan="8">Error loading roster</td></tr>';
    }
  }
};

// Fix 3: Setup roster events (for release functionality)
function setupRosterEvents() {
  // Select all checkbox
  const selectAllEl = document.getElementById('selectAllPlayers');
  if (selectAllEl) {
    selectAllEl.addEventListener('change', function() {
      const checkboxes = document.querySelectorAll('input[name="playerSelect"]');
      checkboxes.forEach(cb => cb.checked = this.checked);
      updateReleaseButton();
    });
  }
  
  // Individual checkboxes
  const checkboxes = document.querySelectorAll('input[name="playerSelect"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', updateReleaseButton);
  });
  
  // Release button
  const releaseBtn = document.getElementById('btnRelease');
  if (releaseBtn) {
    releaseBtn.addEventListener('click', function() {
      const selected = Array.from(document.querySelectorAll('input[name="playerSelect"]:checked'))
                          .map(cb => cb.value);
      
      if (selected.length === 0) {
        window.setStatus('No players selected for release');
        return;
      }
      
      if (confirm(`Release ${selected.length} player(s)?`)) {
        if (window.releaseSelected) {
          window.releaseSelected(selected);
        } else {
          window.setStatus('Release function not available');
        }
      }
    });
  }
}

function updateReleaseButton() {
  const releaseBtn = document.getElementById('btnRelease');
  const selected = document.querySelectorAll('input[name="playerSelect"]:checked');
  
  if (releaseBtn) {
    releaseBtn.disabled = selected.length === 0;
    releaseBtn.textContent = selected.length > 0 ? 
      `Release ${selected.length} Player(s)` : 'Release Selected';
  }
}

// Fix 4: Corrected renderStandings function
window.renderStandings = function() {
  console.log('Rendering standings...');
  
  try {
    const L = state.league;
    if (!L || !L.teams) {
      console.error('No league or teams available');
      return;
    }
    
    // Target correct element
    const standingsWrap = document.getElementById('standingsWrap');
    if (!standingsWrap) {
      console.error('Standings container not found');
      return;
    }
    
    // Division names
    const divisionNames = ['East', 'North', 'South', 'West'];
    const conferenceNames = ['AFC', 'NFC'];
    
    let html = '';
    
    // Render each conference
    conferenceNames.forEach((confName, confIndex) => {
      html += `<div class="conference"><h3>${confName}</h3><div class="divisions">`;
      
      // Render each division
      divisionNames.forEach((divName, divIndex) => {
        const divTeams = L.teams.filter(t => t.conf === confIndex && t.div === divIndex);
        
        // Sort by record
        divTeams.sort((a, b) => {
          const aWins = a.record?.w || a.wins || 0;
          const bWins = b.record?.w || b.wins || 0;
          
          if (aWins !== bWins) return bWins - aWins;
          
          const aPF = a.record?.pf || a.ptsFor || 0;
          const aPA = a.record?.pa || a.ptsAgainst || 0;
          const bPF = b.record?.pf || b.ptsFor || 0;
          const bPA = b.record?.pa || b.ptsAgainst || 0;
          
          return (bPF - bPA) - (aPF - aPA);
        });
        
        html += `
          <div class="division">
            <h4>${divName}</h4>
            <table class="table standings-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>W</th>
                  <th>L</th>
                  <th>T</th>
                  <th>PF</th>
                  <th>PA</th>
                  <th>Diff</th>
                </tr>
              </thead>
              <tbody>
                ${divTeams.map(team => {
                  const wins = team.record?.w || team.wins || 0;
                  const losses = team.record?.l || team.losses || 0;
                  const ties = team.record?.t || team.ties || 0;
                  const pf = team.record?.pf || team.ptsFor || 0;
                  const pa = team.record?.pa || team.ptsAgainst || 0;
                  const diff = pf - pa;
                  
                  const isUserTeam = team.id === (state.userTeamId || state.player?.teamId);
                  const userClass = isUserTeam ? ' class="user-team"' : '';
                  
                  return `
                    <tr${userClass}>
                      <td>${team.name}${isUserTeam ? ' (You)' : ''}</td>
                      <td>${wins}</td>
                      <td>${losses}</td>
                      <td>${ties}</td>
                      <td>${pf}</td>
                      <td>${pa}</td>
                      <td>${diff >= 0 ? '+' : ''}${diff}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      });
      
      html += '</div></div>';
    });
    
    standingsWrap.innerHTML = html;
    
    console.log('✅ Standings rendered successfully');
    
  } catch (error) {
    console.error('Error rendering standings:', error);
    const standingsWrap = document.getElementById('standingsWrap');
    if (standingsWrap) {
      standingsWrap.innerHTML = '<p>Error loading standings</p>';
    }
  }
};

// Fix 5: Enhanced router function
window.router = function() {
  const path = location.hash || '#/hub';
  const viewName = path.slice(2); // Remove #/
  
  console.log('🧭 Routing to:', viewName);
  
  // Always show the view first
  window.show(viewName);
  
  // Only render if game is initialized
  if (!state.league || !state.onboarded) {
    console.log('Game not initialized, skipping view rendering');
    return;
  }
  
  // Render specific views
  try {
    switch(viewName) {
      case 'hub':
        if (window.renderHub) window.renderHub();
        break;
      case 'roster':
        if (window.renderRoster) window.renderRoster();
        break;
      case 'standings':
        if (window.renderStandings) window.renderStandings();
        break;
      case 'freeagency':
        if (window.renderFreeAgency) window.renderFreeAgency();
        break;
      case 'draft':
        if (window.renderDraft) window.renderDraft();
        break;
      case 'scouting':
        if (window.renderDraft) window.renderDraft(); // Draft and scouting share view
        break;
      case 'trade':
        if (window.renderTrade) window.renderTrade();
        break;
      case 'coaching':
        if (window.renderCoachingStats) window.renderCoachingStats();
        break;
      default:
        console.log('No specific renderer for view:', viewName);
    }
  } catch (error) {
    console.error('Error rendering view:', viewName, error);
    window.setStatus('Error loading ' + viewName + ' view');
  }
};

// Fix 6: Enhanced event delegation for better navigation
function enhanceNavigation() {
  console.log('🧭 Enhancing navigation...');
  
  // Remove existing hash change listener if any
  window.removeEventListener('hashchange', window.router);
  
  // Add enhanced hash change listener
  window.addEventListener('hashchange', window.router);
  
  // Handle nav pill clicks directly
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('nav-pill')) {
      e.preventDefault();
      const href = e.target.getAttribute('href');
      if (href && href.startsWith('#/')) {
        location.hash = href;
      }
    }
  });
  
  // Initial route
  setTimeout(() => {
    window.router();
  }, 100);
  
  console.log('✅ Navigation enhanced');
}

// Fix 7: Placeholder render functions for missing views
window.renderTrade = function() {
  console.log('Rendering trade view...');
  
  const tradeView = document.getElementById('trade');
  if (!tradeView) return;
  
  // Basic functionality - will be enhanced later
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
  
  console.log('✅ Trade view rendered (basic)');
};

// Fix 8: Enhanced renderHub with better error handling
window.renderHub = function() {
  console.log('Rendering hub...');
  
  try {
    const L = state.league;
    if (!L) {
      console.error('No league available for hub');
      return;
    }
    
    // Update season display
    const seasonEls = ['hubSeason', 'seasonNow'];
    seasonEls.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = L.year || '2025';
    });
    
    // Update week display
    const weekEl = document.getElementById('hubWeek');
    if (weekEl) weekEl.textContent = L.week || '1';
    
    // Update weeks total
    const weeksEl = document.getElementById('hubWeeks');
    if (weeksEl) {
      const totalWeeks = L.schedule?.weeks?.length || 18;
      weeksEl.textContent = totalWeeks;
    }
    
    // Update games count for current week
    const gamesEl = document.getElementById('hubGames');
    if (gamesEl) {
      const scheduleWeeks = L.schedule?.weeks || L.schedule || [];
      const currentWeek = scheduleWeeks[L.week - 1];
      const gamesCount = currentWeek?.games?.length || 0;
      gamesEl.textContent = gamesCount;
    }
    
    // Update power rankings (top 10)
    const powerEl = document.getElementById('hubPower');
    if (powerEl && L.teams) {
      const sortedTeams = [...L.teams].sort((a, b) => {
        const aWins = a.record?.w || a.wins || 0;
        const bWins = b.record?.w || b.wins || 0;
        if (aWins !== bWins) return bWins - aWins;
        
        const aPF = a.record?.pf || a.ptsFor || 0;
        const aPA = a.record?.pa || a.ptsAgainst || 0;
        const bPF = b.record?.pf || b.ptsFor || 0;
        const bPA = b.record?.pa || b.ptsAgainst || 0;
        
        return (bPF - bPA) - (aPF - aPA);
      });
      
      powerEl.innerHTML = sortedTeams.slice(0, 10).map((team, i) => {
        const wins = team.record?.w || team.wins || 0;
        const losses = team.record?.l || team.losses || 0;
        const ties = team.record?.t || team.ties || 0;
        const isUserTeam = team.id === (state.userTeamId || state.player?.teamId);
        
        return `<li${isUserTeam ? ' class="user-team"' : ''}>${i + 1}. ${team.name} (${wins}-${losses}${ties > 0 ? `-${ties}` : ''})</li>`;
      }).join('');
    }
    
    // Show last week's results
    renderLastWeekResults();
    
    console.log('✅ Hub rendered successfully');
    
  } catch (error) {
    console.error('Error rendering hub:', error);
  }
};

// Fix 9: Render last week results
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
      if (result.bye !== undefined) {
        const team = L.teams[result.bye];
        return `<div class="result-item">${team?.name || 'Team'} - BYE</div>`;
      }
      
      const home = L.teams[result.home];
      const away = L.teams[result.away];
      
      if (!home || !away) return '';
      
      const homeScore = result.scoreHome || 0;
      const awayScore = result.scoreAway || 0;
      const winner = homeScore > awayScore ? home : away;
      
      return `
        <div class="result-item">
          <span class="teams">${away.abbr} ${awayScore} @ ${home.abbr} ${homeScore}</span>
          <span class="winner">${winner.abbr} wins</span>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error rendering results:', error);
  }
}

// Fix 10: Add CSS for new UI elements
const enhancedCSS = `
.user-team {
  background: rgba(10, 132, 255, 0.1) !important;
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
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.standings-table {
  margin: 0;
  font-size: 0.875rem;
}

.standings-table td {
  padding: 0.5rem;
}

.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: var(--surface);
  border-radius: var(--radius-md);
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.result-item .teams {
  color: var(--text);
}

.result-item .winner {
  color: var(--accent);
  font-weight: 600;
}

.abilities {
  font-size: 0.75rem;
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
    font-size: 0.75rem;
  }
  
  .standings-table th,
  .standings-table td {
    padding: 0.25rem;
  }
}
`;

// Inject CSS
const styleElement = document.createElement('style');
styleElement.textContent = enhancedCSS;
document.head.appendChild(styleElement);

// Fix 11: Initialize everything when DOM is ready
function initializeUIFixes() {
  console.log('🎯 Initializing UI fixes...');
  
  // Enhance navigation
  enhanceNavigation();
  
  // Set up team selection dropdowns
  const teamSelects = ['rosterTeam', 'faTeam', 'draftTeam', 'tradeA', 'tradeB'];
  teamSelects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select && select.options.length === 0 && window.fillTeamSelect) {
      window.fillTeamSelect(select);
    }
  });
  
  // Initial render if game is loaded
  if (state.league && state.onboarded) {
    const currentHash = location.hash.slice(2) || 'hub';
    setTimeout(() => {
      window.router();
    }, 200);
  }
  
  console.log('✅ UI fixes initialized successfully');
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeUIFixes);
} else {
  setTimeout(initializeUIFixes, 100);
}

// Export for manual fixing if needed
window.enhanceNavigation = enhanceNavigation;
window.setupRosterEvents = setupRosterEvents;
window.initializeUIFixes = initializeUIFixes;

console.log('🎉 UI fixes loaded successfully!');
