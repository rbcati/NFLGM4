// trades.js – trade engine, trade block, CPU offers, manual trade system
(function (global) {
  'use strict';

  const C = global.Constants || {};
  const U = global.Utils || {};

  // ---- Safe defaults / fallbacks (only if missing) -----------------

  if (!C.POSITION_VALUES) {
    C.POSITION_VALUES = {
      QB: 1.5, WR: 1.2, RB: 1.0, TE: 1.1, OL: 1.1,
      DL: 1.0, LB: 1.0, CB: 1.1, S: 1.0
    };
  }

  if (!C.DEPTH_NEEDS) {
    C.DEPTH_NEEDS = {
      QB: 2, WR: 5, RB: 3, TE: 3,
      OL: 8, DL: 6, LB: 6, CB: 5, S: 4
    };
  }

  if (!C.TRADE_VALUES) {
    C.TRADE_VALUES = {};
  }
  if (typeof C.TRADE_VALUES.FUTURE_DISCOUNT !== 'number') {
    C.TRADE_VALUES.FUTURE_DISCOUNT = 0.85; // 15% discount per year out
  }
  if (!C.TRADE_VALUES.PICKS) {
    // Round averages (scaled) – enough for relative value
    C.TRADE_VALUES.PICKS = {
      1: { avg: 1476 },
      2: { avg: 418  },
      3: { avg: 175  },
      4: { avg: 57   },
      5: { avg: 28   },
      6: { avg: 11   },
      7: { avg: 1.5  }
    };
  }

  /**
   * Asset format:
   *   { kind: 'player', playerId: 'abc123' }
   *   { kind: 'pick',   year: 2027, round: 2 }
   */

  // --- Helpers ------------------------------------------------------

  function getLeagueYear(league) {
    if (league && typeof league.year === 'number') return league.year;
    if (C.GAME_CONFIG && typeof C.GAME_CONFIG.YEAR_START === 'number') {
      return C.GAME_CONFIG.YEAR_START;
    }
    return 2025;
  }

  function findPlayerOnTeam(team, playerId) {
    if (!team || !team.roster) return null;
    return team.roster.find(p => p.id === playerId) || null;
  }

  function removePlayerFromTeam(team, playerId) {
    if (!team || !team.roster) return null;
    const idx = team.roster.findIndex(p => p.id === playerId);
    if (idx === -1) return null;
    const removed = team.roster.splice(idx, 1);
    return removed[0] || null;
  }

  function findPickOnTeam(team, year, round) {
    const picks = team && team.picks ? team.picks : [];
    return picks.find(p => p.year === year && p.round === round) || null;
  }

  function removePickFromTeam(team, year, round) {
    const picks = team && team.picks ? team.picks : [];
    const idx = picks.findIndex(p => p.year === year && p.round === round);
    if (idx === -1) return null;
    const removed = picks.splice(idx, 1);
    return removed[0] || null;
  }

  // --- Value functions ----------------------------------------------

  function getPlayerOvr(player) {
    if (!player) return 60;
    if (typeof player.ovr === 'number') return player.ovr;
    if (!player.ratings) return 60;

    const values = Object.values(player.ratings).filter(v => typeof v === 'number');
    if (!values.length) return 60;
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.round(sum / values.length);
  }

  function getPlayerAge(player, leagueYear) {
    if (!player) return 25;
    if (typeof player.age === 'number') return player.age;
    if (player.year && typeof leagueYear === 'number') {
      return Math.max(21, leagueYear - player.year + 22);
    }
    return 25;
  }

  function getPositionMultiplier(pos) {
    if (!pos) return 1;
    return C.POSITION_VALUES[pos] || 1;
  }

  function getContractFactor(player) {
    if (!player) return 1;

    const salary = player.baseAnnual || player.salary || 1;
    const yearsLeft = player.years || player.yearsRemaining || 1;

    const costFactor = 1 / Math.max(0.5, salary / 5); // cheaper = better
    const termFactor = 0.8 + Math.min(3, yearsLeft) * 0.1; // more years = slightly better

    return costFactor * termFactor;
  }

  function calcPlayerTradeValue(player, leagueYear) {
    if (!player) return 0;

    const ovr = getPlayerOvr(player);
    const age = getPlayerAge(player, leagueYear);
    const pos = player.pos || player.position || 'RB';

    let value = ovr * getPositionMultiplier(pos);

    // Age curve – prime around 24–28
    if (age < 23) value *= 0.9;
    else if (age >= 23 && age <= 28) value *= 1.05;
    else if (age > 30) value *= 0.8;

    value *= getContractFactor(player);

    return Math.max(0, value);
  }

  function calcPickTradeValue(pick, leagueYear) {
    if (!pick) return 0;

    // Reuse global pickValue if game already has one
    if (typeof global.pickValue === 'function') {
      return global.pickValue(pick);
    }

    if (C.TRADE_VALUES && C.TRADE_VALUES.PICKS) {
      const roundMap = C.TRADE_VALUES.PICKS[pick.round];
      if (roundMap && typeof roundMap.avg === 'number') {
        const avg = roundMap.avg;
        const yearsOut = Math.max(0, (pick.year || leagueYear) - leagueYear);
        const disc = Math.pow(C.TRADE_VALUES.FUTURE_DISCOUNT, yearsOut);
        return avg * disc;
      }
    }

    // Fallback
    const baseValues = { 1: 1000, 2: 500, 3: 250, 4: 100, 5: 50, 6: 20, 7: 10 };
    const base = baseValues[pick.round] || 1;
    const yearsOut = Math.max(0, (pick.year || leagueYear) - leagueYear);
    const disc = Math.pow(0.85, yearsOut);
    return base * disc;
  }

  function calcAssetsValue(team, assets, leagueYear) {
    let total = 0;
    if (!team || !assets || !assets.length) return 0;

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
   * Returns: { fromValue: {give,get,delta}, toValue: {give,get,delta} }
   */
  function evaluateTrade(league, fromTeamId, toTeamId, fromAssets, toAssets) {
    const L = league;
    if (!L || !L.teams) return null;

    const leagueYear = getLeagueYear(L);
    const fromTeam = L.teams[fromTeamId];
    const toTeam = L.teams[toTeamId];

    if (!fromTeam || !toTeam) return null;

    const fromGive = calcAssetsValue(fromTeam, fromAssets, leagueYear);
    const fromGet  = calcAssetsValue(toTeam,   toAssets,   leagueYear);

    const toGive   = calcAssetsValue(toTeam,   toAssets,   leagueYear);
    const toGet    = calcAssetsValue(fromTeam, fromAssets, leagueYear);

    return {
      fromValue: { give: fromGive, get: fromGet, delta: fromGet - fromGive },
      toValue:   { give: toGive,   get: toGet,   delta: toGet - toGive }
    };
  }

  function formatAssetString(team, asset) {
    if (!team || !asset) return '';
    if (asset.kind === 'player') {
      const p = (team.roster || []).find(pl => pl.id === asset.playerId);
      return p ? (p.name + ' (' + (p.pos || '') + ')') : 'unknown player';
    }
    if (asset.kind === 'pick') {
      return (asset.year || '?') + ' R' + (asset.round || '?') + ' pick';
    }
    return '';
  }

  /**
   * Apply a trade (no AI, just execute). Returns true/false.
   */
  function applyTrade(league, fromTeamId, toTeamId, fromAssets, toAssets) {
    const L = league;
    if (!L || !L.teams) return false;

    const fromTeam = L.teams[fromTeamId];
    const toTeam   = L.teams[toTeamId];
    if (!fromTeam || !toTeam) return false;

    // Pre-compute human-readable strings BEFORE moving assets
    let fromStr = '';
    let toStr   = '';
    if (L.news) {
      fromStr = (fromAssets || [])
        .map(a => formatAssetString(fromTeam, a))
        .filter(Boolean)
        .join(', ') || 'nothing';
      toStr = (toAssets || [])
        .map(a => formatAssetString(toTeam, a))
        .filter(Boolean)
        .join(', ') || 'nothing';
    }

    // Phase 1 – collect assets to move
    const fromPlayers = [];
    const fromPicks   = [];
    const toPlayers   = [];
    const toPicks     = [];

    (fromAssets || []).forEach(a => {
      if (a.kind === 'player') {
        const p = removePlayerFromTeam(fromTeam, a.playerId);
        if (p) fromPlayers.push(p);
      } else if (a.kind === 'pick') {
        const pk = removePickFromTeam(fromTeam, a.year, a.round);
        if (pk) fromPicks.push(pk);
      }
    });

    (toAssets || []).forEach(a => {
      if (a.kind === 'player') {
        const p = removePlayerFromTeam(toTeam, a.playerId);
        if (p) toPlayers.push(p);
      } else if (a.kind === 'pick') {
        const pk = removePickFromTeam(toTeam, a.year, a.round);
        if (pk) toPicks.push(pk);
      }
    });

    // Phase 2 – add to opposite teams
    fromPlayers.forEach(p => {
      toTeam.roster = toTeam.roster || [];
      toTeam.roster.push(p);
    });
    toPlayers.forEach(p => {
      fromTeam.roster = fromTeam.roster || [];
      fromTeam.roster.push(p);
    });

    fromPicks.forEach(pk => {
      toTeam.picks = toTeam.picks || [];
      toTeam.picks.push(pk);
    });
    toPicks.forEach(pk => {
      fromTeam.picks = fromTeam.picks || [];
      fromTeam.picks.push(pk);
    });

    // Sort rosters by ovr (optional, but nice)
    if (fromTeam.roster) {
      fromTeam.roster.sort((a, b) => getPlayerOvr(b) - getPlayerOvr(a));
    }
    if (toTeam.roster) {
      toTeam.roster.sort((a, b) => getPlayerOvr(b) - getPlayerOvr(a));
    }

    // Recalc caps if available
    if (typeof global.recalcCap === 'function') {
      global.recalcCap(L, fromTeam);
      global.recalcCap(L, toTeam);
    }

    // Save game if save system exists
    if (typeof global.saveLeague === 'function') {
      global.saveLeague();
    }

    // Add news
    if (L.news) {
      L.news.push(fromTeam.name + ' traded ' + fromStr + ' to ' +
                  toTeam.name + ' for ' + toStr);
    }

    return true;
  }

  // --- Trade block --------------------------------------------------

  function ensureTradeBlock(team) {
    if (!team.tradeBlock) {
      team.tradeBlock = []; // array of playerId
    }
    return team.tradeBlock;
  }

  function addToTradeBlock(league, teamId, playerId) {
    const team = league && league.teams ? league.teams[teamId] : null;
    if (!team) return false;
    const block = ensureTradeBlock(team);
    if (!block.includes(playerId)) block.push(playerId);
    if (typeof global.saveLeague === 'function') global.saveLeague();
    return true;
  }

  function removeFromTradeBlock(league, teamId, playerId) {
    const team = league && league.teams ? league.teams[teamId] : null;
    if (!team || !team.tradeBlock) return false;
    team.tradeBlock = team.tradeBlock.filter(id => id !== playerId);
    if (typeof global.saveLeague === 'function') global.saveLeague();
    return true;
  }

  function getTeamTradeBlock(league, teamId) {
    const team = league && league.teams ? league.teams[teamId] : null;
    if (!team) return [];
    return ensureTradeBlock(team).slice();
  }

  // --- CPU trade offers ---------------------------------------------

  /**
   * CPU looks at user's trade block, sends offers if position need + value fit.
   */
  function generateCpuTradeOffers(league, userTeamId, maxOffers) {
    const L = league;
    const offers = [];
    if (!L || !L.teams || userTeamId == null) return offers;

    const userTeam = L.teams[userTeamId];
    if (!userTeam) return offers;

    const leagueYear = getLeagueYear(L);
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

    function teamNeedsPosition(teamIndex, pos) {
      const counts = teamPosCounts[teamIndex] || {};
      const needed = C.DEPTH_NEEDS[pos] || 2;
      const have = counts[pos] || 0;
      return have < needed;
    }

    for (let t = 0; t < L.teams.length; t++) {
      if (t === userTeamId) continue;
      const cpuTeam = L.teams[t];
      if (!cpuTeam) continue;

      // Chance this team is active in trade talks
      if (Math.random() > 0.3) continue;

      for (const playerId of userBlock) {
        const player = findPlayerOnTeam(userTeam, playerId);
        if (!player) continue;

        const pos = player.pos || 'RB';
        if (!teamNeedsPosition(t, pos)) continue;

        const playerVal = calcPlayerTradeValue(player, leagueYear);

        // CPU gives something, user gives the block player
        let cpuOfferAssets = [];
        const userReturnAssets = [{ kind: 'player', playerId: playerId }];

        const cpuOfferPick = pickCpuTradeAssetForValue(cpuTeam, playerVal, leagueYear);
        if (cpuOfferPick) {
          cpuOfferAssets = [cpuOfferPick];
        } else {
          const cpuOfferPlayer = pickCpuPlayerForValue(cpuTeam, playerVal, leagueYear);
          if (!cpuOfferPlayer) continue;
          cpuOfferAssets = [{ kind: 'player', playerId: cpuOfferPlayer.id }];
        }

        let evalResult = evaluateTrade(L, t, userTeamId, cpuOfferAssets, userReturnAssets);
        if (!evalResult) continue;

        let cpuDelta = evalResult.fromValue.delta; // "from" is CPU in this call

        // Slightly unfavorable? Try adding a cheap sweetener pick.
        if (cpuDelta < -5 && cpuDelta > -20) {
          const sweetener = pickCpuTradeAssetForValue(cpuTeam, 10, leagueYear); // low value late pick
          if (sweetener) {
            cpuOfferAssets.push(sweetener);
            evalResult = evaluateTrade(L, t, userTeamId, cpuOfferAssets, userReturnAssets);
            cpuDelta = evalResult.fromValue.delta;
          }
        }

        // CPU only sends the offer if it's not a big loss for them
        if (cpuDelta < -5) continue;

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
    const picks = team && team.picks ? team.picks : [];
    if (!picks.length) return null;

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
    const roster = team && team.roster ? team.roster : [];
    if (!roster.length) return null;

    const valued = roster
      .map(p => ({
        player: p,
        value: calcPlayerTradeValue(p, leagueYear)
      }))
      .filter(v => v.value > 0);

    if (!valued.length) return null;

    valued.sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));
    return valued[0].player;
  }

  // --- MANUAL TRADE SYSTEM (user-initiated trades) ------------------

  /**
   * Decide if a CPU team accepts a trade offered by the user.
   * - userTeamId: user's team
   * - cpuTeamId:  CPU team you're trading with
   * - userAssets: assets user is giving
   * - cpuAssets:  assets CPU is giving
   *
   * options:
   *   { cpuLossLimit: number } // minimum delta CPU is willing to accept (default -15)
   *
   * Returns: { accepted: boolean, eval }
   */
  function proposeUserTradeInternal(league, userTeamId, cpuTeamId, userAssets, cpuAssets, options) {
    const L = league;
    if (!L || !L.teams) {
      return { accepted: false, eval: null };
    }

    const evalResult = evaluateTrade(L, userTeamId, cpuTeamId, userAssets, cpuAssets);
    if (!evalResult) {
      return { accepted: false, eval: null };
    }

    const cpuValue = evalResult.toValue; // toTeam = CPU
    const cpuDelta = cpuValue.delta;

    const cpuLossLimit = (options && typeof options.cpuLossLimit === 'number')
      ? options.cpuLossLimit
      : -15; // CPU won't accept worse than -15 for itself

    const accepted = cpuDelta >= cpuLossLimit;

    if (accepted) {
      applyTrade(L, userTeamId, cpuTeamId, userAssets, cpuAssets);
    }

    return { accepted, eval: evalResult };
  }

  // Small helpers to construct asset objects in UI code
  function assetPlayer(playerId) {
    return { kind: 'player', playerId: playerId };
  }

  function assetPick(year, round) {
    return { kind: 'pick', year: year, round: round };
  }

  // --- Expose API on window ----------------------------------------

  global.evaluateTrade = function (fromTeamId, toTeamId, fromAssets, toAssets) {
    if (!global.state || !global.state.league) return null;
    return evaluateTrade(global.state.league, fromTeamId, toTeamId, fromAssets, toAssets);
  };

  global.applyTrade = function (fromTeamId, toTeamId, fromAssets, toAssets) {
    if (!global.state || !global.state.league) return false;
    return applyTrade(global.state.league, fromTeamId, toTeamId, fromAssets, toAssets);
  };

  global.addToTradeBlock = function (teamId, playerId) {
    if (!global.state || !global.state.league) return false;
    return addToTradeBlock(global.state.league, teamId, playerId);
  };

  global.removeFromTradeBlock = function (teamId, playerId) {
    if (!global.state || !global.state.league) return false;
    return removeFromTradeBlock(global.state.league, teamId, playerId);
  };

  global.getTeamTradeBlock = function (teamId) {
    if (!global.state || !global.state.league) return [];
    return getTeamTradeBlock(global.state.league, teamId);
  };

  global.generateCpuTradeOffers = function (userTeamId, maxOffers) {
    if (!global.state || !global.state.league) return [];
    return generateCpuTradeOffers(global.state.league, userTeamId, maxOffers);
  };

  // Manual trade from the UI: user -> CPU
  global.proposeUserTrade = function (cpuTeamId, userAssets, cpuAssets, options) {
    if (!global.state || !global.state.league) {
      return { accepted: false, eval: null };
    }
    const userTeamId = global.state.userTeamId || 0;
    return proposeUserTradeInternal(global.state.league, userTeamId, cpuTeamId, userAssets, cpuAssets, options);
  };

  // Asset helpers for your UI
  global.assetPlayer = assetPlayer;
  global.assetPick = assetPick;

  console.log('✅ Trade system (manual + CPU) loaded');

})(window);