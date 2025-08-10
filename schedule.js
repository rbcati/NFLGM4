// schedule.js
(function () {
  'use strict';

  // Public surface
  var Scheduler = {
    makeAccurateSchedule: makeAccurateSchedule,
    computeLastDivisionRanks: computeLastDivisionRanks
  };
  window.Scheduler = Scheduler;

  // ---------- Helpers (no external deps) ----------
  function pct(rec) {
    var w = (rec && rec.w)|0, l = (rec && rec.l)|0, t = (rec && rec.t)|0;
    var g = w + l + t;
    return g ? (w + 0.5*t) / g : 0;
  }
  function shuffle(arr){
    for (var i=arr.length-1;i>0;i--){
      var j = Math.floor(Math.random()*(i+1));
      var tmp = arr[i]; arr[i]=arr[j]; arr[j]=tmp;
    }
  }
  function divTeamsByConf(league){
    var by = {0:[[],[],[],[]], 1:[[],[],[],[]]};
    league.teams.forEach(function(t,i){ by[t.conf][t.div].push(i); });
    return by;
  }
  function computeLastDivisionRanks(league){
    var ranks = Array(league.teams.length).fill(0);
    for (var conf=0; conf<2; conf++){
      for (var dv=0; dv<4; dv++){
        var idxs = league.teams.map(function(t,i){return {i:i,t:t};})
          .filter(function(x){return x.t.conf===conf && x.t.div===dv;});
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

  // Host grid for 2H/2A balancing inside 4x4 blocks
  var HOST_GRID_CANON = [
    [1,0,1,0],
    [0,1,0,1],
    [1,0,1,0],
    [0,1,0,1],
  ];
  function hostByGrid(aIndex, bIndex, flip){
    var bit = HOST_GRID_CANON[aIndex][bIndex];
    return flip ? (1-bit) : bit;
  }

  // 8-year inter-conference rotation
  var INTER_ROT_8 = {
    0: [0,1,2,3, 0,1,2,3], // East
    1: [1,2,3,0, 1,2,3,0], // North
    2: [2,3,0,1, 2,3,0,1], // South
    3: [3,0,1,2, 3,0,1,2], // West
  };
  // 3-year intra-conference rotation embedded over 8 years (1,2,3,1,2,3,1,2)
  var INTRA_ROT_8 = {
    0: [1,2,3, 1,2,3, 1,2],
    1: [2,3,0, 2,3,0, 2,3],
    2: [3,0,1, 3,0,1, 3,0],
    3: [0,1,2, 0,1,2, 0,1],
  };

  // ---------- Game slate builder ----------
  function buildGames(league){
    var year = league.year || (2025 + ((league.season||1)-1));
    var seasonNum = league.season || 1;
    var by = divTeamsByConf(league);
    var lastRanks = computeLastDivisionRanks(league);
    var y8 = (year - 2025) % 8;
    var seventeenthHostConf = (year % 2 === 1) ? 0 : 1; // AFC hosts odd seasons

    var games = [];
    var seenOnce = new Set();

    function addGame(home, away){
      // allow two divisional games per pair, but avoid duplicates in cross blocks
      var k = home+'@'+away;
      if (seenOnce.has(k)) return;
      seenOnce.add(k);
      games.push({home:home, away:away});
    }

    // 1) Division home-and-away (6 each)
    for (var conf=0; conf<2; conf++){
      for (var dv=0; dv<4; dv++){
        var teams = by[conf][dv].slice();
        for (var i=0; i<teams.length; i++){
          for (var j=i+1; j<teams.length; j++){
            var a = teams[i], b = teams[j];
            games.push({home:a, away:b});
            games.push({home:b, away:a});
          }
        }
      }
    }

    // Host parity flags (flip across cycles)
    var intraHostFlip = (Math.floor((seasonNum-1)/3) % 2) ? 1 : 0;
    var interHostFlip = (Math.floor((seasonNum-1)/4) % 2) ? 1 : 0;

    // 2) Intra-conference 4-game set vs rotated division (2H/2A)
    for (conf=0; conf<2; conf++){
      for (dv=0; dv<4; dv++){
        var targetDiv = INTRA_ROT_8[dv][y8];
        var A = by[conf][dv], B = by[conf][targetDiv];
        for (i=0; i<4; i++){
          for (j=0; j<4; j++){
            var aIdx = A[i], bIdx = B[j];
            var hosts = hostByGrid(i, j, !!intraHostFlip);
            var home = hosts ? aIdx : bIdx;
            var away = hosts ? bIdx : aIdx;
            addGame(home, away);
          }
        }
      }
    }

    // 3) Inter-conference 4-game set vs rotated opposite division (2H/2A)
    for (conf=0; conf<2; conf++){
      var other = conf===0 ? 1 : 0;
      for (dv=0; dv<4; dv++){
        targetDiv = INTER_ROT_8[dv][y8];
        A = by[conf][dv]; B = by[other][targetDiv];
        for (i=0; i<4; i++){
          for (j=0; j<4; j++){
            aIdx = A[i]; bIdx = B[j];
            hosts = hostByGrid(i, j, !!interHostFlip);
            home = hosts ? aIdx : bIdx;
            away = hosts ? bIdx : aIdx;
            addGame(home, away);
          }
        }
      }
    }

    // Helper: same-place pick
    function samePlaceTeam(confX, divX, rank){
      var idxs = by[confX][divX].slice().sort(function(x,y){ return lastRanks[x]-lastRanks[y]; });
      return idxs[Math.min(rank, idxs.length-1)];
    }

    // 4) Two intra-conference same-place games vs the two divisions not in the 4-game intra set
    for (conf=0; conf<2; conf++){
      for (dv=0; dv<4; dv++){
        A
