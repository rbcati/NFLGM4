// final-cleanup-fixes.js - Fix remaining syntax errors and jQuery issues
'use strict';

console.log('🧹 Loading final cleanup fixes...');

// Fix 1: Missing show function (replace UI.js version to avoid conflicts)
window.show = function(viewId) {
  console.log('📺 Showing view:', viewId);
  
  // Hide all views
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
    
    console.log('✅ View shown:', viewId);
  } else {
    console.error('❌ View not found:', viewId);
  }
};

// Fix 2: jQuery replacement helper ($ function)
window.$ = function(selector) {
  if (selector.startsWith('#')) {
    return document.getElementById(selector.slice(1));
  }
  return document.querySelector(selector);
};

// Fix 3: Fixed runWeeklyTraining without jQuery
window.runWeeklyTraining = function(league) {
  if (!league || !league.teams) return;
  
  try {
    console.log('🏃‍♂️ Running weekly training...');
    
    const weekJustCompleted = league.week - 1;
    const userTeamSelect = document.getElementById('userTeam');
    const userTeamId = userTeamSelect ? parseInt(userTeamSelect.value || '0', 10) : 
                      (state.userTeamId || state.player?.teamId || 0);
    
    const userPlan = (state.trainingPlan && state.trainingPlan.week === weekJustCompleted) ? 
                     state.trainingPlan : null;

    league.teams.forEach((team, idx) => {
      try {
        // Determine training plan for this team
        const plan = (idx === userTeamId && userPlan) ? userPlan : pickAITargetSafe(team);
        
        if (!plan) return; // Skip if no valid training plan
        
        const result = resolveTrainingForSafe(team, plan);
        
        if (!result || !result.ok) return;

        const teamAbbr = team.abbr || `T${idx}`;
        const player = team.roster.find(p => p.id === plan.playerId);
        const playerName = player ? player.name : 'Unknown';
        
        let logMsg;
        if (result.success) {
          logMsg = `Week ${weekJustCompleted}: ${teamAbbr} - ${playerName} improved ${result.stat} from ${result.before} to ${result.after} (+${result.improvement})`;
        } else {
          logMsg = `Week ${weekJustCompleted}: ${teamAbbr} - ${playerName}'s ${result.stat} training showed no improvement`;
        }
        
        // Add to league news
        if (!league.news) league.news = [];
        league.news.push(logMsg);
        
        // Keep news manageable
        if (league.news.length > 50) {
          league.news = league.news.slice(-25);
        }
        
      } catch (teamError) {
        console.warn(`Training error for team ${idx}:`, teamError);
      }
    });

    // Clear user training plan after use
    if (userPlan) {
      state.trainingPlan = null;
    }
    
    console.log('✅ Weekly training completed');
    
  } catch (error) {
    console.error('❌ Error in runWeeklyTraining:', error);
  }
};

// Fix 4: Safe AI training target picker
function pickAITargetSafe(team) {
  if (!team || !team.roster) return null;
  
  try {
    const C = window.Constants;
    
    // Get healthy players from roster
    const healthyPlayers = team.roster.filter(p => 
      p && (!p.injuryWeeks || p.injuryWeeks <= 0)
    );
    
    if (healthyPlayers.length === 0) return null;
    
    // Focus on starters (best players at each position)
    const positionCounts = { QB: 1, RB: 2, WR: 3, TE: 1, OL: 5, DL: 4, LB: 3, CB: 3, S: 2, K: 1, P: 1 };
    
    let bestPlayer = null;
    let bestScore = -1;
    let bestStat = 'awareness';

    const trainableStats = ['speed', 'agility', 'awareness', 'intelligence', 'acceleration'];

    // Check top players at each position
    Object.keys(positionCounts).forEach(pos => {
      const posPlayers = healthyPlayers.filter(p => p.pos === pos)
                                     .sort((a, b) => b.ovr - a.ovr)
                                     .slice(0, positionCounts[pos]);
      
      posPlayers.forEach(p => {
        trainableStats.forEach(stat => {
          const currentRating = p.ratings?.[stat] || p[stat] || 70;
          
          // Skip if already at max
          if (currentRating >= 99) return;
          
          // Calculate training priority
          const improvementPotential = Math.max(0, 99 - currentRating);
          const agePenalty = Math.max(0, p.age - 27) * 0.5;
          const positionBonus = (stat === 'awareness') ? 5 : 0;
          
          const score = improvementPotential - agePenalty + positionBonus;
          
          if (score > bestScore) {
            bestScore = score;
            bestPlayer = p;
            bestStat = stat;
          }
        });
      });
    });

    return bestPlayer ? { playerId: bestPlayer.id, stat: bestStat } : null;
    
  } catch (error) {
    console.warn('Error in pickAITargetSafe:', error);
    return null;
  }
}

