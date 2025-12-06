// records.js - All-Time Records and Leaderboards System
'use strict';

(function() {
  'use strict';

  /**
   * Initialize records structure in league
   * @param {Object} league - League object
   */
  function initializeRecords(league) {
    if (!league) return;
    
    if (!league.records) {
      league.records = {
        // Career totals (all-time records)
        careerTotals: {
          // Passing
          passYd: { player: null, value: 0, year: null },
          passTD: { player: null, value: 0, year: null },
          passAtt: { player: null, value: 0, year: null },
          passComp: { player: null, value: 0, year: null },
          interceptions: { player: null, value: 0, year: null },
          sacks: { player: null, value: 0, year: null },
          
          // Rushing
          rushYd: { player: null, value: 0, year: null },
          rushTD: { player: null, value: 0, year: null },
          rushAtt: { player: null, value: 0, year: null },
          
          // Receiving
          recYd: { player: null, value: 0, year: null },
          recTD: { player: null, value: 0, year: null },
          receptions: { player: null, value: 0, year: null },
          targets: { player: null, value: 0, year: null },
          drops: { player: null, value: 0, year: null },
          
          // All-purpose
          allTD: { player: null, value: 0, year: null },
          
          // Defense
          tackles: { player: null, value: 0, year: null },
          tacklesForLoss: { player: null, value: 0, year: null },
          forcedFumbles: { player: null, value: 0, year: null },
          interceptions: { player: null, value: 0, year: null },
          pickSixes: { player: null, value: 0, year: null },
          safeties: { player: null, value: 0, year: null },
          passesDefended: { player: null, value: 0, year: null },
          defensiveTD: { player: null, value: 0, year: null },
          
          // Special teams
          fgMade: { player: null, value: 0, year: null },
          fgAttempts: { player: null, value: 0, year: null },
          punts: { player: null, value: 0, year: null },
          puntYards: { player: null, value: 0, year: null }
        },
        
        // Career averages/percentages (leaderboards - top 10)
        careerAverages: {
          passYd: [],
          completionPct: [],
          rushYd: [],
          passerRating: [],
          qbRating: [],
          recYd: [],
          receptions: [],
          drops: [],
          rushTD: [],
          recTD: [],
          allTD: [],
          passTD: [],
          sacks: [],
          tackles: [],
          tacklesForLoss: [],
          defensiveTD: [],
          forcedFumbles: [],
          interceptions: [],
          pickSixes: [],
          safeties: [],
          passesDefended: []
        },
        
        // Single season records
        singleSeason: {
          passYd: { player: null, value: 0, year: null },
          passTD: { player: null, value: 0, year: null },
          rushYd: { player: null, value: 0, year: null },
          rushTD: { player: null, value: 0, year: null },
          recYd: { player: null, value: 0, year: null },
          recTD: { player: null, value: 0, year: null },
          receptions: { player: null, value: 0, year: null },
          sacks: { player: null, value: 0, year: null },
          tackles: { player: null, value: 0, year: null },
          interceptions: { player: null, value: 0, year: null }
        },
        
        // Single game records
        singleGame: {
          passYd: { player: null, value: 0, year: null, week: null },
          passTD: { player: null, value: 0, year: null, week: null },
          rushYd: { player: null, value: 0, year: null, week: null },
          rushTD: { player: null, value: 0, year: null, week: null },
          recYd: { player: null, value: 0, year: null, week: null },
          recTD: { player: null, value: 0, year: null, week: null },
          sacks: { player: null, value: 0, year: null, week: null },
          interceptions: { player: null, value: 0, year: null, week: null }
        }
      };
    }
  }

  /**
   * Update career totals records
   * @param {Object} league - League object
   */
  function updateCareerTotals(league) {
    if (!league || !league.teams) return;
    
    initializeRecords(league);
    
    const records = league.records.careerTotals;
    const statFields = Object.keys(records);
    
    // Reset all records
    statFields.forEach(field => {
      records[field] = { player: null, value: 0, year: null };
    });
    
    // Find all-time leaders
    league.teams.forEach(team => {
      if (!team.roster || !Array.isArray(team.roster)) return;
      
      team.roster.forEach(player => {
        if (!player.stats || !player.stats.career) return;
        
        const career = player.stats.career;
        
        // Check each stat field
        statFields.forEach(field => {
          const value = career[field];
          if (typeof value === 'number' && value > (records[field].value || 0)) {
            records[field] = {
              player: {
                id: player.id,
                name: player.name,
                pos: player.pos
              },
              value: value,
              year: league.year || null
            };
          }
        });
      });
    });
  }

  /**
   * Calculate career averages/percentages and create leaderboards
   * @param {Object} league - League object
   */
  function updateCareerAverages(league) {
    if (!league || !league.teams) return;
    
    initializeRecords(league);
    
    const leaderboards = league.records.careerAverages;
    
    // Define leaderboard configurations
    const leaderboardConfigs = {
      passYd: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          const games = career.gamesPlayed || 1;
          return (career.passYd || 0) / games; // Yards per game
        },
        format: (val) => val.toFixed(1) + ' YPG'
      },
      completionPct: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          const att = career.passAtt || 1;
          const comp = career.passComp || 0;
          return att >= 100 ? (comp / att) * 100 : 0; // Minimum 100 attempts
        },
        format: (val) => val.toFixed(1) + '%'
      },
      rushYd: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          const games = career.gamesPlayed || 1;
          return (career.rushYd || 0) / games;
        },
        format: (val) => val.toFixed(1) + ' YPG'
      },
      passerRating: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.passerRating || 0;
        },
        format: (val) => val.toFixed(1)
      },
      qbRating: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.qbRating || 0;
        },
        format: (val) => val.toFixed(1)
      },
      recYd: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          const games = career.gamesPlayed || 1;
          return (career.recYd || 0) / games;
        },
        format: (val) => val.toFixed(1) + ' YPG'
      },
      receptions: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          const games = career.gamesPlayed || 1;
          return (career.receptions || 0) / games;
        },
        format: (val) => val.toFixed(1) + ' RPG'
      },
      drops: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          const targets = career.targets || 1;
          return targets >= 50 ? ((career.drops || 0) / targets) * 100 : 0; // Drop percentage
        },
        format: (val) => val.toFixed(1) + '%'
      },
      rushTD: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.rushTD || 0;
        },
        format: (val) => val.toLocaleString()
      },
      recTD: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.recTD || 0;
        },
        format: (val) => val.toLocaleString()
      },
      allTD: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return (career.passTD || 0) + (career.rushTD || 0) + (career.recTD || 0);
        },
        format: (val) => val.toLocaleString()
      },
      passTD: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.passTD || 0;
        },
        format: (val) => val.toLocaleString()
      },
      sacks: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.sacks || 0;
        },
        format: (val) => val.toLocaleString()
      },
      tackles: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.tackles || 0;
        },
        format: (val) => val.toLocaleString()
      },
      tacklesForLoss: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.tacklesForLoss || 0;
        },
        format: (val) => val.toLocaleString()
      },
      defensiveTD: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.defensiveTD || 0;
        },
        format: (val) => val.toLocaleString()
      },
      forcedFumbles: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.forcedFumbles || 0;
        },
        format: (val) => val.toLocaleString()
      },
      interceptions: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.interceptions || 0;
        },
        format: (val) => val.toLocaleString()
      },
      pickSixes: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.pickSixes || 0;
        },
        format: (val) => val.toLocaleString()
      },
      safeties: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.safeties || 0;
        },
        format: (val) => val.toLocaleString()
      },
      passesDefended: {
        calculate: (player) => {
          const career = player.stats?.career || {};
          return career.passesDefended || 0;
        },
        format: (val) => val.toLocaleString()
      }
    };
    
    // Calculate leaderboards for each stat
    Object.keys(leaderboardConfigs).forEach(statKey => {
      const config = leaderboardConfigs[statKey];
      const entries = [];
      
      league.teams.forEach(team => {
        if (!team.roster || !Array.isArray(team.roster)) return;
        
        team.roster.forEach(player => {
          if (!player.stats || !player.stats.career) return;
          
          const value = config.calculate(player);
          if (value > 0) {
            entries.push({
              player: {
                id: player.id,
                name: player.name,
                pos: player.pos,
                team: team.name,
                teamAbbr: team.abbr
              },
              value: value,
              formatted: config.format(value)
            });
          }
        });
      });
      
      // Sort and take top 10
      entries.sort((a, b) => b.value - a.value);
      leaderboards[statKey] = entries.slice(0, 10);
    });
  }

  /**
   * Check and update single season records
   * @param {Object} league - League object
   * @param {number} year - Season year
   */
  function updateSingleSeasonRecords(league, year) {
    if (!league || !league.teams) return;
    
    initializeRecords(league);
    
    const records = league.records.singleSeason;
    const statFields = ['passYd', 'passTD', 'rushYd', 'rushTD', 'recYd', 'recTD', 'receptions', 'sacks', 'tackles', 'interceptions'];
    
    league.teams.forEach(team => {
      if (!team.roster || !Array.isArray(team.roster)) return;
      
      team.roster.forEach(player => {
        if (!player.stats || !player.stats.season) return;
        
        const season = player.stats.season;
        
        statFields.forEach(field => {
          const value = season[field];
          if (typeof value === 'number' && value > (records[field]?.value || 0)) {
            records[field] = {
              player: {
                id: player.id,
                name: player.name,
                pos: player.pos
              },
              value: value,
              year: year
            };
          }
        });
      });
    });
  }

  /**
   * Check and update single game records
   * @param {Object} league - League object
   * @param {number} year - Season year
   * @param {number} week - Week number
   */
  function updateSingleGameRecords(league, year, week) {
    if (!league || !league.resultsByWeek) return;
    
    initializeRecords(league);
    
    const records = league.records.singleGame;
    const weekResults = league.resultsByWeek[week - 1];
    if (!weekResults || !Array.isArray(weekResults)) return;
    
    weekResults.forEach(gameResult => {
      if (!gameResult || !gameResult.boxScore) return;
      
      // Check both teams
      ['home', 'away'].forEach(side => {
        const playerStats = gameResult.boxScore[side];
        if (!playerStats) return;
        
        Object.values(playerStats).forEach(playerData => {
          if (!playerData || !playerData.stats) return;
          
          const gameStats = playerData.stats;
          const statFields = ['passYd', 'passTD', 'rushYd', 'rushTD', 'recYd', 'recTD', 'sacks', 'interceptions'];
          
          statFields.forEach(field => {
            const value = gameStats[field];
            if (typeof value === 'number' && value > (records[field]?.value || 0)) {
              records[field] = {
                player: {
                  id: playerData.id || playerData.name,
                  name: playerData.name,
                  pos: playerData.pos
                },
                value: value,
                year: year,
                week: week
              };
            }
          });
        });
      });
    });
  }

  /**
   * Update all records (called at end of season)
   * @param {Object} league - League object
   * @param {number} year - Season year
   */
  function updateAllRecords(league, year) {
    if (!league) return;
    
    console.log(`Updating all-time records for ${year}...`);
    
    updateCareerTotals(league);
    updateCareerAverages(league);
    updateSingleSeasonRecords(league, year);
    
    // Update single game records for all weeks
    if (league.resultsByWeek) {
      Object.keys(league.resultsByWeek).forEach(weekIndex => {
        const week = parseInt(weekIndex) + 1;
        updateSingleGameRecords(league, year, week);
      });
    }
    
    console.log('✅ All-time records updated');
  }

  /**
   * Render records view
   */
  function renderRecords() {
    const container = document.getElementById('records');
    if (!container) {
      console.warn('Records container not found');
      return;
    }
    
    const L = window.state?.league;
    if (!L) {
      container.innerHTML = '<div class="card"><p>No league loaded.</p></div>';
      return;
    }
    
    initializeRecords(L);
    const records = L.records;
    
    let html = `
      <div class="card">
        <h2>All-Time Records</h2>
        
        <div class="records-tabs">
          <button class="tab-btn active" data-tab="career-totals">Career Totals</button>
          <button class="tab-btn" data-tab="career-averages">Career Leaderboards</button>
          <button class="tab-btn" data-tab="single-season">Single Season</button>
          <button class="tab-btn" data-tab="single-game">Single Game</button>
        </div>
        
        <div class="records-content">
          <div id="career-totals-tab" class="records-tab-content active">
            ${renderCareerTotals(records.careerTotals)}
          </div>
          
          <div id="career-averages-tab" class="records-tab-content">
            ${renderCareerAverages(records.careerAverages)}
          </div>
          
          <div id="single-season-tab" class="records-tab-content">
            ${renderSingleSeason(records.singleSeason)}
          </div>
          
          <div id="single-game-tab" class="records-tab-content">
            ${renderSingleGame(records.singleGame)}
          </div>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    // Set up tab switching
    const tabButtons = container.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        
        // Update button states
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content visibility
        container.querySelectorAll('.records-tab-content').forEach(content => {
          content.classList.remove('active');
        });
        const targetContent = container.querySelector(`#${tab}-tab`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  /**
   * Render career totals
   */
  function renderCareerTotals(careerTotals) {
    if (!careerTotals) return '<p>No career totals available.</p>';
    
    const statNames = {
      passYd: 'Passing Yards',
      passTD: 'Passing Touchdowns',
      passAtt: 'Pass Attempts',
      passComp: 'Pass Completions',
      interceptions: 'Interceptions Thrown',
      sacks: 'Sacks Taken',
      rushYd: 'Rushing Yards',
      rushTD: 'Rushing Touchdowns',
      rushAtt: 'Rush Attempts',
      recYd: 'Receiving Yards',
      recTD: 'Receiving Touchdowns',
      receptions: 'Receptions',
      targets: 'Targets',
      drops: 'Drops',
      allTD: 'Total Touchdowns',
      tackles: 'Tackles',
      tacklesForLoss: 'Tackles for Loss',
      forcedFumbles: 'Forced Fumbles',
      pickSixes: 'Pick Sixes',
      safeties: 'Safeties',
      passesDefended: 'Passes Defended',
      defensiveTD: 'Defensive Touchdowns',
      fgMade: 'Field Goals Made',
      fgAttempts: 'Field Goal Attempts',
      punts: 'Punts',
      puntYards: 'Punt Yards'
    };
    
    const entries = Object.entries(careerTotals)
      .filter(([key, record]) => record && record.player && record.value > 0)
      .sort((a, b) => b[1].value - a[1].value);
    
    if (entries.length === 0) {
      return '<p>No career totals recorded yet.</p>';
    }
    
    return `
      <div class="records-table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Statistic</th>
              <th>Player</th>
              <th>Position</th>
              <th>Value</th>
              <th>Year Set</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(([stat, record]) => `
              <tr>
                <td><strong>${statNames[stat] || stat}</strong></td>
                <td>${record.player.name}</td>
                <td>${record.player.pos}</td>
                <td>${record.value.toLocaleString()}</td>
                <td>${record.year || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render career averages/leaderboards
   */
  function renderCareerAverages(careerAverages) {
    if (!careerAverages) return '<p>No leaderboards available.</p>';
    
    const leaderboardNames = {
      passYd: 'Passing Yards per Game',
      completionPct: 'Completion Percentage',
      rushYd: 'Rushing Yards per Game',
      passerRating: 'Passer Rating',
      qbRating: 'QB Rating',
      recYd: 'Receiving Yards per Game',
      receptions: 'Receptions per Game',
      drops: 'Drop Percentage',
      rushTD: 'Rushing Touchdowns',
      recTD: 'Receiving Touchdowns',
      allTD: 'Total Touchdowns',
      passTD: 'Passing Touchdowns',
      sacks: 'Sacks',
      tackles: 'Tackles',
      tacklesForLoss: 'Tackles for Loss',
      defensiveTD: 'Defensive Touchdowns',
      forcedFumbles: 'Forced Fumbles',
      interceptions: 'Interceptions',
      pickSixes: 'Pick Sixes',
      safeties: 'Safeties',
      passesDefended: 'Passes Defended'
    };
    
    const leaderboards = Object.entries(careerAverages)
      .filter(([key, entries]) => entries && entries.length > 0);
    
    if (leaderboards.length === 0) {
      return '<p>No leaderboards available yet.</p>';
    }
    
    return `
      <div class="leaderboards-grid">
        ${leaderboards.map(([stat, entries]) => `
          <div class="leaderboard-card">
            <h3>${leaderboardNames[stat] || stat}</h3>
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Player</th>
                  <th>Pos</th>
                  <th>Team</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                ${entries.map((entry, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${entry.player.name}</td>
                    <td>${entry.player.pos}</td>
                    <td>${entry.player.teamAbbr || entry.player.team}</td>
                    <td><strong>${entry.formatted}</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render single season records
   */
  function renderSingleSeason(singleSeason) {
    if (!singleSeason) return '<p>No single season records available.</p>';
    
    const statNames = {
      passYd: 'Passing Yards',
      passTD: 'Passing Touchdowns',
      rushYd: 'Rushing Yards',
      rushTD: 'Rushing Touchdowns',
      recYd: 'Receiving Yards',
      recTD: 'Receiving Touchdowns',
      receptions: 'Receptions',
      sacks: 'Sacks',
      tackles: 'Tackles',
      interceptions: 'Interceptions'
    };
    
    const entries = Object.entries(singleSeason)
      .filter(([key, record]) => record && record.player && record.value > 0)
      .sort((a, b) => b[1].value - a[1].value);
    
    if (entries.length === 0) {
      return '<p>No single season records yet.</p>';
    }
    
    return `
      <div class="records-table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Statistic</th>
              <th>Player</th>
              <th>Position</th>
              <th>Value</th>
              <th>Year</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(([stat, record]) => `
              <tr>
                <td><strong>${statNames[stat] || stat}</strong></td>
                <td>${record.player.name}</td>
                <td>${record.player.pos}</td>
                <td>${record.value.toLocaleString()}</td>
                <td>${record.year || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render single game records
   */
  function renderSingleGame(singleGame) {
    if (!singleGame) return '<p>No single game records available.</p>';
    
    const statNames = {
      passYd: 'Passing Yards',
      passTD: 'Passing Touchdowns',
      rushYd: 'Rushing Yards',
      rushTD: 'Rushing Touchdowns',
      recYd: 'Receiving Yards',
      recTD: 'Receiving Touchdowns',
      sacks: 'Sacks',
      interceptions: 'Interceptions'
    };
    
    const entries = Object.entries(singleGame)
      .filter(([key, record]) => record && record.player && record.value > 0)
      .sort((a, b) => b[1].value - a[1].value);
    
    if (entries.length === 0) {
      return '<p>No single game records yet.</p>';
    }
    
    return `
      <div class="records-table-container">
        <table class="table">
          <thead>
            <tr>
              <th>Statistic</th>
              <th>Player</th>
              <th>Position</th>
              <th>Value</th>
              <th>Year</th>
              <th>Week</th>
            </tr>
          </thead>
          <tbody>
            ${entries.map(([stat, record]) => `
              <tr>
                <td><strong>${statNames[stat] || stat}</strong></td>
                <td>${record.player.name}</td>
                <td>${record.player.pos}</td>
                <td>${record.value.toLocaleString()}</td>
                <td>${record.year || 'N/A'}</td>
                <td>${record.week || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // Export functions
  window.initializeRecords = initializeRecords;
  window.updateAllRecords = updateAllRecords;
  window.updateCareerTotals = updateCareerTotals;
  window.updateCareerAverages = updateCareerAverages;
  window.updateSingleSeasonRecords = updateSingleSeasonRecords;
  window.updateSingleGameRecords = updateSingleGameRecords;
  window.renderRecords = renderRecords;

  console.log('✅ All-Time Records System loaded');

})();
