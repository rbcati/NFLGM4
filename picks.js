// picks.js
'use strict';

function seedTeamPicks(team, startSeason, count) {
  const U = window.Utils;
  team.picks = [];
  for (let y = 0; y < count; y++) {
    for (let r = 1; r <= 7; r++) {
      team.picks.push({ year: startSeason + y, round: r, from: team.abbr, id: U.id() });
    }
  }
}

function pickValue(pick) {
  const base = { 1: 25, 2: 15, 3: 8, 4: 5, 5: 3, 6: 2, 7: 1 }[pick.round] || 1;
  const yearsOut = pick.year - state.league.season;
  const discount = Math.pow(0.8, yearsOut);
  return base * discount;
}
