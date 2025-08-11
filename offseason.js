// offseason.js
'use strict';

function runOffseason() {
  const L = state.league;
  const C = window.Constants;
  const Scheduler = window.Scheduler;

  // Store last-season division rank for next schedule
  const ranks = Scheduler.computeLastDivisionRanks ?
    Scheduler.computeLastDivisionRanks(L) :
    L.teams.map((t, i) => i % 4);
  L.teams.forEach((t, i) => { t.lastDivisionRank = ranks[i]; });

  L.teams.forEach(t => {
    recalcCap(L, t);
    const room = Math.max(0, t.capTotal - t.capUsed);
    t.capRollover = Math.round(room * 10) / 10;

    // Age players and decrement contracts
    const survivors = [];
    t.roster.forEach(p => {
      if (p.years > 0) p.years -= 1;
      if (p.years === 0) {
        state.freeAgents.push(p);
      } else {
        p.age += 1;
        p.ovr = window.Utils.clamp(p.ovr + window.Utils.rand(-2, 2), 48, 99);
        survivors.push(p);
      }
    });
    t.roster = survivors.sort((a, b) => b.ovr - a.ovr);

    // Move picks forward and re-seed future year
    t.picks.forEach(pk => { pk.year = Math.max(1, pk.year - 1); });
    const needed = 7 - t.picks.filter(pk => pk.year === C.YEARS_OF_PICKS).length;
    for (let i = 0; i < needed; i++) {
      t.picks.push({ year: C.YEARS_OF_PICKS, round: i + 1, from: t.abbr, id: window.Utils.id() });
    }

    delete t.deadCapBook[L.season - 1];
    recalcCap(L, t);
    t.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
  });

  // Reset league state for new season
  L.season += 1;
  L.year = (L.year || YEAR_START) + 1;
  L.week = 1;
  L.resultsByWeek = {};
  L.schedule = Scheduler.makeAccurateSchedule(L);
}
