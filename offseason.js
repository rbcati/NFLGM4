// offseason.js
'use strict';

function checkHOFEligibility(player) {
    let legacyScore = 0;
    const career = player.stats.career;
    if (career.passYd) legacyScore += Math.floor(career.passYd / 1000);
    if (career.rushYd) legacyScore += Math.floor(career.rushYd / 500);
    player.awards.forEach(award => {
        if (award.award === 'Super Bowl Champion') legacyScore += 5;
    });
    return legacyScore > 30;
}

function handleRetirementsAndHOF(league) {
    const retiringPlayers = [];
    league.teams.forEach(team => {
        const remainingRoster = [];
        team.roster.forEach(player => {
            const retirementChance = player.age > 34 ? (player.age - 34) * 0.25 : 0;
            if (Math.random() < retirementChance) {
                retiringPlayers.push(player);
            } else {
                remainingRoster.push(player);
            }
        });
        team.roster = remainingRoster;
    });

    retiringPlayers.forEach(player => {
        if (checkHOFEligibility(player)) {
            league.hallOfFame.push(player);
            league.news.push(`${player.name} (${player.pos}) has been inducted into the Hall of Fame!`);
        }
    });
}

function runOffseason() {
  const L = state.league;
  const U = window.Utils;

  handleRetirementsAndHOF(L);

  L.teams.forEach(team => {
    team.roster.forEach(p => {
      p.history.push({ year: L.year, team: team.abbr, stats: { ...p.stats.season }, ovr: p.ovr });
      for (const key in p.stats.season) {
          p.stats.career[key] = (p.stats.career[key] || 0) + p.stats.season[key];
      }
      p.stats.season = {};
      
      p.age++;
      const progression = U.rand(-3, 3) + Math.floor((90 - p.ovr) / 10) - Math.floor(Math.max(0, p.age - 29) / 2);
      p.ovr = U.clamp(p.ovr + progression, 40, 99);
      p.years--;
    });
    team.roster = team.roster.filter(p => p.years > 0);
  });
  
  state.draftClass = generateDraftClass(L.year + 1);

  L.year++;
  L.week = 1;
  L.resultsByWeek = {};
  L.teams.forEach(t => {
      t.record = {w:0, l:0, t:0, pf:0, pa:0, streak:0, divW:0, divL:0, homeW:0, homeL:0, awayW:0, awayL:0};
  });
}
