// trade.js
'use strict';

function collectSelected(side, team) {
  const checks = $$(`input[type=checkbox][data-side=${side}]:checked`);
  const players = [], picks = [];
  checks.forEach(c => {
    if (c.dataset.type === 'player') {
      const p = team.roster.find(x => x.id === c.dataset.id);
      if (p) players.push(p);
    } else {
      const pk = team.picks.find(x => x.id === c.dataset.id);
      if (pk) picks.push(pk);
    }
  });
  return { players, picks };
}

function valueOf(p) {
  const agePenalty = Math.max(0, p.age - 26) * 0.6;
  const contractValue = Math.max(0, p.years) * (p.baseAnnual * 0.6);
  return p.ovr - agePenalty + contractValue * 0.05 + (p.pos === 'QB' ? 6 : 0) + ((p.pos === 'WR' || p.pos === 'CB') ? 2 : 0);
}

function validateTrade() {
  const L = state.league;
  const a = parseInt($('#tradeA').value, 10), b = parseInt($('#tradeB').value, 10);
  const A = collectSelected('A', L.teams[a]), B = collectSelected('B', L.teams[b]);
  if ((!A.players.length && !A.picks.length) || (!B.players.length && !B.picks.length)) {
    $('#tradeInfo').textContent = 'Pick at least one asset on each side.';
    $('#tradeExecute').disabled = true; return;
  }
  const valA = A.players.reduce((s, p) => s + valueOf(p), 0) + A.picks.reduce((s, pk) => s + pickValue(pk), 0);
  const valB = B.players.reduce((s, p) => s + valueOf(p), 0) + B.picks.reduce((s, pk) => s + pickValue(pk), 0);
  const diff = Math.abs(valA - valB);
  const fair = diff <= 15;
  const capA = L.teams[a].capUsed - A.players.reduce((s, p) => s + capHitFor(p, 0), 0) + B.players.reduce((s, p) => s + capHitFor(p, 0), 0);
  const capB = L.teams[b].capUsed - B.players.reduce((s, p) => s + capHitFor(p, 0), 0) + A.players.reduce((s, p) => s + capHitFor(p, 0), 0);
  const capOK = capA <= L.teams[a].capTotal && capB <= L.teams[b].capTotal;
  $('#tradeInfo').textContent = `Value A ${valA.toFixed(1)} vs B ${valB.toFixed(1)} — ${fair ? 'Fair' : 'Unbalanced'} (delta ${diff.toFixed(1)}). Cap after: A ${capA.toFixed(1)}/${L.teams[a].capTotal}M, B ${capB.toFixed(1)}/${L.teams[b].capTotal}M ${capOK ? '' : '(CAP VIOLATION)'}`;
  $('#tradeExecute').disabled = !(fair && capOK);
}

function executeTrade() {
  const L = state.league;
  const a = parseInt($('#tradeA').value, 10), b = parseInt($('#tradeB').value, 10);
  const A = collectSelected('A', L.teams[a]), B = collectSelected('B', L.teams[b]);
  L.teams[a].roster = L.teams[a].roster.filter(p => !A.players.some(x => x.id === p.id)).concat(B.players).sort((x, y) => y.ovr - x.ovr);
  L.teams[b].roster = L.teams[b].roster.filter(p => !B.players.some(x => x.id === p.id)).concat(A.players).sort((x, y) => y.ovr - x.ovr);
  L.teams[a].picks = L.teams[a].picks.filter(pk => !A.picks.some(x => x.id === pk.id)).concat(B.picks);
  L.teams[b].picks = L.teams[b].picks.filter(pk => !B.picks.some(x => x.id === pk.id)).concat(A.picks);
  recalcCap(L, L.teams[a]); recalcCap(L, L.teams[b]);
  $('#tradeInfo').textContent = 'Trade executed.';
  renderTradeLists();
  setStatus('Trade complete.');
}

// ... (All other AI trade functions from the original file go here)
function teamNeedProfile(team) { /* ... */ }
function teamSurplusPositions(team) { /* ... */ }
function pickBestTradeCounterpart(L, teamA) { /* ... */ }
function chooseTradePieces(teamA, teamB) { /* ... */ }
function adjustValueForNeed(rawValue, receiverTeam, player) { /* ... */ }
function buildSuggestionForTeams(teamA, teamB) { /* ... */ }
function validateSuggestionCapsAndFairness(sug) { /* ... */ }
function executeSuggestion(sug) { /* ... */ }
function assetLabel(asset, nowSeason) { /* ... */ }
function logTrade(sug) { /* ... */ }
function tryOfferToUser() { /* ... */ }
function weeklyTradeProbability(week) { /* ... */ }
function aiWeeklyTrades() { /* ... */ }
