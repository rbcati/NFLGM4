// simulation.js
'use strict';

function applyResult(home, away, sH, sA) {
  home.record.pf += sH;
  home.record.pa += sA;
  away.record.pf += sA;
  away.record.pa += sH;
  if (sH === sA) {
    home.record.t++;
    away.record.t++;
  } else if (sH > sA) {
    home.record.w++;
    away.record.l++;
  } else {
    away.record.w++;
    home.record.l++;
  }
}

function simulateWeek() {
  const L = state.league;
  const U = window.Utils;

  // **THE FIX - PART 1:** Check against the length of the weeks array.
  if (L.week > L.schedule.weeks.length) {
    if (!state.playoffs) {
      startPlayoffs();
      location.hash = '#/playoffs';
    }
    return;
  }

  // **THE FIX - PART 2:** Access the `weeks` property of the schedule object.
  const weekData = L.schedule.weeks[L.week - 1];
  const pairings = weekData ? weekData.games : []; // Get the games for the current week.
  
  const results = [];
  pairings.forEach(pair => { // This line will no longer cause an error.
    if (pair.bye !== undefined) {
      results.push({ bye: pair.bye });
      return;
    }
    const sH = U.rand(13, 34);
    const sA = U.rand(10, 31);
    // Note: pair.home and pair.away are IDs, so we use them to look up the teams
    const home = L.teams[pair.home];
    const away = L.teams[pair.away];
    results.push({ home: pair.home, away: pair.away, scoreHome: sH, scoreAway: sA, homeWin: sH > sA });
    applyResult(home, away, sH, sA);
  });

  L.resultsByWeek[L.week - 1] = results;
  L.week++;

  // Post-simulation actions
  // aiWeeklyTrades(); // You can uncomment this when you're ready to add AI trades back
  runWeeklyTraining(L);

  // Update UI
  if (L.week > L.schedule.weeks.length) {
    setStatus('Regular season complete. Playoffs ready.');
  }
  renderHub();
  renderSchedule();
  renderStandings();
  if (location.hash === '#/roster') renderRoster();
}
