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
  if (L.week > L.schedule.length) {
    if (!state.playoffs) {
      startPlayoffs();
      location.hash = '#/playoffs';
      return;
    }
    return;
  }
  const pairings = L.schedule[L.week - 1];
  const results = [];
  pairings.forEach(pair => {
    if (pair.bye !== undefined) {
      results.push({ bye: pair.bye });
      return;
    }
    const sH = U.rand(13, 34);
    const sA = U.rand(10, 31);
    const home = L.teams[pair.home];
    const away = L.teams[pair.away];
    results.push({ home: pair.home, away: pair.away, scoreHome: sH, scoreAway: sA, homeWin: sH > sA });
    applyResult(home, away, sH, sA);
  });

  L.resultsByWeek[L.week - 1] = results;
  L.week++;

  // Post-simulation actions
  aiWeeklyTrades();
  runWeeklyTraining(L);

  // Update UI
  if (L.week > L.schedule.length) {
    setStatus('Regular season complete. Playoffs ready.');
  }
  renderHub();
  renderSchedule();
  renderStandings();
  if (location.hash === '#/roster') renderRoster();
}
