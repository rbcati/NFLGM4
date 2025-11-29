(function (global) {
  'use strict';

  const C = global.Constants || {};
  const U = global.Utils || {};

  // Default constants if not defined (add to your Constants if needed)
  if (!C.POSITION_VALUES) {
    C.POSITION_VALUES = { QB: 1.5, WR: 1.2, RB: 1.0, TE: 1.1, OL: 1.1, DL: 1.0, LB: 1.0, CB: 1.1, S: 1.0 }; // Example: QB most valuable
  }
  if (!C.DEPTH_NEEDS) {
    C.DEPTH_NEEDS = { QB: 2, WR: 5, RB: 3, TE: 3, OL: 8, DL: 6, LB: 6, CB: 5, S: 4 }; // Example min depth per pos
  }
  if (!C.TRADE_VALUES) {
    C.TRADE_VALUES = {};
  }
  if (!C.TRADE_VALUES.FUTURE_DISCOUNT) {
    C.TRADE_VALUES.FUTURE_DISCOUNT = 0.85; // 15% discount per year out
  }
  if (!C.TRADE_VALUES.PICKS) {
    // Averaged from Drafttek 2026 chart (classic Jimmy Johnson style)
    // Round averages: R1 ~1476, R2 ~418, R3 ~175, R4 ~57, R5 ~28, R6 ~11, R7 ~1.5 (scaled down for balance if needed)
    C.TRADE_VALUES.PICKS = {
      1: { avg: 1476 },
      2: { avg: 418 },
      3: { avg: 175 },
      4: { avg: 57 },
      5: { avg: 28 },
      6: { avg: 11 },
      7: { avg: 1.5 }
    };
  }

  /**
   * Trade asset format:
   * { kind: 'player', playerId: 'abc123' }
   * { kind: 'pick',   year: 2027, round: 2 }
   */

  // --- Helpers ------------------------------------------------------

  function findPlayerOnTeam(team, playerId) {
    if (!team || !team.roster) return null;
    return team.roster.find(p => p.id === playerId) || null;
  }

  function removePlayerFromTeam(team, playerId) {
    if (!team || !team.roster) return null;
    const idx = team.roster.findIndex(p => p.id === playerId);
    if (idx === -1) return null;
    const [player] = team.roster.splice(idx, 1);
    return player;
  }

  function findPickOnTeam(team, year, round) {
    const picks = team.picks || [];
    return picks.find(p => p.year === year && p.round === round) || null;
  }

  function removePickFromTeam(team, year, round) {
    const picks = team.picks || [];
    const idx = picks.findIndex(p => p.year === year && p.round === round);
    if (idx === -1) return null;
    const [pick] = picks.splice(idx, 1);
    return pick;
  }

  // --- Value functions ----------------------------------------------

  // Basic overall from ratings if needed
  function getPlayerOvr(player) {
    if (typeof player.ovr === 'number') return player.ovr;
    if (!player.ratings) return 60;
    // crude fallback: average all rating numbers
    const values = Object.values(player.ratings).filter(v => typeof v === 'number');
    if (!values.length) return 60;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  function getPlayerAge(player, leagueYear) {
    if (typeof player.age === 'number') return player.age;
    if (player.year && typeof leagueYear === 'number') {
      return Math.max(21, leagueYear - player.year + 22); // hand-wavey fallback (assumes draft year)
    }
    return 25;
  }

  function getPositionMultiplier(pos) {
    return C.POSITION_VALUES[pos] || 1;
  }

  function getContractFactor(player) {
    // Favors cheap, long-term players; penalizes older, expensive ones
    const salary = player.baseAnnual || player.salary || 1;
    const yearsLeft = player.years || player.yearsRemaining || 1;

    // Cheap, multi-year deals are more valuable
    const costFactor = 1 / Math.max(0.5, salary / 5); // assume 5 = "starter money"
    const termFactor = 0.8 + Math.min(3, yearsLeft) * 0.1; // 0.8 – 1.1 or so

    return costFactor * termFactor;
  }

  function calcPlayerTradeValue(player, leagueYear) {
    if (!player) return 0;

    const ovr = getPlayerOvr(player);
    const age = getPlayerAge(player, leagueYear);
    const pos = player.pos || player.position || 'RB';

    let base = ovr * getPositionMultiplier(pos);

    // Age curve – prime ~24–28
    if (age < 23) base *= 0.9;
    else if (age >= 23 && age <= 28) base *= 1.05;
    else if (age > 30) base *= 0.8;

    base *= getContractFactor(player);

    return Math.max(0, base); // Ensure non-negative
  }

  function calcPickTradeValue(pick, leagueYear) {
    // If you already have a pickValue function from draft.js, re-use it:
    if (typeof global.pickValue === 'function') {
      return global.pickValue(pick);
    }

    // Use C.TRADE_VALUES.PICKS if present (now with averages)
    if (C.TRADE_VALUES && C.TRADE_VALUES.PICKS) {
      const roundMap = C.TRADE_VALUES.PICKS[pick.round];
      if (roundMap) {
        const avg = roundMap.avg; // Use precomputed average since no slot
        const yearsOut = Math.max(0, (pick.year || leagueYear) - leagueYear);
        const discount = Math.pow(C.TRADE_VALUES.FUTURE_DISCOUNT, yearsOut);
        return avg * discount;
      }
    }

    // Simple fallback (improved slightly)
    const baseValues = { 1: 1000, 2: 500, 3: 250, 4: 100, 5: 50, 6: 20, 7: 10 };
    const base = baseValues[pick.round] || 1;
    const yearsOut = Math.max(0, (pick.year || leagueYear) - leagueYear);
    const discount = Math.pow(0.85, yearsOut);
    return base * discount;
  }

  function calcAssetsValue(team, assets, leagueYear) {
    let total = 0;

    assets.forEach(a => {
      if (a.kind === 'player') {
        const p = findPlayerOnTeam(team, a.playerId);
        if (p) total += calcPlayerTradeValue(p, leagueYear);
      } else if (a.kind === 'pick') {
        const pk = findPickOnTeam(team, a.year, a.round);
        if (pk) total += calcPickTradeValue(pk, leagueYear);
      }
    });

    return total;
  }

  // --- Trade evaluation & execution --------------------------------

  /**
   * Evaluate trade fairness from each side's perspective.
   * Returns { fromValue, toValue, deltaFrom, deltaTo }
   */
  function evaluateTrade(league, fromTeamId, toTeamId, fromAssets, toAssets) {
    const L = league;
    const leagueYear = L.year || C.GAME_CONFIG?.YEAR_START || 2025;
    const fromTeam = L.teams[fromTeamId];
    const toTeam = L.teams[toTeamId];

    if (!fromTeam || !toTeam) {
      return null;
    }

    const fromGive = calcAssetsValue(fromTeam, fromAssets, leagueYear);
    const fromGet  = calcAssetsValue(toTeam,   toAssets,   leagueYear);

    const toGive   = calcAssetsValue(toTeam,   toAssets,   leagueYear);
    const toGet    = calcAssetsValue(fromTeam, fromAssets, leagueYear);

    return {
      fromValue: { give: fromGive, get: fromGet, delta: fromGet - fromGive },
      toValue:   { give: toGive,   get: toGet,   delta: toGet - toGive }
    };
  }

  /**
   * Apply a trade if valid. Returns true/false.
   */
  function applyTrade(league, fromTeamId, toTeamId, fromAssets, toAssets) {
    const L = league;
    const fromTeam = L.teams[fromTeamId];
    const toTeam   = L.teams[toTeamId];

    if (!fromTeam || !toTeam) return false;

    // Generate news strings BEFORE moving assets (fix for finding players)
    let fromStr = '';
    let toStr = '';
    if (L.news) {
      fromStr = fromAssets.map(a => formatAssetString(fromTeam, a)).filter(s => s).join(', ') || 'nothing';
      toStr   = toAssets.map(a => formatAssetString(toTeam, a)).filter(s => s).join(', ') || 'nothing';
    }

    // Phase 1 – collect assets to move
    const fromPlayers = [];
    const fromPicks   = [];
    const toPlayers   = [];
    const toPicks     = [];

    // Remove from "fromTeam"
    fromAssets.forEach(a => {
      if (a.kind === 'player') {
        const p = removePlayerFromTeam(fromTeam, a.playerId);
        if (p) fromPlayers.push(p);
      } else if (a.kind === 'pick') {
        const pk = removePickFromTeam(fromTeam, a.year, a.round);
        if (pk) fromPicks.push(pk);
      }
    });

    // Remove from "toTeam"
    toAssets.forEach(a => {
      if (a.kind === 'player') {
        const p = removePlayerFromTeam(toTeam, a.playerId);
        if (p) toPlayers.push(p);
      } else if (a.kind === 'pick') {
        const pk = removePickFromTeam(toTeam, a.year, a.round);
        if (pk) toPicks.push(pk);
      }
    });

    // Phase 2 – add to opposite teams
    fromPlayers.forEach(p => toTeam.roster.push(p));
    toPlayers.forEach(p   => fromTeam.roster.push(p));

    fromPicks.forEach(pk => {
      toTeam.picks = toTeam.picks || [];
      toTeam.picks.push(pk);
    });

    toPicks.forEach(pk => {
      fromTeam.picks = fromTeam.picks || [];
      fromTeam.picks.push(pk);
    });

    // Optional: sort rosters by ovr
    fromTeam.roster.sort((a, b) => getPlayerOvr(b) - getPlayerOvr(a));
    toTeam.roster.sort((a, b) => getPlayerOvr(b) - getPlayerOvr(a));

    // Recalc caps if available
    if (typeof global.recalcCap === 'function') {
      global.recalcCap(L, fromTeam);
      global.recalcCap(L, toTeam);
    }

    // Save game if save system exists
    if (typeof global.saveLeague === 'function') {
      global.saveLeague();
    }

    // Give news (now using pre-generated strings)
    if (L.news) {
      L.news.push(`${fromTeam.name} traded ${fromStr} to ${toTeam.name} for ${toStr}`);
    }

    return true;
  }

  function formatAssetString(team, asset) {
    if (!team) return '';
    if (asset.kind === 'player') {
      const p = (team.roster || []).find(pl => pl.id === asset.playerId);
      return p ? `${p.name} (${p.pos})` : 'unknown player';
    }
    if (asset.kind === 'pick') {
      return `${asset.year} R${asset.round} pick`;
    }
    return '';
  }

  // --- Trade block --------------------------------------------------

  function ensureTradeBlock(team) {
    if (!team.tradeBlock) {
      team.tradeBlock = []; // array of playerId
    }
    return team.tradeBlock;
  }

  function addToTradeBlock(league, teamId, playerId) {
    const team = league.teams[teamId];
    if (!team) return false;
    const block = ensureTradeBlock(team);
    if (!block.includes(playerId)) block.push(playerId);
    if (typeof global.saveLeague === 'function') global.saveLeague();
    return true;
  }

  function removeFromTradeBlock(league, teamId, playerId) {
    const team = league.teams[teamId];
    if (!team || !team.tradeBlock) return false;
    team.tradeBlock = team.tradeBlock.filter(id => id !== playerId);
    if (typeof global.saveLeague === 'function') global.saveLeague();
    return true;
  }

  function getTeamTradeBlock(league, teamId) {
    const team = league.teams[teamId];
    if (!team) return [];
    return ensureTradeBlock(team).slice();
  }

  // --- CPU trade offers ---------------------------------------------

  /**
   * Very simple CPU trade AI:
   * - Other teams look at your trade block.
   * - If they "need" that position and value is close, they offer a pick or a player.
   */
  function generateCpuTradeOffers(league, userTeamId, maxOffers) {
    const L = league;
    const offers = [];
    if (!L || !L.teams || userTeamId == null) return offers;

    const userTeam = L.teams[userTeamId];
    const leagueYear = L.year || C.GAME_CONFIG?.YEAR_START || 2025;

    // Make sure trade block exists
    const userBlock = ensureTradeBlock(userTeam);

    if (!userBlock.length) return offers;

    const max = maxOffers || 3;

    // Precompute counts by position for each team
    const teamPosCounts = L.teams.map(team => {
      const counts = {};
      (team.roster || []).forEach(p => {
        const pos = p.pos || 'RB';
        counts[pos] = (counts[pos] || 0) + 1;
      });
      return counts;
    });

    // Helper to compute if a team "needs" a pos vs DEPTH_NEEDS
    function teamNeedsPosition(teamIndex, pos) {
      const counts = teamPosCounts[teamIndex];
      const needed = C.DEPTH_NEEDS[pos] || 2;
      const have = counts[pos] || 0;
      return have < needed;
    }

    for (let t = 0; t < L.teams.length; t++) {
      if (t === userTeamId) continue;
      const cpuTeam = L.teams[t];

      // small chance this team is active in trades right now
      if (Math.random() > 0.3) continue; // Increased chance for more offers

      // Look through user trade block players
      for (const playerId of userBlock) {
        const player = findPlayerOnTeam(userTeam, playerId);
        if (!player) continue;

        const pos = player.pos || 'RB';
        if (!teamNeedsPosition(t, pos)) continue;

        const playerVal = calcPlayerTradeValue(player, leagueYear);

        // Option A: CPU offers a pick
        let cpuOfferAssets = [];
        let userReturnAssets = [{ kind: 'player', playerId }];

        const cpuOfferPick = pickCpuTradeAssetForValue(cpuTeam, playerVal, leagueYear);
        if (cpuOfferPick) {
          cpuOfferAssets = [cpuOfferPick];
        } else {
          // Option B: CPU offers a player
          const cpuOfferPlayer = pickCpuPlayerForValue(cpuTeam, playerVal, leagueYear);
          if (!cpuOfferPlayer) continue;
          cpuOfferAssets = [{ kind: 'player', playerId: cpuOfferPlayer.id }];
        }

        let evalResult = evaluateTrade(L, t, userTeamId, cpuOfferAssets, userReturnAssets);
        if (!evalResult) continue;

        // If slightly unfavorable for CPU, add a low-value sweetener (e.g., late pick)
        let cpuDelta = evalResult.fromValue.delta;
        if (cpuDelta < -5 && cpuDelta > -20) {
          const sweetener = pickCpuTradeAssetForValue(cpuTeam, 10, leagueYear); // Low value ~ Round 6-7
          if (sweetener) {
            cpuOfferAssets.push(sweetener);
            evalResult = evaluateTrade(L, t, userTeamId, cpuOfferAssets, userReturnAssets); // Re-eval
            cpuDelta = evalResult.fromValue.delta;
          }
        }

        // CPU only sends offer if it's roughly even or better (adjusted threshold)
        if (cpuDelta < -5) continue; // Allow slight loss for realism

        offers.push({
          fromTeamId: t,
          toTeamId: userTeamId,
          fromAssets: cpuOfferAssets,
          toAssets: userReturnAssets,
          eval: evalResult
        });

        if (offers.length >= max) return offers;
      }
    }

    return offers;
  }

  function pickCpuTradeAssetForValue(team, target, leagueYear) {
    const picks = team.picks || [];
    if (!picks.length) return null;

    // sort picks by value closest to target
    const valued = picks.map(p => ({
      pick: p,
      value: calcPickTradeValue(p, leagueYear)
    }));

    valued.sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));

    const best = valued[0];
    if (!best || best.value <= 0) return null;

    return {
      kind: 'pick',
      year: best.pick.year,
      round: best.pick.round
    };
  }

  function pickCpuPlayerForValue(team, target, leagueYear) {
    const roster = team.roster || [];
    if (!roster.length) return null;

    const valued = roster.map(p => ({
      player: p,
      value: calcPlayerTradeValue(p, leagueYear)
    })).filter(v => v.value > 0); // Skip worthless

    if (!valued.length) return null;

    valued.sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));

    return valued[0].player;
  }

  // --- Expose API ---------------------------------------------------

  global.evaluateTrade = function (fromTeamId, toTeamId, fromAssets, toAssets) {
    return evaluateTrade(global.state.league, fromTeamId, toTeamId, fromAssets, toAssets);
  };

  global.applyTrade = function (fromTeamId, toTeamId, fromAssets, toAssets) {
    return applyTrade(global.state.league, fromTeamId, toTeamId, fromAssets, toAssets);
  };

  global.addToTradeBlock = function (teamId, playerId) {
    return addToTradeBlock(global.state.league, teamId, playerId);
  };

  global.removeFromTradeBlock = function (teamId, playerId) {
    return removeFromTradeBlock(global.state.league, teamId, playerId);
  };

  global.getTeamTradeBlock = function (teamId) {
    return getTeamTradeBlock(global.state.league, teamId);
  };

  global.generateCpuTradeOffers = function (userTeamId, maxOffers) {
    return generateCpuTradeOffers(global.state.league, userTeamId, maxOffers);
  };

  console.log('✅ Trade system loaded');

})(window);