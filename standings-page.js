// standings-page-fixed.js - Comprehensive Standings System (Enhanced & Fixed)

'use strict';

// --- Utility Functions (Defined Locally) ---

/**
 * Calculate win percentage (W + 0.5 * T) / (W + L + T)
 */
function calculateWinPercentage(wins, losses, ties = 0) {
  const totalGames = wins + losses + ties;
  if (totalGames === 0) return 0;
  return (wins + (ties * 0.5)) / totalGames;
}

/**
 * Get division name (AFC/NFC East, North, South, West)
 */
function getDivisionName(conf, div) {
  const divisions = ['East', 'North', 'South', 'West'];
  return `${getConferenceName(conf)} ${divisions[div] || 'Unknown'}`;
}

/**
 * Get conference name
 */
function getConferenceName(conf) {
  return conf === 0 ? 'AFC' : 'NFC';
}

/**
 * CORE UTILITY: Groups teams by their division (0-3) within their conference.
 */
function groupByDivision(teams) {
  const groups = { 0: [], 1: [], 2: [], 3: [] };
  teams.forEach(team => {
    if (team.div !== undefined && team.div !== null) {
      groups[team.div].push(team);
    }
  });
  return groups;
}

/**
 * CORE UTILITY: Sorts teams primarily by Win Percentage.
 * TODO: Implement advanced tiebreakers (Head-to-Head, Division/Conference Record, Point Differential).
 */
function sortTeamsByRecord(teams) {
  // Use a stable sort if available, but simple sort on WPCT is usually fine for a base game.
  return teams.slice().sort((a, b) => {
    // 1. Primary: Win Percentage (higher is better)
    if (b.winPercentage !== a.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }
    // 2. Secondary: Point Differential (higher is better)
    return b.pointDifferential - a.pointDifferential;
  });
}

/**
 * CORE UTILITY: Calculates the number of games separating two teams.
 * Formula: (Leader Wins - Challenger Wins) + (Challenger Losses - Leader Losses) / 2
 */
