// simulation.js
'use strict';

// --- Stat Generation Helpers ---
function getStarters(team) {
    const starters = {};
    const positions = ['QB', 'RB', 'WR', 'TE', 'K'];
    positions.forEach(pos => {
        starters[pos] = team.roster.filter(p => p.pos === pos).sort((a,b) => b.ovr - a.ovr)[0];
    });
    return starters;
}

function simGameStats(homeTeam, awayTeam) {
    const homeStarters = getStarters(homeTeam);
    const awayStarters = getStarters(awayTeam);
    const U = window.Utils;

    // Reset game stats for all players
    [...homeTeam.roster, ...awayTeam.roster].forEach(p => p.stats.game = {});

    // --- Simulate Offense ---
    function simDrive(offense, defense, starters) {
        let score = 0;
        if (starters.QB) {
            const passYards = U.rand(150, 400);
            const passTD = Math.floor(passYards / 120);
            starters.QB.stats.game.passYd = (starters.QB.stats.game.passYd || 0) + passYards;
            starters.QB.stats.game.passTD = (starters.QB.stats.game.passTD || 0) + passTD;
            score += passTD * 6;
        }
        if (starters.RB) {
            const rushYards = U.rand(40, 150);
            const rushTD = Math.floor(rushYards / 70);
            starters.RB.stats.game.rushYd = (starters.RB.stats.game.rushYd || 0) + rushYards;
            starters.RB.stats.game.rushTD = (starters.RB.stats.game.rushTD || 0) + rushTD;
            score += rushTD * 6;
        }
        if (starters.K) {
            const fg = U.rand(0, 3);
            starters.K.stats.game.fgMade = (starters.K.stats.game.fgMade || 0) + fg;
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

    pairings.forEach(pair => {
        if (pair.bye !== undefined) {
            results.push({ bye: pair.bye });
            return;
        }
        const home = L.teams[pair.home];
        const away = L.teams[pair.away];
        
        const gameScores = simGameStats(home, away);
        const sH = gameScores.homeScore;
        const sA = gameScores.awayScore;

        results.push({ home: pair.home, away: pair.away, scoreHome: sH, scoreAway: sA, homeWin: sH > sA });
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
