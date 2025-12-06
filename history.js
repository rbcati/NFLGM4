// history.js - League History and Records System
'use strict';

(function() {
  'use strict';

  /**
   * Initialize history tracking in league
   */
  function initializeHistory(league) {
    if (!league) return;

    if (!league.history) {
      league.history = {
        superBowls: [],      // [{year, winner, runnerUp, score}]
        mvps: [],            // [{year, player, team, position, stats}]
        awards: [],          // [{year, type, player, team}]
        coachRankings: []    // [{year, offensive: [{coach, rank}], defensive: [{coach, rank}]}]
      };
    }
  }

  /**
   * Record Super Bowl winner
   */
  function recordSuperBowl(league, year, winner, runnerUp, score) {
    initializeHistory(league);
    
    league.history.superBowls.push({
      year: year,
      winner: {
        name: winner.name || winner,
        abbr: winner.abbr || '',
        id: winner.id
      },
      runnerUp: {
        name: runnerUp.name || runnerUp,
        abbr: runnerUp.abbr || '',
        id: runnerUp.id
      },
      score: score || 'N/A'
    });

    // Sort by year (newest first)
    league.history.superBowls.sort((a, b) => b.year - a.year);
  }

  /**
   * Record MVP
   */
  function recordMVP(league, year, player, team, stats) {
    initializeHistory(league);
    
    league.history.mvps.push({
      year: year,
      player: {
        name: player.name || player,
        id: player.id,
        position: player.pos
      },
      team: {
        name: team.name || team,
        abbr: team.abbr || '',
        id: team.id
      },
      stats: stats || {}
    });

    league.history.mvps.sort((a, b) => b.year - a.year);
  }

  /**
   * Record award
   */
  function recordAward(league, year, type, player, team) {
    initializeHistory(league);
    
    league.history.awards.push({
      year: year,
      type: type, // 'Offensive Player', 'Defensive Player', 'Rookie', etc.
      player: {
        name: player.name || player,
        id: player.id,
        position: player.pos
      },
      team: {
        name: team.name || team,
        abbr: team.abbr || '',
        id: team.id
      }
    });

    league.history.awards.sort((a, b) => b.year - a.year);
  }

  /**
   * Record coach rankings
   */
  function recordCoachRankings(league, year, offensiveRankings, defensiveRankings) {
    initializeHistory(league);
    
    league.history.coachRankings.push({
      year: year,
      offensive: offensiveRankings.map((coach, index) => ({
        coach: {
          name: coach.name || coach,
          id: coach.id
        },
        team: {
          name: coach.team?.name || '',
          abbr: coach.team?.abbr || '',
          id: coach.team?.id
        },
        rank: index + 1,
        stats: coach.stats || {}
      })),
      defensive: defensiveRankings.map((coach, index) => ({
        coach: {
          name: coach.name || coach,
          id: coach.id
        },
        team: {
          name: coach.team?.name || '',
          abbr: coach.team?.abbr || '',
          id: coach.team?.id
        },
        rank: index + 1,
        stats: coach.stats || {}
      }))
    });

    league.history.coachRankings.sort((a, b) => b.year - a.year);
  }

  /**
   * Render history view
   */
  function renderHistory() {
    const container = document.getElementById('history');
    if (!container) {
      console.warn('History container not found');
      return;
    }

    const L = window.state?.league;
    if (!L) {
      container.innerHTML = '<div class="card"><p>No league data available.</p></div>';
      return;
    }

    initializeHistory(L);
    const history = L.history;

    let html = `
      <div class="card">
        <h2>League History</h2>
        <div class="history-tabs">
          <button class="tab-btn active" data-tab="superbowls">Super Bowls</button>
          <button class="tab-btn" data-tab="mvps">MVPs & Awards</button>
          <button class="tab-btn" data-tab="coaches">Coach Rankings</button>
        </div>

        <div id="history-tab-content">
          ${renderSuperBowls(history.superBowls)}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Set up tab switching
    const tabButtons = container.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const tabContent = document.getElementById('history-tab-content');
        const tab = btn.dataset.tab;
        
        if (tab === 'superbowls') {
          tabContent.innerHTML = renderSuperBowls(history.superBowls);
        } else if (tab === 'mvps') {
          tabContent.innerHTML = renderMVPsAndAwards(history.mvps, history.awards);
        } else if (tab === 'coaches') {
          tabContent.innerHTML = renderCoachRankings(history.coachRankings);
        }
      });
    });
  }

  /**
   * Render Super Bowl history
   */
  function renderSuperBowls(superBowls) {
    if (!superBowls || superBowls.length === 0) {
      return '<div class="history-section"><p>No Super Bowl history yet.</p></div>';
    }

    return `
      <div class="history-section">
        <h3>Super Bowl Champions</h3>
        <div class="superbowl-history">
          ${superBowls.map(sb => `
            <div class="superbowl-entry">
              <div class="superbowl-year">${sb.year}</div>
              <div class="superbowl-matchup">
                <div class="superbowl-winner">
                  <span class="trophy">🏆</span>
                  <span class="team-name">${sb.winner.name}</span>
                  ${sb.winner.abbr ? `<span class="team-abbr">${sb.winner.abbr}</span>` : ''}
                </div>
                <div class="superbowl-runnerup">
                  <span class="team-name">${sb.runnerUp.name}</span>
                  ${sb.runnerUp.abbr ? `<span class="team-abbr">${sb.runnerUp.abbr}</span>` : ''}
                </div>
                ${sb.score !== 'N/A' ? `<div class="superbowl-score">${sb.score}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render MVPs and Awards
   */
  function renderMVPsAndAwards(mvps, awards) {
    const mvpSection = mvps && mvps.length > 0 ? `
      <div class="mvp-section">
        <h3>Most Valuable Players</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Player</th>
              <th>Position</th>
              <th>Team</th>
            </tr>
          </thead>
          <tbody>
            ${mvps.map(mvp => `
              <tr>
                <td>${mvp.year}</td>
                <td>${mvp.player.name}</td>
                <td>${mvp.player.position}</td>
                <td>${mvp.team.name}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '<div class="mvp-section"><p>No MVP history yet.</p></div>';

    const awardsSection = awards && awards.length > 0 ? `
      <div class="awards-section">
        <h3>Other Awards</h3>
        <table class="table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Award</th>
              <th>Player</th>
              <th>Position</th>
              <th>Team</th>
            </tr>
          </thead>
          <tbody>
            ${awards.map(award => `
              <tr>
                <td>${award.year}</td>
                <td>${award.type}</td>
                <td>${award.player.name}</td>
                <td>${award.player.position}</td>
                <td>${award.team.name}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    return mvpSection + awardsSection;
  }

  /**
   * Render coach rankings
   */
  function renderCoachRankings(coachRankings) {
    if (!coachRankings || coachRankings.length === 0) {
      return '<div class="history-section"><p>No coach ranking history yet.</p></div>';
    }

    const latest = coachRankings[0]; // Most recent year

    return `
      <div class="history-section">
        <h3>Coach Rankings - ${latest.year}</h3>
        
        <div class="coach-rankings-grid">
          <div class="offensive-rankings">
            <h4>Offensive Rankings</h4>
            <table class="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Coach</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                ${latest.offensive.map(rank => `
                  <tr>
                    <td>${rank.rank}</td>
                    <td>${rank.coach.name}</td>
                    <td>${rank.team.name || rank.team.abbr}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="defensive-rankings">
            <h4>Defensive Rankings</h4>
            <table class="table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Coach</th>
                  <th>Team</th>
                </tr>
              </thead>
              <tbody>
                ${latest.defensive.map(rank => `
                  <tr>
                    <td>${rank.rank}</td>
                    <td>${rank.coach.name}</td>
                    <td>${rank.team.name || rank.team.abbr}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        ${coachRankings.length > 1 ? `
          <div class="previous-years">
            <h4>Previous Years</h4>
            <select id="coachYearSelect">
              ${coachRankings.map(cr => `<option value="${cr.year}">${cr.year}</option>`).join('')}
            </select>
          </div>
        ` : ''}
      </div>
    `;
  }

  // Export functions
  window.renderHistory = renderHistory;
  window.initializeHistory = initializeHistory;
  window.recordSuperBowl = recordSuperBowl;
  window.recordMVP = recordMVP;
  window.recordAward = recordAward;
  window.recordCoachRankings = recordCoachRankings;

  console.log('✅ History system loaded');

})();