function calculateGamesBack(teamA, teamB) {
  if (!teamA || !teamB) return 0;
  
  const leadWins = teamA.wins || 0;
  const leadLosses = teamA.losses || 0;
  const followWins = teamB.wins || 0;
  const followLosses = teamB.losses || 0;

  // The 'leader' is always the team that is ahead in the standings (first argument)
  // When calculating "Games Back" on the bubble, we calculate relative to the 7th seed (teamB)
  const gamesBack = ((leadWins - followWins) + (followLosses - leadLosses)) / 2;
  
  // Return positive value indicating how far back teamB is from teamA
  return Math.max(0, gamesBack.toFixed(1)); 
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
    console.error('No standings container found, that’s rough.');
    return;
  }
  
  // Calculate all standings data
  const standingsData = calculateAllStandings(L);
  const divisionRenderer = typeof window.renderDivisionStandings === 'function'
    ? window.renderDivisionStandings
    : renderDivisionStandings;
  const conferenceRenderer = typeof window.renderConferenceStandings === 'function'
    ? window.renderConferenceStandings
    : renderConferenceStandings;
  const overallRenderer = typeof window.renderOverallStandings === 'function'
    ? window.renderOverallStandings
    : renderOverallStandings;

  if (standingsView) {
    // Use the dedicated standings view with tabs
    // NOTE: Requires external CSS for styling and setupStandingsTabs() for logic
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
            ${divisionRenderer(standingsData)}
          </div>

          <div id="standings-conference" class="standings-section">
            ${conferenceRenderer(standingsData)}
          </div>

          <div id="standings-overall" class="standings-section">
            ${overallRenderer(standingsData)}
          </div>
          
          <div id="standings-schedule" class="standings-section">
            ${renderScheduleStandings(L)} </div>
          
          <div id="standings-playoff" class="standings-section">
            ${renderPlayoffPicture(standingsData)}
          </div>
        </div>
      </div>
    `;
    
    // Set up tab switching (MUST BE DEFINED GLOBALLY)
    if (typeof window.setupStandingsTabs === 'function') {
      window.setupStandingsTabs();
    } else {
      console.warn('Missing function: setupStandingsTabs.');
    }
    
    // Make teams clickable (MUST BE DEFINED GLOBALLY)
    if (typeof window.makeTeamsClickable === 'function') {
      setTimeout(() => window.makeTeamsClickable(), 100);
    } else {
      console.warn('Missing function: makeTeamsClickable.');
    }

  } else {
    // Use the simple standings wrapper (Fallback)
    targetContainer.innerHTML = `
      <div class="card">
        <h2>League Standings</h2>
        <div class="conferences-grid">
          <div class="conference-standings">
            <h3 class="conference-title">AFC</h3>
            ${window.renderSimpleConferenceStandings(standingsData.afc)}
          </div>
          <div class="conference-standings">
            <h3 class="conference-title">NFC</h3>
            ${window.renderSimpleConferenceStandings(standingsData.nfc)}
          </div>
        </div>
      </div>
    `;
    
    if (typeof window.makeTeamsClickable === 'function') {
        setTimeout(() => window.makeTeamsClickable(), 100);
    }
  }
  
  console.log('✅ Standings page rendered successfully, period.');
}


/**
 * Calculate all standings data needed for different views
 */
function calculateAllStandings(league) {
  const teams = [...league.teams];
  
  // Add calculated fields to each team
  teams.forEach(team => {
    team.wins = team.wins || 0;
    team.losses = team.losses || 0;
    team.ties = team.ties || 0;
    team.pointsFor = team.ptsFor || 0;
    team.pointsAgainst = team.ptsAgainst || 0;
    team.pointDifferential = team.pointsFor - team.pointsAgainst;
    team.winPercentage = calculateWinPercentage(team.wins, team.losses, team.ties);
    team.gamesPlayed = team.wins + team.losses + team.ties;
    team.remaining = 17 - team.gamesPlayed; // Assuming 17-game season
  });
  
  // Group by conference and division
  const afc = teams.filter(t => t.conf === 0);
  const nfc = teams.filter(t => t.conf === 1);

  const afcDivisions = groupByDivision(afc);
  const nfcDivisions = groupByDivision(nfc);

  // Leaders cache (used by renderers for games-back math)
  const leaders = { 0: {}, 1: {} };

  // Sort each division (IMPORTANT for determining Division Winners)
  Object.keys(afcDivisions).forEach(div => {
    afcDivisions[div] = sortTeamsByRecord(afcDivisions[div]);
    leaders[0][div] = afcDivisions[div];
  });
  Object.keys(nfcDivisions).forEach(div => {
    nfcDivisions[div] = sortTeamsByRecord(nfcDivisions[div]);
    leaders[1][div] = nfcDivisions[div];
  });
  
  // Sort conferences (needed for Wild Card calculation)
  const afcSorted = sortTeamsByRecord(afc);
  const nfcSorted = sortTeamsByRecord(nfc);
  
  // Calculate playoff scenarios using sorted division winners
  const playoffPicture = calculatePlayoffPicture(afcSorted, nfcSorted, afcDivisions, nfcDivisions);

  return {
    divisions: { 0: afcDivisions, 1: nfcDivisions },
    conferences: { 0: afcSorted, 1: nfcSorted },
    leaders,
    overall: sortTeamsByRecord(teams),
    playoffs: playoffPicture,
    league
  };
}


/**
 * Calculate playoff picture (UPDATED for Division Winners)
 */
function calculatePlayoffPicture(afcTeams, nfcTeams, afcDivisions, nfcDivisions) {
  // Get the top team in each division (which is the first element after sorting)
  const afcWinners = Object.values(afcDivisions).map(div => div[0]).filter(t => t);
  const nfcWinners = Object.values(nfcDivisions).map(div => div[0]).filter(t => t);
  
  // Separate Wild Card Pool: All teams that are NOT Division Winners
  const afcWinnerIds = afcWinners.map(t => t.id);
  const nfcWinnerIds = nfcWinners.map(t => t.id);

  const afcWildCardPool = afcTeams.filter(team => !afcWinnerIds.includes(team.id));
  const nfcWildCardPool = nfcTeams.filter(team => !nfcWinnerIds.includes(team.id));
  
  // Seed 1-4: Division Winners, sorted by record
  const afcDivisionSeeded = sortTeamsByRecord(afcWinners);
  const nfcDivisionSeeded = sortTeamsByRecord(nfcWinners);
  
  // Seed 5-7: Top 3 Wild Card teams, sorted by record
  const afcWildCardSeeded = sortTeamsByRecord(afcWildCardPool).slice(0, 3);
  const nfcWildCardSeeded = sortTeamsByRecord(nfcWildCardPool).slice(0, 3);
  
  // Final Playoff List (Seeds 1-7)
  const afcPlayoffs = [...afcDivisionSeeded, ...afcWildCardSeeded];
  const nfcPlayoffs = [...nfcDivisionSeeded, ...nfcWildCardSeeded];
  
  // Bubble Teams (The next 3 teams after the 7 playoff teams)
  // Find teams not already in the playoff array
  const afcPlayoffIds = afcPlayoffs.map(t => t.id);
  const nfcPlayoffIds = nfcPlayoffs.map(t => t.id);
  
  const afcBubble = afcTeams.filter(t => !afcPlayoffIds.includes(t.id)).slice(0, 3);
  const nfcBubble = nfcTeams.filter(t => !nfcPlayoffIds.includes(t.id)).slice(0, 3);

  return {
    afc: {
      playoffs: afcPlayoffs,
      bubble: afcBubble,
      divisionWinners: afcWinnerIds
    },
    nfc: {
      playoffs: nfcPlayoffs,
      bubble: nfcBubble,
      divisionWinners: nfcWinnerIds
    }
  };
}


/**
 * Render playoff picture (UPDATED for better status)
 */
function renderPlayoffPicture(standingsData) {
  const userTeamId = window.state.userTeamId || 0;
  
  const getPlayoffStatus = (team, seed, divisionWinners) => {
    if (seed === 1) return '1st Seed & **Bye**';
    if (divisionWinners.includes(team.id)) {
      return '**Division Winner**';
    }
    return '**Wild Card**';
  };
  
  const renderConfPlayoffs = (confData, confName) => `
    <div class="conference-playoffs">
      <h3 class="conference-title">${confName} Playoff Picture</h3>
      
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
            ${confData.playoffs.map((team, index) => `
              <tr class="${team.id === userTeamId ? 'user-team' : ''}">
                <td class="seed">${index + 1}</td>
                <td class="team-name">${team.name}</td>
                <td>${team.wins}-${team.losses}-${team.ties}</td>
                <td>${getDivisionName(team.conf, team.div).replace(confName + ' ', '')}</td>
                <td class="playoff-status">${getPlayoffStatus(team, index + 1, confData.divisionWinners)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      ${confData.bubble.length > 0 ? `
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
              ${confData.bubble.map(team => `
                <tr class="${team.id === userTeamId ? 'user-team' : ''}">
                  <td class="team-name">${team.name}</td>
                  <td>${team.wins}-${team.losses}-${team.ties}</td>
                  <td>${calculateGamesBack(confData.playoffs[6], team)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;

  return `
    <div class="playoff-picture">
      <div class="conferences-grid">
        ${renderConfPlayoffs(standingsData.playoffs.afc, 'AFC')}
        ${renderConfPlayoffs(standingsData.playoffs.nfc, 'NFC')}
      </div>
    </div>
  `;
}

/**
 * Render schedule standings (UPDATED to show results)
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
  
  const maxWeeks = Math.max(17, Object.keys(gamesByWeek).length); 
  
  for (let week = 1; week <= maxWeeks; week++) {
    const weekGames = gamesByWeek[week] || [];
    html += `<div class="week-schedule">`;
    html += `<h4>Week **${week}** ${week < league.week ? '(Completed)' : week === league.week ? '(Current)' : ''}</h4>`;
    
    if (weekGames.length === 0 && week < 18) {
        html += '<p class="no-games">Bye Week or schedule not yet generated.</p>';
    } else if (weekGames.length > 0) {
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

// --- Fallback Renderers ---
function renderDivisionStandings(data) {
  if (!data || !data.divisions) return '<div class="muted">No standings available.</div>';
  const { divisions, leaders } = data;
  const userTeamId = window.state?.userTeamId ?? 0;

  return ['AFC', 'NFC'].map(confName => {
    const conf = confName === 'AFC' ? 0 : 1;
    return `
      <div class="division-block">
        <h3>${confName}</h3>
        ${[0,1,2,3].map(div => {
          const teams = divisions[conf][div] || [];
          return `
            <div class="division">
              <h4>${getDivisionName(conf, div)}</h4>
              <table class="standings-table">
                <thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>Pct</th><th>GB</th></tr></thead>
                <tbody>
                  ${teams.map((team, idx) => {
                    const leader = leaders[conf][div]?.[0];
                    const gamesBack = leader ? calculateGamesBack(leader, team) : 0;
                    return `<tr class="${team.id === userTeamId ? 'user-team' : ''}">
                      <td>${team.abbr || team.name}</td>
                      <td>${team.wins}</td><td>${team.losses}</td><td>${team.ties}</td>
                      <td>${team.winPercentage.toFixed(3)}</td><td>${idx === 0 ? '-' : gamesBack}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>`;
        }).join('')}
      </div>`;
  }).join('');
}

function renderConferenceStandings(data) {
  if (!data || !data.conferences) return '<div class="muted">No standings available.</div>';
  const userTeamId = window.state?.userTeamId ?? 0;

  return ['AFC', 'NFC'].map(confName => {
    const conf = confName === 'AFC' ? 0 : 1;
    const teams = data.conferences[conf] || [];
    return `
      <div class="conference">
        <h3>${confName} Conference</h3>
        <table class="standings-table">
          <thead><tr><th>Seed</th><th>Team</th><th>W</th><th>L</th><th>T</th><th>Pct</th></tr></thead>
          <tbody>
            ${teams.map((team, idx) => `
              <tr class="${team.id === userTeamId ? 'user-team' : ''}">
                <td>${idx + 1}</td><td>${team.abbr || team.name}</td>
                <td>${team.wins}</td><td>${team.losses}</td><td>${team.ties}</td>
                <td>${team.winPercentage.toFixed(3)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }).join('');
}

function renderOverallStandings(data) {
  if (!data || !data.overall) return '<div class="muted">No standings available.</div>';
  const userTeamId = window.state?.userTeamId ?? 0;
  return `
    <table class="standings-table">
      <thead><tr><th>Rank</th><th>Team</th><th>W</th><th>L</th><th>T</th><th>Pct</th></tr></thead>
      <tbody>
        ${data.overall.map((team, idx) => `
          <tr class="${team.id === userTeamId ? 'user-team' : ''}">
            <td>${idx + 1}</td><td>${team.abbr || team.name}</td>
            <td>${team.wins}</td><td>${team.losses}</td><td>${team.ties}</td>
            <td>${team.winPercentage.toFixed(3)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderSimpleConferenceStandings(confTeams = []) {
  const userTeamId = window.state?.userTeamId ?? 0;
  return `
    <table class="standings-table">
      <thead><tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>Pct</th></tr></thead>
      <tbody>
        ${(confTeams || []).map(team => `
          <tr class="${team.id === userTeamId ? 'user-team' : ''}">
            <td>${team.abbr || team.name}</td><td>${team.wins}</td><td>${team.losses}</td><td>${team.ties}</td><td>${team.winPercentage.toFixed(3)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function setupStandingsTabs() {
  const tabs = document.querySelectorAll('.standings-tab');
  const sections = document.querySelectorAll('.standings-section');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(`standings-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}

function makeTeamsClickable() {
  // Basic safety: highlight rows and allow future expansion
  document.querySelectorAll('.standings-table tr').forEach(row => {
    row.style.cursor = 'default';
  });
}

// --- Global Exports ---

// Make utility functions available globally for other scripts that might need them
window.calculateWinPercentage = calculateWinPercentage;
window.getDivisionName = getDivisionName;
window.getConferenceName = getConferenceName;
window.groupByDivision = groupByDivision;
window.sortTeamsByRecord = sortTeamsByRecord;
window.calculateGamesBack = calculateGamesBack;

// Primary page function
window.renderStandingsPage = renderStandingsPage;
window.renderStandings = renderStandingsPage;
window.calculateAllStandings = calculateAllStandings;

// Provide fallbacks if hosting page doesn't supply them
window.renderDivisionStandings = window.renderDivisionStandings || renderDivisionStandings;
window.renderConferenceStandings = window.renderConferenceStandings || renderConferenceStandings;
window.renderOverallStandings = window.renderOverallStandings || renderOverallStandings;
window.renderSimpleConferenceStandings = window.renderSimpleConferenceStandings || renderSimpleConferenceStandings;
window.setupStandingsTabs = window.setupStandingsTabs || setupStandingsTabs;
window.makeTeamsClickable = window.makeTeamsClickable || makeTeamsClickable;
