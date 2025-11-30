// standings-page.js - Comprehensive Standings System (Enhanced)
'use strict';

// --- Utility Functions (Defined locally for robustness) ---

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
 * Get division name
 * @param {number} conf - Conference (0 = AFC, 1 = NFC)
 * @param {number} div - Division (0-3)
 * @returns {string} Division name
 */
function getDivisionName(conf, div) {
  const divisions = ['East', 'North', 'South', 'West'];
  // We don't need the conference prefix here, it's implied by the calling function context
  return divisions[div] || 'Unknown';
}

/**
 * Get conference name
 * @param {number} conf - Conference (0 = AFC, 1 = NFC)
 * @returns {string} Conference name
 */
function getConferenceName(conf) {
  return conf === 0 ? 'AFC' : 'NFC';
}


// --- Core Functions ---

/**
 * Renders the complete standings view with multiple tabs and sorting options
 */
function renderStandingsPage() {
  console.log('Rendering dedicated standings page...');
  
  const L = window.state?.league;
  if (!L || !L.teams) {
    console.error('No league data available for standings');
    return;
  }
  
  // Existing container logic...
  const standingsView = document.getElementById('standings');
  const standingsWrap = document.getElementById('standingsWrap');
  const targetContainer = standingsView || standingsWrap;
  
  if (!targetContainer) {
    console.error('No standings container found');
    return;
  }
  
  // Calculate all standings data
  // Pass the league object directly instead of relying on global state access inside
  const standingsData = calculateAllStandings(L); 
  
  // ... (The rest of renderStandingsPage remains the same, using the updated functions) ...
  
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
            ${renderScheduleStandings(L)} </div>
          
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
    // Ensure all stats are present, even if 0
    team.wins = team.wins || 0;
    team.losses = team.losses || 0;
    team.ties = team.ties || 0;
    team.pointsFor = team.ptsFor || 0;
    team.pointsAgainst = team.ptsAgainst || 0;
    team.pointDifferential = team.pointsFor - team.pointsAgainst;
    // Using local utility function
    team.winPercentage = calculateWinPercentage(team.wins, team.losses, team.ties);
    team.gamesPlayed = team.wins + team.losses + team.ties;
    team.remaining = 17 - team.gamesPlayed; // Assuming 17-game season
  });
  
  // Group by conference and division
  const afc = teams.filter(t => t.conf === 0);
  const nfc = teams.filter(t => t.conf === 1);
  
  const afcDivisions = groupByDivision(afc);
  const nfcDivisions = groupByDivision(nfc);
  
  // Sort each division (IMPORTANT for determining Division Winners)
  Object.keys(afcDivisions).forEach(div => {
    afcDivisions[div] = sortTeamsByRecord(afcDivisions[div]);
  });
  Object.keys(nfcDivisions).forEach(div => {
    nfcDivisions[div] = sortTeamsByRecord(nfcDivisions[div]);
  });
  
  // Sort conferences (needed for Wild Card calculation)
  const afcSorted = sortTeamsByRecord(afc);
  const nfcSorted = sortTeamsByRecord(nfc);
  
  // Calculate playoff scenarios using sorted division winners
  const playoffPicture = calculatePlayoffPicture(afcSorted, nfcSorted, afcDivisions, nfcDivisions);
  
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

// ... (groupByDivision remains the same)

// ... (sortTeamsByRecord remains the same)

/**
 * Calculate playoff picture (UPDATED for Division Winners)
 * @param {Array} afcTeams - AFC teams sorted by record
 * @param {Array} nfcTeams - NFC teams sorted by record
 * @param {Object} afcDivisions - AFC teams grouped/sorted by division
 * @param {Object} nfcDivisions - NFC teams grouped/sorted by division
 * @returns {Object} Playoff picture data
 */
function calculatePlayoffPicture(afcTeams, nfcTeams, afcDivisions, nfcDivisions) {
  const afcWinners = Object.values(afcDivisions).map(div => div[0]).filter(t => t); // Top team in each div
  const nfcWinners = Object.values(nfcDivisions).map(div => div[0]).filter(t => t);
  
  // Combine all teams and remove division winners from the wild card pool
  const afcWildCardPool = afcTeams.filter(team => !afcWinners.includes(team));
  const nfcWildCardPool = nfcTeams.filter(team => !nfcWinners.includes(team));
  
  // Sort Division Winners and Wild Card Pool separately
  const afcDivisionSeeded = sortTeamsByRecord(afcWinners); // Seed 1-4
  const nfcDivisionSeeded = sortTeamsByRecord(nfcWinners); // Seed 1-4
  
  const afcWildCardSeeded = sortTeamsByRecord(afcWildCardPool).slice(0, 3); // Seed 5-7
  const nfcWildCardSeeded = sortTeamsByRecord(nfcWildCardPool).slice(0, 3); // Seed 5-7
  
  // Final Playoff List (Seeds 1-7)
  const afcPlayoffs = [...afcDivisionSeeded, ...afcWildCardSeeded];
  const nfcPlayoffs = [...nfcDivisionSeeded, ...nfcWildCardSeeded];
  
  // Bubble Teams (The next 3 teams after the 7 playoff teams)
  const afcBubble = afcTeams.filter(t => !afcPlayoffs.includes(t)).slice(0, 3);
  const nfcBubble = nfcTeams.filter(t => !nfcPlayoffs.includes(t)).slice(0, 3);

  // Re-sort the final 7 for display to ensure the actual *best* records get higher seeds (even if Wild Card)
  // HOWEVER, NFL rules mandate Division Winners get the top 4 spots regardless of record vs WC teams.
  // We'll stick to the NFL standard: 1-4 are Division Winners (seeded by record), 5-7 are Wild Cards (seeded by record).
  
  return {
    afc: {
      playoffs: afcPlayoffs,
      bubble: afcBubble,
      divisionWinners: afcWinners.map(t => t.id)
    },
    nfc: {
      playoffs: nfcPlayoffs,
      bubble: nfcBubble,
      divisionWinners: nfcWinners.map(t => t.id)
    }
  };
}

