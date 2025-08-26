'use strict';

/**
 * Applies the result of a simulated game to the teams' records.
 * @param {object} game - An object containing the home and away team objects.
 * @param {object} game.home - The home team object.
 * @param {object} game.away - The away team object.
 * @param {number} homeScore - The final score for the home team.
 * @param {number} awayScore - The final score for the away team.
 */
function applyResult(game, homeScore, awayScore) {
  const home = game.home;
  const away = game.away;

  // This check is important to prevent errors if teams are not found
  if (!home || !away) {
    console.error("Invalid team data provided to applyResult", game);
    return;
  }

  // Initialize records if they don't exist
  if (home.wins === undefined) home.wins = 0;
  if (home.losses === undefined) home.losses = 0;
  if (home.ties === undefined) home.ties = 0;
  if (away.wins === undefined) away.wins = 0;
  if (away.losses === undefined) away.losses = 0;
  if (away.ties === undefined) away.ties = 0;
  if (home.ptsFor === undefined) home.ptsFor = 0;
  if (home.ptsAgainst === undefined) home.ptsAgainst = 0;
  if (away.ptsFor === undefined) away.ptsFor = 0;
  if (away.ptsAgainst === undefined) away.ptsAgainst = 0;


  // Update game scores if a game object is passed with schedule info
  if (game.played !== undefined) {
      game.homeScore = homeScore;
      game.awayScore = awayScore;
      game.played = true;
  }


  // Update team records
  if (homeScore > awayScore) {
    home.wins++;
    away.losses++;
  } else if (awayScore > homeScore) {
    away.wins++;
    home.losses++;
  } else {
    home.ties++;
    away.ties++;
  }

  // Update points for and against
  home.ptsFor += homeScore;
  home.ptsAgainst += awayScore;
  away.ptsFor += awayScore;
  away.ptsAgainst += homeScore;
}


/**
 * Simulates game statistics for a single game between two teams.
 * @param {object} home - The home team object.
 * @param {object} away - The away team object.
 * @returns {object} An object with homeScore and awayScore.
 */
function simGameStats(home, away) {
  const C = window.Constants.SIMULATION;
  const U = window.Utils;

  // Basic team strength from overall ratings
  const homeStrength = home.roster.reduce((acc, p) => acc + p.ovr, 0) / home.roster.length;
  const awayStrength = away.roster.reduce((acc, p) => acc + p.ovr, 0) / away.roster.length;

  // Add home advantage
  const strengthDiff = (homeStrength - awayStrength) + C.HOME_ADVANTAGE;

  // Simulate scores
  let homeScore = U.rand(C.BASE_SCORE_MIN, C.BASE_SCORE_MAX) + Math.round(strengthDiff / 5);
  let awayScore = U.rand(C.BASE_SCORE_MIN, C.BASE_SCORE_MAX) - Math.round(strengthDiff / 5);

  // Add some randomness
  homeScore += U.rand(0, C.SCORE_VARIANCE);
  awayScore += U.rand(0, C.SCORE_VARIANCE);

  // Ensure scores are non-negative
  homeScore = Math.max(0, homeScore);
  awayScore = Math.max(0, awayScore);

  // Simulate basic player stats (you can expand on this)
  [home, away].forEach((team, isHome) => {
    const score = isHome ? homeScore : awayScore;
    const qb = team.roster.find(p => p.pos === 'QB');
    if (qb) {
      const passYd = Math.round(score * U.rand(8, 12));
      const passTD = Math.floor(score / 10);
      if(!qb.stats) qb.stats = {};
      qb.stats.game = { passYd, passTD };
    }
  });

  return { homeScore, awayScore };
}


/**
 * Simulates all games for the current week in the league.
 */
