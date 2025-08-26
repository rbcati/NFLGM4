// simulation.js - Fixed Syntax
'use strict';

// --- Stat Generation Helpers ---
function getStarters(team) {
  if (!team || !team.roster) return {};
  
  const starters = {};
  const positions = ['QB', 'RB', 'WR', 'TE', 'K'];
  
  positions.forEach(pos => {
    const playersAtPosition = team.roster.filter(p => p && p.pos === pos);
    if (playersAtPosition.length > 0) {
      starters[pos] = playersAtPosition.sort((a,b) => b.ovr - a.ovr)[0];
    } else {
      starters[pos] = null;
    }
  });
  
  return starters;
}

function calculateFatigue(homeTeam, awayTeam) {
  // Simple fatigue calculation
  const homeFatigue = homeTeam.roster.reduce((sum, p) => sum + (p.fatigue || 0), 0) / homeTeam.roster.length;
  const awayFatigue = awayTeam.roster.reduce((sum, p) => sum + (p.fatigue || 0), 0) / awayTeam.roster.length;
  return { home: homeFatigue, away: awayFatigue };
}

function getInjuryImpact(homeTeam, awayTeam) {
  // Count injured players
  const homeInjured = homeTeam.roster.filter(p => p.injuryWeeks && p.injuryWeeks > 0).length;
  const awayInjured = awayTeam.roster.filter(p => p.injuryWeeks && p.injuryWeeks > 0).length;
  return { home: homeInjured, away: awayInjured };
}

function getWeatherImpact() {
  // Random weather factor
  return Math.random() * 2 - 1; // -1 to 1
}

function simGameStats(homeTeam, awayTeam) {
  if (!homeTeam || !awayTeam) {
    console.error('Invalid teams provided to simGameStats');
    return { homeScore: 0, awayScore: 0 };
  }
  
  try {
    const factors = {
      homeAdvantage: window.Constants?.SIMULATION?.HOME_ADVANTAGE || 2.5,
      fatigue: calculateFatigue(homeTeam, awayTeam),
      injuries: getInjuryImpact(homeTeam, awayTeam),
      weather: getWeatherImpact()
    };
    
    const homeStarters = getStarters(homeTeam);
    const awayStarters = getStarters(awayTeam);
    const U = window.Utils;
    
    if (!U) {
      console.error('Utils not available for simulation');
      return { homeScore: 17, awayScore: 14 }; // Default scores
    }

    // Reset game stats for all players on both teams
    [...homeTeam.roster, ...awayTeam.roster].forEach(p => {
      if (p) p.stats.game = {};
    });

    // --- Simulate a team's offensive performance for a whole game ---
    function simTeamOffense(offense, defense, starters) {
      let score = 0;
      const C = window.Constants;
      
      // Passing game
      if (starters.QB) {
        const minAttempts = C?.SIMULATION?.MIN_PASS_ATTEMPTS || 25;
        const maxAttempts = C?.SIMULATION?.MAX_PASS_ATTEMPTS || 45;
        const passAttempts = U.rand(minAttempts, maxAttempts);
        
        const minCompPct = C?.SIMULATION?.MIN_COMPLETION_PCT || 55;
        const maxCompPct = C?.SIMULATION?.MAX_COMPLETION_PCT || 80;
        const baseCompPct = U.rand(minCompPct, maxCompPct);
        const qbBonus = Math.floor((starters.QB.ovr - 75) / 5);
        const completionPct = Math.min(95, baseCompPct + qbBonus);
        
        const completions = Math.floor(passAttempts * completionPct / 100);
        const yardsPerComp = U.rand(C?.SIMULATION?.YARDS_PER_COMPLETION?.MIN || 8, 
                                   C?.SIMULATION?.YARDS_PER_COMPLETION?.MAX || 15);
        const passYards = completions * yardsPerComp;
        
        const passTD = Math.max(0, U.rand(0, 4) + Math.floor((starters.QB.ovr - 80) / 8));
        
        starters.QB.stats.game.passYd = passYards;
        starters.QB.stats.game.passTD = passTD;
        starters.QB.stats.game.passAtt = passAttempts;
        starters.QB.stats.game.passComp = completions;
        
        score += passTD * 6;
      }
      
      // Rushing game
      if (starters.RB) {
        const minAttempts = C?.SIMULATION?.MIN_RUSH_ATTEMPTS || 15;
        const maxAttempts = C?.SIMULATION?.MAX_RUSH_ATTEMPTS || 30;
        const rushAttempts = U.rand(minAttempts, maxAttempts);
        
        const baseYPC = U.rand(C?.SIMULATION?.YARDS_PER_CARRY?.MIN || 3, 
                              C?.SIMULATION?.YARDS_PER_CARRY?.MAX || 6);
        const rbBonus = (starters.RB.ovr - 75) / 20;
        const yardsPerCarry = Math.max(1, baseYPC + rbBonus);
        
        const rushYards = Math.floor(rushAttempts * yardsPerCarry);
        const rushTD = Math.max(0, U.rand(0, 2) + Math.floor((starters.RB.ovr - 85) / 10));
        
        starters.RB.stats.game.rushYd = rushYards;
        starters.RB.stats.game.rushTD = rushTD;
        starters.RB.stats.game.rushAtt = rushAttempts;
        
        score += rushTD * 6;
      }
      
      // Field goals
      if (starters.K) {
        const fgAttempts = U.rand(1, 4);
        const kickerAccuracy = (starters.K.ovr - 50) / 50; // 0 to 1
        const fgMade = Math.floor(fgAttempts * Math.max(0.5, kickerAccuracy));
        
        starters.K.stats.game.fgAtt = fgAttempts;
        starters.K.stats.game.fgMade = fgMade;
        
        score += fgMade * 3;
      }
      
      return Math.max(0, score);
    }

    const homeScore = simTeamOffense(homeTeam, awayTeam, homeStarters) + factors.homeAdvantage;
    const awayScore = simTeamOffense(awayTeam, homeTeam, awayStarters);

    return { 
      homeScore: Math.round(Math.max(0, homeScore)), 
      awayScore: Math.round(Math.max(0, awayScore)) 
    };
    
  } catch (error) {
    console.error('Error in simGameStats:', error);
    return { homeScore: 17, awayScore: 14 }; // Fallback scores
  }
}

