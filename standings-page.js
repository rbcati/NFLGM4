// standings-page.js - Comprehensive Standings System
'use strict';

/**
 * Renders the complete standings view with multiple tabs and sorting options
 */
function renderStandingsPage() {
  console.log('Rendering dedicated standings page...');
  
  const L = state.league;
  if (!L || !L.teams) {
    console.error('No league data available for standings');
    return;
  }
  
  // Check if we should use the dedicated standings view or the simple one
  const standingsView = document.getElementById('standings');
  const standingsWrap = document.getElementById('standingsWrap');
  
  if (!standingsView && !standingsWrap) {
    console.error('No standings container found');
    return;
  }
  
  // Calculate all standings data
  const standingsData = calculateAllStandings(L);
  
  // Use the dedicated standings view if available, otherwise use the simple wrapper
  const targetContainer = standingsView || standingsWrap;
  
  if (standingsView) {
    // Use the dedicated standings view with tabs
    standingsView.innerHTML = `
      <div class="card">
        <div class="standings-header">
          <h2>NFL Standings</h2>
          <div class="standings-controls">
            <div class="season-info">
              <span class="season-year">${L.year}</span>
              <span class="week-info">Week ${L.week}</span>
            </div>
            <div class="standings-tabs">
              <button class="standings-tab active" data-tab="division">Division</button>
              <button class="standings-tab" data-tab="conference">Conference</button>
              <button class="standings-tab" data-tab="overall">Overall</button>
              <button class="standings-tab" data-tab="schedule">Schedule</button>
              <button class="standings-tab" data-tab="playoff">Playoff Picture</button>
            </div>
          </div>
        </div>
        
        <div class="standings-content">
          <div id="standings-division" class="standings-section active">
            ${renderDivisionStandings(standingsData)}
          </div>
          
          <div id="standings-conference" class="standings-section">
            ${renderConferenceStandings(standingsData)}
          </div>
          
          <div id="standings-overall" class="standings-section">
            ${renderOverallStandings(standingsData)}
          </div>
          
          <div id="standings-schedule" class="standings-section">
            ${renderScheduleStandings(standingsData)}
          </div>
          
          <div id="standings-playoff" class="standings-section">
            ${renderPlayoffPicture(standingsData)}
          </div>
        </div>
      </div>
    `;
    
    // Set up tab switching
    setupStandingsTabs();
    
    // Make teams clickable
    setTimeout(() => makeTeamsClickable(), 100);
  } else {
    // Use the simple standings wrapper
    targetContainer.innerHTML = `
      <div class="card">
        <h2>League Standings</h2>
        <div class="conferences-grid">
          <div class="conference-standings">
            <h3 class="conference-title">AFC</h3>
            ${renderSimpleConferenceStandings(standingsData.afc)}
          </div>
          <div class="conference-standings">
            <h3 class="conference-title">NFC</h3>
            ${renderSimpleConferenceStandings(standingsData.nfc)}
          </div>
        </div>
      </div>
    `;
    
    // Make teams clickable in simple standings too
    setTimeout(() => makeTeamsClickable(), 100);
  }
  
  console.log('✅ Standings page rendered successfully');
}

/**
 * Calculate all standings data needed for different views
 * @param {Object} league - League object
 * @returns {Object} Complete standings data
 */
function calculateAllStandings(league) {
  const teams = [...league.teams];
  
  // Add calculated fields to each team
  teams.forEach(team => {
    // Use the direct team properties that are set by simulation
    team.wins = team.wins || 0;
    team.losses = team.losses || 0;
    team.ties = team.ties || 0;
    team.pointsFor = team.ptsFor || 0;
    team.pointsAgainst = team.ptsAgainst || 0;
    team.pointDifferential = team.pointsFor - team.pointsAgainst;
    team.winPercentage = calculateWinPercentage(team.wins, team.losses, team.ties);
    team.gamesPlayed = team.wins + team.losses + team.ties;
    team.remaining = 17 - team.gamesPlayed;
  });
  
  // Group by conference and division
  const afc = teams.filter(t => t.conf === 0);
  const nfc = teams.filter(t => t.conf === 1);
  
  const afcDivisions = groupByDivision(afc);
  const nfcDivisions = groupByDivision(nfc);
  
  // Sort each division
  Object.keys(afcDivisions).forEach(div => {
    afcDivisions[div] = sortTeamsByRecord(afcDivisions[div]);
  });
  Object.keys(nfcDivisions).forEach(div => {
    nfcDivisions[div] = sortTeamsByRecord(nfcDivisions[div]);
  });
  
  // Sort conferences
  const afcSorted = sortTeamsByRecord(afc);
  const nfcSorted = sortTeamsByRecord(nfc);
  
  // Calculate playoff scenarios
  const playoffPicture = calculatePlayoffPicture(afcSorted, nfcSorted);
  
  return {
    afc: {
      teams: afcSorted,
      divisions: afcDivisions
    },
    nfc: {
      teams: nfcSorted,
      divisions: nfcDivisions
    },
    overall: sortTeamsByRecord(teams),
    playoffs: playoffPicture
  };
}