// Fix 5: Safe training resolver
function resolveTrainingForSafe(team, plan) {
  if (!plan || !team) return null;
  
  try {
    const player = team.roster.find(x => x.id === plan.playerId);
    if (!player) return { ok: false, message: 'Player not found' };
    
    const stat = plan.stat;
    const currentRating = player.ratings?.[stat] || player[stat] || 70;
    
    // Simple success calculation
    const baseRate = 0.6; // 60% base success
    const coachSkill = (team.staff?.headCoach?.playerDevelopment || 75) / 100;
    const agePenalty = Math.max(0, player.age - 27) * 0.02;
    const ratingPenalty = Math.max(0, currentRating - 75) * 0.01;
    
    const successRate = Math.max(0.2, Math.min(0.85, baseRate + (coachSkill - 0.75) * 0.2 - agePenalty - ratingPenalty));
    const success = Math.random() < successRate;

    if (success) {
      const improvement = 1 + Math.floor(Math.random() * 2); // 1-2 point improvement
      const newRating = Math.min(99, currentRating + improvement);
      
      // Update rating
      if (player.ratings && player.ratings[stat] !== undefined) {
        player.ratings[stat] = newRating;
      } else {
        player[stat] = newRating;
      }
      
      // Small overall boost for key stats
      if (['awareness', 'intelligence'].includes(stat) && Math.random() < 0.3) {
        player.ovr = Math.min(99, player.ovr + 1);
      }
      
      return { 
        ok: true, 
        success: true, 
        stat, 
        before: currentRating, 
        after: newRating,
        improvement: improvement
      };
      
    } else {
      return { 
        ok: true, 
        success: false, 
        stat, 
        before: currentRating 
      };
    }
    
  } catch (error) {
    console.warn('Error in resolveTrainingForSafe:', error);
    return { ok: false, message: 'Training error' };
  }
}

// Fix 6: Enhanced router with proper error handling
window.router = function() {
  const path = location.hash || '#/hub';
  const viewName = path.slice(2);
  
  console.log('🧭 Router: navigating to', viewName);
  
  // Always show the view first
  window.show(viewName);
  
  // Only render if game is ready
  if (!state.league || !state.onboarded) {
    console.log('Game not ready for rendering');
    return;
  }
  
  // Render view content with error handling
  try {
    switch(viewName) {
      case 'hub':
        renderHubSafe();
        break;
      case 'roster':
        renderRosterSafe();
        break;
      case 'standings':
        renderStandingsSafe();
        break;
      case 'freeagency':
        if (window.renderFreeAgency) window.renderFreeAgency();
        break;
      case 'draft':
      case 'scouting':
        if (window.renderDraft) window.renderDraft();
        break;
      default:
        console.log('No renderer for:', viewName);
    }
  } catch (error) {
    console.error('Render error for', viewName, ':', error);
    window.setStatus(`Error loading ${viewName} view`);
  }
};