function applyResult(home, away, sH, sA) {
  if (!home || !away || !home.record || !away.record) {
    console.error('Invalid team records in applyResult');
    return;
  }
  
  try {
    const homeWin = sH > sA;
    const awayWin = sA > sH;
    const tie = sH === sA;

    // Update points for/against
    home.record.pf += sH; 
    home.record.pa += sA;
    away.record.pf += sA; 
    away.record.pa += sH;

    if (tie) {
      home.record.t++;
      away.record.t++;
      home.record.streak = 0;
      away.record.streak = 0;
    } else if (homeWin) {
      home.record.w++;
      away.record.l++;
      home.record.streak = home.record.streak > 0 ? home.record.streak + 1 : 1;
      away.record.streak = away.record.streak < 0 ? away.record.streak - 1 : -1;
      if (home.record.homeW !== undefined) home.record.homeW++;
      if (away.record.awayL !== undefined) away.record.awayL++;
    } else { // awayWin
      away.record.w++;
      home.record.l++;
      away.record.streak = away.record.streak > 0 ? away.record.streak + 1 : 1;
      home.record.streak = home.record.streak < 0 ? home.record.streak - 1 : -1;
      if (away.record.awayW !== undefined) away.record.awayW++;
      if (home.record.homeL !== undefined) home.record.homeL++;
    }

    // Division game handling
    if (home.conf === away.conf && home.div === away.div) {
      if (homeWin) { 
        if (home.record.divW !== undefined) home.record.divW++;
        if (away.record.divL !== undefined) away.record.divL++;
      } else if (awayWin) { 
        if (away.record.divW !== undefined) away.record.divW++;
        if (home.record.divL !== undefined) home.record.divL++;
      }
    }
    
  } catch (error) {
    console.error('Error in applyResult:', error);
  }
}

function simulateWeek() {
  const L = state.league;
  if (!L || !L.schedule || !L.schedule.weeks) {
    console.error('Invalid league or schedule for simulation');
    return;
  }
  
  try {
    console.log(`Simulating week ${L.week}...`);
    
    // Check if season is over
    if (L.week > L.schedule.weeks.length) {
      console.log('Regular season complete, starting playoffs');
      if (window.startPlayoffs) {
        window.startPlayoffs();
      }
      location.hash = '#/standings';
      return;
    }
    
    const weekData = L.schedule.weeks[L.week - 1];
    const pairings = weekData ? weekData.games : [];
    const results = [];
    
    pairings.forEach((pair, index) => {
      if (pair.bye !== undefined) {
        results.push({ id: `w${L.week}b${pair.bye}`, bye: pair.bye });
        return;
      }
      
      const home = L.teams[pair.home];
      const away = L.teams[pair.away];
      
      if (!home || !away) {
        console.warn('Invalid team IDs in pairing:', pair);
        return;
      }
      
      const gameScores = simGameStats(home, away);
      const sH = gameScores.homeScore;
      const sA = gameScores.awayScore;

      // Add game stats to season totals for every player
      [...home.roster, ...away.roster].forEach(p => {
        if (p && p.stats && p.stats.game) {
          Object.keys(p.stats.game).forEach(key => {
            if (!p.stats.season) p.stats.season = {};
            p.stats.season[key] = (p.stats.season[key] || 0) + p.stats.game[key];
          });
        }
      });

      results.push({ 
        id: `w${L.week}g${index}`, 
        home: pair.home, 
        away: pair.away, 
        scoreHome: sH, 
        scoreAway: sA, 
        homeWin: sH > sA 
      });
      
      applyResult(home, away, sH, sA);
    });

    // Store results and advance week
    if (!L.resultsByWeek) L.resultsByWeek = {};
    L.resultsByWeek[L.week - 1] = results;
    L.week++;
    
    // Run weekly training if available
    if (window.runWeeklyTraining) {
      window.runWeeklyTraining(L);
    }
    
    console.log(`Week ${L.week - 1} simulation complete`);
    
  } catch (error) {
    console.error('Error in simulateWeek:', error);
    window.setStatus('Error simulating week');
  }
}

function simulateDrive(offense, defense, gameState) {
  // This function can be expanded for more detailed drive simulation
  console.log('Drive simulation not yet implemented');
  return { score: 0, yards: 0, plays: 0 };
}

// Make functions globally available
window.getStarters = getStarters;
window.calculateFatigue = calculateFatigue;
window.getInjuryImpact = getInjuryImpact;
window.getWeatherImpact = getWeatherImpact;
window.simGameStats = simGameStats;
window.applyResult = applyResult;
window.simulateWeek = simulateWeek;
window.simulateDrive = simulateDrive;
