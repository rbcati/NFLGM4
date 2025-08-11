// schedule.js
(function () {
  'use strict';

  // Public API
  var Scheduler = {
    makeAccurateSchedule: makeAccurateSchedule,
    computeLastDivisionRanks: computeLastDivisionRanks
  };
  window.Scheduler = Scheduler;

  // ---------- Small helpers ----------
  function pct(rec){ var w=(rec&&rec.w)|0,l=(rec&&rec.l)|0,t=(rec&&rec.t)|0; var g=w+l+t; return g? (w+0.5*t)/g : 0; }
  function shuffle(a){ for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)); var t=a[i]; a[i]=a[j]; a[j]=t;} }
  function byConfDiv(league){
    var by={0:[[],[],[],[]],1:[[],[],[],[]]};
    league.teams.forEach(function(t,i){ by[t.conf][t.div].push(i); });
    return by;
  }
  function computeLastDivisionRanks(league){
    var ranks = Array(league.teams.length).fill(0);
    for (var c=0;c<2;c++){
      for (var d=0;d<4;d++){
        var idxs = league.teams.map(function(t,i){return {i:i,t:t};})
          .filter(function(x){return x.t.conf===c && x.t.div===d;});
        idxs.sort(function(a,b){
          var pa=pct(a.t.record), pb=pct(b.t.record);
          if (pa!==pb) return pb-pa;
          var pda=a.t.record.pf-a.t.record.pa, pdb=b.t.record.pf-b.t.record.pa;
          if (pda!==pdb) return pdb-pda;
          return (b.t.rating||0)-(a.t.rating||0);
        });
        idxs.forEach(function(x,rank){ ranks[x.i]=rank; });
      }
    }
    return ranks;
  }

  // 4x4 host grid to balance 2H/2A blocks
  var GRID = [
    [1,0,1,0],
    [0,1,0,1],
    [1,0,1,0],
    [0,1,0,1],
  ];
  function hostByGrid(i,j,flip){ var bit = GRID[i][j]; return flip ? (1-bit) : bit; }

  // 8-year rotations
  var INTER_ROT_8 = { 0:[0,1,2,3,0,1,2,3], 1:[1,2,3,0,1,2,3,0], 2:[2,3,0,1,2,3,0,1], 3:[3,0,1,2,3,0,1,2] };
  var INTRA_ROT_8 = { 0:[1,2,3,1,2,3,1,2], 1:[2,3,0,2,3,0,2,3], 2:[3,0,1,3,0,1,3,0], 3:[0,1,2,0,1,2,0,1] };

  // ---------- Build 17-game slate ----------
  function buildGames(league){
    var year = league.year || (2025 + ((league.season||1)-1));
    var seasonNum = league.season || 1;
    var by = byConfDiv(league);
    var lastRanks = computeLastDivisionRanks(league);
    var y8 = (year - 2025) % 8;
    var seventeenthHostConf = (year % 2 === 1) ? 0 : 1; // AFC hosts odd years

    var games = [];
    var seen = new Set(); // prevent dupes in cross blocks

    function addGame(home, away){
      var key = home+'@'+away;
      if (seen.has(key)) return;
      seen.add(key);
      games.push({home:home, away:away});
    }

    // 1) Division H/A (6 each)
    for (var c=0;c<2;c++){
      for (var d=0;d<4;d++){
        var T = by[c][d];
        for (var i=0;i<4;i++){
          for (var j=i+1;j<4;j++){
            var a=T[i], b=T[j];
            games.push({home:a, away:b});
            games.push({home:b, away:a});
          }
        }
      }
    }

    // Flip flags
    var intraFlip = (Math.floor((seasonNum-1)/3)%2) ? 1 : 0;
    var interFlip = (Math.floor((seasonNum-1)/4)%2) ? 1 : 0;

    // 2) Intra-conf 4 vs rotated div (2H/2A)
    for (c=0;c<2;c++){
      for (d=0;d<4;d++){
        var tgt = INTRA_ROT_8[d][y8];
        var A = by[c][d], B = by[c][tgt];
        for (i=0;i<4;i++){
          for (j=0;j<4;j++){
            var a=A[i], b=B[j];
            var hosts = hostByGrid(i,j,!!intraFlip);
            addGame(hosts? a : b, hosts? b : a);
          }
        }
      }
    }

    // 3) Inter-conf 4 vs rotated div (2H/2A)
    for (c=0;c<2;c++){
      var oc = c===0?1:0;
      for (d=0;d<4;d++){
        tgt = INTER_ROT_8[d][y8];
        A = by[c][d]; B = by[oc][tgt];
        for (i=0;i<4;i++){
          for (j=0;j<4;j++){
            a=A[i]; b=B[j];
            hosts = hostByGrid(i,j,!!interFlip);
            addGame(hosts? a : b, hosts? b : a);
          }
        }
      }
    }

    // helper
    function samePlace(conf, div, rank){
      var idxs = by[conf][div].slice().sort(function(x,y){ return lastRanks[x]-lastRanks[y]; });
      return idxs[Math.min(rank, idxs.length-1)];
    }

    // 4) Two intra-conf same-place
    for (c=0;c<2;c++){
      for (d=0;d<4;d++){
        var Adiv = by[c][d];
        var intraTgt = INTRA_ROT_8[d][y8];
        var otherDivs = [0,1,2,3].filter(function(x){return x!==d && x!==intraTgt;});
        for (i=0;i<Adiv.length;i++){
          var t = Adiv[i];
          var r = lastRanks[t];
          for (var k=0;k<otherDivs.length;k++){
            var od = otherDivs[k];
            var opp = samePlace(c, od, r);
            if (t===opp) continue;
            var home = ((year + k + r) % 2 === 0) ? t : opp;
            addGame(home, home===t? opp : t);
          }
        }
      }
    }

    // 5) 17th cross-conf same-place
    for (c=0;c<2;c++){
      oc = c===0?1:0;
      for (d=0;d<4;d++){
        Adiv = by[c][d];
        var nextDiv = INTER_ROT_8[d][(y8+1)%8];
        for (i=0;i<Adiv.length;i++){
          t = Adiv[i];
          r = lastRanks[t];
          opp = samePlace(oc, nextDiv, r);
          if (t===opp) continue;
          home = (league.teams[t].conf === seventeenthHostConf) ? t : opp;
          addGame(home, home===t? opp : t);
        }
      }
    }

    return games; // expect 272
  }

  // ---------- Byes weeks 6..14 ----------
  function makeByes(teamCount){
    var quotas=[4,4,4,4,4,4,4,2,2]; // sum 32
    var weeks=Array(18).fill(null);
    var pool=Array.from({length:teamCount},function(_,i){return i;});
    shuffle(pool);
    var p=0;
    for (var k=0;k<quotas.length;k++){
      var w=5+k; // 5..13
      var set=new Set();
      for (var c=0;c<quotas[k];c++){ set.add(pool[p++]); }
      weeks[w]=set;
    }
    return weeks;
  }

  // ---------- Robust placement with restarts ----------
  function placeWithCSP(games, teamCount, byes, restarts){
    var W=18;
    function domainsFor(g){
      var dom=[];
      for (var w=0;w<W;w++){
        if (byes && byes[w] && (byes[w].has(g.home) || byes[w].has(g.away))) continue;
        dom.push(w);
      }
      return dom;
    }
    for (var attempt=0; attempt<restarts; attempt++){
      var weeks=Array.from({length:W},function(){return[];});
      var has=Array.from({length:W},function(){return Array(teamCount).fill(false);});
      var doms=games.map(domainsFor);
      var order=games.map(function(_,i){return i;});
      order.sort(function(a,b){
        var da=doms[a].length, db=doms[b].length;
        if (da!==db) return da-db;
        return Math.random()<0.5? -1: 1;
      });

      var ok=true;
      for (var i=0;i<order.length;i++){
        var gi=order[i], g=games[gi];
        var opts=[];
        for (var di=0; di<doms[gi].length; di++){
          var w=doms[gi][di];
          if (!has[w][g.home] && !has[w][g.away]) opts.push(w);
        }
        if (!opts.length){ ok=false; break; }
        // least loaded week
        var best=opts[0], load=weeks[best].length;
        for (var u=1; u<opts.length; u++){
          var ww=opts[u], ld=weeks[ww].length;
          if (ld<load){ load=ld; best=ww; }
        }
        weeks[best].push(g);
        has[best][g.home]=true; has[best][g.away]=true;
        // prune same-week from neighbors sharing teams
        for (var j=i+1;j<order.length;j++){
          var gj=order[j], og=games[gj], d=doms[gj];
          if (og.home===g.home || og.away===g.home || og.home===g.away || og.away===g.away){
            var idx=d.indexOf(best); if (idx>=0) d.splice(idx,1);
          }
        }
      }
      if (!ok) continue;

      if (byes){
        for (var w=0; w<W; w++){ if (byes[w]) byes[w].forEach(function(t){ weeks[w].push({bye:t}); }); }
        return {ok:true, weeks:weeks};
      } else {
        // infer bye: week with no game for each team
        var played=Array.from({length:W},function(){return Array(teamCount).fill(false);});
        for (w=0; w<W; w++){
          weeks[w].forEach(function(x){ if (x.bye===undefined){ played[w][x.home]=true; played[w][x.away]=true; } });
        }
        for (var t=0;t<teamCount;t++){
          var byeW=-1;
          for (w=0;w<W;w++){ if (!played[w][t]){ byeW=w; break; } }
          if (byeW>=0) weeks[byeW].push({bye:t});
        }
        return {ok:true, weeks:weeks};
      }
    }
    return {ok:false};
  }
// Add logging before line 264 in schedule.js
console.log('Schedule constraints:', {
    teams: teams.length,
    weeks: numWeeks,
    gamesPerWeek: gamesPerWeek,
    // Log other relevant constraints
});
  // ---------- Public entry ----------
  function makeAccurateSchedule(league){
    var games = buildGames(league);
    var n = league.teams.length;

    for (var tries=0; tries<8; tries++){
      var byes = makeByes(n);
      var placed = placeWithCSP(games, n, byes, 200);
      if (placed.ok) return placed.weeks;
    }
    var fallback = placeWithCSP(games, n, null, 400);
    if (fallback.ok) return fallback.weeks;

    throw new Error('Scheduler failed after multiple restarts');
  }

})();