// ... (renderDivisionStandings remains the same, using local getDivisionName)

// ... (renderConferenceStandings remains the same, using local getDivisionName)

// ... (renderOverallStandings remains the same, using local getDivisionName)

/**
 * Render playoff picture (UPDATED for better status)
 * @param {Object} standingsData - All standings data
 * @returns {string} HTML string
 */
function renderPlayoffPicture(standingsData) {
  const userTeamId = window.state.userTeamId || 0;
  
  const getPlayoffStatus = (team, seed, divisionWinners) => {
    if (seed === 1) return '1st Seed & Bye';
    if (divisionWinners.includes(team.id)) {
      return 'Division Winner';
    }
    return 'Wild Card';
  };
  
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
                  <tr class="${team.id === userTeamId ? 'user-team' : ''}">
                    <td class="seed">${index + 1}</td>
                    <td class="team-name">${team.name}</td>
                    <td>${team.wins}-${team.losses}-${team.ties}</td>
                    <td>${getDivisionName(team.conf, team.div)}</td>
                    <td class="playoff-status">
                      **${getPlayoffStatus(team, index + 1, standingsData.playoffs.afc.divisionWinners)}**
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
                  <tr class="${team.id === userTeamId ? 'user-team' : ''}">
                    <td class="seed">${index + 1}</td>
                    <td class="team-name">${team.name}</td>
                    <td>${team.wins}-${team.losses}-${team.ties}</td>
                    <td>${getDivisionName(team.conf, team.div)}</td>
                    <td class="playoff-status">
                      **${getPlayoffStatus(team, index + 1, standingsData.playoffs.nfc.divisionWinners)}**
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

// ... (setupStandingsTabs and calculateGamesBack remain the same)

/**
 * Render schedule standings (UPDATED to show results)
 * @param {Object} league - League object
 * @returns {string} HTML string
 */
function renderScheduleStandings(league) {
  if (!league || !league.schedule || !league.teams) {
    return '<p>No schedule data available. 😔</p>';
  }
  
  let html = '<div class="schedule-view">';
  html += `<h3>${league.year} Season Schedule (Through Week ${league.week})</h3>`;
  
  const gamesByWeek = league.resultsByWeek || {};
  const teamMap = league.teams.reduce((map, t) => {
    map[t.id] = t;
    return map;
  }, {});
  
  // Render schedule by week
  // Render up to 17 weeks for a standard season
  const maxWeeks = Math.max(17, Object.keys(gamesByWeek).length); 
  
  for (let week = 1; week <= maxWeeks; week++) {
    const weekGames = gamesByWeek[week] || [];
    html += `<div class="week-schedule">`;
    html += `<h4>Week **${week}** ${week < league.week ? '(Completed)' : week === league.week ? '(Current)' : ''}</h4>`;
    
    if (weekGames.length === 0 && week < league.week) {
        html += '<p class="no-games">Bye Week or missing results.</p>';
    } else if (weekGames.length === 0) {
        html += '<p class="no-games">Schedule not yet generated.</p>';
    } else {
      html += '<div class="games-grid">';
      weekGames.forEach(game => {
        const homeTeam = teamMap[game.home];
        const awayTeam = teamMap[game.away];
        
        if (homeTeam && awayTeam) {
          const isCompleted = game.homeScore !== undefined && game.awayScore !== undefined;
          let score = '';
          let resultClass = '';
          
          if (isCompleted) {
            score = `**${game.awayScore}** - **${game.homeScore}**`;
            if (game.homeScore > game.awayScore) {
              resultClass = 'home-win';
            } else if (game.awayScore > game.homeScore) {
              resultClass = 'away-win';
            } else {
              resultClass = 'tie';
              score = `**${game.awayScore}** - **${game.homeScore} (TIE)**`;
            }
          } else {
            score = 'Scheduled';
          }
          
          html += `
            <div class="game-item ${resultClass}">
              <div class="away-team">${awayTeam.name}</div>
              <div class="vs">@</div>
              <div class="home-team">${homeTeam.name}</div>
              <div class="score">${score}</div>
            </div>
          `;
        }
      });
      html += '</div>';
    }
    
    html += '</div>';
  }
  
  html += '</div>';
  return html;
}

// ... (renderSimpleConferenceStandings remains the same)

// ... (makeTeamsClickable remains the same, but uses window.state)

// ... (showTeamDetails remains the same, but uses window.state)

// ... (showEnhancedTeamDetails remains the same, but uses window.state)

// Make functions globally available
window.renderStandingsPage = renderStandingsPage;
window.renderStandings = renderStandingsPage;
window.calculateAllStandings = calculateAllStandings;
window.setupStandingsTabs = setupStandingsTabs;

// ... (The rest of the function exports remain the same) ...

console.log('✅ Dedicated Standings Page loaded successfully and enhanced.');
