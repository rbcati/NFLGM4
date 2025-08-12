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

    // A higher overall rating gives a boost
    legacyScore += Math.floor(Math.max(0, player.ovr - 85) / 2);

    return legacyScore > 30; // Set a threshold for HOF induction
}

function handleRetirementsAndHOF(league) {
    const retiringPlayers = [];
    league.teams.forEach(team => {
        const remainingRoster = [];
        team.roster.forEach(player => {
            // Simple retirement logic: chance increases significantly with age
            const retirementChance = player.age > 33 ? (player.age - 33) * 0.20 : 0;
            if (player.age > 38 || Math.random() < retirementChance) {
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
  const U = window.Utils;

  // Step 1: Handle retirements and Hall of Fame inductions
  handleRetirementsAndHOF(L);

  // Step 2: Player Progression, History Archiving, and Contract Expiration
  L.teams.forEach(team => {
    // Get the head coach's development rating (default to 75 if no coach)
    const devBoost = (team.staff.headCoach.playerDevelopment || 75) / 25; // A number between ~2 and 4

    const nextSeasonRoster = [];
    team.roster.forEach(p => {
      // Archive last season's stats into history and add to career totals
      p.history.push({ year: L.year, team: team.abbr, stats: { ...p.stats.season }, ovr: p.ovr });
      for (const key in p.stats.season) {
          p.stats.career[key] = (p.stats.career[key] || 0) + p.stats.season[key];
      }
      p.stats.season = {}; // Reset for new season
      
      // Age players
      p.age++;
      
      // Progress/regress players based on age, potential, and coach skill
      const progression = U.rand(-2, 2) + Math.floor((95 - p.ovr) / 10) - Math.floor(Math.max(0, p.age - 28)) + devBoost;
      p.ovr = U.clamp(p.ovr + Math.round(progression), 40, 99);
      
      // Decrement contract years
      p.years--;
      if(p.years > 0){
          nextSeasonRoster.push(p);
      } else {
          // Player's contract has expired, they become a free agent (or will in a future step)
          state.freeAgents.push(p);
      }
    });
    team.roster = nextSeasonRoster;
  });
  
  // Step 3: Generate the new scoutable draft class for the upcoming season
  state.draftClass = generateDraftClass(L.year + 1);

  // Step 4: Reset league state for the new season
  L.year++;
  L.week = 1;
  L.resultsByWeek = {};
  L.teams.forEach(t => {
      // Reset team records for the new season
      t.record = {w:0, l:0, t:0, pf:0, pa:0, streak:0, divW:0, divL:0, homeW:0, homeL:0, awayW:0, awayL:0};
  });
  
  // Create a new schedule for the new season
  L.schedule = Scheduler.makeAccurateSchedule(L.teams);
}