// Fix 7: Safe hub renderer
function renderHubSafe() {
  try {
    console.log('🏠 Rendering hub safely...');
    
    const L = state.league;
    if (!L) return;
    
    // Update basic info
    const seasonElements = ['hubSeason', 'seasonNow'];
    seasonElements.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = L.year || '2025';
    });
    
    const weekEl = document.getElementById('hubWeek');
    if (weekEl) weekEl.textContent = L.week || '1';
    
    const weeksEl = document.getElementById('hubWeeks');
    if (weeksEl) weeksEl.textContent = L.schedule?.weeks?.length || 18;
    
    // Current week games count
    const gamesEl = document.getElementById('hubGames');
    if (gamesEl) {
      const scheduleWeeks = L.schedule?.weeks || [];
      const currentWeek = scheduleWeeks[L.week - 1];
      gamesEl.textContent = currentWeek?.games?.length || 0;
    }
    
    // Power rankings
    const powerEl = document.getElementById('hubPower');
    if (powerEl && L.teams) {
      const sorted = [...L.teams].sort((a, b) => {
        const aWins = a.record?.w || a.wins || 0;
        const bWins = b.record?.w || b.wins || 0;
        if (aWins !== bWins) return bWins - aWins;
        
        const aDiff = (a.record?.pf || a.ptsFor || 0) - (a.record?.pa || a.ptsAgainst || 0);
        const bDiff = (b.record?.pf || b.ptsFor || 0) - (b.record?.pa || b.ptsAgainst || 0);
        return bDiff - aDiff;
      });
      
      powerEl.innerHTML = sorted.slice(0, 10).map((team, i) => {
        const wins = team.record?.w || team.wins || 0;
        const losses = team.record?.l || team.losses || 0;
        const isUser = team.id === (state.userTeamId || state.player?.teamId);
        const userClass = isUser ? ' class="user-team"' : '';
        
        return `<li${userClass}>${i + 1}. ${team.name} (${wins}-${losses})</li>`;
      }).join('');
    }
    
    // Last week results
    renderLastWeekResultsSafe();
    
    console.log('✅ Hub rendered safely');
    
  } catch (error) {
    console.error('Error in renderHubSafe:', error);
  }
}

