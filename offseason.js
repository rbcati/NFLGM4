// offseason.js
'use strict';

function checkHOFEligibility(player) {
    let legacyScore = 0;
    // Simple scoring: 1 point for every 1000 passing yards, 5 for a championship, etc.
    const career = player.stats.career;
    if (career.passYd) legacyScore += Math.floor(career.passYd / 1000);
    if (career.rushYd) legacyScore += Math.floor(career.rushYd / 500);
    
    player.awards.forEach(award => {
        if (award.award === 'Super Bowl Champion') legacyScore += 5;
        // In the future, you could add points for MVP, etc.
    });

    return legacyScore > 30; // Set a threshold for HOF induction
}

function handleRetirementsAndHOF(league) {
    const retiringPlayers = [];
    league.teams.forEach(team => {
        const remainingRoster = [];
        team.roster.forEach(player => {
            // Simple retirement logic: chance increases with age
            const retirementChance = player.age > 34 ? (player.age - 34) * 0.25 : 0;
            if (Math.random() < retirementChance) {
                retiringPlayers.push(player); // Player retires
            } else {
                remainingRoster.push(player); // Player stays
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
  
  // New Step 1: Handle retirements and Hall of Fame inductions
  handleRetirementsAndHOF(L);

  // Existing offseason logic follows...
  L.teams.forEach(t => {
    // ... (age players, decrement contracts, etc.)
    
    // Accumulate season stats into career stats before clearing
    t.roster.forEach(p => {
        for (const key in p.stats.season) {
            p.stats.career[key] = (p.stats.career[key] || 0) + p.stats.season[key];
        }
        p.history.push({ year: L.year, stats: p.stats.season, ovr: p.ovr });
        p.stats.season = {}; // Reset for new season
    });
  });

  // ... (the rest of the offseason logic to reset the league for a new year)
}