/**
 * Group teams by division
 * @param {Array} teams - Teams in conference
 * @returns {Object} Teams grouped by division
 */
function groupByDivision(teams) {
  const divisions = {
    0: [], // East
    1: [], // North
    2: [], // South
    3: []  // West
  };
  
  teams.forEach(team => {
    if (divisions[team.div]) {
      divisions[team.div].push(team);
    }
  });
  
  return divisions;
}

/**
 * Sort teams by record using NFL tiebreaker rules
 * @param {Array} teams - Teams to sort
 * @returns {Array} Sorted teams
 */
function sortTeamsByRecord(teams) {
  return teams.sort((a, b) => {
    // First: Win percentage
    if (a.winPercentage !== b.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }
    
    // Second: Head-to-head (simplified - not implemented)
    // Third: Division record (simplified - not implemented)
    // Fourth: Conference record (simplified - not implemented)
    
    // Fifth: Point differential
    if (a.pointDifferential !== b.pointDifferential) {
      return b.pointDifferential - a.pointDifferential;
    }
    
    // Sixth: Points for
    if (a.pointsFor !== b.pointsFor) {
      return b.pointsFor - a.pointsFor;
    }
    
    // Seventh: Points against (lower is better)
    return a.pointsAgainst - b.pointsAgainst;
  });
}

/**
 * Calculate playoff picture
 * @param {Array} afcTeams - AFC teams sorted by record
 * @param {Array} nfcTeams - NFC teams sorted by record
 * @returns {Object} Playoff picture data
 */
function calculatePlayoffPicture(afcTeams, nfcTeams) {
  const afcPlayoffs = afcTeams.slice(0, 7);
  const nfcPlayoffs = nfcTeams.slice(0, 7);
  
  const afcBubble = afcTeams.slice(7, 10);
  const nfcBubble = nfcTeams.slice(7, 10);
  
  return {
    afc: {
      playoffs: afcPlayoffs,
      bubble: afcBubble
    },
    nfc: {
      playoffs: nfcPlayoffs,
      bubble: nfcBubble
    }
  };
}

/**
 * Render division standings
 * @param {Object} standingsData - All standings data
 * @returns {string} HTML string
 */
