// playoffs.js
'use strict';

function teamStats(L) {
  const N = L.teams.length;
  const stats = Array.from({ length: N }).map(() => ({ w: 0, l: 0, t: 0, pf: 0, pa: 0, divW: 0, divL: 0, divT: 0, confW: 0, confL: 0, confT: 0, h2h: {} }));
  for (let i = 0; i < N; i++) {
    const r = L.teams[i].record;
    const s = stats[i];
    s.w = r.w; s.l = r.l; s.t = r.t; s.pf = r.pf; s.pa = r.pa;
  }
  Object.keys(L.resultsByWeek).forEach(wk => {
    (L.resultsByWeek[wk] || []).forEach(g => {
      if (g.bye) return;
      const h = g.home, a = g.away, hs = stats[h], as = stats[a];
      const hc = L.teams[h].conf, ac = L.teams[a].conf, hd = L.teams[h].div, ad = L.teams[a].div;
      const sameConf = hc === ac, sameDiv = sameConf && hd === ad;
      let resH = 0, resA = 0;
      if (g.scoreHome > g.scoreAway) { resH = 1; resA = -1; }
      else if (g.scoreHome < g.scoreAway) { resH = -1; resA = 1; }
      if (sameDiv) {
        if (resH > 0) hs.divW++; else if (resH < 0) hs.divL++; else hs.divT++;
        if (resA > 0) as.divW++; else if (resA < 0) as.divL++; else as.divT++;
      }
      if (sameConf) {
        if (resH > 0) hs.confW++; else if (resH < 0) hs.confL++; else hs.confT++;
        if (resA > 0) as.confW++; else if (resA < 0) as.confL++; else as.confT++;
      }
      hs.h2h[a] = (hs.h2h[a] || 0) + (resH > 0 ? 1 : resH < 0 ? -1 : 0);
      as.h2h[h] = (as.h2h[h] || 0) + (resA > 0 ? 1 : resA < 0 ? -1 : 0);
    });
  });
  return stats;
}

function pctRec(w, l, t) { const g = w + l + t; return g ? (w + 0.5 * t) / g : 0; }
function pctDiv(s) { return pctRec(s.divW, s.divL, s.divT); }
function pctConf(s) { return pctRec(s.confW, s.confL, s.confT); }

function tieBreakCompare(L, aIdx, bIdx, scope) {
  if (aIdx === bIdx) return 0;
  const Sx = teamStats(L);
  const pA = pctRec(Sx[aIdx].w, Sx[aIdx].l, Sx[aIdx].t);
  const pB = pctRec(Sx[bIdx].w, Sx[bIdx].l, Sx[bIdx].t);
  if (pA !== pB) return pB - pA;
  const h2h = Sx[aIdx].h2h[bIdx] || 0;
  if (h2h !== 0) return h2h > 0 ? -1 : 1;
  if (scope === 'division' || scope === 'leaders') {
    const dA = pctDiv(Sx[aIdx]), dB = pctDiv(Sx[bIdx]);
    if (dA !== dB) return dB - dA;
  }
  const cA = pctConf(Sx[aIdx]), cB = pctConf(Sx[bIdx]);
  if (cA !== cB) return cB - cA;
  const pdA = (Sx[aIdx].pf - Sx[aIdx].pa), pdB = (Sx[bIdx].pf - Sx[bIdx].pa);
  if (pdA !== pdB) return pdB - pdA;
  if (Sx[aIdx].pf !== Sx[bIdx].pf) return Sx[bIdx].pf - Sx[aIdx].pf;
  return aIdx - bIdx;
}

function seedPlayoffs(L) {
  const seeds = { AFC: [], NFC: [] };
  for (let conf = 0; conf < 2; conf++) {
    const confKey = conf === 0 ? 'AFC' : 'NFC';
    const allIdx = L.teams.map((t, i) => i).filter(i => L.teams[i].conf === conf);
    const leaders = [];
    for (let dv = 0; dv < 4; dv++) {
      const divIdx = allIdx.filter(i => L.teams[i].div === dv);
      divIdx.sort((a, b) => tieBreakCompare(L, a, b, 'leaders'));
      leaders.push(divIdx[0]);
    }
    leaders.sort((a, b) => tieBreakCompare(L, a, b, 'conference'));
    const others = allIdx.filter(i => !leaders.includes(i));
    others.sort((a, b) => tieBreakCompare(L, a, b, 'conference'));
    seeds[confKey] = leaders.concat(others.slice(0, 3));
  }
  return seeds;
}