// Fix 8: Safe standings renderer
function renderStandingsSafe() {
  try {
    console.log('📊 Rendering standings safely...');
    
    const L = state.league;
    if (!L || !L.teams) return;
    
    const container = document.getElementById('standingsWrap');
    if (!container) return;
    
    const divisions = ['East', 'North', 'South', 'West'];
    const conferences = ['AFC', 'NFC'];
    
    let html = '';
    
    conferences.forEach((conf, confIndex) => {
      html += `<div class="conference"><h3>${conf}</h3><div class="divisions">`;
      
      divisions.forEach((div, divIndex) => {
        const divTeams = L.teams.filter(t => t.conf === confIndex && t.div === divIndex);
        
        divTeams.sort((a, b) => {
          const aWins = a.record?.w || a.wins || 0;
          const bWins = b.record?.w || b.wins || 0;
          if (aWins !== bWins) return bWins - aWins;
          
          const aDiff = (a.record?.pf || a.ptsFor || 0) - (a.record?.pa || a.ptsAgainst || 0);
          const bDiff = (b.record?.pf || b.ptsFor || 0) - (b.record?.pa || b.ptsAgainst || 0);
          return bDiff - aDiff;
        });
        
        html += `
          <div class="division">
            <h4>${div}</h4>
            <table class="table">
              <thead><tr><th>Team</th><th>W</th><th>L</th><th>PF</th><th>PA</th></tr></thead>
              <tbody>
                ${divTeams.map(team => {
                  const wins = team.record?.w || team.wins || 0;
                  const losses = team.record?.l || team.losses || 0;
                  const pf = team.record?.pf || team.ptsFor || 0;
                  const pa = team.record?.pa || team.ptsAgainst || 0;
                  
                  const isUser = team.id === (state.userTeamId || state.player?.teamId);
                  const userClass = isUser ? ' class="user-team"' : '';
                  
                  return `
                    <tr${userClass}>
                      <td>${team.name}${isUser ? ' (You)' : ''}</td>
                      <td>${wins}</td>
                      <td>${losses}</td>
                      <td>${pf}</td>
                      <td>${pa}</td>
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
    
    container.innerHTML = html;
    console.log('✅ Standings rendered safely');
    
  } catch (error) {
    console.error('Error in renderStandingsSafe:', error);
  }
}

// Fix 9: Safe roster renderer
function renderRosterSafe() {
  try {
    console.log('👥 Rendering roster safely...');
    
    const L = state.league;
    if (!L) return;
    
    const teamSelect = document.getElementById('rosterTeam');
    if (teamSelect && window.fillTeamSelect && teamSelect.options.length === 0) {
      window.fillTeamSelect(teamSelect);
    }
    
    const teamId = parseInt(teamSelect?.value || state.userTeamId || '0', 10);
    const team = L.teams[teamId];
    
    if (!team) return;
    
    // Update title
    const titleEl = document.getElementById('rosterTitle');
    if (titleEl) titleEl.textContent = `${team.name} Roster`;
    
    // Render roster table
    const table = document.getElementById('rosterTable');
    if (!table) return;
    
    if (!team.roster || team.roster.length === 0) {
      table.innerHTML = '<tr><td colspan="7">No players on roster</td></tr>';
      return;
    }
    
    table.innerHTML = `
      <thead>
        <tr>
          <th>Name</th><th>Pos</th><th>Age</th><th>OVR</th>
          <th>Contract</th><th>Cap Hit</th><th>Abilities</th>
        </tr>
      </thead>
      <tbody>
        ${team.roster.map(player => {
          const capHit = window.capHitFor ? window.capHitFor(player, 0) : player.baseAnnual || 0;
          const abilities = (player.abilities || []).slice(0, 2).join(', ') || 'None';
          const contract = `${player.years}yr / $${(player.baseAnnual || 0).toFixed(1)}M`;
          
          return `
            <tr>
              <td>${player.name}</td>
              <td>${player.pos}</td>
              <td>${player.age}</td>
              <td>${player.ovr}</td>
              <td>${contract}</td>
              <td>$${capHit.toFixed(1)}M</td>
              <td>${abilities}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    `;
    
    console.log('✅ Roster rendered safely');
    
  } catch (error) {
    console.error('Error in renderRosterSafe:', error);
  }
}

// Fix 10: Safe results renderer
function renderLastWeekResultsSafe() {
  try {
    const L = state.league;
    const resultsEl = document.getElementById('hubResults');
    
    if (!resultsEl || !L.resultsByWeek) return;
    
    const lastWeek = Math.max(0, L.week - 2);
    const results = L.resultsByWeek[lastWeek] || [];
    
    if (results.length === 0) {
      resultsEl.innerHTML = '<div class="muted">No recent results</div>';
      return;
    }
    
    resultsEl.innerHTML = results.slice(0, 6).map(result => {
      if (result.bye !== undefined) {
        const team = L.teams[result.bye];
        return `<div class="result-item">${team?.name || 'Team'} - BYE</div>`;
      }
      
      const home = L.teams[result.home];
      const away = L.teams[result.away];
      if (!home || !away) return '';
      
      return `<div class="result-item">${away.abbr} ${result.scoreAway} @ ${home.abbr} ${result.scoreHome}</div>`;
    }).join('');
    
  } catch (error) {
    console.warn('Error rendering results:', error);
  }
}

// Fix 11: Setup navigation
function setupNavigation() {
  console.log('🧭 Setting up safe navigation...');
  
  window.removeEventListener('hashchange', window.router);
  window.addEventListener('hashchange', window.router);
  
  // Handle nav clicks
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
  setTimeout(window.router, 100);
}

// Auto-setup
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNavigation);
} else {
  setupNavigation();
}

// Make functions globally available
window.pickAITargetSafe = pickAITargetSafe;
window.resolveTrainingForSafe = resolveTrainingForSafe;
window.renderHubSafe = renderHubSafe;
window.renderStandingsSafe = renderStandingsSafe;
window.renderRosterSafe = renderRosterSafe;
window.renderLastWeekResultsSafe = renderLastWeekResultsSafe;

console.log('✅ Final cleanup fixes loaded!');
