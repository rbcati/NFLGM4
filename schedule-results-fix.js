// schedule-results-fix.js - Fix last week results and add schedule view
'use strict';

console.log('🗓️ Loading schedule and results fixes...');

// Fix 1: Corrected renderLastWeekResults function
function renderLastWeekResultsFixed() {
  try {
    const L = state.league;
    const resultsEl = document.getElementById('hubResults');
    
    if (!resultsEl || !L.resultsByWeek) {
      console.log('No results element or results data');
      return;
    }
    
    // Fix: Look at the most recently completed week
    // If we're in week 3, we want to see results from week 2
    const lastCompletedWeek = L.week - 1;
    const results = L.resultsByWeek[lastCompletedWeek - 1] || []; // Results are 0-indexed
    
    console.log(`Looking for results from week ${lastCompletedWeek} (index ${lastCompletedWeek - 1})`);
    console.log('Available weeks:', Object.keys(L.resultsByWeek));
    console.log('Found results:', results.length);
    
    if (results.length === 0) {
      resultsEl.innerHTML = '<p class="muted">No recent results available</p>';
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
      const loser = homeScore > awayScore ? away : home;
      
      return `
        <div class="result-item">
          <span class="teams">${away.abbr} ${awayScore} @ ${home.abbr} ${homeScore}</span>
          <span class="winner">${winner.abbr} wins</span>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Error rendering results:', error);
    const resultsEl = document.getElementById('hubResults');
    if (resultsEl) {
      resultsEl.innerHTML = '<p class="muted">Error loading results</p>';
    }
  }
}

// Fix 2: Add schedule view to navigation
function addScheduleNavigation() {
  const nav = document.querySelector('#site-nav');
  const scheduleLink = document.querySelector('a[href="#/schedule"]');
  
  if (nav && !scheduleLink) {
    // Find standings link and add schedule after it
    const standingsLink = document.querySelector('a[href="#/standings"]');
    if (standingsLink) {
      const scheduleNav = document.createElement('a');
      scheduleNav.href = '#/schedule';
      scheduleNav.className = 'nav-pill';
      scheduleNav.dataset.view = 'schedule';
      scheduleNav.textContent = 'Schedule';
      
      // Insert after standings
      standingsLink.parentNode.insertBefore(scheduleNav, standingsLink.nextSibling);
      console.log('✅ Added schedule navigation');
    }
  }
}

// Fix 3: Create schedule view HTML if it doesn't exist
function ensureScheduleViewExists() {
  let scheduleView = document.getElementById('schedule');
  if (!scheduleView) {
    scheduleView = document.createElement('section');
    scheduleView.id = 'schedule';
    scheduleView.className = 'view';
    scheduleView.hidden = true;
    
    scheduleView.innerHTML = `
      <div class="card">
        <div class="row">
          <h2>Schedule & Results</h2>
          <div class="spacer"></div>
          <label for="scheduleWeek">Week</label>
          <select id="scheduleWeek"></select>
        </div>
        <div id="scheduleContent"></div>
      </div>
    `;
    
    const contentSection = document.querySelector('.content');
    if (contentSection) {
      contentSection.appendChild(scheduleView);
      console.log('✅ Created schedule view');
    }
  }
}

// Fix 4: Render schedule view
window.renderSchedule = function() {
  console.log('Rendering schedule...');
  
  try {
    const L = state.league;
    if (!L) {
      console.error('No league available');
      return;
    }
    
    // Ensure the view exists
    ensureScheduleViewExists();
    
    // Populate week selector
    const weekSelect = document.getElementById('scheduleWeek');
    const scheduleContent = document.getElementById('scheduleContent');
    
    if (!weekSelect || !scheduleContent) {
      console.error('Schedule elements not found');
      return;
    }
    
    // Get schedule data
    const scheduleWeeks = L.schedule?.weeks || L.schedule || [];
    const totalWeeks = scheduleWeeks.length;
    
    // Populate week dropdown
    if (weekSelect.options.length === 0) {
      weekSelect.innerHTML = '';
      
      // Add "All Weeks" option
      const allOption = document.createElement('option');
      allOption.value = 'all';
      allOption.textContent = 'All Weeks';
      weekSelect.appendChild(allOption);
      
      // Add individual weeks
      for (let w = 1; w <= totalWeeks; w++) {
        const option = document.createElement('option');
        option.value = String(w);
        option.textContent = `Week ${w}`;
        if (w === L.week) {
          option.textContent += ' (Current)';
        } else if (w < L.week) {
          option.textContent += ' (Completed)';
        }
        weekSelect.appendChild(option);
      }
      
      // Set to current week by default
      weekSelect.value = String(L.week);
      
      // Add change listener
      weekSelect.addEventListener('change', function() {
        renderScheduleContent(this.value);
      });
    }
    
    // Render initial content
    renderScheduleContent(weekSelect.value || String(L.week));
    
    console.log('✅ Schedule rendered successfully');
    
  } catch (error) {
    console.error('Error rendering schedule:', error);
  }
};

// Fix 5: Render schedule content based on selected week
function renderScheduleContent(selectedWeek) {
  try {
    const L = state.league;
    const scheduleContent = document.getElementById('scheduleContent');
    
    if (!scheduleContent || !L) return;
    
    const scheduleWeeks = L.schedule?.weeks || L.schedule || [];
    
    if (selectedWeek === 'all') {
      // Show all weeks
      let html = '<div class="all-weeks-schedule">';
      
      scheduleWeeks.forEach((weekData, weekIndex) => {
        const weekNumber = weekIndex + 1;
        const isCurrentWeek = weekNumber === L.week;
        const isCompleted = weekNumber < L.week;
        const games = weekData.games || [];
        const results = L.resultsByWeek?.[weekIndex] || [];
        
        html += `
          <div class="week-section ${isCurrentWeek ? 'current-week' : ''} ${isCompleted ? 'completed-week' : ''}">
            <h3>Week ${weekNumber} ${isCurrentWeek ? '(Current)' : isCompleted ? '(Completed)' : '(Upcoming)'}</h3>
            <div class="games-grid">
              ${renderWeekGames(games, results, L, isCompleted)}
            </div>
          </div>
        `;
      });
      
      html += '</div>';
      scheduleContent.innerHTML = html;
      
    } else {
      // Show specific week
      const weekNumber = parseInt(selectedWeek, 10);
      const weekIndex = weekNumber - 1;
      const weekData = scheduleWeeks[weekIndex];
      
      if (!weekData) {
        scheduleContent.innerHTML = '<p>Week not found</p>';
        return;
      }
      
      const games = weekData.games || [];
      const results = L.resultsByWeek?.[weekIndex] || [];
      const isCompleted = weekNumber < L.week;
      const isCurrentWeek = weekNumber === L.week;
      
      let html = `
        <div class="single-week-schedule">
          <h3>Week ${weekNumber} ${isCurrentWeek ? '(Current Week)' : isCompleted ? '(Completed)' : '(Upcoming)'}</h3>
          <div class="games-grid">
            ${renderWeekGames(games, results, L, isCompleted)}
          </div>
        </div>
      `;
      
      scheduleContent.innerHTML = html;
    }
    
  } catch (error) {
    console.error('Error rendering schedule content:', error);
  }
}

// Fix 6: Render games for a specific week
function renderWeekGames(games, results, league, isCompleted) {
  if (!games || games.length === 0) {
    return '<p class="muted">No games scheduled</p>';
  }
  
  return games.map((game, gameIndex) => {
    // Handle bye weeks
    if (game.bye !== undefined) {
      const team = league.teams[game.bye];
      return `
        <div class="game-card bye-week">
          <div class="bye-info">
            <span class="team-name">${team?.name || 'Team'}</span>
            <span class="bye-label">BYE</span>
          </div>
        </div>
      `;
    }
    
    const home = league.teams[game.home];
    const away = league.teams[game.away];
    
    if (!home || !away) {
      return `<div class="game-card error">Invalid matchup</div>`;
    }
    
    // Get result if completed
    const result = results.find(r => r.home === game.home && r.away === game.away);
    
    if (isCompleted && result) {
      // Show completed game with score
      const homeScore = result.scoreHome || 0;
      const awayScore = result.scoreAway || 0;
      const homeWin = homeScore > awayScore;
      const awayWin = awayScore > homeScore;
      const tie = homeScore === awayScore;
      
      return `
        <div class="game-card completed">
          <div class="matchup">
            <div class="team ${awayWin ? 'winner' : tie ? 'tie' : 'loser'}">
              <span class="team-abbr">${away.abbr}</span>
              <span class="team-name">${away.name}</span>
              <span class="score">${awayScore}</span>
            </div>
            <div class="at">@</div>
            <div class="team ${homeWin ? 'winner' : tie ? 'tie' : 'loser'}">
              <span class="team-abbr">${home.abbr}</span>
              <span class="team-name">${home.name}</span>
              <span class="score">${homeScore}</span>
            </div>
          </div>
          <div class="game-status">
            ${tie ? 'TIE' : homeWin ? `${home.abbr} wins` : `${away.abbr} wins`}
          </div>
        </div>
      `;
    } else {
      // Show upcoming game
      const homeRecord = `${home.record?.w || home.wins || 0}-${home.record?.l || home.losses || 0}`;
      const awayRecord = `${away.record?.w || away.wins || 0}-${away.record?.l || away.losses || 0}`;
      
      return `
        <div class="game-card upcoming">
          <div class="matchup">
            <div class="team">
              <span class="team-abbr">${away.abbr}</span>
              <span class="team-name">${away.name}</span>
              <span class="record">(${awayRecord})</span>
            </div>
            <div class="at">@</div>
            <div class="team">
              <span class="team-abbr">${home.abbr}</span>
              <span class="team-name">${home.name}</span>
              <span class="record">(${homeRecord})</span>
            </div>
          </div>
          <div class="game-status">
            Upcoming
          </div>
        </div>
      `;
    }
  }).join('');
}

// Fix 7: Update the router to handle schedule view
const originalRouter = window.router;
window.router = function() {
  const path = location.hash || '#/hub';
  const viewName = path.slice(2);
  
  // Handle schedule view
  if (viewName === 'schedule') {
    window.show(viewName);
    if (state.league && state.onboarded && window.renderSchedule) {
      window.renderSchedule();
    }
    return;
  }
  
  // Call original router for other views
  if (originalRouter) {
    originalRouter();
  }
};

// Fix 8: Override the renderLastWeekResults function in renderHub
const originalRenderHub = window.renderHub;
window.renderHub = function() {
  // Call original renderHub
  if (originalRenderHub) {
    originalRenderHub();
  }
  
  // Override with fixed results rendering
  renderLastWeekResultsFixed();
};

// Fix 9: Add CSS for schedule view
const scheduleCSS = `
/* Schedule View Styles */
.all-weeks-schedule {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.week-section {
  background: var(--surface);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--hairline);
}

.week-section h3 {
  color: var(--text);
  margin-bottom: 1rem;
  font-size: 1.125rem;
}

.week-section.current-week {
  border-color: var(--accent);
  background: var(--accent-muted);
}

.week-section.completed-week {
  opacity: 0.8;
}

.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.game-card {
  background: var(--glass-bg);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  padding: 1rem;
  transition: all var(--dur) var(--ease);
}

.game-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.game-card.completed {
  border-left: 3px solid var(--success);
}

.game-card.upcoming {
  border-left: 3px solid var(--accent);
}

.game-card.bye-week {
  border-left: 3px solid var(--text-muted);
  background: var(--surface);
}

.matchup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.team-abbr {
  font-weight: 700;
  font-size: 1.125rem;
  color: var(--text);
}

.team-name {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-align: center;
  margin-top: 0.25rem;
}

.record {
  font-size: 0.75rem;
  color: var(--text-subtle);
  margin-top: 0.25rem;
}

.score {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 0.5rem;
}

.team.winner .team-abbr,
.team.winner .score {
  color: var(--success);
}

.team.loser .team-abbr,
.team.loser .score {
  color: var(--text-muted);
}

.team.tie .team-abbr,
.team.tie .score {
  color: var(--warning);
}

.at {
  color: var(--text-muted);
  font-size: 0.875rem;
  margin: 0 1rem;
}

.game-status {
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
  font-weight: 500;
  padding-top: 0.5rem;
  border-top: 1px solid var(--hairline);
}

.bye-info {
  text-align: center;
}

.bye-label {
  display: block;
  margin-top: 0.5rem;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 1.25rem;
}

.single-week-schedule h3 {
  color: var(--text);
  margin-bottom: 1.5rem;
  text-align: center;
  font-size: 1.5rem;
}

/* Enhanced result items on hub */
.result-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--surface);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  border-left: 3px solid var(--success);
  transition: all var(--dur-fast) var(--ease);
}

.result-item:hover {
  background: var(--surface-elevated);
  transform: translateX(2px);
}

.result-item .teams {
  color: var(--text);
  font-weight: 500;
  font-family: monospace;
}

.result-item .winner {
  color: var(--accent);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Responsive */
@media (max-width: 768px) {
  .games-grid {
    grid-template-columns: 1fr;
  }
  
  .team-name {
    display: none;
  }
  
  .matchup {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .at {
    margin: 0;
  }
}
`;

// Inject the CSS
const scheduleStyleElement = document.createElement('style');
scheduleStyleElement.textContent = scheduleCSS;
document.head.appendChild(scheduleStyleElement);

// Fix 10: Initialize when DOM is ready
function initializeScheduleFixes() {
  console.log('🎯 Initializing schedule and results fixes...');
  
  // Add navigation
  addScheduleNavigation();
  
  // Ensure schedule view exists
  ensureScheduleViewExists();
  
  console.log('✅ Schedule fixes initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeScheduleFixes);
} else {
  setTimeout(initializeScheduleFixes, 100);
}

// Make functions globally available
window.renderSchedule = window.renderSchedule;
window.renderScheduleContent = renderScheduleContent;
window.renderWeekGames = renderWeekGames;
window.renderLastWeekResultsFixed = renderLastWeekResultsFixed;
window.initializeScheduleFixes = initializeScheduleFixes;

console.log('✅ Schedule and results fixes loaded!');