function startPlayoffs() {
  const L = state.league;
  state.playoffs = { round: 'WC', seeds: seedPlayoffs(L), series: { AFC: [], NFC: [], SB: [] }, results: [] };
  buildRoundPairings();
  renderPlayoffs();
}

function buildRoundPairings() {
  const P = state.playoffs; if (!P) return;
  const L = state.league;
  P.series.AFC = []; P.series.NFC = [];
  if (P.round === 'WC') {
    ['AFC', 'NFC'].forEach(key => {
      const s = P.seeds[key];
      P.series[key] = [{ home: s[1], away: s[6] }, { home: s[2], away: s[5] }, { home: s[3], away: s[4] }];
    });
  } else if (P.round === 'DIV') {
    ['AFC', 'NFC'].forEach(key => {
      const s = P.seeds[key];
      const remaining = P.lastWinners[key].slice().sort((a, b) => tieBreakCompare(L, a, b, 'conference'));
      const top = s[0], low = remaining[remaining.length - 1], other = remaining[0];
      P.series[key] = [{ home: top, away: low }, { home: tieBreakCompare(L, other, remaining[0], 'conference') < 0 ? other : remaining[0], away: tieBreakCompare(L, other, remaining[0], 'conference') < 0 ? remaining[0] : other }];
    });
  } else if (P.round === 'CONF') {
    ['AFC', 'NFC'].forEach(key => {
      const order = P.lastWinners[key].slice().sort((a, b) => tieBreakCompare(L, a, b, 'conference'));
      P.series[key] = [{ home: order[0], away: order[1] }];
    });
  } else if (P.round === 'SB') {
    const champsA = P.lastWinners.AFC[0], champsN = P.lastWinners.NFC[0];
    const better = tieBreakCompare(L, champsA, champsN, 'league');
    const home = better <= 0 ? champsA : champsN;
    P.series.SB = [{ home: home, away: home === champsA ? champsN : champsA }];
  }
}

function simPlayoffGame(homeIdx, awayIdx) {
  const L = state.league, h = L.teams[homeIdx], a = L.teams[awayIdx];
  const base = h.rating - a.rating + 0.1 * ((h.record.pf - h.record.pa) - (a.record.pf - a.record.pa));
  const probHome = 1 / (1 + Math.exp(-base / 8));
  let homeScore = Math.round(17 + Math.random() * 17 + probHome * 6);
  const awayScore = Math.round(14 + Math.random() * 17 + (1 - probHome) * 6);
  if (homeScore === awayScore) homeScore += 3;
  return { home: homeIdx, away: awayIdx, scoreHome: homeScore, scoreAway: awayScore };
}

function simulatePlayoffRound() {
    const P = state.playoffs; if (!P) return;
    const L = state.league;

    if (P.round === 'WC' || P.round === 'DIV' || P.round === 'CONF') {
        const nextWinners = { AFC: [], NFC: [] };
        ['AFC', 'NFC'].forEach(key => {
            P.series[key].forEach(g => {
                const res = simPlayoffGame(g.home, g.away);
                const winner = res.scoreHome > res.scoreAway ? g.home : g.away;
                P.results.push(`${L.teams[res.away].abbr} ${res.scoreAway} @ ${L.teams[res.home].abbr} ${res.scoreHome} — ${L.teams[winner].abbr} advance`);
                nextWinners[key].push(winner);
            });
        });
        P.lastWinners = nextWinners;
        if (P.round === 'WC') P.round = 'DIV';
        else if (P.round === 'DIV') P.round = 'CONF';
        else if (P.round === 'CONF') P.round = 'SB';
        buildRoundPairings();
    } else if (P.round === 'SB') {
        const g = P.series.SB[0];
        const res = simPlayoffGame(g.home, g.away);
        const winnerId = res.scoreHome > res.scoreAway ? g.home : g.away;
        const winnerTeam = L.teams[winnerId];

        winnerTeam.roster.forEach(player => {
            player.awards.push({ year: L.year, award: 'Super Bowl Champion' });
        });

        P.results.push(`Super Bowl: ${L.teams[res.away].abbr} ${res.scoreAway} @ ${L.teams[res.home].abbr} ${res.scoreHome} — Champion ${winnerTeam.name}`);
        
        state.playoffs = null;
        runOffseason();
        location.hash = '#/hub';
        return;
    }
    
    renderPlayoffs();
}