function renderDivisionStandings(standingsData) {
  const divisionNames = ['East', 'North', 'South', 'West'];
  const userTeamId = state.userTeamId || 0;
  
  return `
    <div class="conferences-grid">
      <div class="conference-standings">
        <h3 class="conference-title">AFC</h3>
        <div class="divisions-grid">
          ${divisionNames.map((divName, divIndex) => {
            const teams = standingsData.afc.divisions[divIndex] || [];
            return `
              <div class="division-card">
                <h4 class="division-title">AFC ${divName}</h4>
                <table class="standings-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>W</th>
                      <th>L</th>
                      <th>T</th>
                      <th>PCT</th>
                      <th>PF</th>
                      <th>PA</th>
                      <th>DIFF</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teams.map((team, index) => `
                      <tr class="${team.id === userTeamId ? 'user-team' : ''} ${index === 0 ? 'division-leader' : ''}">
                        <td class="team-name">
                          ${index === 0 ? '<span class="division-crown">👑</span>' : ''}
                          ${team.name}
                        </td>
                        <td>${team.wins}</td>
                        <td>${team.losses}</td>
                        <td>${team.ties}</td>
                        <td>${team.winPercentage.toFixed(3)}</td>
                        <td>${team.pointsFor}</td>
                        <td>${team.pointsAgainst}</td>
                        <td class="${team.pointDifferential >= 0 ? 'positive' : 'negative'}">
                          ${team.pointDifferential > 0 ? '+' : ''}${team.pointDifferential}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}
        </div>
      </div>
      
      <div class="conference-standings">
        <h3 class="conference-title">NFC</h3>
        <div class="divisions-grid">
          ${divisionNames.map((divName, divIndex) => {
            const teams = standingsData.nfc.divisions[divIndex] || [];
            return `
              <div class="division-card">
                <h4 class="division-title">NFC ${divName}</h4>
                <table class="standings-table">
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>W</th>
                      <th>L</th>
                      <th>T</th>
                      <th>PCT</th>
                      <th>PF</th>
                      <th>PA</th>
                      <th>DIFF</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${teams.map((team, index) => `
                      <tr class="${team.id === userTeamId ? 'user-team' : ''} ${index === 0 ? 'division-leader' : ''}">
                        <td class="team-name">
                          ${index === 0 ? '<span class="division-crown">👑</span>' : ''}
                          ${team.name}
                        </td>
                        <td>${team.wins}</td>
                        <td>${team.losses}</td>
                        <td>${team.ties}</td>
                        <td>${team.winPercentage.toFixed(3)}</td>
                        <td>${team.pointsFor}</td>
                        <td>${team.pointsAgainst}</td>
                        <td class="${team.pointDifferential >= 0 ? 'positive' : 'negative'}">
                          ${team.pointDifferential > 0 ? '+' : ''}${team.pointDifferential}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

/**
 * Render conference standings
 * @param {Object} standingsData - All standings data
 * @returns {string} HTML string
 */
function renderConferenceStandings(standingsData) {
  const userTeamId = state.userTeamId || 0;
  
  return `
    <div class="conferences-grid">
      <div class="conference-standings">
        <h3 class="conference-title">AFC Conference Standings</h3>
        <table class="standings-table conference-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>PCT</th>
              <th>PF</th>
              <th>PA</th>
              <th>DIFF</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${standingsData.afc.teams.map((team, index) => `
              <tr class="${team.id === userTeamId ? 'user-team' : ''} ${index < 7 ? 'playoff-team' : ''}">
                <td class="rank">${index + 1}</td>
                <td class="team-name">
                  ${index < 7 ? '<span class="playoff-indicator">🏆</span>' : ''}
                  ${team.name}
                  ${team.div !== undefined ? `<span class="division-indicator">${getDivisionName(team.conf, team.div)}</span>` : ''}
                </td>
                <td>${team.wins}</td>
                <td>${team.losses}</td>
                <td>${team.ties}</td>
                <td>${team.winPercentage.toFixed(3)}</td>
                <td>${team.pointsFor}</td>
                <td>${team.pointsAgainst}</td>
                <td class="${team.pointDifferential >= 0 ? 'positive' : 'negative'}">
                  ${team.pointDifferential > 0 ? '+' : ''}${team.pointDifferential}
                </td>
                <td>${team.remaining}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="conference-standings">
        <h3 class="conference-title">NFC Conference Standings</h3>
        <table class="standings-table conference-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>PCT</th>
              <th>PF</th>
              <th>PA</th>
              <th>DIFF</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${standingsData.nfc.teams.map((team, index) => `
              <tr class="${team.id === userTeamId ? 'user-team' : ''} ${index < 7 ? 'playoff-team' : ''}">
                <td class="rank">${index + 1}</td>
                <td class="team-name">
                  ${index < 7 ? '<span class="playoff-indicator">🏆</span>' : ''}
                  ${team.name}
                  ${team.div !== undefined ? `<span class="division-indicator">${getDivisionName(team.conf, team.div)}</span>` : ''}
                </td>
                <td>${team.wins}</td>
                <td>${team.losses}</td>
                <td>${team.ties}</td>
                <td>${team.winPercentage.toFixed(3)}</td>
                <td>${team.pointsFor}</td>
                <td>${team.pointsAgainst}</td>
                <td class="${team.pointDifferential >= 0 ? 'positive' : 'negative'}">
                  ${team.pointDifferential > 0 ? '+' : ''}${team.pointDifferential}
                </td>
                <td>${team.remaining}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render overall league standings
 * @param {Object} standingsData - All standings data
 * @returns {string} HTML string
 */
function renderOverallStandings(standingsData) {
  const userTeamId = state.userTeamId || 0;
  
  return `
    <div class="overall-standings">
      <h3 class="standings-title">Overall League Standings</h3>
      <table class="standings-table overall-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Conference</th>
            <th>W</th>
            <th>L</th>
            <th>T</th>
            <th>PCT</th>
            <th>PF</th>
            <th>PA</th>
            <th>DIFF</th>
            <th>Games Remaining</th>
          </tr>
        </thead>
        <tbody>
          ${standingsData.overall.map((team, index) => `
            <tr class="${team.id === userTeamId ? 'user-team' : ''}">
              <td class="rank">${index + 1}</td>
              <td class="team-name">${team.name}</td>
              <td class="conference-name">${team.conf === 0 ? 'AFC' : 'NFC'} ${getDivisionName(team.conf, team.div)}</td>
              <td>${team.wins}</td>
              <td>${team.losses}</td>
              <td>${team.ties}</td>
              <td>${team.winPercentage.toFixed(3)}</td>
              <td>${team.pointsFor}</td>
              <td>${team.pointsAgainst}</td>
              <td class="${team.pointDifferential >= 0 ? 'positive' : 'negative'}">
                ${team.pointDifferential > 0 ? '+' : ''}${team.pointDifferential}
              </td>
              <td>${team.remaining}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Render playoff picture
 * @param {Object} standingsData - All standings data
 * @returns {string} HTML string
 */
function renderPlayoffPicture(standingsData) {
  const userTeamId = state.userTeamId || 0;
  
  return `
    <div class="playoff-picture">
      <div class="conferences-grid">
        <div class="conference-playoffs">
          <h3 class="conference-title">AFC Playoff Picture</h3>
          
          <div class="playoff-teams">
            <h4 class="playoff-section-title">In the Playoffs (7 teams)</h4>
            <table class="standings-table playoff-table">
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>Team</th>
                  <th>Record</th>
                  <th>Division</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${standingsData.playoffs.afc.playoffs.map((team, index) => `
                  <tr class="${team.id === userTeamId ? 'user-team' : ''} ${index < 4 ? 'division-winner' : 'wildcard'}">
                    <td class="seed">${index + 1}</td>
                    <td class="team-name">${team.name}</td>
                    <td>${team.wins}-${team.losses}-${team.ties}</td>
                    <td>${getDivisionName(team.conf, team.div)}</td>
                    <td class="playoff-status">
                      ${index === 0 ? '1st Seed' : index < 2 ? 'Bye Week' : index < 4 ? 'Division Winner' : 'Wild Card'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          ${standingsData.playoffs.afc.bubble.length > 0 ? `
            <div class="bubble-teams">
              <h4 class="playoff-section-title">On the Bubble</h4>
              <table class="standings-table bubble-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Record</th>
                    <th>Games Back</th>
                  </tr>
                </thead>
                <tbody>
                  ${standingsData.playoffs.afc.bubble.map(team => `
                    <tr class="${team.id === userTeamId ? 'user-team' : ''}">
                      <td class="team-name">${team.name}</td>
                      <td>${team.wins}-${team.losses}-${team.ties}</td>
                      <td>${calculateGamesBack(team, standingsData.playoffs.afc.playoffs[6])}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
        
        <div class="conference-playoffs">
          <h3 class="conference-title">NFC Playoff Picture</h3>
          
          <div class="playoff-teams">
            <h4 class="playoff-section-title">In the Playoffs (7 teams)</h4>
            <table class="standings-table playoff-table">
              <thead>
                <tr>
                  <th>Seed</th>
                  <th>Team</th>
                  <th>Record</th>
                  <th>Division</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${standingsData.playoffs.nfc.playoffs.map((team, index) => `
                  <tr class="${team.id === userTeamId ? 'user-team' : ''} ${index < 4 ? 'division-winner' : 'wildcard'}">
                    <td class="seed">${index + 1}</td>
                    <td class="team-name">${team.name}</td>
                    <td>${team.wins}-${team.losses}-${team.ties}</td>
                    <td>${getDivisionName(team.conf, team.div)}</td>
                    <td class="playoff-status">
                      ${index === 0 ? '1st Seed' : index < 2 ? 'Bye Week' : index < 4 ? 'Division Winner' : 'Wild Card'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          
          ${standingsData.playoffs.nfc.bubble.length > 0 ? `
            <div class="bubble-teams">
              <h4 class="playoff-section-title">On the Bubble</h4>
              <table class="standings-table bubble-table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Record</th>
                    <th>Games Back</th>
                  </tr>
                </thead>
                <tbody>
                  ${standingsData.playoffs.nfc.bubble.map(team => `
                    <tr class="${team.id === userTeamId ? 'user-team' : ''}">
                      <td class="team-name">${team.name}</td>
                      <td>${team.wins}-${team.losses}-${team.ties}</td>
                      <td>${calculateGamesBack(team, standingsData.playoffs.nfc.playoffs[6])}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Set up tab switching for standings
 */
function setupStandingsTabs() {
  const tabs = document.querySelectorAll('.standings-tab');
  const sections = document.querySelectorAll('.standings-section');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      
      // Update active tab
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update active section
      sections.forEach(section => {
        section.classList.remove('active');
      });
      
      const targetSection = document.getElementById(`standings-${targetTab}`);
      if (targetSection) {
        targetSection.classList.add('active');
      }
    });
  });
}

/**
 * Get division name
 * @param {number} conf - Conference (0 = AFC, 1 = NFC)
 * @param {number} div - Division (0-3)
 * @returns {string} Division name
 */
function getDivisionName(conf, div) {
  const divisions = ['East', 'North', 'South', 'West'];
  const conference = conf === 0 ? 'AFC' : 'NFC';
  return `${conference} ${divisions[div] || 'Unknown'}`;
}

/**
 * Calculate games back from playoff position
 * @param {Object} team - Team to check
 * @param {Object} lastPlayoffTeam - Last team in playoffs
 * @returns {string} Games back description
 */
function calculateGamesBack(team, lastPlayoffTeam) {
  if (!lastPlayoffTeam) return '0';
  
  const winDiff = lastPlayoffTeam.wins - team.wins;
  const lossDiff = team.losses - lastPlayoffTeam.losses;
  const gamesBack = (winDiff + lossDiff) / 2;
  
  if (gamesBack === 0) return '0';
  if (gamesBack === 0.5) return '½';
  if (gamesBack % 1 === 0.5) return `${Math.floor(gamesBack)}½`;
  return gamesBack.toString();
}

/**
 * Calculate win percentage
 * @param {number} wins - Number of wins
 * @param {number} losses - Number of losses
 * @param {number} ties - Number of ties
 * @returns {number} Win percentage as decimal
 */
function calculateWinPercentage(wins, losses, ties = 0) {
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return (wins + (ties * 0.5)) / totalGames;
}

/**
 * Render simple conference standings for the basic view
 * @param {Object} conferenceData - Conference data
 * @returns {string} HTML string
 */
function renderSimpleConferenceStandings(conferenceData) {
  if (!conferenceData || !conferenceData.teams) return '<p>No data available</p>';
  
  const userTeamId = state.userTeamId || 0;
  
  return `
    <table class="standings-table">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>W</th>
          <th>L</th>
          <th>T</th>
          <th>PCT</th>
          <th>PF</th>
          <th>PA</th>
          <th>DIFF</th>
        </tr>
      </thead>
      <tbody>
        ${conferenceData.teams.map((team, index) => `
          <tr class="${team.id === userTeamId ? 'user-team' : ''} ${index < 7 ? 'playoff-team' : ''}">
            <td class="rank">${index + 1}</td>
            <td class="team-name">
              ${index < 7 ? '<span class="playoff-indicator">🏆</span>' : ''}
              ${team.name}
            </td>
            <td>${team.wins}</td>
            <td>${team.losses}</td>
            <td>${team.ties}</td>
            <td>${team.winPercentage.toFixed(3)}</td>
            <td>${team.pointsFor}</td>
            <td>${team.pointsAgainst}</td>
            <td class="${team.pointDifferential >= 0 ? 'positive' : 'negative'}">
              ${team.pointDifferential > 0 ? '+' : ''}${team.pointDifferential}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/**
 * Make teams clickable in standings tables
 */
function makeTeamsClickable() {
  const teamRows = document.querySelectorAll('.standings-table tbody tr');
  teamRows.forEach(row => {
    const teamNameCell = row.querySelector('.team-name');
    if (teamNameCell) {
      teamNameCell.style.cursor = 'pointer';
      teamNameCell.style.color = '#007bff';
      teamNameCell.style.textDecoration = 'underline';
      
      teamNameCell.addEventListener('click', (e) => {
        e.preventDefault();
        const teamName = teamNameCell.textContent.replace('👑', '').trim();
        showTeamDetails(teamName);
      });
    }
  });
}

/**
 * Show team details when clicked
 * @param {string} teamName - Name of the team
 */
function showTeamDetails(teamName) {
  const L = state.league;
  if (!L || !L.teams) return;
  
  // Find team by name
  const team = Object.values(L.teams).find(t => t.name === teamName);
  if (!team) return;
  
  // Create modal to show team details
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${team.name}</h2>
        <span class="close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="team-info">
          <p><strong>Conference:</strong> ${team.conference || 'Unknown'}</p>
          <p><strong>Division:</strong> ${team.division || 'Unknown'}</p>
          <p><strong>Record:</strong> ${team.wins || 0}-${team.losses || 0}-${team.ties || 0}</p>
          <p><strong>Points For:</strong> ${team.pointsFor || 0}</p>
          <p><strong>Points Against:</strong> ${team.pointsAgainst || 0}</p>
        </div>
        <div class="team-actions">
          <button class="btn primary" onclick="viewTeamRoster(${team.id})">View Roster</button>
          <button class="btn secondary" onclick="viewTeamSchedule(${team.id})">View Schedule</button>
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

/**
 * Render schedule standings
 * @param {Object} standingsData - All standings data
 * @returns {string} HTML string
 */
function renderScheduleStandings(standingsData) {
  const L = state.league;
  if (!L || !L.schedule) {
    return '<p>No schedule data available.</p>';
  }
  
  let html = '<div class="schedule-view">';
  html += '<h3>Season Schedule</h3>';
  
  // Group games by week
  const gamesByWeek = {};
  if (L.resultsByWeek) {
    Object.entries(L.resultsByWeek).forEach(([week, results]) => {
      if (Array.isArray(results)) {
        gamesByWeek[week] = results;
      }
    });
  }
  
  // Render schedule by week
  for (let week = 1; week <= 17; week++) {
    const weekGames = gamesByWeek[week] || [];
    html += `<div class="week-schedule">`;
    html += `<h4>Week ${week}</h4>`;
    
    if (weekGames.length === 0) {
      html += '<p class="no-games">No games scheduled</p>';
    } else {
      html += '<div class="games-grid">';
      weekGames.forEach(game => {
        if (game.home && game.away) {
          const homeTeam = L.teams[game.home];
          const awayTeam = L.teams[game.away];
          if (homeTeam && awayTeam) {
            html += `
              <div class="game-item">
                <div class="away-team">${awayTeam.name}</div>
                <div class="vs">@</div>
                <div class="home-team">${homeTeam.name}</div>
              </div>
            `;
          }
        }
      });
      html += '</div>';
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

// Make functions globally available
window.renderStandingsPage = renderStandingsPage;
window.renderStandings = renderStandingsPage;
window.calculateAllStandings = calculateAllStandings;
window.setupStandingsTabs = setupStandingsTabs;

// Global functions for team actions
window.viewTeamRoster = function(teamId) {
  // Switch to roster view and select the team
  if (window.state) {
    window.state.userTeamId = teamId;
  }
  
  // Navigate to roster view
  window.location.hash = '#/roster';
  
  // Close the modal if it exists
  const modal = document.querySelector('.modal');
  if (modal) modal.remove();
};

window.viewTeamSchedule = function(teamId) {
  // Switch to schedule view and show team's schedule
  if (window.state) {
    window.state.userTeamId = teamId;
  }
  
  // Navigate to standings view (which includes schedule)
  window.location.hash = '#/standings';
  
  // Close the modal if it exists
  const modal = document.querySelector('.modal');
  modal.remove();
  
  // Show schedule tab if available
  setTimeout(() => {
    const scheduleTab = document.querySelector('[data-tab="schedule"]');
    if (scheduleTab) scheduleTab.click();
  }, 200);
};

console.log('✅ Dedicated Standings Page loaded successfully');
