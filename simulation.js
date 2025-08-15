// simulation.js
'use strict';

// --- Stat Generation Helpers ---
function getStarters(team) {
    const starters = {};
    const positions = ['QB', 'RB', 'WR', 'TE', 'K'];
    positions.forEach(pos => {
        starters[pos] = team.roster.filter(p => p && p.pos === pos).sort((a,b) => b.ovr - a.ovr)[0];
    });
    return starters;
}

function simGameStats(homeTeam, awayTeam) {
       const factors = {
        homeAdvantage: 2.5,
        fatigue: calculateFatigue(homeTeam, awayTeam),
        injuries: getInjuryImpact(homeTeam, awayTeam),
        weather: getWeatherImpact()
    };
    const homeStarters = getStarters(homeTeam);
    const awayStarters = getStarters(awayTeam);
    const U = window.Utils;

    // Reset game stats for all players on both teams
    [...homeTeam.roster, ...awayTeam.roster].forEach(p => {
        if (p) p.stats.game = {};
    });

    // --- Simulate a team's offensive drives for a whole game ---
    function simDrive(offense, defense, starters) {
        let score = 0;
        if (starters.QB) {
            const passAttempts = U.rand(25, 45);
            const completions = Math.floor(passAttempts * (U.rand(55, 80) + starters.QB.ovr / 10) / 100);
            const passYards = completions * U.rand(8, 15);
            const passTD = Math.max(0, U.rand(0, 5) + Math.floor((starters.QB.ovr - 80) / 5));
            starters.QB.stats.game.passYd = passYards;
            starters.QB.stats.game.passTD = passTD;
            score += passTD * 6;
        }
        if (starters.RB) {
            const rushAttempts = U.rand(15, 30);
            const rushYards = Math.floor(rushAttempts * (U.rand(3, 6) + starters.RB.ovr / 20));
            const rushTD = Math.max(0, U.rand(0, 3) + Math.floor((starters.RB.ovr - 85) / 5));
            starters.RB.stats.game.rushYd = rushYards;
            starters.RB.stats.game.rushTD = rushTD;
            score += rushTD * 6;
        }
        if (starters.K) {
            const fg = U.rand(0, 4);
            starters.K.stats.game.fgMade = fg;
            score += fg * 3;
        }
        return score;
    }

    const homeScore = simDrive(homeTeam, awayTeam, homeStarters);
    const awayScore = simDrive(awayTeam, homeTeam, awayStarters);

    return { homeScore, awayScore };
}

function applyResult(home, away, sH, sA) {
  const homeWin = sH > sA;
  const awayWin = sA > sH;

  home.record.pf += sH; home.record.pa += sA;
  away.record.pf += sA; away.record.pa += sH;

  if (sH === sA) {
    home.record.t++; away.record.t++;
    home.record.streak = 0; away.record.streak = 0;
  } else if (homeWin) {
    home.record.w++; away.record.l++;
    home.record.streak = home.record.streak > 0 ? home.record.streak + 1 : 1;
    away.record.streak = away.record.streak < 0 ? away.record.streak - 1 : -1;
    home.record.homeW++; away.record.awayL++;
  } else { // awayWin
    away.record.w++; home.record.l++;
    away.record.streak = away.record.streak > 0 ? away.record.streak + 1 : 1;
    home.record.streak = home.record.streak < 0 ? home.record.streak - 1 : -1;
    away.record.awayW++; home.record.homeL++;
  }

  if (home.conf === away.conf && home.div === away.div) {
    if (homeWin) { home.record.divW++; away.record.divL++; }
    else if (awayWin) { away.record.divW++; home.record.divL++; }
  }
}

function simulateWeek() {
    const L = state.league;
    if (L.week > L.schedule.weeks.length) {
        startPlayoffs();
        location.hash = '#/playoffs';
        return;
    }
    const weekData = L.schedule.weeks[L.week - 1];
    const pairings = weekData ? weekData.games : [];
    const results = [];
function simulateDrive(offense, defense, gameState) {
    pairings.forEach((pair, index) => {
        if (pair.bye !== undefined) {
            results.push({ id: `w${L.week}b${pair.bye}`, bye: pair.bye });
            return;
        }
        const home = L.teams[pair.home];
        const away = L.teams[pair.away];
        
        const gameScores = simGameStats(home, away);
        const sH = gameScores.homeScore;
        const sA = gameScores.awayScore;

        // Add game stats to season totals for every player
        [...home.roster, ...away.roster].forEach(p => {
            if (p) {
                for (const key in p.stats.game) {
                    p.stats.season[key] = (p.stats.season[key] || 0) + p.stats.game[key];
                }
            }
        });

        results.push({ id: `w${L.week}g${index}`, home: pair.home, away: pair.away, scoreHome: sH, scoreAway: sA, homeWin: sH > sA });
        applyResult(home, away, sH, sA);
    });

    L.resultsByWeek[L.week - 1] = results;
    L.week++;
    runWeeklyTraining(L);
    
    renderHub();
    renderSchedule();
    renderStandings();
    if (location.hash === '#/roster') renderRoster();
}
