// playoffs-fixed.js - Complete playoffs system with all missing functions
'use strict';

/**
 * Calculate team statistics for tiebreaking
 */
function teamStats(L) {
  const N = L.teams.length;
  const stats = Array.from({ length: N }).map(() => ({ 
    w: 0, l: 0, t: 0, pf: 0, pa: 0, 
    divW: 0, divL: 0, divT: 0, 
    confW: 0, confL: 0, confT: 0, 
    h2h: {} 
  }));
  
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

function pctRec(w, l, t) { 
  const g = w + l + t; 
  return g ? (w + 0.5 * t) / g : 0; 
}

function pctDiv(s) { 
  return pctRec(s.divW, s.divL, s.divT); 
}

function pctConf(s) { 
  return pctRec(s.confW, s.confL, s.confT); 
}

/**
 * Tiebreaker comparison function
 */
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

/**
 * Seed teams for playoffs
 */
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

/**
 * Start the playoff system
 */
function startPlayoffs() {
  const L = state.league;
  console.log('🏆 Starting playoffs...');
  
  try {
    state.playoffs = { 
      round: 'WC', 
      seeds: seedPlayoffs(L), 
      series: { AFC: [], NFC: [], SB: [] }, 
      results: [] 
    };
    
    buildRoundPairings();
    renderPlayoffs();
    
    // Navigate to playoffs view
    location.hash = '#/playoffs';
    
  } catch (error) {
    console.error('Error starting playoffs:', error);
    window.setStatus('Error starting playoffs');
  }
}

/**
 * Build playoff pairings for current round
 */
function buildRoundPairings() {
  const P = state.playoffs; 
  if (!P) return;
  
  const L = state.league;
  P.series.AFC = []; 
  P.series.NFC = [];
  
  if (P.round === 'WC') {
    ['AFC', 'NFC'].forEach(key => {
      const s = P.seeds[key];
      P.series[key] = [
        { home: s[1], away: s[6] }, 
        { home: s[2], away: s[5] }, 
        { home: s[3], away: s[4] }
      ];
    });
  } else if (P.round === 'DIV') {
    ['AFC', 'NFC'].forEach(key => {
      const s = P.seeds[key];
      const remaining = P.lastWinners[key].slice().sort((a, b) => tieBreakCompare(L, a, b, 'conference'));
      const top = s[0], low = remaining[remaining.length - 1], other = remaining[0];
      P.series[key] = [
        { home: top, away: low }, 
        { home: tieBreakCompare(L, other, remaining[0], 'conference') < 0 ? other : remaining[0], 
          away: tieBreakCompare(L, other, remaining[0], 'conference') < 0 ? remaining[0] : other }
      ];
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

/**
 * Simulate a playoff game
 */
function simPlayoffGame(homeIdx, awayIdx) {
  const L = state.league, h = L.teams[homeIdx], a = L.teams[awayIdx];
  
  // Calculate team strengths
  const homeStrength = h.roster.reduce((acc, p) => acc + p.ovr, 0) / h.roster.length;
  const awayStrength = a.roster.reduce((acc, p) => acc + p.ovr, 0) / a.roster.length;
  
  const base = homeStrength - awayStrength + 2.5; // Home advantage
  const probHome = 1 / (1 + Math.exp(-base / 8));
  
  let homeScore = Math.round(17 + Math.random() * 17 + probHome * 6);
  let awayScore = Math.round(14 + Math.random() * 17 + (1 - probHome) * 6);
  
  // No ties in playoffs
  if (homeScore === awayScore) {
    homeScore += Math.random() < 0.5 ? 3 : 0;
    awayScore += homeScore === awayScore ? 3 : 0;
  }
  
  return { home: homeIdx, away: awayIdx, scoreHome: homeScore, scoreAway: awayScore };
}

/**
 * Simulate current playoff round
 */
function simulatePlayoffRound() {
  const P = state.playoffs; 
  if (!P) return;
  const L = state.league;

  if (P.round === 'WC' || P.round === 'DIV' || P.round === 'CONF') {
    const nextWinners = { AFC: [], NFC: [] };
    ['AFC', 'NFC'].forEach(key => {
      P.series[key].forEach(g => {
        const res = simPlayoffGame(g.home, g.away);
        const winner = res.scoreHome > res.scoreAway ? g.home : g.away;
        const homeTeam = L.teams[res.home];
        const awayTeam = L.teams[res.away];
        const winnerTeam = L.teams[winner];
        
        P.results.push(`${awayTeam.abbr} ${res.scoreAway} @ ${homeTeam.abbr} ${res.scoreHome} — ${winnerTeam.abbr} advances`);
        nextWinners[key].push(winner);
        
        // Update coaching playoff stats if available
        if (window.updateCoachingPlayoffResults) {
          window.updateCoachingPlayoffResults(winnerTeam, {
            madePlayoffs: true,
            wins: 1,
            teamWon: true
          });
          
          const loserTeam = winner === g.home ? L.teams[g.away] : L.teams[g.home];
          window.updateCoachingPlayoffResults(loserTeam, {
            madePlayoffs: true,
            losses: 1,
            teamWon: false
          });
        }
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
    const homeTeam = L.teams[res.home];
    const awayTeam = L.teams[res.away];

    // Award Super Bowl to all players
    winnerTeam.roster.forEach(player => {
      if (!player.awards) player.awards = [];
      player.awards.push({ year: L.year, award: 'Super Bowl Champion' });
    });

    // Update coaching stats
    if (window.updateCoachingPlayoffResults) {
      window.updateCoachingPlayoffResults(winnerTeam, {
        wonSuperBowl: true,
        wonConferenceChampionship: true,
        madePlayoffs: true
      });
    }

    P.results.push(`Super Bowl: ${awayTeam.abbr} ${res.scoreAway} @ ${homeTeam.abbr} ${res.scoreHome} — ${winnerTeam.name} are Super Bowl Champions!`);
    
    // Store champion
    L.champion = winnerTeam;
    if (!L.history) L.history = { superBowlWinners: [] };
    L.history.superBowlWinners.push({
      year: L.year,
      team: winnerTeam.name,
      abbr: winnerTeam.abbr
    });
    
    // End playoffs and run offseason
    state.playoffs = null;
    L.playoffsDone = true;
    
    window.setStatus(`${winnerTeam.name} win Super Bowl ${L.year}!`);
    
    // Run offseason after short delay
    setTimeout(() => {
      if (window.runOffseason) {
        window.runOffseason();
      } else {
        // Simple offseason simulation
        runBasicOffseason();
      }
      location.hash = '#/hub';
    }, 2000);
    
    return;
  }
  
  renderPlayoffs();
}

/**
 * Basic offseason simulation if full offseason not available
 */
function runBasicOffseason() {
  console.log('🏖️ Running basic offseason...');
  
  const L = state.league;
  if (!L) return;
  
  try {
    // Advance year and reset week
    L.year++;
    L.week = 1;
    L.playoffsDone = false;
    L.champion = null;
    
    // Reset team records
    L.teams.forEach(team => {
      team.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
      
      // Age players and handle retirements
      if (team.roster) {
        team.roster = team.roster.filter(player => {
          player.age++;
          
          // Simple retirement logic
          const retirementAge = 35;
          const retireChance = Math.max(0, (player.age - retirementAge) * 0.2);
          
          if (player.age >= retirementAge && Math.random() < retireChance) {
            console.log(`${player.name} retires at age ${player.age}`);
            return false; // Remove from roster
          }
          
          // Decrease years on contract
          if (player.years > 0) {
            player.years--;
          }
          
          return true; // Keep player
        });
        
        // Recalculate cap
        if (window.recalcCap) {
          window.recalcCap(L, team);
        }
      }
    });
    
    // Clear results
    L.resultsByWeek = {};
    
    // Generate new schedule if scheduler available
    if (window.Scheduler && window.Scheduler.makeAccurateSchedule) {
      L.schedule = window.Scheduler.makeAccurateSchedule(L.teams);
    }
    
    // Regenerate free agents
    if (window.ensureFA) {
      window.ensureFA();
    }
    
    // Generate new draft class
    if (window.generateProspects) {
      state.draftClass = window.generateProspects(L.year + 1);
    }
    
    window.setStatus(`Welcome to the ${L.year} season!`);
    
  } catch (error) {
    console.error('Error in basic offseason:', error);
    window.setStatus('Offseason simulation error');
  }
}

/**
 * Render playoffs view - THE MISSING FUNCTION
 */
function renderPlayoffs() {
  console.log('🏆 Rendering playoffs...');
  
  const P = state.playoffs;
  const L = state.league;
  
  if (!P || !L) {
    console.error('No playoffs or league data for rendering');
    return;
  }
  
  // Create playoffs view if it doesn't exist
  let playoffsView = document.getElementById('playoffs');
  if (!playoffsView) {
    playoffsView = document.createElement('section');
    playoffsView.id = 'playoffs';
    playoffsView.className = 'view';
    
    const contentSection = document.querySelector('.content');
    if (contentSection) {
      contentSection.appendChild(playoffsView);
    }
  }
  
  // Show the view
  playoffsView.hidden = false;
  playoffsView.style.display = 'block';
  
  try {
    const roundNames = {
      'WC': 'Wild Card',
      'DIV': 'Divisional',
      'CONF': 'Conference Championships', 
      'SB': 'Super Bowl'
    };
    
    let html = `
      <div class="card">
        <h2>🏆 ${L.year} Playoffs - ${roundNames[P.round] || P.round}</h2>
        <div class="playoffs-controls">
          <button id="btnSimPlayoffRound" class="btn primary">Simulate ${roundNames[P.round] || P.round}</button>
        </div>
      </div>
    `;
    
    // Show current matchups
    if (P.round !== 'SB') {
      ['AFC', 'NFC'].forEach(conf => {
        if (P.series[conf] && P.series[conf].length > 0) {
          html += `
            <div class="card">
              <h3>${conf} ${roundNames[P.round] || P.round}</h3>
              <div class="playoff-matchups">
                ${P.series[conf].map((game, i) => {
                  const home = L.teams[game.home];
                  const away = L.teams[game.away];
                  const homeRecord = home.record;
                  const awayRecord = away.record;
                  
                  return `
                    <div class="matchup-card">
                      <div class="team away-team">
                        <span class="team-name">${away.name}</span>
                        <span class="team-record">(${awayRecord.w}-${awayRecord.l}-${awayRecord.t})</span>
                      </div>
                      <div class="vs">@</div>
                      <div class="team home-team">
                        <span class="team-name">${home.name}</span>
                        <span class="team-record">(${homeRecord.w}-${homeRecord.l}-${homeRecord.t})</span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }
      });
    } else {
      // Super Bowl
      const game = P.series.SB[0];
      const home = L.teams[game.home];
      const away = L.teams[game.away];
      
      html += `
        <div class="card super-bowl-card">
          <h3>🏆 Super Bowl ${L.year}</h3>
          <div class="super-bowl-matchup">
            <div class="team sb-away">
              <h4>${away.name}</h4>
              <p>(${away.record.w}-${away.record.l}-${away.record.t})</p>
            </div>
            <div class="sb-vs">VS</div>
            <div class="team sb-home">
              <h4>${home.name}</h4>
              <p>(${home.record.w}-${home.record.l}-${home.record.t})</p>
            </div>
          </div>
        </div>
      `;
    }
    
    // Show playoff results
    if (P.results && P.results.length > 0) {
      html += `
        <div class="card">
          <h3>Playoff Results</h3>
          <div class="playoff-results">
            ${P.results.slice(-8).reverse().map(result => 
              `<div class="result-item">${result}</div>`
            ).join('')}
          </div>
        </div>
      `;
    }
    
    playoffsView.innerHTML = html;
    
    // Set up simulation button
    const simBtn = document.getElementById('btnSimPlayoffRound');
    if (simBtn) {
      simBtn.addEventListener('click', () => {
        simBtn.disabled = true;
        simBtn.textContent = 'Simulating...';
        
        setTimeout(() => {
          simulatePlayoffRound();
          simBtn.disabled = false;
          simBtn.textContent = `Simulate ${roundNames[P.round] || P.round}`;
        }, 500);
      });
    }
    
  } catch (error) {
    console.error('Error rendering playoffs:', error);
    playoffsView.innerHTML = `
      <div class="card">
        <h2>Playoffs</h2>
        <p class="error">Error rendering playoffs view</p>
      </div>
    `;
  }
}

// Add playoffs CSS
const playoffCSS = `
.playoffs-controls {
  margin: 1rem 0;
  text-align: center;
}

.playoff-matchups {
  display: grid;
  gap: 1rem;
}

.matchup-card {
  display: grid;
  grid-template-columns: 2fr auto 2fr;
  align-items: center;
  padding: 1rem;
  background: var(--surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--hairline);
}

.team {
  text-align: center;
  padding: 0.5rem;
}

.away-team {
  text-align: right;
}

.home-team {
  text-align: left;
}

.team-name {
  display: block;
  font-weight: 600;
  color: var(--text);
}

.team-record {
  display: block;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.vs {
  font-weight: 700;
  color: var(--accent);
  padding: 0 1rem;
}

.super-bowl-card {
  background: linear-gradient(135deg, 
    var(--surface) 0%, 
    rgba(255, 215, 0, 0.1) 100%);
  border: 2px solid rgba(255, 215, 0, 0.3);
}

.super-bowl-matchup {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 2rem;
  padding: 2rem;
  text-align: center;
}

.sb-vs {
  font-size: 2rem;
  font-weight: 900;
  color: var(--accent);
  text-shadow: 0 0 10px rgba(10, 132, 255, 0.5);
}

.playoff-results {
  max-height: 300px;
  overflow-y: auto;
}

.playoff-results .result-item {
  padding: 0.75rem;
  background: var(--surface);
  border-radius: var(--radius-md);
  margin-bottom: 0.5rem;
  font-family: monospace;
  font-size: 0.875rem;
}
`;

// Inject CSS
const playoffStyleEl = document.createElement('style');
playoffStyleEl.id = 'playoff-styles';
playoffStyleEl.textContent = playoffCSS;

// Remove existing if present
const existingStyle = document.getElementById('playoff-styles');
if (existingStyle) existingStyle.remove();

document.head.appendChild(playoffStyleEl);

// Make functions globally available
window.teamStats = teamStats;
window.pctRec = pctRec;
window.pctDiv = pctDiv;
window.pctConf = pctConf;
window.tieBreakCompare = tieBreakCompare;
window.seedPlayoffs = seedPlayoffs;
window.startPlayoffs = startPlayoffs;
window.buildRoundPairings = buildRoundPairings;
window.simPlayoffGame = simPlayoffGame;
window.simulatePlayoffRound = simulatePlayoffRound;
window.renderPlayoffs = renderPlayoffs; // THE MISSING FUNCTION!
window.runBasicOffseason = runBasicOffseason;

console.log('✅ Complete playoffs system loaded with renderPlayoffs function');
