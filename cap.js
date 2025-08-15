// cap.js
'use strict';

function prorationPerYear(p) { return p.signingBonus / p.yearsTotal; }

function capHitFor(p, relSeason) {
  if (p.years <= 0 || relSeason >= p.years) return 0;
  const base = p.baseAnnual;
  const pr = prorationPerYear(p);
  return Math.round((base + pr) * 10) / 10;
}

function addDead(team, season, amount) {
  team.deadCapBook[season] = Math.round(((team.deadCapBook[season] || 0) + amount) * 10) / 10;
}

function recalcCap(league, team) {
  function calculateRollover(team, league) {
    const unused = team.capTotal - team.capUsed;
    const maxRollover = 10; // NFL rule: max $10M
    return Math.min(unused, maxRollover);
}
  const C = window.Constants;
  const active = team.roster.reduce((s, p) => s + capHitFor(p, 0), 0);
  const dead = team.deadCapBook[league.season] || 0;
  const capTotal = C.CAP_BASE + (team.capRollover || 0);
  team.capTotal = Math.round(capTotal * 10) / 10;
  team.capUsed = Math.round((active + dead) * 10) / 10;
  team.deadCap = Math.round(dead * 10) / 10;
}

function releaseWithProration(league, team, p, isPostJune1) {
   if (canRestructure(p)) {
  const pr = prorationPerYear(p);
  const yearsLeft = p.years;
  if (yearsLeft <= 0) return;

  const currentSeason = league.season;
  const gBase = p.baseAnnual * (p.guaranteedPct || 0);
  const remainingPr = pr * yearsLeft;

  if (isPostJune1 && yearsLeft > 1) {
    addDead(team, currentSeason, pr + gBase);
    addDead(team, currentSeason + 1, remainingPr - pr);
  } else {
    addDead(team, currentSeason, remainingPr + gBase);
  }

  const idx = team.roster.findIndex(x => x.id === p.id);
  if (idx >= 0) team.roster.splice(idx, 1);
  p.years = 0;
}
