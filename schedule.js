<!-- schedule.js -->
<script>
(function (global) {
  'use strict';

  function pct(rec){ var w=+rec.w||0, l=+rec.l||0, t=+rec.t||0; var g=w+l+t; return g? (w+0.5*t)/g : 0; }

  var HOST_GRID_CANON = [
    [1,0,1,0],
    [0,1,0,1],
    [1,0,1,0],
    [0,1,0,1]
  ];
  function hostByGrid(aIndex, bIndex, flip){
    var bit = HOST_GRID_CANON[aIndex][bIndex];
    var h = flip ? (1-bit) : bit;
    return h === 1;
  }
  var INTER_ROT_8 = { 0:[0,1,2,3, 0,1,2,3], 1:[1,2,3,0, 1,2,3,0], 2:[2,3,0,1, 2,3,0,1], 3:[3,0,1,2, 3,0,1,2] };
  var INTRA_ROT_8  = { 0:[1,2,3, 1,2,3, 1,2], 1:[2,3,0, 2,3,0, 2,3], 2:[3,0,1, 3,0,1, 3,0], 3:[0,1,2, 0,1,2, 0,1] };

  function divisionTeamsByConf(league){
    var by = {0:[[],[],[],[]], 1:[[],[],[],[]]};
    league.teams.forEach(function(t,i){ by[t.conf][t.div].push(i); });
    return by;
  }

  function computeLastDivisionRanks(league){
    var ranks = Array(league.teams.length).fill(0);
    for (var conf=0; conf<2; conf++){
      for (var dv=0; dv<4; dv++){
        var idxs = league.teams.map(function(t,i){return {i:i,t:t};}).filter(function(x){return x.t.conf===conf && x.t.div===dv;});
        idxs.sort(function(a,b){
          var pa = pct(a.t.record), pb = pct(b.t.record);
          if (pa!==pb) return pb - pa;
          var pda = a.t.record.pf - a.t.record.pa;
          var pdb = b.t.record.pf - b.t.record.pa;
          if (pda!==pdb) return pdb - pda;
          return (b.t.rating||0) - (a.t.rating||0);
        });
        idxs.forEach(function(x,rank){ ranks[x.i] = rank; });
      }
    }
    return ranks;
  }

  // Robust scheduler: place games, swap if blocked, then mark byes from empty weeks
  function makeAccurateSchedule(league){
    var year = league.year || (2025 + ((league.season||1)-1));
    var by = divisionTeamsByConf(league);
    var lastRanks = computeLastDivisionRanks(league);
    var y8 = (year - 2025) % 8;
    var seventeenthHostConf = (year % 2 === 1) ? 0 : 1;

    var games = [];
    var seen = new Set();
    function addUnique(h,a){
      var k = h < a ? (h+'-'+a) : (a+'-'+h);
      if (seen.has(k)) return;
      seen.add(k);
      games.push({home:h, away:a});
    }

    // 1) Divisional home and away
    for (var conf=0; conf<2; conf++){
      for (var dv=0; dv<4; dv++){
        var tms = by[conf][dv];
        for (var i=0;i<tms.length;i++){
          for (var j=i+1;j<tms.length;j++){
            var a=tms[i], b=tms[j];
            games.push({home:a, away:b});
            games.push({home:b, away:a});
            seen.add((Math.min(a,b))+"-"+(Math.max(a,b)));
          }
        }
      }
    }

    var y0 = year - 2025;
    var intraFlip = (Math.floor(y0/3) % 2) ? 1 : 0;
    var interFlip = (Math.floor(y0/4) % 2) ? 1 : 0;

    // 2) Intra conference rotation
    for (var c2=0;c2<2;c2++){
      for (var d2=0;d2<4;d2++){
        var tgt = INTRA_ROT_8[d2][y8];
        var A = by[c2][d2], B = by[c2][tgt];
        for (var i2=0;i2<4;i2++){
          for (var j2=0;j2<4;j2++){
            var a2=A[i2], b2=B[j2];
            var host = hostByGrid(i2,j2,!!intraFlip);
            addUnique(host?a2:b2, host?b2:a2);
          }
        }
      }
    }

    // 3) Inter conference rotation
    for (var c3=0;c3<2;c3++){
      var other = c3===0?1:0;
      for (var d3=0;d3<4;d3++){
        var td = INTER_ROT_8[d3][y8];
        var A3 = by[c3][d3], B3 = by[other][td];
        for (var i3=0;i3<4;i3++){
          for (var j3=0;j3<4;j3++){
            var a3=A3[i3], b3=B3[j3];
            var host2 = hostByGrid(i3,j3,!!interFlip);
            addUnique(host2?a3:b3, host2?b3:a3);
          }
        }
      }
    }

    function samePlaceTeam(confX, divX, rank){
      var idxs = by[confX][divX].slice().sort(function(x,y){ return lastRanks[x]-lastRanks[y]; });
      return idxs[Math.min(rank, idxs.length-1)];
    }

    // 4) Two same place intra-conference
    for (var c4=0;c4<2;c4++){
      for (var d4=0;d4<4;d4++){
        var A4 = by[c4][d4];
        var skip = INTRA_ROT_8[d4][y8];
        var otherDivs = [0,1,2,3].filter(function(x){return x!==d4 && x!==skip;});
        for (var tIdx=0;tIdx<A4.length;tIdx++){
          var t = A4[tIdx];
          var r = lastRanks[t];
          for (var k=0;k<otherDivs.length;k++){
            var od = otherDivs[k];
            var opp = samePlaceTeam(c4, od, r);
            if (t===opp) continue;
            var home = ((year + k + r) % 2 === 0) ? t : opp;
            addUnique(home, home===t?opp:t);
          }
        }
      }
    }

    // 5) Seventeenth same-place cross-conference
    for (var c5=0;c5<2;c5++){
      var oc = c5===0?1:0;
      for (var d5=0;d5<4;d5++){
        var A5 = by[c5][d5];
        var nextDiv = INTER_ROT_8[d5][(y8+1)%8];
        for (var ti=0; ti<A5.length; ti++){
          var t2 = A5[ti];
          var r2 = lastRanks[t2];
          var opp2 = samePlaceTeam(oc, nextDiv, r2);
          if (t2===opp2) continue;
          var home2 = (league.teams[t2].conf === seventeenthHostConf) ? t2 : opp2;
          addUnique(home2, home2===t2?opp2:t2);
        }
      }
    }

    // Placement with swap fallback
    for (var gi=games.length-1; gi>0; gi--){
      var j = Math.floor(Math.random()*(gi+1));
      var tmp = games[gi]; games[gi]=games[j]; games[j]=tmp;
    }
    var N = league.teams.length;
    var weeks = Array.apply(null, Array(18)).map(function(){return [];});
    var hasGame = Array.apply(null, Array(18)).map(function(){ return Array(N).fill(false); });

    function canPlace(w,g){ return !(hasGame[w][g.home] || hasGame[w][g.away]); }

    function trySwapPlace(g){
      for (var w=0; w<18; w++){
        if (canPlace(w,g)){ weeks[w].push(g); hasGame[w][g.home]=true; hasGame[w][g.away]=true; return true; }
      }
      // one-hop swap
      for (var w1=0; w1<18; w1++){
        for (var idx=0; idx<weeks[w1].length; idx++){
          var g2 = weeks[w1][idx];
          for (var w2=0; w2<18; w2++){
            if (w2===w1) continue;
            if (!canPlace(w2,g2)) continue;
            // move g2
            weeks[w2].push(g2);
            hasGame[w2][g2.home]=true; hasGame[w2][g2.away]=true;
            weeks[w1].splice(idx,1);
            hasGame[w1][g2.home]=false; hasGame[w1][g2.away]=false;
            // place g
            if (canPlace(w1,g)){
              weeks[w1].push(g);
              hasGame[w1][g.home]=true; hasGame[w1][g.away]=true;
              return true;
            }
          }
        }
      }
      return false;
    }

    for (var x=0; x<games.length; x++){
      var g = games[x], placed=false;
      for (var w=0; w<18; w++){
        if (canPlace(w,g)){
          weeks[w].push(g); hasGame[w][g.home]=true; hasGame[w][g.away]=true; placed=true; break;
        }
      }
      if (!placed && !trySwapPlace(g)) throw new Error("Scheduler fallback failed for "+g.home+" vs "+g.away);
    }

    // Emit bye markers from empty-team weeks
    for (var w3=0; w3<18; w3++){
      var played = Array(N).fill(false);
      for (var ii=0; ii<weeks[w3].length; ii++){
        var gg = weeks[w3][ii];
        if (gg.bye!==undefined) continue;
        played[gg.home]=true; played[gg.away]=true;
      }
      for (var t=0; t<N; t++){ if (!played[t]) weeks[w3].push({bye:t}); }
    }
    return weeks;
  }

  // Optional export if you ever want to force fixed bye windows again
  function assignByes(teamCount){
    var quotas = [4,4,4,4,4,4,4,2,2]; // weeks 6..14
    var weeks = Array(18).fill(null);
    var sum = quotas.reduce(function(s,x){return s+x;},0);
    if (sum !== teamCount) throw new Error("assignByes quotas sum mismatch");
    var pool = Array.apply(null, Array(teamCount)).map(function(_,i){return i;});
    for (var i=pool.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=pool[i]; pool[i]=pool[j]; pool[j]=t; }
    var p=0;
    for (var k=0;k<quotas.length;k++){
      var w = 5 + k;
      var set = new Set();
      for (var c=0;c<quotas[k] && p<pool.length;c++) set.add(pool[p++]);
      weeks[w]=set;
    }
    return weeks;
  }

  global.Scheduler = { makeAccurateSchedule: makeAccurateSchedule, assignByes: assignByes, computeLastDivisionRanks: computeLastDivisionRanks };
})(window);
</script>