function simulateWeek() {
  const L = state.league;

  // Enhanced validation
  if (!L) {
    console.error('No league available for simulation');
    window.setStatus('Error: No league loaded');
    return;
  }

  if (!L.schedule) {
    console.error('No schedule available for simulation');
    window.setStatus('Error: No schedule found');
    return;
  }

  // Handle both schedule formats (legacy compatibility)
  const scheduleWeeks = L.schedule.weeks || L.schedule;
  if (!scheduleWeeks || !Array.isArray(scheduleWeeks)) {
    console.error('Invalid schedule format for simulation');
    window.setStatus('Error: Invalid schedule format');
    return;
  }

  try {
    console.log(`Simulating week ${L.week}...`);
    window.setStatus(`Simulating week ${L.week}...`);

    // Check if season is over
    if (L.week > scheduleWeeks.length) {
      console.log('Regular season complete, starting playoffs');
      window.setStatus('Regular season complete!');

      if (window.startPlayoffs) {
        window.startPlayoffs();
      } else {
        // Fallback if playoffs not implemented
        window.setStatus('Season complete! Check standings.');
        location.hash = '#/standings';
      }
      return;
    }

    // Get current week's games
    const weekIndex = L.week - 1;
    const weekData = scheduleWeeks[weekIndex];

    if (!weekData) {
      console.error(`No data found for week ${L.week}`);
      window.setStatus(`Error: No data for week ${L.week}`);
      return;
    }

    const pairings = weekData.games || [];
    console.log(`Found ${pairings.length} games for week ${L.week}`);

    if (pairings.length === 0) {
      console.warn(`No games scheduled for week ${L.week}`);
      window.setStatus(`No games scheduled for week ${L.week}`);
      // Still advance the week
      L.week++;
      if (window.renderHub) window.renderHub();
      return;
    }

    const results = [];
    let gamesSimulated = 0;

    // Simulate each game
    pairings.forEach((pair, index) => {
      // Handle bye weeks
      if (pair.bye !== undefined) {
        results.push({
          id: `w${L.week}b${pair.bye}`,
          bye: pair.bye
        });
        return;
      }

      // Validate team indices
      const home = L.teams[pair.home];
      const away = L.teams[pair.away];

      if (!home || !away) {
        console.warn('Invalid team IDs in pairing:', pair);
        window.setStatus(`Warning: Invalid teams in game ${index + 1}`);
        return;
      }

      // Simulate the game
      const gameScores = simGameStats(home, away);
      const sH = gameScores.homeScore;
      const sA = gameScores.awayScore;

      // Update player season stats from game stats
      [...home.roster, ...away.roster].forEach(p => {
        if (p && p.stats && p.stats.game) {
          if (!p.stats.season) p.stats.season = {};
          Object.keys(p.stats.game).forEach(key => {
            if (typeof p.stats.game[key] === 'number') {
              p.stats.season[key] = (p.stats.season[key] || 0) + p.stats.game[key];
            }
          });
        }
      });

      // Store game result
      results.push({
        id: `w${L.week}g${index}`,
        home: pair.home,
        away: pair.away,
        scoreHome: sH,
        scoreAway: sA,
        homeWin: sH > sA
      });

      // *** THIS IS THE CORRECTED PART ***
      // Create a game object with the actual teams to pass to applyResult
      const game = { home: home, away: away };
      applyResult(game, sH, sA);
      gamesSimulated++;

      console.log(`${away.name} ${sA} @ ${home.name} ${sH}`);
    });

    // Store results for the week
    if (!L.resultsByWeek) L.resultsByWeek = {};
    L.resultsByWeek[L.week - 1] = results;

    // Advance to next week
    const previousWeek = L.week;
    L.week++;

    // Run weekly training if available
    if (window.runWeeklyTraining) {
      try {
        window.runWeeklyTraining(L);
      } catch (trainingError) {
        console.error('Error in weekly training:', trainingError);
        // Don't stop simulation for training errors
      }
    }

    console.log(`Week ${previousWeek} simulation complete - ${gamesSimulated} games simulated`);

    // Update UI to show results
    try {
      if (window.renderHub) {
        window.renderHub();
      }
      if (window.updateCapSidebar) {
        window.updateCapSidebar();
      }

      // Show success message
      window.setStatus(`Week ${previousWeek} simulated - ${gamesSimulated} games completed`);

      // Auto-show results on hub
      if (location.hash !== '#/hub') {
        location.hash = '#/hub';
      }

    } catch (uiError) {
      console.error('Error updating UI after simulation:', uiError);
      window.setStatus(`Week simulated but UI update failed`);
    }

  } catch (error) {
    console.error('Error in simulateWeek:', error);
    window.setStatus(`Simulation error: ${error.message}`);
  }
}

// Make sure function is available globally
window.simulateWeek = simulateWeek;
