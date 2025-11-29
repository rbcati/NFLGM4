// trades.js – core trade / trade block / CPU offer logic
(function (global) {
  'use strict';

  const C = global.Constants || {};
  const U = global.Utils || {};

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
      return Math.max(21, leagueYear - player.year + 22); // hand-wavey fallback
    }
    return 25;
  }

  function getPositionMultiplier(pos) {
    if (!C.POSITION_VALUES) return 1;
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

    return base;
  }

  function calcPickTradeValue(pick, leagueYear) {
    // If you already have a pickValue function from draft.js, re-use it:
    if (typeof global.pickValue === 'function') {
      return global.pickValue(pick);
    }

    // Fallback: use Constants.TRADE_VALUES if present
    if (C.TRADE_VALUES && C.TRADE_VALUES.PICKS) {
      const roundMap = C.TRADE_VALUES.PICKS[pick.round];
      if (roundMap) {
        // use mid slot if slot not known
        const slotValues = Object.values(roundMap);
        const avg = slotValues.reduce((a, b) => a + b, 0) / slotValues.length;
        const yearsOut = (pick.year || leagueYear) - (leagueYear || 2025);
        const discount = Math.pow(C.TRADE_VALUES.FUTURE_DISCOUNT || 0.8, Math.max(0, yearsOut));
        return avg * discount;
      }
    }

    // Simple fallback
    const baseValues = { 1: 25, 2: 15, 3: 8, 4: 5, 5: 3, 6: 2, 7: 1 };
    const base = baseValues[pick.round] || 1;
    const yearsOut = (pick.year || leagueYear) - (leagueYear || 2025);
    const discount = Math.pow(0.8, Math.max(0, yearsOut));
    return base * discount;
  }

  function calcAssetsValue(team, assets, leagueYear) {
    let total = 0;
    const picks = team.picks || [];

    assets.forEach(a => {
      if (a.kind === 'player') {
        const p = findPlayerOnTeam(team, a.playerId);
        total += calcPlayerTradeValue(p, leagueYear);
      } else if (a.kind === 'pick') {
        const pk = picks.find(p => p.year === a.year && p.round === a.round);
        if (pk) {
          total += calcPickTradeValue(pk, leagueYear);
        }
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
m, fromAssets, leagueYear);

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

    // Give news
    if (L.news) {
      const fromStr = fromAssets.map(a => formatAssetString(fromTeam, a)).join(', ');
      const toStr   = toAssets.map(a => formatAssetString(toTeam, a)).join(', ');
      L.news.push(`${fromTeam.name} traded ${fromStr} to ${toTeam.name} for ${toStr}`);
    }

    return true;
  }

  function formatAssetString(team, asset) {
    if (!team) return '';
    if (asset.kind === 'player') {
      const p = (team.roster || []).find(pl => pl.id === asset.playerId);
      return p ? `${p.name} (${p.pos})` : 'player';
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
      const team = L.teams[teamIndex];
      const counts = teamPosCounts[teamIndex];
      const needed = (C.DEPTH_NEEDS && C.DEPTH_NEEDS[pos]) || 2;
      const have = counts[pos] || 0;
      return have < needed;
    }

    for (let t = 0; t < L.teams.length; t++) {
      if (t === userTeamId) continue;
      const cpuTeam = L.teams[t];

      // small chance this team is active in trades right now
      if (Math.random() > 0.5) continue;

      // Look through user trade block players
      for (const playerId of userBlock) {
        const player = userTeam.roster.find(p => p.id === playerId);
        if (!player) continue;

        const pos = player.pos || 'RB';
        if (!teamNeedsPosition(t, pos)) continue;

        const playerVal = calcPlayerTradeValue(player, leagueYear);

        // Option A: CPU offers a pick
        const cpuOfferPick = pickCpuTradeAssetForValue(cpuTeam, playerVal, leagueYear);
        let cpuOfferAssets = [];
        let userReturnAssets = [];

        if (cpuOfferPick) {
          cpuOfferAssets = [cpuOfferPick];
          userReturnAssets = [{ kind: 'player', playerId }];
        } else {
          // Option B: CPU offers a player
          const cpuOfferPlayer = pickCpuPlayerForValue(cpuTeam, playerVal, leagueYear);
          if (!cpuOfferPlayer) continue;

          cpuOfferAssets = [{ kind: 'player', playerId: cpuOfferPlayer.id }];
          userReturnAssets = [{ kind: 'player', playerId }];
        }

        const evalResult = evaluateTrade(L, t, userTeamId, cpuOfferAssets, userReturnAssets);
        if (!evalResult) continue;

        // CPU only sends offer if it's slightly favorable or roughly even
        const cpuDelta = evalResult.fromValue.delta; // from CPU perspective (team t)
        if (cpuDelta < -10) {
          // Really bad for CPU; skip
          continue;
        }

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
    if (!best) return null;

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
    }));

    valued.sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));

    const best = valued[0];
    if (!best) return null;
    return best.player;
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