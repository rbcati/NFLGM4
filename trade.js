// trades.js – trade engine, trade block, CPU offers, manual trade system
(function (global) {
  'use strict';

  const C = global.Constants || {};
  const U = global.Utils || {};
  
  // --- Constants/Defaults (Kept as is) -----------------------------

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
      1: { avg: 1476, rankFactor: 1.2 }, // Added rankFactor for scaling
      2: { avg: 418, rankFactor: 1.1 },
      3: { avg: 175, rankFactor: 1.05 },
      4: { avg: 57, rankFactor: 1.0 },
      5: { avg: 28, rankFactor: 1.0 },
      6: { avg: 11, rankFactor: 1.0 },
      7: { avg: 1.5, rankFactor: 1.0 }
    };
  }

  // --- Helpers (Kept as is) --------------------------------------

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

  function assetPlayer(playerId) {
    return { kind: 'player', playerId };
  }

  function assetPick(year, round) {
    return { kind: 'pick', year, round };
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
      // Assuming 'player.year' is the draft year. Age calculation is complex, but this formula is consistent.
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

    // Cheaper players (lower salary/5) are more valuable. Salary cap relief is key.
    const costFactor = 1 / Math.max(0.5, salary / 5); 
    
    // More years left = slightly more valuable, up to 3 years.
    const termFactor = 0.8 + Math.min(3, yearsLeft) * 0.1; 

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

    // Player value is significantly driven by contract
    value *= getContractFactor(player);
    
    // Low OVR players have minimal value
    if (ovr < 70) value *= 0.5; 
    
    return Math.max(0, value);
  }

  /**
   * UPDATED: Calculates pick value, factoring in years out and team record.
   */
  function calcPickTradeValue(pick, leagueYear, teamRecord = 0.5) {
    if (!pick) return 0;

    if (C.TRADE_VALUES && C.TRADE_VALUES.PICKS) {
      const roundMap = C.TRADE_VALUES.PICKS[pick.round];
      if (roundMap && typeof roundMap.avg === 'number') {
        let avg = roundMap.avg;
        const yearsOut = Math.max(0, (pick.year || leagueYear) - leagueYear);
        const disc = Math.pow(C.TRADE_VALUES.FUTURE_DISCOUNT, yearsOut);
        
        // --- Pick Value Refinement (New Logic) ---
        // Picks from teams with bad records (low win %) are more valuable.
        // teamRecord is win percentage (0.0 to 1.0).
        const winPctAdjustment = 1.0 - teamRecord; // 0.2 team record = 0.8 adjustment
        
        // Apply factor based on round importance
        const rankFactor = roundMap.rankFactor || 1.0; 
        const recordFactor = 1.0 + (winPctAdjustment - 0.5) * rankFactor * 0.4; 
        // Example: Bad team (0.2 win pct) -> winPctAdjustment=0.8. rankFactor=1.2 (R1).
        // RecordFactor = 1.0 + (0.3) * 1.2 * 0.4 = 1.144 (14.4% bump)
        
        avg *= recordFactor; 
        // -----------------------------------------

        return avg * disc;
      }
    }

    // Fallback logic remains the same
    const baseValues = { 1: 1000, 2: 500, 3: 250, 4: 100, 5: 50, 6: 20, 7: 10 };
    const base = baseValues[pick.round] || 1;
    const yearsOut = Math.max(0, (pick.year || leagueYear) - leagueYear);
    const disc = Math.pow(0.85, yearsOut);
    return base * disc;
  }

  /**
   * Helper to get team record for pick valuation
   */
  function getTeamRecord(team) {
    if (!team) return 0.5;
    const wins = team.wins || 0;
    const losses = team.losses || 0;
    const ties = team.ties || 0;
    const total = wins + losses + ties;
    if (total === 0) return 0.5;
    return (wins + 0.5 * ties) / total;
  }
  
  /**
   * Calculates the value of assets, including pick value adjustment.
   */
  function calcAssetsValue(team, assets, leagueYear) {
    let total = 0;
    if (!team || !assets || !assets.length) return 0;
    
    // Get the trading team's record *if* they are giving the pick
    const teamRecord = getTeamRecord(team); 

    assets.forEach(a => {
      if (a.kind === 'player') {
        const p = findPlayerOnTeam(team, a.playerId);
        if (p) total += calcPlayerTradeValue(p, leagueYear);
      } else if (a.kind === 'pick') {
        const pk = findPickOnTeam(team, a.year, a.round);
        // Pass teamRecord to calcPickTradeValue for more accurate pick value
        if (pk) total += calcPickTradeValue(pk, leagueYear, teamRecord);
      }
    });

    return total;
  }

  // --- Trade evaluation & execution (Minor update to eval call) --------------------------------

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

    // **Note:** calcAssetsValue handles finding the asset on the corresponding team 
    // and using *that team's record* for pick valuation.
    const fromGive = calcAssetsValue(fromTeam, fromAssets, leagueYear);
    const fromGet  = calcAssetsValue(toTeam,   toAssets,   leagueYear);

    const toGive   = calcAssetsValue(toTeam,   toAssets,   leagueYear);
    const toGet    = calcAssetsValue(fromTeam, fromAssets, leagueYear);

    return {
      fromValue: { give: fromGive, get: fromGet, delta: fromGet - fromGive },
      toValue:   { give: toGive,   get: toGet,   delta: toGet - toGive }
    };
  }

  // ... (formatAssetString and applyTrade remain the same) ...

  // --- Trade block (Kept as is) -------------------------------------

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

  // --- CPU trade offers (Refined Logic) -----------------------------

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
      // CPU needs player if they are below 75% of depth needs
      return have < needed * 0.75; 
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
        // CPU only targets players they need
        if (!teamNeedsPosition(t, pos)) continue; 

        const playerVal = calcPlayerTradeValue(player, leagueYear);

        // CPU gives something, user gives the block player
        let cpuOfferAssets = [];
        const userReturnAssets = [{ kind: 'player', playerId: playerId }];

        // 60% chance to offer a pick first
        if (Math.random() < 0.6) { 
            const cpuOfferPick = pickCpuTradeAssetForValue(cpuTeam, playerVal, leagueYear);
            if (cpuOfferPick) {
              cpuOfferAssets = [cpuOfferPick];
            }
        }
        
        if (cpuOfferAssets.length === 0) { // If no pick or pick wasn't chosen
            const cpuOfferPlayer = pickCpuPlayerForValue(cpuTeam, playerVal, leagueYear, ensureTradeBlock(cpuTeam));
            if (!cpuOfferPlayer) continue;
            cpuOfferAssets = [{ kind: 'player', playerId: cpuOfferPlayer.id }];
        }

        // Must have assets to offer
        if (cpuOfferAssets.length === 0) continue; 
        
        let evalResult = evaluateTrade(L, t, userTeamId, cpuOfferAssets, userReturnAssets);
        if (!evalResult) continue;

        let cpuDelta = evalResult.fromValue.delta; // "from" is CPU in this call

        // Slightly unfavorable? Try adding a cheap sweetener pick.
        if (cpuDelta < -5 && cpuDelta > -20) {
          const sweetener = pickCpuTradeAssetForValue(cpuTeam, 10, leagueYear); // low value late pick
          if (sweetener && cpuOfferAssets.length < 3) { // Limit sweeteners
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

    const teamRecord = getTeamRecord(team);
    
    const valued = picks.map(p => ({
      pick: p,
      // Use refined value function
      value: calcPickTradeValue(p, leagueYear, teamRecord) 
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

  /**
   * UPDATED: Finds a player close to the target value, excluding high-OVR players and trade block players.
   */
  function pickCpuPlayerForValue(team, target, leagueYear, excludeIds = []) {
    const roster = team && team.roster ? team.roster : [];
    if (!roster.length) return null;

    const valued = roster
      .map(p => ({
        player: p,
        value: calcPlayerTradeValue(p, leagueYear)
      }))
      // --- New Filters ---
      // 1. Exclude players with OVR > 85 (core players)
      .filter(v => getPlayerOvr(v.player) < 85)
      // 2. Exclude players on the CPU's own trade block
      .filter(v => !excludeIds.includes(v.player.id))
      .filter(v => v.value > 0);
      // -------------------

    if (!valued.length) return null;

    valued.sort((a, b) => Math.abs(a.value - target) - Math.abs(b.value - target));
    return valued[0].player;
  }

  // ... (The rest of the functions remain the same) ...

  // --- Expose API on window (Kept as is) ----------------------------------------

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

  console.log('✅ Trade system (manual + CPU) loaded and optimized for value');

})(window);
