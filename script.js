// NFL GM Simulator - fixed build
(function () {
  // Global error banner for quick diagnosis
  window.addEventListener('error', function(e){
    try{
      var div = document.createElement('div');
      div.style.cssText='position:fixed;left:0;right:0;top:0;z-index:9999;background:#3b0d0d;color:#fff;padding:8px 12px;font-family:system-ui;box-shadow:0 2px 6px rgba(0,0,0,.4)';
      div.textContent = 'JS error: ' + (e.message||'') + ' @ ' + (e.filename||'') + ':' + (e.lineno||'');
      document.body.appendChild(div);
    }catch(_){}
  });

  var YEAR_START = 2025;
  function $(sel){ return document.querySelector(sel); }
  function $$(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  var SAVE_KEY = "nflGM.league.contracts.picks";

  var state = { league: null, prospects: [], freeAgents: [], playoffs: null, namesMode: 'fictional', onboarded: false, pendingOffers: [] };

  var POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K"];
  var DEPTH_NEEDS = { QB:1, RB:1, WR:3, TE:1, OL:5, DL:4, LB:3, CB:2, S:2, K:1 };

  // helpers
  function clamp(x,a,b){ return Math.max(a, Math.min(b, x)); }
  function clampYear(y){
    y = parseInt(y, 10);
    if (!isFinite(y)) return YEAR_START;
    if (y < 1930) return 1930;
    if (y > 9999) return 9999;
    return y;
  }
  function rand(n,m){ return Math.floor(Math.random()*(m-n+1))+n; }
  function choice(a){ return a[Math.floor(Math.random()*a.length)]; }
  function id(){ return Math.random().toString(36).slice(2,10); }
  function avg(a){ return a.length? a.reduce(function(s,x){return s+x;},0)/a.length : 0; }
  function pct(rec){
    var w = Number(rec.w)||0, l = Number(rec.l)||0, t = Number(rec.t)||0;
    var g = w+l+t; return g? (w + 0.5*t)/g : 0;
  }

  // Official teams with abbreviations and accurate divisions
  // conf: 0 = AFC, 1 = NFC; div: 0 = East, 1 = North, 2 = South, 3 = West
  var TEAM_META_REAL = [
    // AFC East
    {abbr:"BUF", name:"Buffalo Bills", conf:0, div:0},
    {abbr:"MIA", name:"Miami Dolphins", conf:0, div:0},
    {abbr:"NE",  name:"New England Patriots", conf:0, div:0},
    {abbr:"NYJ", name:"New York Jets", conf:0, div:0},
    // AFC North
    {abbr:"BAL", name:"Baltimore Ravens", conf:0, div:1},
    {abbr:"CIN", name:"Cincinnati Bengals", conf:0, div:1},
    {abbr:"CLE", name:"Cleveland Browns", conf:0, div:1},
    {abbr:"PIT", name:"Pittsburgh Steelers", conf:0, div:1},
    // AFC South
    {abbr:"HOU", name:"Houston Texans", conf:0, div:2},
    {abbr:"IND", name:"Indianapolis Colts", conf:0, div:2},
    {abbr:"JAX", name:"Jacksonville Jaguars", conf:0, div:2},
    {abbr:"TEN", name:"Tennessee Titans", conf:0, div:2},
    // AFC West
    {abbr:"DEN", name:"Denver Broncos", conf:0, div:3},
    {abbr:"KC",  name:"Kansas City Chiefs", conf:0, div:3},
    {abbr:"LV",  name:"Las Vegas Raiders", conf:0, div:3},
    {abbr:"LAC", name:"Los Angeles Chargers", conf:0, div:3},
    // NFC East
    {abbr:"DAL", name:"Dallas Cowboys", conf:1, div:0},
    {abbr:"NYG", name:"New York Giants", conf:1, div:0},
    {abbr:"PHI", name:"Philadelphia Eagles", conf:1, div:0},
    {abbr:"WAS", name:"Washington Commanders", conf:1, div:0},
    // NFC North
    {abbr:"CHI", name:"Chicago Bears", conf:1, div:1},
    {abbr:"DET", name:"Detroit Lions", conf:1, div:1},
    {abbr:"GB",  name:"Green Bay Packers", conf:1, div:1},
    {abbr:"MIN", name:"Minnesota Vikings", conf:1, div:1},
    // NFC South
    {abbr:"ATL", name:"Atlanta Falcons", conf:1, div:2},
    {abbr:"CAR", name:"Carolina Panthers", conf:1, div:2},
    {abbr:"NO",  name:"New Orleans Saints", conf:1, div:2},
    {abbr:"TB",  name:"Tampa Bay Buccaneers", conf:1, div:2},
    // NFC West
    {abbr:"ARI", name:"Arizona Cardinals", conf:1, div:3},
    {abbr:"LAR", name:"Los Angeles Rams", conf:1, div:3},
    {abbr:"SF",  name:"San Francisco 49ers", conf:1, div:3},
    {abbr:"SEA", name:"Seattle Seahawks", conf:1, div:3}
  ];

  // Fictional teams (same length)
  var TEAM_META_FICTIONAL = [
    {abbr:"ARI",name:"Arizona Scorpions",conf:1,div:3},
    {abbr:"ATL",name:"Atlanta Flight",conf:1,div:2},
    {abbr:"BAL",name:"Baltimore Crabs",conf:0,div:1},
    {abbr:"BUF",name:"Buffalo Blizzard",conf:0,div:0},
    {abbr:"CAR",name:"Carolina Lynx",conf:1,div:2},
    {abbr:"CHI",name:"Chicago Hammers",conf:1,div:1},
    {abbr:"CIN",name:"Cincinnati Tigers",conf:0,div:1},
    {abbr:"CLE",name:"Cleveland Dawgs",conf:0,div:1},
    {abbr:"DAL",name:"Dallas Mustangs",conf:1,div:0},
    {abbr:"DEN",name:"Denver Peaks",conf:0,div:3},
    {abbr:"DET",name:"Detroit Motors",conf:1,div:1},
    {abbr:"GB", name:"Green Bay Wolves",conf:1,div:1},
    {abbr:"HOU",name:"Houston Comets",conf:0,div:2},
    {abbr:"IND",name:"Indianapolis Racers",conf:0,div:2},
    {abbr:"JAX",name:"Jacksonville Sharks",conf:0,div:2},
    {abbr:"KC", name:"Kansas City Kings",conf:0,div:3},
    {abbr:"LV", name:"Las Vegas Aces",conf:0,div:3},
    {abbr:"LAC",name:"Los Angeles Lightning",conf:0,div:3},
    {abbr:"LAR",name:"Los Angeles Guardians",conf:1,div:3},
    {abbr:"MIA",name:"Miami Surge",conf:0,div:0},
    {abbr:"MIN",name:"Minnesota North",conf:1,div:1},
    {abbr:"NE", name:"New England Minutemen",conf:0,div:0},
    {abbr:"NO", name:"New Orleans Spirits",conf:1,div:2},
    {abbr:"NYG",name:"New York Giants*",conf:1,div:0},
    {abbr:"NYJ",name:"New York Jets*",conf:0,div:0},
    {abbr:"PHI",name:"Philadelphia Liberty",conf:1,div:0},
    {abbr:"PIT",name:"Pittsburgh Iron",conf:0,div:1},
    {abbr:"SEA",name:"Seattle Orcas",conf:1,div:3},
    {abbr:"SF", name:"San Francisco Gold",conf:1,div:3},
    {abbr:"TB", name:"Tampa Bay Cannons",conf:1,div:2},
    {abbr:"TEN",name:"Tennessee Twang",conf:0,div:2},
    {abbr:"WAS",name:"Washington Sentinels",conf:1,div:0}
  ];

  var CONF_NAMES = ["AFC","NFC"];
  var DIV_NAMES = ["East","North","South","West"];

  var CAP_BASE = 220; // M
  var YEARS_OF_PICKS = 3;

  // Player factory with contract fields
  var FIRST=["James","Michael","Chris","Alex","Jordan","Tyler","Jacob","Ethan","Logan","Mason","Liam","Noah","Owen","Jaden","Austin","Evan","Blake","Wyatt","Carson","Aiden","Dylan","Hunter","Cole","Kai","Zion","Nico","Xavier","Trent","Shawn","Brett","Marcus","Isaiah","Jamal","Elijah","Cameron","Trevor","Devon","Shane","Aaron","Caleb","Nick","Matt","Jake","Josh","Troy"];
  var LAST=["Johnson","Smith","Williams","Brown","Jones","Miller","Davis","Garcia","Rodriguez","Wilson","Martinez","Anderson","Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lopez","Lee","Gonzalez","Harris","Clark","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Reed","Cook","Bell","Perez","Hill","Green"];

  function makePlayer(pos){
    var speed = clamp(rand(50, 95) + ((pos==="WR"||pos==="CB")?6:0) + ((pos==="OL"||pos==="DL")?-8:0), 40, 99);
    var strength = clamp(rand(50, 95) + ((pos==="OL"||pos==="DL")?6:0) + ((pos==="WR"||pos==="CB")?-8:0), 40, 99);
    var agility = clamp(rand(50, 95), 40, 99);
    var awareness = clamp(rand(40, 92), 30, 99);
    var ovr = clamp(Math.round((speed*0.25 + strength*0.25 + agility*0.2 + awareness*0.3)/1.15), 50, 99);
    var baseAnnual = Math.round(0.42*ovr*10)/10;
    var years = rand(1,4);
    var signingBonus = Math.round((baseAnnual * years * (0.25 + Math.random()*0.35))*10)/10;
    var guaranteedPct = 0.5;
    return {
      id: id(), name: choice(FIRST)+" "+choice(LAST), pos: pos, age: rand(21,34),
      speed: speed, strength: strength, agility: agility, awareness: awareness, ovr: ovr,
      years: years, yearsTotal: years, baseAnnual: baseAnnual, signingBonus: signingBonus, guaranteedPct: guaranteedPct,
      injuryWeeks: 0, fatigue: 0, abilities: []
    };
  }

  function tagAbilities(p){
    if (p.pos==="QB" && p.speed>=85 && p.agility>=85) p.abilities.push("Dual Threat");
    if (p.pos==="WR" && p.speed>=92) p.abilities.push("Deep Threat");
    if (p.pos==="RB" && p.strength>=92) p.abilities.push("Power Back");
    if (p.pos==="CB" && p.agility>=90 && p.awareness>=85) p.abilities.push("Ball Hawk");
    if (p.pos==="DL" && p.strength>=94) p.abilities.push("Run Stuffer");
    if (p.pos==="K" && p.awareness>=88) p.abilities.push("Clutch");
  }

  function prorationPerYear(p){ return p.signingBonus / p.yearsTotal; }
  function capHitFor(p, relSeason, leagueSeason){
    if (p.years <= 0) return 0;
    if (relSeason >= p.years) return 0;
    var base = p.baseAnnual;
    var pr = prorationPerYear(p);
    return Math.round((base + pr) * 10)/10;
  }
  function addDead(team, season, amount){
    team.deadCapBook[season] = Math.round(((team.deadCapBook[season]||0) + amount)*10)/10;
  }
  function recalcCap(league, team){
    var active = team.roster.reduce(function(s,p){ return s + capHitFor(p, 0, league.season); }, 0);
    var dead = team.deadCapBook[league.season] || 0;
    var capTotal = CAP_BASE + (team.capRollover||0);
    team.capTotal = Math.round(capTotal*10)/10;
    team.capUsed = Math.round((active + dead)*10)/10;
    team.deadCap = Math.round(dead*10)/10;
  }
  function releaseWithProration(league, team, p, isPostJune1){
    var pr = prorationPerYear(p);
    var yearsLeft = p.years;
    if (yearsLeft <= 0) return;
    var currentSeason = league.season;
    var gBase = p.baseAnnual * (p.guaranteedPct || 0);
    var remainingPr = pr * yearsLeft;
    if (isPostJune1 && yearsLeft > 1){
      addDead(team, currentSeason, pr + gBase);
      addDead(team, currentSeason + 1, remainingPr - pr);
    } else {
      addDead(team, currentSeason, remainingPr + gBase);
    }
    var idx = team.roster.findIndex(function(x){ return x.id===p.id; });
    if (idx>=0) team.roster.splice(idx,1);
    p.years = 0;
  }

  function seedTeamPicks(team, startSeason, count){
    team.picks = [];
    for (var y=0; y<count; y++){
      for (var r=1; r<=7; r++){
        team.picks.push({year: startSeason + y, round: r, from: team.abbr, id: id()});
      }
    }
  }
  function pickValue(pick){
    var base = {1: 25, 2: 15, 3: 8, 4: 5, 5: 3, 6: 2, 7: 1}[pick.round] || 1;
    var yearsOut = pick.year - state.league.season;
    var discount = Math.pow(0.8, yearsOut);
    return base * discount;
  }

  // ===== Accurate NFL-like schedule generation =====
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
  var INTER_ROT_8 = { 0:[0,1,2,3, 0,1,2,3], 1:[1,2,3,0, 1,2,3,0], 2:[2,3,0,1, 2,3,0,1], 3:[3,0,1,2, 3,0,1,2] };
  var INTRA_ROT_8 =  { 0:[1,2,3, 1,2,3, 1,2], 1:[2,3,0, 2,3,0, 2,3], 2:[3,0,1, 3,0,1, 3,0], 3:[0,1,2, 0,1,2, 0,1] };

  function makeAccurateSchedule(league){
    var year = (league.year || (2025 + ((league.season||1)-1)));
    var by = divisionTeamsByConf(league);
    var lastRanks = computeLastDivisionRanks(league);
    var y8 = (year - 2025) % 8;
    var seventeenthHostConf = (year % 2 === 1) ? 0 : 1; // AFC hosts odd years

    var games = [];
    var keyset = new Set();
    function addGame(home, away){
      var k = home < away ? (home+"-"+away) : (away+"-"+home);
      if (keyset.has(k)) return;
      keyset.add(k);
      games.push({home:home, away:away});
    }

    // 1) Division home-and-away (6 each)
    for (var conf=0; conf<2; conf++){
      for (var dv=0; dv<4; dv++){
        var teams = by[conf][dv];
        for (var i=0; i<teams.length; i++){
          for (var j=i+1; j<teams.length; j++){
            var a = teams[i], b = teams[j];
            games.push({home:a, away:b});
            games.push({home:b, away:a});
            keyset.add((Math.min(a,b))+"-"+(Math.max(a,b)));
          }
        }
      }
    }

    // host parity flips based on calendar year anchor
    var y0 = year - 2025;
    var intraHostFlip = (Math.floor(y0/3) % 2) ? 1 : 0;
    var interHostFlip = (Math.floor(y0/4) % 2) ? 1 : 0;

    // 2) Intra-conference 4-game set vs rotated division
    for (var conf2=0; conf2<2; conf2++){
      for (var dv2=0; dv2<4; dv2++){
        var targetDiv = INTRA_ROT_8[dv2][y8];
        var A = by[conf2][dv2], B = by[conf2][targetDiv];
        for (var i2=0; i2<4; i2++){
          for (var j2=0; j2<4; j2++){
            var a2 = A[i2], b2 = B[j2];
            var hosts2 = hostByGrid(i2, j2, !!intraHostFlip);
            addGame(hosts2 ? a2 : b2, hosts2 ? b2 : a2);
          }
        }
      }
    }

    // 3) Inter-conference 4-game set vs rotated opposite division
    for (var conf3=0; conf3<2; conf3++){
      var other = conf3===0 ? 1 : 0;
      for (var dv3=0; dv3<4; dv3++){
        var tDiv = INTER_ROT_8[dv3][y8];
        var A3 = by[conf3][dv3], B3 = by[other][tDiv];
        for (var i3=0; i3<4; i3++){
          for (var j3=0; j3<4; j3++){
            var a3 = A3[i3], b3 = B3[j3];
            var hosts3 = hostByGrid(i3, j3, !!interHostFlip);
            addGame(hosts3 ? a3 : b3, hosts3 ? b3 : a3);
          }
        }
      }
    }

    function samePlaceTeam(confX, divX, rank){
      var idxs = by[confX][divX].slice().sort(function(x,y){ return lastRanks[x]-lastRanks[y]; });
      return idxs[Math.min(rank, idxs.length-1)];
    }

    // 4) Two intra-conference same-place games vs the two other divisions
    for (var conf4=0; conf4<2; conf4++){
      for (var dv4=0; dv4<4; dv4++){
        var A4 = by[conf4][dv4];
        var targ = INTRA_ROT_8[dv4][y8];
        var otherDivs = [0,1,2,3].filter(function(x){return x!==dv4 && x!==targ;});
        for (var ti=0; ti<A4.length; ti++){
          var t = A4[ti];
          var r = lastRanks[t];
          for (var k=0; k<otherDivs.length; k++){
            var od = otherDivs[k];
            var opp = samePlaceTeam(conf4, od, r);
            if (t === opp) continue;
            var home = ((year + k + r) % 2 === 0) ? t : opp;
            addGame(home, home===t ? opp : t);
          }
        }
      }
    }

    // 5) 17th cross-conference same-place
    for (var conf5=0; conf5<2; conf5++){
      var otherC = conf5===0 ? 1 : 0;
      for (var dv5=0; dv5<4; dv5++){
        var A5 = by[conf5][dv5];
        var nextDiv = INTER_ROT_8[dv5][(y8+1)%8];
        for (var ti2=0; ti2<A5.length; ti2++){
          var t2 = A5[ti2];
          var r2 = lastRanks[t2];
          var opp2 = samePlaceTeam(otherC, nextDiv, r2);
          if (t2 === opp2) continue;
          var home2 = (league.teams[t2].conf === seventeenthHostConf) ? t2 : opp2;
          addGame(home2, home2===t2 ? opp2 : t2);
        }
      }
    }

    // Build schedule by weeks with byes 6–14
    var byes = assignByes(league.teams.length);

    var weeks = Array.apply(null, Array(18)).map(function(){return [];});
    var played = Array.apply(null, Array(18)).map(function(){ return Array(league.teams.length).fill(false); });

    // Shuffle games for dispersion
    for (var iG=games.length-1; iG>0; iG--){
      var jG = Math.floor(Math.random()*(iG+1)); var tmpG = games[iG]; games[iG]=games[jG]; games[jG]=tmpG;
    }

    function canPlace(w,g){
      var h=g.home, a=g.away;
      if (byes[w] && (byes[w].has(h) || byes[w].has(a))) return false;
      if (played[w][h] || played[w][a]) return false;
      return true;
    }

    for (var gi=0; gi<games.length; gi++){
      var g = games[gi], placed=false;
      for (var w=0; w<18; w++){
        if (canPlace(w,g)){
          weeks[w].push({home:g.home, away:g.away});
          played[w][g.home]=true; played[w][g.away]=true;
          placed=true; break;
        }
      }
      if (!placed){
        // fallback: still avoid double-booking, ignore byes if necessary
        for (var w2=0; w2<18 && !placed; w2++){
          if (!played[w2][g.home] && !played[w2][g.away]){
            weeks[w2].push({home:g.home, away:g.away});
            played[w2][g.home]=true; played[w2][g.away]=true;
            placed=true; break;
          }
        }
      }
      if (!placed){ throw new Error("Could not place game "+g.home+" vs "+g.away); }
    }

    // Insert byes
    for (var wb=0; wb<18; wb++){
      if (!byes[wb]) continue;
      byes[wb].forEach(function(t){ weeks[wb].push({bye:t}); });
    }

    return weeks;
  }

  // 1) Byes: weeks 6..14, quotas sum to 32
  function assignByes(teamCount){
    var quotas = [4,4,4,4,4,4,4,2,2]; // 9 bye weeks -> 32 total
    var weeks = Array(18).fill(null);
    var sum = quotas.reduce(function(s,x){return s+x;},0);
    if (sum !== teamCount) throw new Error("assignByes quotas sum "+sum+" != teamCount "+teamCount);
    var pool = Array.apply(null, Array(teamCount)).map(function(_,i){return i;});
    // shuffle
    for (var i=pool.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var t=pool[i]; pool[i]=pool[j]; pool[j]=t; }
    var p=0;
    for (var k=0;k<quotas.length;k++){
      var w = 5 + k; // 0-index 5..13 == NFL weeks 6..14
      var set = new Set();
      for (var c=0;c<quotas[k] && p<pool.length;c++){ set.add(pool[p++]); }
      weeks[w]=set;
    }
    return weeks;
  }

  // League creation
  function makeLeague(teamList){
    var baseList = teamList || TEAM_META_FICTIONAL;
    var teams = baseList.map(function(t, idx){
      var isArray = Array.isArray(t);
      var abbr = isArray ? t[0] : t.abbr;
      var name = isArray ? t[1] : t.name;
      var conf = isArray ? Math.floor(idx/16) : t.conf;
      var div  = isArray ? Math.floor((idx%16)/4) : t.div;
      return {
        id: idx, abbr: abbr, name: name,
        rating: rand(70,88), roster: [], record: {w:0,l:0,t:0,pf:0,pa:0},
        conf: conf, div: div,
        capBook: {}, deadCapBook: {}, capRollover: 0,
        capTotal: CAP_BASE, picks: [],
        strategy: { passBias: 0.5, tempo: 1.0, aggression: 1.0, coachSkill: Math.random()*0.4 + 0.6 }
      };
    });
    for (var ti=0; ti<teams.length; ti++){
      var tm = teams[ti];
      var roster = [];
      var template = {QB:2,RB:3,WR:5,TE:2,OL:7,DL:7,LB:5,CB:5,S:3,K:1};
      for (var pos in template){
        for (var c=0; c<template[pos]; c++){
          var p = makePlayer(pos);
          tagAbilities(p);
          roster.push(p);
        }
      }
      tm.roster = roster.sort(function(a,b){return b.ovr-a.ovr;});
      seedTeamPicks(tm, 1, YEARS_OF_PICKS);
      tm.rating = Math.round(0.6*avg(tm.roster.map(function(p){return p.ovr;})) + 0.4*tm.rating);
    }

    // Build league first, then schedule
    var L = { seed: rand(1,999999), season: 1, year: YEAR_START, week: 1,
              teams: teams, schedule: [], resultsByWeek: {}, playoffsDone: false, champion: null };
    for (var k=0; k<teams.length; k++) recalcCap(L, teams[k]);
    var tmpRanks = computeLastDivisionRanks(L);
    L.teams.forEach(function(t,i){ t.lastDivisionRank = tmpRanks[i]; });

    L.schedule = makeAccurateSchedule(L);
    return L;
  }

  // ===== Standings stats and NFL-style tiebreakers =====
  function teamStats(L){
    var N = L.teams.length;
    var stats = Array.apply(null, Array(N)).map(function(){return {w:0,l:0,t:0,pf:0,pa:0, divW:0,divL:0,divT:0, confW:0,confL:0,confT:0, h2h:{}};});
    for (var i=0;i<N;i++){
      var r = L.teams[i].record;
      var s = stats[i];
      s.w=r.w; s.l=r.l; s.t=r.t; s.pf=r.pf; s.pa=r.pa;
    }
    for (var wk in L.resultsByWeek){
      var arr = L.resultsByWeek[wk] || [];
      for (var gi=0; gi<arr.length; gi++){
        var g = arr[gi];
        if (g.bye) continue;
        var h = g.home, a = g.away;
        var hs = stats[h], as = stats[a];
        var hc = L.teams[h].conf, ac = L.teams[a].conf;
        var hd = L.teams[h].div,  ad = L.teams[a].div;
        var sameConf = hc===ac;
        var sameDiv = sameConf && hd===ad;
        var resH=0, resA=0;
        if (g.scoreHome>g.scoreAway){ resH=1; resA=-1; }
        else if (g.scoreHome<g.scoreAway){ resH=-1; resA=1; }
        if (sameDiv){
          if (resH>0) hs.divW++; else if (resH<0) hs.divL++; else hs.divT++;
          if (resA>0) as.divW++; else if (resA<0) as.divL++; else as.divT++;
        }
        if (sameConf){
          if (resH>0) hs.confW++; else if (resH<0) hs.confL++; else hs.confT++;
          if (resA>0) as.confW++; else if (resA<0) as.confL++; else as.confT++;
        }
        hs.h2h[a] = (hs.h2h[a]||0) + (resH>0?1:resH<0?-1:0);
        as.h2h[h] = (as.h2h[h]||0) + (resA>0?1:resA<0?-1:0);
      }
    }
    return stats;
  }
  function pctRec(w,l,t){ var g=w+l+t; return g? (w + 0.5*t)/g : 0; }
  function pctDiv(s){ return pctRec(s.divW, s.divL, s.divT); }
  function pctConf(s){ return pctRec(s.confW, s.confL, s.confT); }
  function tieBreakCompare(L, aIdx, bIdx, scope){
    if (aIdx===bIdx) return 0;
    var S = teamStats(L);
    var pA = pctRec(S[aIdx].w, S[aIdx].l, S[aIdx].t);
    var pB = pctRec(S[bIdx].w, S[bIdx].l, S[bIdx].t);
    if (pA !== pB) return pB - pA;
    var h2h = S[aIdx].h2h[bIdx] || 0;
    if (h2h !== 0) return h2h > 0 ? -1 : 1;
    if (scope==="division" || scope==="leaders"){
      var dA = pctDiv(S[aIdx]), dB = pctDiv(S[bIdx]);
      if (dA !== dB) return dB - dA;
    }
    var cA = pctConf(S[aIdx]), cB = pctConf(S[bIdx]);
    if (cA !== cB) return cB - cA;
    var pdA = (S[aIdx].pf - S[aIdx].pa);
    var pdB = (S[bIdx].pf - S[bIdx].pa);
    if (pdA !== pdB) return pdB - pdA;
    if (S[aIdx].pf !== S[bIdx].pf) return S[bIdx].pf - S[aIdx].pf;
    return aIdx - bIdx;
  }

  // UI helpers
  function listByMode(mode){ return mode==='real' ? TEAM_META_REAL : TEAM_META_FICTIONAL; }

  function rebuildTeamLabels(mode){
    var L = state.league;
    var meta = listByMode(mode);
    if (!L || !L.teams || L.teams.length !== meta.length) return;
    L.teams.forEach(function(tm, i){
      tm.abbr = meta[i].abbr;
      tm.name = meta[i].name;
      tm.conf = meta[i].conf;
      tm.div  = meta[i].div;
    });
    $$("select").forEach(function(sel){
      if (sel.id==="onboardTeam") return;
      var prev = sel.value;
      sel.innerHTML = "";
      L.teams.forEach(function(t, i){
        var opt = document.createElement("option");
        opt.value = String(i);
        var conf = CONF_NAMES[t.conf] + " " + DIV_NAMES[t.div];
        opt.textContent = t.abbr + " — " + t.name + " (" + conf + ")";
        sel.appendChild(opt);
      });
      if (prev) sel.value = prev;
    });
    renderHub(); renderRoster(); renderStandings(); renderDraft();
  }

  var routes = ["hub","roster","cap","schedule","standings","trade","freeagency","draft","playoffs","settings"];
  function show(route){
    routes.forEach(function(r){
      var el = $("#"+r);
      if (el) el.hidden = (r !== route);
    });
    if (route === "hub") renderHub();
    if (route === "roster") renderRoster();
    if (route === "cap") renderCap();
    if (route === "schedule") renderSchedule();
    if (route === "standings") renderStandings();
    if (route === "trade") renderTradeUI();
    if (route === "freeagency") renderFreeAgency();
    if (route === "draft") renderDraft();
    if (route === "playoffs") renderPlayoffs();
    if (route === "settings"){
      var y = (state.league && state.league.year) ? state.league.year : YEAR_START;
      var el = document.getElementById("settingsYear"); if (el) el.value = y;
    }
  }
  window.addEventListener("hashchange", function(){
    var seg = location.hash.replace("#/","") || "hub";
    show(routes.indexOf(seg)>=0 ? seg : "hub");
  });

  function setStatus(msg){
    var el = $("#statusMsg"); if (!el) return;
    el.textContent = msg;
    setTimeout(function(){ el.textContent=""; }, 2000);
  }

  // Hub
  function renderHub(){
    var L = state.league; if (!L) return;
    var el;
    el = $("#hubSeason"); if (el) el.textContent = L.year;
    el = $("#hubWeek"); if (el) el.textContent = L.week;
    el = $("#hubWeeks"); if (el) el.textContent = L.schedule.length;
    el = $("#seasonNow"); if (el) el.textContent = L.year;
    var games = (L.schedule[L.week-1] || []).filter(function(g){return !g.bye;});
    el = $("#hubGames"); if (el) el.textContent = games.length;
    var res = L.resultsByWeek[L.week-1] || [];
    var box = $("#hubResults"); if (box) box.innerHTML="";
    for (var i=0;i<res.length;i++){
      var g = res[i];
      if (g.bye) continue;
      var t1 = L.teams[g.home].abbr, t2 = L.teams[g.away].abbr;
      var div = document.createElement("div");
      div.className="row";
      div.innerHTML = '<div>'+t2+' '+g.scoreAway+' at '+t1+' '+g.scoreHome+'</div><div class="spacer"></div><div class="muted">'+(g.homeWin?L.teams[g.home].name:L.teams[g.away].name)+' wins</div>';
      if (box) box.appendChild(div);
    }
    updateCapSidebar();
  }

  function updateCapSidebar(){
    var L = state.league; if (!L) return;
    var t = currentTeam(); if (!t) return;
    recalcCap(L, t);
    var el;
    el = $("#capUsed"); if (el) el.textContent = (t.capUsed||0).toFixed(1) + " M";
    el = $("#capTotal"); if (el) el.textContent = (t.capTotal||0).toFixed(1) + " M";
    el = $("#deadCap"); if (el) el.textContent = ((t.deadCap||0)).toFixed(1) + " M";
    el = $("#capRoom"); if (el) el.textContent = ((t.capTotal - t.capUsed)||0).toFixed(1) + " M";
  }

  // Roster
  function renderRoster(){
    var L = state.league; if (!L) return;
    var sel = $("#rosterTeam"); if (!sel) return;
    if (!sel.dataset.filled){
      fillTeamSelect(sel);
      sel.dataset.filled = "1";
      sel.addEventListener("change", renderRoster);
    }
    var teamId = parseInt(sel.value || ($("#userTeam")?$("#userTeam").value:"0") || "0", 10);
    sel.value = teamId;
    var tm = L.teams[teamId];
    var ttl = $("#rosterTitle"); if (ttl) ttl.textContent = "Roster — "+tm.name+" ("+tm.abbr+")";
    var tbl = $("#rosterTable"); if (!tbl) return;
    tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base (M)</th><th>Bonus (tot)</th><th>Years</th><th>Cap Hit</th><th>Abilities</th><th>Status</th></tr></thead>';
    var tb = document.createElement("tbody");
    tm.roster.forEach(function(p){
      var inj = p.injuryWeeks>0 ? ('Out '+p.injuryWeeks+'w') : (p.fatigue>0?('Fatigue '+p.fatigue):"OK");
      var cap = capHitFor(p, 0, L.season);
      var tr = document.createElement("tr");
      tr.innerHTML = '<td><input type="checkbox" data-id="'+p.id+'"></td><td>'+p.name+'</td><td>'+p.pos+'</td><td>'+p.ovr+'</td><td>'+p.baseAnnual.toFixed(1)+'</td><td>'+p.signingBonus.toFixed(1)+'</td><td>'+p.years+'</td><td>'+cap.toFixed(1)+'</td><td>'+((p.abilities||[]).join(", "))+'</td><td>'+inj+'</td>';
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    var btnRel = $("#btnRelease"); if (btnRel) btnRel.onclick = function(){ releaseSelected(tm); };
    var dc = autoDepthChart(tm);
    var box = $("#depthChart"); if (box) box.innerHTML="";
    for (var pos in dc){
      var div = document.createElement("div");
      div.className = "row";
      var names = dc[pos].map(function(p){ return p.name+' ('+p.ovr+')'; }).join(", ");
      div.innerHTML = '<div><strong>'+pos+'</strong></div><div class="spacer"></div><div class="muted">'+names+'</div>';
      if (box) box.appendChild(div);
    }
    updateCapSidebar();
  }

  function releaseSelected(team){
    var ids = $$("input[type=checkbox][data-id]:checked").map(function(x){return x.dataset.id;});
    if (!ids.length){ setStatus("Select players to release."); return; }
    var isPost = $("#postJune1") && $("#postJune1").checked;
    ids.forEach(function(pid){
      var p = team.roster.find(function(x){return x.id===pid;});
      if (p) releaseWithProration(state.league, team, p, isPost);
    });
    recalcCap(state.league, team);
    setStatus(isPost ? "Released with post-June 1 split." : "Released with acceleration.");
    renderRoster();
  }

  function autoDepthChart(team){
    var byPos = {}; POSITIONS.forEach(function(p){ byPos[p]=[]; });
    team.roster.forEach(function(p){ byPos[p.pos].push(p); });
    POSITIONS.forEach(function(p){ byPos[p].sort(function(a,b){return b.ovr-a.ovr;}); });
    var depth = {};
    for (var pos in DEPTH_NEEDS){
      depth[pos] = byPos[pos].slice(0, DEPTH_NEEDS[pos]);
    }
    return depth;
  }

  // Cap table
  function renderCap(){
    var L = state.league; if (!L) return;
    var t = currentTeam(); if (!t) return;
    recalcCap(L, t);
    var years = [0,1,2];
    var tbl = $("#capTable"); if (!tbl) return;
    tbl.innerHTML = '<thead><tr><th>Player</th>'+years.map(function(y){return '<th>Y'+(L.year+y)+'</th>';}).join("")+'</tr></thead>';
    var tb = document.createElement("tbody");
    t.roster.forEach(function(p){
      var row = document.createElement("tr");
      row.innerHTML = '<td>'+p.name+' • '+p.pos+'</td>' + years.map(function(y){ var hit = capHitFor(p,y,L.season); return '<td>'+(hit?hit.toFixed(1):"")+'</td>'; }).join("");
      tb.appendChild(row);
    });
    tbl.appendChild(tb);
    var deadBox = $("#deadLedger"); if (deadBox) deadBox.innerHTML="";
    years.forEach(function(y){
      var yr = L.year + y;
      var amt = t.deadCapBook[yr] || 0;
      var div = document.createElement("div");
      div.className = "row";
      div.innerHTML = '<div class="badge">Season '+yr+'</div><div class="spacer"></div><div class="muted">Dead cap '+amt.toFixed(1)+' M</div>';
      if (deadBox) deadBox.appendChild(div);
    });
    var capSummary = $("#capSummary");
    if (capSummary) capSummary.textContent = 'Current cap used '+t.capUsed.toFixed(1)+' M, total '+t.capTotal.toFixed(1)+' M, room '+(t.capTotal-t.capUsed).toFixed(1)+' M.';
    updateCapSidebar();
  }

  // Schedule
  function renderSchedule(){
    var L = state.league; if (!L) return;
    var btn2 = $("#btnSimWeek2"); if (btn2) btn2.onclick = function(){ simulateWeek(); };
    var week = L.week;
    var games = L.schedule[week-1] || [];
    var box = $("#scheduleList"); if (box) box.innerHTML="";
    var byeTeams = games.filter(function(g){return g.bye!==undefined;}).map(function(g){return L.teams[g.bye].abbr;});
    if (byeTeams.length && box){
      var d = document.createElement("div"); d.className="muted"; d.textContent = 'Byes: '+byeTeams.join(", ");
      box.appendChild(d);
    }
    games.filter(function(g){return !g.bye;}).forEach(function(g, idx){
      var home = L.teams[g.home], away = L.teams[g.away];
      var div = document.createElement("div"); div.className="row";
      div.innerHTML = '<div>Game '+(idx+1)+': '+away.name+' at '+home.name+'</div>';
      if (box) box.appendChild(div);
    });
  }

  function renderStandings(){
    var L = state.league; if (!L) return;
    var scope = ($("#standingsScope") && $("#standingsScope").value) ? $("#standingsScope").value : "league";
    var leadersOnly = ($("#leadersOnly") ? $("#leadersOnly").checked : false) || false;
    var highlight = ($("#highlightLeaders") ? $("#highlightLeaders").checked : false) !== false;
    var wrap = $("#standingsWrap"); if (!wrap) return; wrap.innerHTML="";
    var stats = teamStats(L);

    function rowHtml(tIdx, leader){
      var t = L.teams[tIdx];
      var rec = t.record;
      var cls = leader && highlight ? ' class="leader-row"' : "";
      var badge = leader ? ' <span class="badge leader">Leader</span>' : "";
      var pd = rec.pf - rec.pa;
      return '<tr'+cls+'><td>'+t.abbr+badge+'</td><td>'+rec.w+'</td><td>'+rec.l+'</td><td>'+rec.t+'</td><td>'+pct(rec).toFixed(3)+'</td><td>'+rec.pf+'</td><td>'+rec.pa+'</td><td>'+pd+'</td></tr>';
    }
    function sorted(list, cmpScope){
      var arr = list.slice();
      arr.sort(function(a,b){ return tieBreakCompare(L, a, b, cmpScope); });
      return arr;
    }

    if (scope==="league" || scope==="conference"){
      for (var conf=0; conf<2; conf++){
        var card = document.createElement("div"); card.className="card";
        var title = conf===0 ? "AFC" : "NFC";
        var allIdx = L.teams.map(function(_,i){return i;}).filter(function(i){return L.teams[i].conf===conf;});
        var leaders = [];
        for (var dv=0; dv<4; dv++){
          var divIdx = allIdx.filter(function(i){return L.teams[i].div===dv;});
          var winner = sorted(divIdx, "leaders")[0];
          leaders.push(winner);
        }
        var displayIdx = leadersOnly ? leaders : sorted(allIdx, "conference");
        var tbl = document.createElement("table"); tbl.className="table";
        tbl.innerHTML = '<thead><tr><th>'+title+'</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>';
        var tb = document.createElement("tbody");
        displayIdx.forEach(function(i){ tb.innerHTML += rowHtml(i, leaders.indexOf(i)>=0); });
        tbl.appendChild(tb); card.appendChild(tbl); wrap.appendChild(card);
      }
    } else {
      for (var conf2=0; conf2<2; conf2++){
        for (var dv2=0; dv2<4; dv2++){
          var card2 = document.createElement("div"); card2.className="card";
          var title2 = CONF_NAMES[conf2]+' '+DIV_NAMES[dv2];
          var idxs = L.teams.map(function(_,i){return i;}).filter(function(i){return L.teams[i].conf===conf2 && L.teams[i].div===dv2;});
          var order = sorted(idxs, "division");
          var winner2 = order[0];
          var tbl2 = document.createElement("table"); tbl2.className="table";
          tbl2.innerHTML = '<thead><tr><th>'+title2+'</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>';
          var tb2 = document.createElement("tbody");
          order.forEach(function(i){ tb2.innerHTML += rowHtml(i, i===winner2); });
          tbl2.appendChild(tb2); card2.appendChild(tbl2); wrap.appendChild(card2);
        }
      }
    }
    var ss = $("#standingsScope"); if (ss) ss.onchange = renderStandings;
    var lo = $("#leadersOnly"); if (lo) lo.addEventListener("change", renderStandings);
    var hl = $("#highlightLeaders"); if (hl) hl.addEventListener("change", renderStandings);
    var btn = $("#btnPlayoffPicture");
    if (btn) btn.addEventListener("click", function(){
      if (typeof renderPlayoffPicture === "function"){
        renderPlayoffPicture();
        var pp = $("#playoffPicture"); if (pp) pp.hidden = false;
      }
    }, {once:true});
  }

  // Playoffs: 7 per conference
  function seedPlayoffs(L){
    var seeds = {AFC:[], NFC:[]};
    for (var conf=0; conf<2; conf++){
      var confKey = conf===0 ? "AFC" : "NFC";
      var allIdx = L.teams.map(function(_,i){return i;}).filter(function(i){return L.teams[i].conf===conf;});
      var leaders = [];
      for (var dv=0; dv<4; dv++){
        var divIdx = allIdx.filter(function(i){return L.teams[i].div===dv;});
        divIdx.sort(function(a,b){ return tieBreakCompare(L, a, b, "leaders"); });
        leaders.push(divIdx[0]);
      }
      leaders.sort(function(a,b){ return tieBreakCompare(L, a, b, "conference"); });
      var others = allIdx.filter(function(i){return leaders.indexOf(i)<0;});
      others.sort(function(a,b){ return tieBreakCompare(L, a, b, "conference"); });
      var wc = others.slice(0,3);
      var seven = leaders.concat(wc);
      seeds[confKey] = seven;
    }
    return seeds;
  }
  function renderPlayoffPicture(){
    var L = state.league; if (!L) return;
    var seeds = seedPlayoffs(L);
    var afc = $("#seedsAFC"); var nfc = $("#seedsNFC");
    if (afc) afc.innerHTML = ""; if (nfc) nfc.innerHTML = "";
    function fill(ol, idxs){
      if (!ol) return;
      idxs.forEach(function(i,seed){
        var t = L.teams[i];
        var li = document.createElement("li");
        var bye = seed===0 ? ' <span class="badge leader">Bye</span>' : '';
        li.innerHTML = (seed+1)+'. '+t.name+bye;
        ol.appendChild(li);
      });
    }
    fill(afc, seeds.AFC); fill(nfc, seeds.NFC);
  }
  function startPlayoffs(){
    var L = state.league;
    var seeds = seedPlayoffs(L);
    state.playoffs = { round: "WC", seeds: seeds, series: {AFC:[],NFC:[],SB:[]}, results: [] };
    buildRoundPairings();
    renderPlayoffs();
  }
  function buildRoundPairings(){
    var P = state.playoffs; if (!P) return;
    var L = state.league;
    P.series.AFC = []; P.series.NFC = [];
    if (P.round==="WC"){
      ["AFC","NFC"].forEach(function(key){
        var s = P.seeds[key];
        P.series[key] = [
          {home:s[1], away:s[6]},
          {home:s[2], away:s[5]},
          {home:s[3], away:s[4]}
        ];
      });
    } else if (P.round==="DIV"){
      ["AFC","NFC"].forEach(function(key){
        var s = P.seeds[key];
        var winners = P.lastWinners[key]; // 3 teams
        var bySeed = winners.slice().sort(function(a,b){ return s.indexOf(a) - s.indexOf(b); });
        var low = bySeed[bySeed.length-1];
        var high = bySeed[0];
        var mid = bySeed[1];
        var oneSeed = s[0];
        P.series[key] = [
          {home: oneSeed, away: low},
          {home: high, away: mid}
        ];
      });
    } else if (P.round==="CONF"){
      ["AFC","NFC"].forEach(function(key){
        var s = P.seeds[key];
        var winners = P.lastWinners[key];
        var order = winners.slice().sort(function(a,b){ return s.indexOf(a) - s.indexOf(b); });
        P.series[key] = [{home: order[0], away: order[1]}];
      });
    } else if (P.round==="SB"){
      var a = P.lastWinners.AFC[0], n = P.lastWinners.NFC[0];
      var homeIsAFC = (state.league.year % 2 === 1);
      var home = homeIsAFC ? a : n;
      var away = homeIsAFC ? n : a;
      P.series.SB = [{home: home, away: away}];
    }
  }
  function simPlayoffGame(homeIdx, awayIdx){
    var L = state.league;
    var h = L.teams[homeIdx], a = L.teams[awayIdx];
    var pdH = h.record.pf - h.record.pa;
    var pdA = a.record.pf - a.record.pa;
    var base = h.rating - a.rating + 0.1*(pdH - pdA);
    var probHome = 1/(1+Math.exp(-base/8));
    var homeScore = Math.round(17 + Math.random()*17 + probHome*6);
    var awayScore = Math.round(14 + Math.random()*17 + (1-probHome)*6);
    if (homeScore === awayScore) return {home:homeIdx, away:awayIdx, scoreHome:homeScore+3, scoreAway:awayScore};
    return {home:homeIdx, away:awayIdx, scoreHome:homeScore, scoreAway:awayScore};
  }
  function simulatePlayoffRound(){
    var P = state.playoffs; var L = state.league; if (!P) return;
    if (P.round==="WC" || P.round==="DIV" || P.round==="CONF"){
      var nextWinners = {AFC:[], NFC:[]};
      ["AFC","NFC"].forEach(function(key){
        var games = P.series[key];
        for (var i=0;i<games.length;i++){
          var g = games[i];
          var res = simPlayoffGame(g.home, g.away);
          var winner = res.scoreHome>res.scoreAway ? g.home : g.away;
          state.playoffs.results.push(L.teams[res.away].abbr+' '+res.scoreAway+' at '+L.teams[res.home].abbr+' '+res.scoreHome+' — '+L.teams[winner].abbr+' advance');
          nextWinners[key].push(winner);
        }
      });
      P.lastWinners = nextWinners;
      if (P.round==="WC"){ P.round="DIV"; buildRoundPairings(); }
      else if (P.round==="DIV"){ P.round="CONF"; buildRoundPairings(); }
      else if (P.round==="CONF"){ P.round="SB"; buildRoundPairings(); }
    } else if (P.round==="SB"){
      var g = P.series.SB[0];
      var res2 = simPlayoffGame(g.home, g.away);
      var winner2 = res2.scoreHome>res2.scoreAway ? g.home : g.away;
      state.playoffs.results.push('Super Bowl: '+L.teams[res2.away].abbr+' '+res2.scoreAway+' at '+L.teams[res2.home].abbr+' '+res2.scoreHome+' — Champion '+L.teams[winner2].name);
      state.playoffs = null;
      runOffseason();
      location.hash = "#/hub";
      return;
    }
    renderPlayoffs();
  }
  function renderPlayoffs(){
    var P = state.playoffs; var L = state.league;
    var bracket = $("#playoffBracket"); var info = $("#playoffState"); var rs = $("#playoffResults");
    if (info) info.textContent = P ? ('Round: '+P.round) : "No playoffs in progress.";
    if (bracket) bracket.innerHTML = "";
    if (rs) rs.innerHTML = "";
    var results = (state.playoffs && state.playoffs.results) || [];
    results.forEach(function(line){
      var d = document.createElement("div"); d.textContent = line; if (rs) rs.appendChild(d);
    });
    if (!P) return;
    function listSeries(key){
      var wrap = document.createElement("div"); wrap.className = "card";
      var title = key==="SB" ? "Super Bowl" : key;
      var header = document.createElement("h3"); header.textContent = title; wrap.appendChild(header);
      var games = P.series[key] || [];
      games.forEach(function(g,idx){
        var row = document.createElement("div"); row.className="row";
        row.innerHTML = '<div>Game '+(idx+1)+': '+L.teams[g.away].name+' at '+L.teams[g.home].name+'</div>';
        wrap.appendChild(row);
      });
      if (bracket) bracket.appendChild(wrap);
    }
    listSeries("AFC"); listSeries("NFC"); if (P.round==="SB") listSeries("SB");
  }

  // Trade UI with picks
  function renderTradeUI(){
    var L = state.league; if (!L) return;
    var selA = $("#tradeA"), selB = $("#tradeB"); if (!selA || !selB) return;
    if (!selA.dataset.filled){ fillTeamSelect(selA); selA.dataset.filled="1"; selA.value = ($("#userTeam")?$("#userTeam").value:"0"); selA.addEventListener("change", renderTradeLists); }
    if (!selB.dataset.filled){ fillTeamSelect(selB); selB.dataset.filled="1"; selB.value = String((parseInt(selA.value,10)+1)%L.teams.length); selB.addEventListener("change", renderTradeLists); }
    var tv = $("#tradeValidate"), te = $("#tradeExecute");
    if (tv) tv.onclick = validateTrade;
    if (te) te.onclick = executeTrade;
    renderTradeLists();
  }
  function renderTradeLists(){
    var L = state.league; if (!L) return;
    var a = parseInt($("#tradeA").value,10);
    var b = parseInt($("#tradeB").value,10);
    listPlayers("#tradeListA", L.teams[a], "A");
    listPlayers("#tradeListB", L.teams[b], "B");
    listPicks("#pickListA", L.teams[a], "A");
    listPicks("#pickListB", L.teams[b], "B");
    var te = $("#tradeExecute"); if (te) te.disabled = true;
    var ti = $("#tradeInfo"); if (ti) ti.textContent = "Select players or picks on both sides, then validate.";
  }
  function listPlayers(rootSel, team, side){
    var root = $(rootSel); if (!root) return; root.innerHTML = "";
    team.roster.forEach(function(p){
      var row = document.createElement("label"); row.className = "row";
      var cap = capHitFor(p, 0, state.league.season);
      row.innerHTML = '<input type="checkbox" data-side="'+side+'" data-type="player" data-id="'+p.id+'" />'+
                       '<div>'+p.name+' • '+p.pos+'</div><div class="spacer"></div>'+
                       '<div class="muted">OVR '+p.ovr+' • Cap '+cap.toFixed(1)+'M ('+p.years+'y)</div>';
      root.appendChild(row);
    });
  }
  function listPicks(rootSel, team, side){
    var root = $(rootSel); if (!root) return; root.innerHTML = "";
    var now = state.league.year;
    team.picks.slice().sort(function(a,b){ return a.year===b.year? a.round-b.round : a.year-b.year; }).forEach(function(pk){
      var row = document.createElement("label"); row.className = "row";
      row.innerHTML = '<input type="checkbox" data-side="'+side+'" data-type="pick" data-id="'+pk.id+'" />'+
                       '<div>Y'+(now + (pk.year-1))+' R'+pk.round+'</div><div class="spacer"></div><div class="muted">from '+pk.from+'</div>';
      root.appendChild(row);
    });
  }
  function collectSelected(side, team){
    var checks = $$('input[type=checkbox][data-side='+side+']:checked');
    var players = [], picks = [];
    checks.forEach(function(c){
      if (c.dataset.type==="player"){
        var p = team.roster.find(function(x){return x.id===c.dataset.id;});
        if (p) players.push(p);
      } else {
        var pk = team.picks.find(function(x){return x.id===c.dataset.id;});
        if (pk) picks.push(pk);
      }
    });
    return {players:players, picks:picks};
  }
  function valueOf(p){
    var agePenalty = Math.max(0, p.age - 26) * 0.6;
    var contractValue = Math.max(0, p.years) * (p.baseAnnual*0.6);
    return p.ovr - agePenalty + contractValue*0.05 + (p.pos==="QB"?6:0) + ((p.pos==="WR"||p.pos==="CB")?2:0);
  }
  function validateTrade(){
    var L = state.league;
    var a = parseInt($("#tradeA").value,10);
    var b = parseInt($("#tradeB").value,10);
    var A = collectSelected("A", L.teams[a]);
    var B = collectSelected("B", L.teams[b]);
    var te = $("#tradeExecute"), ti = $("#tradeInfo");
    if ((!A.players.length && !A.picks.length) || (!B.players.length && !B.picks.length)){
      if (ti) ti.textContent = "Pick at least one asset on each side.";
      if (te) te.disabled = true; return;
    }
    var valA = A.players.reduce(function(s,p){return s+valueOf(p);},0) + A.picks.reduce(function(s,pk){return s+pickValue(pk);},0);
    var valB = B.players.reduce(function(s,p){return s+valueOf(p);},0) + B.picks.reduce(function(s,pk){return s+pickValue(pk);},0);
    var diff = Math.abs(valA - valB);
    var fair = diff <= 15;
    var capA = L.teams[a].capUsed - A.players.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0) + B.players.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0);
    var capB = L.teams[b].capUsed - B.players.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0) + A.players.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0);
    var capOK = capA <= L.teams[a].capTotal && capB <= L.teams[b].capTotal;
    if (ti) ti.textContent = 'Value A '+valA.toFixed(1)+' vs B '+valB.toFixed(1)+' — '+(fair?"Fair":"Unbalanced")+' (delta '+diff.toFixed(1)+').';
    if (te) te.disabled = !(fair && capOK);
  }
  function executeTrade(){
    var L = state.league;
    var a = parseInt($("#tradeA").value,10);
    var b = parseInt($("#tradeB").value,10);
    var A = collectSelected("A", L.teams[a]);
    var B = collectSelected("B", L.teams[b]);
    L.teams[a].roster = L.teams[a].roster.filter(function(p){return !A.players.some(function(x){return x.id===p.id;});}).concat(B.players).sort(function(x,y){return y.ovr-x.ovr;});
    L.teams[b].roster = L.teams[b].roster.filter(function(p){return !B.players.some(function(x){return x.id===p.id;});}).concat(A.players).sort(function(x,y){return y.ovr-x.ovr;});
    L.teams[a].picks = L.teams[a].picks.filter(function(pk){return !A.picks.some(function(x){return x.id===pk.id;});}).concat(B.picks);
    L.teams[b].picks = L.teams[b].picks.filter(function(pk){return !B.picks.some(function(x){return x.id===pk.id;});}).concat(A.picks);
    var ti = $("#tradeInfo"); if (ti) ti.textContent = "Trade executed.";
    recalcCap(L, L.teams[a]); recalcCap(L, L.teams[b]);
    renderTradeLists();
    setStatus("Trade complete.");
  }

  // Free Agency
  function ensureFA(){
    if (!state.freeAgents.length){
      for (var i=0;i<120;i++){
        var pos = choice(POSITIONS);
        var p = makePlayer(pos);
        p.years = 0; p.yearsTotal = 2;
        p.baseAnnual = Math.round(p.baseAnnual*0.9*10)/10;
        p.signingBonus = Math.round((p.baseAnnual*p.yearsTotal*0.4)*10)/10;
        p.guaranteedPct = 0.5;
        tagAbilities(p);
        state.freeAgents.push(p);
      }
      state.freeAgents.sort(function(a,b){return b.ovr-a.ovr;});
    }
  }
  function renderFreeAgency(){
    ensureFA();
    var L = state.league;
    var tbl = $("#faTable"); if (!tbl) return;
    tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base</th><th>Bonus</th><th>Years</th><th>Abilities</th></tr></thead>';
    var tb = document.createElement("tbody");
    state.freeAgents.forEach(function(p,i){
      var tr = document.createElement("tr");
      tr.innerHTML = '<td><input type="radio" name="fa" value="'+i+'"></td><td>'+p.name+'</td><td>'+p.pos+'</td><td>'+p.ovr+'</td><td>'+p.baseAnnual.toFixed(1)+'</td><td>'+p.signingBonus.toFixed(1)+'</td><td>'+p.yearsTotal+'</td><td>'+((p.abilities||[]).join(", "))+'</td>';
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    var sel = $("#faTeam"); if (sel && !sel.dataset.filled){ fillTeamSelect(sel); sel.dataset.filled="1"; }
    var btn = $("#btnSignFA"); if (btn) btn.disabled = true;
    tbl.addEventListener("change", function(e){ if (e.target && e.target.name==="fa" && btn) btn.disabled = false; }, {once:true});
    if (btn) btn.onclick = function(){
      var el = document.querySelector('input[name=fa]:checked');
      var idx = el ? Number(el.value) : NaN;
      if (isNaN(idx)) return;
      var teamId = parseInt(($("#faTeam")?$("#faTeam").value:($("#userTeam")?$("#userTeam").value:"0")), 10);
      var tm = L.teams[teamId];
      var p = state.freeAgents[idx];
      p.years = p.yearsTotal;
      var capAfter = tm.capUsed + capHitFor(p,0,L.season);
      if (capAfter > tm.capTotal){ setStatus("Cap exceeded. Release or trade first."); return; }
      tm.roster.push(p);
      tm.roster.sort(function(a,b){return b.ovr-a.ovr;});
      state.freeAgents.splice(idx,1);
      recalcCap(L, tm);
      renderFreeAgency();
      setStatus("Signed free agent");
    };
  }

  // Draft
  function renderDraft(){
    var sel = $("#draftTeam"); if (!sel) return;
    if (!sel.dataset.filled){ fillTeamSelect(sel); sel.dataset.filled="1"; }
    var teamId = parseInt(sel.value || ($("#userTeam")?$("#userTeam").value:"0") || "0", 10);
    sel.value = teamId;
    var t = state.league.teams[teamId];
    var now = state.league.year;
    var box = $("#draftPicks"); if (!box) return; box.innerHTML="";
    t.picks.slice().sort(function(a,b){ return a.year===b.year? a.round-b.round : a.year-b.year; }).forEach(function(pk){
      var div = document.createElement("div"); div.className = "row";
      var v = pickValue(pk);
      div.innerHTML = '<div class="badge">Y'+(now + (pk.year-1))+' R'+pk.round+'</div><div class="spacer"></div><div class="muted">from '+pk.from+'</div><div class="muted">value '+v.toFixed(1)+'</div>';
      box.appendChild(div);
    });
  }

  // Sim week and apply results
  function applyResult(home, away, sH, sA){
    home.record.pf += sH; home.record.pa += sA;
    away.record.pf += sA; away.record.pa += sH;
    if (sH === sA){ home.record.t++; away.record.t++; }
    else if (sH > sA){ home.record.w++; away.record.l++; }
    else { away.record.w++; home.record.l++; }
  }
  function simulateWeek(){
    var L = state.league;
    if (L.week > L.schedule.length){ if (!state.playoffs) { startPlayoffs(); location.hash = "#/playoffs"; return; } return; }
    var pairings = L.schedule[L.week-1];
    var results = [];
    for (var i=0;i<pairings.length;i++){
      var pair = pairings[i];
      if (pair.bye !== undefined){ results.push({bye: pair.bye}); continue; }
      var sH = rand(13,34), sA = rand(10,31);
      var home = L.teams[pair.home], away = L.teams[pair.away];
      results.push({home: pair.home, away: pair.away, scoreHome: sH, scoreAway: sA, homeWin: sH>sA});
      applyResult(home, away, sH, sA);
    }
    L.resultsByWeek[L.week] = results;
    L.week++;
    if (L.week > L.schedule.length){ setStatus("Regular season complete. Playoffs ready."); }
    renderHub();
  }

  // AI trade suggestion and weekly trades
  function teamNeedProfile(team){
    var target = DEPTH_NEEDS;
    var byPos = {}; POSITIONS.forEach(function(p){byPos[p]=[];});
    team.roster.forEach(function(p){ byPos[p.pos].push(p); });
    POSITIONS.forEach(function(p){ byPos[p].sort(function(a,b){return b.ovr-a.ovr;}); });
    var profile = {};
    for (var pos in target){
      var need = target[pos];
      var have = byPos[pos].length;
      var top = byPos[pos].slice(0, Math.max(1, need));
      var quality = top.length? top.reduce(function(s,x){return s+x.ovr;},0)/top.length : 50;
      var countGap = Math.max(0, need - have);
      var qualityGap = Math.max(0, 80 - quality);
      profile[pos] = {countGap:countGap, qualityGap:qualityGap, score: countGap*6 + qualityGap*0.6};
    }
    return profile;
  }
  function teamSurplusPositions(team){
    var byPos = {}; POSITIONS.forEach(function(p){byPos[p]=0;});
    team.roster.forEach(function(p){byPos[p.pos]++;});
    var surplus = [];
    for (var pos in DEPTH_NEEDS){
      var extra = byPos[pos] - DEPTH_NEEDS[pos];
      if (extra>0) surplus.push(pos);
    }
    return surplus;
  }
  function pickBestTradeCounterpart(L, teamA){
    var needs = teamNeedProfile(teamA);
    var needOrder = Object.keys(needs).sort(function(a,b){return needs[b].score - needs[a].score;});
    var best = null, bestScore = -1;
    for (var i=0;i<L.teams.length;i++){
      var teamB = L.teams[i]; if (teamB===teamA) continue;
      var bSurplus = new Set(teamSurplusPositions(teamB));
      var match = 0;
      for (var j=0;j<needOrder.length;j++){
        var pos = needOrder[j];
        var weight = (needOrder.length - j);
        if (bSurplus.has(pos)) match += weight;
      }
      if (match>bestScore){ bestScore = match; best = teamB; }
    }
    return best;
  }
  function chooseTradePieces(teamA, teamB){
    var needsA = teamNeedProfile(teamA);
    var needsB = teamNeedProfile(teamB);
    var wantA = Object.keys(needsA).sort(function(a,b){return needsA[b].score - needsA[a].score;});
    var wantB = Object.keys(needsB).sort(function(a,b){return needsB[b].score - needsB[a].score;});
    function tradable(team, pos){
      var pool = team.roster.filter(function(p){return p.pos===pos;}).sort(function(a,b){return a.ovr-b.ovr;});
      if (pool.length <= (DEPTH_NEEDS[pos]||1)) return null;
      return pool[0] || null;
    }
    var offerFromB = null;
    for (var i=0;i<wantA.length;i++){ offerFromB = tradable(teamB, wantA[i]); if (offerFromB) break; }
    var offerFromA = null;
    for (var j=0;j<wantB.length;j++){ offerFromA = tradable(teamA, wantB[j]); if (offerFromA) break; }
    return {fromB: offerFromB, fromA: offerFromA};
  }
  function adjustValueForNeed(rawValue, receiverTeam, player){
    var needs = teamNeedProfile(receiverTeam);
    var posNeed = (needs[player.pos] ? needs[player.pos].score : 0) || 0;
    var factor = 1 + Math.min(0.3, posNeed/40);
    return rawValue * factor;
  }
  function buildSuggestionForTeams(teamA, teamB){
    var pieces = chooseTradePieces(teamA, teamB);
    if (!pieces.fromA && !pieces.fromB) return null;
    var packageA = [], packageB = [];
    if (pieces.fromA) packageA.push(pieces.fromA);
    if (pieces.fromB) packageB.push(pieces.fromB);
    var valA = 0, valB = 0, i;
    for (i=0;i<packageA.length;i++) valA += adjustValueForNeed(valueOf(packageA[i]), teamB, packageA[i]);
    for (i=0;i<packageB.length;i++) valB += adjustValueForNeed(valueOf(packageB[i]), teamA, packageB[i]);
    function smallestPick(team){ return team.picks.slice().sort(function(a,b){return pickValue(a)-pickValue(b);})[0] || null; }
    var guard=0;
    while (Math.abs(valA - valB) > 8 && guard++<4){
      if (valA < valB){
        var pkA = smallestPick(teamA); if (!pkA) break;
        packageA.push(pkA); valA += pickValue(pkA);
      } else {
        var pkB = smallestPick(teamB); if (!pkB) break;
        packageB.push(pkB); valB += pickValue(pkB);
      }
    }
    return {teamA:teamA, teamB:teamB, packageA:packageA, packageB:packageB, valA:valA, valB:valB};
  }
  function validateSuggestionCapsAndFairness(sug){
    var L = state.league;
    var A = sug.packageA.filter(function(x){return !x.round;});
    var B = sug.packageB.filter(function(x){return !x.round;});
    var valA = sug.valA, valB = sug.valB;
    var fair = Math.abs(valA - valB) <= 15;
    var capA = sug.teamA.capUsed - A.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0) + B.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0);
    var capB = sug.teamB.capUsed - B.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0) + A.reduce(function(s,p){return s+capHitFor(p,0,L.season);},0);
    var capOK = capA <= sug.teamA.capTotal && capB <= sug.teamB.capTotal;
    return fair && capOK;
  }
  function executeSuggestion(sug){
    var L = state.league;
    var A_players = sug.packageA.filter(function(x){return !x.round;});
    var B_players = sug.packageB.filter(function(x){return !x.round;});
    var A_picks = sug.packageA.filter(function(x){return x.round;});
    var B_picks = sug.packageB.filter(function(x){return x.round;});
    sug.teamA.roster = sug.teamA.roster.filter(function(p){return !A_players.some(function(x){return x.id===p.id;});}).concat(B_players).sort(function(x,y){return y.ovr-x.ovr;});
    sug.teamB.roster = sug.teamB.roster.filter(function(p){return !B_players.some(function(x){return x.id===p.id;});}).concat(A_players).sort(function(x,y){return y.ovr-x.ovr;});
    sug.teamA.picks = sug.teamA.picks.filter(function(pk){return !A_picks.some(function(x){return x.id===pk.id;});}).concat(B_picks);
    sug.teamB.picks = sug.teamB.picks.filter(function(pk){return !B_picks.some(function(x){return x.id===pk.id;});}).concat(A_picks);
    recalcCap(L, sug.teamA); recalcCap(L, sug.teamB);
  }

  function assetLabel(asset, nowSeason){
    if (asset.round) return 'Y'+(nowSeason + (asset.year-1))+' R'+asset.round;
    return asset.name+' ('+asset.pos+' '+asset.ovr+')';
  }
  function logTrade(sug){
    var L = state.league;
    L.news = L.news || [];
    var now = L.season;
    var aOut = sug.packageA.map(function(x){return assetLabel(x, now);}).join(", ");
    var bOut = sug.packageB.map(function(x){return assetLabel(x, now);}).join(", ");
    L.news.push('Trade: '+sug.teamA.abbr+' send '+aOut+' to '+sug.teamB.abbr+' for '+bOut);
  }
  function tryOfferToUser(){
    var L = state.league;
    var userIdx = parseInt(($("#userTeam")?$("#userTeam").value:"0") || "0",10);
    var user = L.teams[userIdx];
    var counterpart = pickBestTradeCounterpart(L, user);
    if (!counterpart) return;
    var sug = buildSuggestionForTeams(counterpart, user);
    if (!sug) return;
    if (!validateSuggestionCapsAndFairness(sug)) return;
    state.pendingOffers = state.pendingOffers || [];
    state.pendingOffers.push({ from: counterpart.abbr, to: user.abbr, packageFrom: sug.packageA, packageTo: sug.packageB });
    renderOffers();
  }
  function renderOffers(){
    var box = $("#hubOffers"); if (!box) return;
    box.innerHTML = "";
    var L = state.league;
    var now = L.season;
    var offers = state.pendingOffers || [];
    if (!offers.length){
      var d = document.createElement("div"); d.className="muted"; d.textContent = "No offers.";
      box.appendChild(d); return;
    }
    offers.forEach(function(off, idx){
      var d = document.createElement("div"); d.className="row";
      var fromList = off.packageFrom.map(function(x){return assetLabel(x, now);}).join(", ");
      var toList = off.packageTo.map(function(x){return assetLabel(x, now);}).join(", ");
      d.innerHTML = '<div>'+off.from+' offers '+fromList+' for '+off.to+'\'s '+toList+'</div><div class="spacer"></div>'+
                    '<button class="offer-btn decline" data-off="'+idx+'" data-act="decline">Decline</button>'+
                    '<button class="offer-btn accept" data-off="'+idx+'" data-act="accept">Accept</button>';
      box.appendChild(d);
    });
  }
  document.addEventListener("click", function(e){
    var t = e.target;
    if (!t || !t.dataset || !t.dataset.act) return;
    var idx = Number(t.dataset.off);
    if (!state.pendingOffers || !state.pendingOffers[idx]) return;
    var off = state.pendingOffers[idx];
    if (t.dataset.act==="decline"){
      state.pendingOffers.splice(idx,1); renderOffers(); setStatus("Offer declined."); return;
    }
    if (t.dataset.act==="accept"){
      var L = state.league;
      var user = L.teams.find(function(tm){return tm.abbr===off.to;});
      var other = L.teams.find(function(tm){return tm.abbr===off.from;});
      var sug = {teamA: other, teamB: user, packageA: off.packageFrom, packageB: off.packageTo, valA: 0, valB:0};
      if (validateSuggestionCapsAndFairness(sug)){ executeSuggestion(sug); logTrade(sug); setStatus("Trade accepted."); }
      else { setStatus("Offer invalid due to cap or value change."); }
      state.pendingOffers.splice(idx,1); renderOffers(); renderRoster();
    }
  });

  // Hook weekly AI into week advance
  var _simulateWeekOrig = simulateWeek;
  simulateWeek = function(){
    _simulateWeekOrig();
    aiWeeklyTrades();
    renderOffers();
  };
  function weeklyTradeProbability(week){
    if (week <= 2) return 0.03;
    if (week <= 6) return 0.06;
    if (week <= 8) return 0.12;
    if (week === 9) return 0.35;
    return 0.0;
  }
  function aiWeeklyTrades(){
    var L = state.league;
    var wk = Math.min(L.week, 18);
    var p = weeklyTradeProbability(wk);
    if (p <= 0) return;
    var attempts = wk === 9 ? 2 : 1;
    var executed = 0;
    for (var i=0; i<attempts; i++){
      if (Math.random() > p) continue;
      var targetUser = Math.random() < 0.2;
      if (targetUser){
        tryOfferToUser();
      } else {
        var tA = choice(L.teams);
        var tB = pickBestTradeCounterpart(L, tA);
        if (!tB || tA===tB) continue;
        var sug = buildSuggestionForTeams(tA, tB);
        if (!sug) continue;
        if (validateSuggestionCapsAndFairness(sug)){
          executeSuggestion(sug);
          logTrade(sug);
          executed++;
        }
      }
    }
    if (executed>0) setStatus(executed+' AI trade'+(executed>1?'s':'')+' executed.');
  }

  // Helpers
  function currentTeam(){
    var L = state.league;
    var idx = parseInt(($("#userTeam")?$("#userTeam").value:"0") || "0", 10);
    return L.teams[idx];
  }
  function fillTeamSelect(sel){
    var L = state.league; if (!L) return;
    sel.innerHTML = "";
    L.teams.forEach(function(t,i){
      var opt = document.createElement("option");
      opt.value = String(i);
      var conf = CONF_NAMES[t.conf] + " " + DIV_NAMES[t.div];
      opt.textContent = t.abbr + " — " + t.name + " (" + conf + ")";
      sel.appendChild(opt);
    });
  }

  // Offseason rollover and aging
  function runOffseason(){
    var L = state.league;

    var ranks = computeLastDivisionRanks(L);
    L.teams.forEach(function(t,i){ t.lastDivisionRank = ranks[i]; });

    for (var ti=0; ti<L.teams.length; ti++){
      var t = L.teams[ti];
      recalcCap(L, t);
      var room = Math.max(0, t.capTotal - t.capUsed);
      t.capRollover = Math.round(room*10)/10;
      var survivors = [];
      for (var pi=0; pi<t.roster.length; pi++){
        var p = t.roster[pi];
        if (p.years>0) p.years -= 1;
        if (p.years === 0){
          state.freeAgents.push(p);
        } else {
          p.age += 1;
          p.ovr = clamp(p.ovr + rand(-2,2), 48, 99);
          survivors.push(p);
        }
      }
      t.roster = survivors.sort(function(a,b){return b.ovr-a.ovr;});
      for (var pk=0; pk<t.picks.length; pk++){ t.picks[pk].year = Math.max(1, t.picks[pk].year - 1); }
      var needed = 7 - t.picks.filter(function(pk){return pk.year===YEARS_OF_PICKS;}).length;
      for (var i2=0;i2<needed;i2++){ t.picks.push({year:YEARS_OF_PICKS, round:i2+1, from:t.abbr, id:id()}); }
      delete t.deadCapBook[L.season-1];
      recalcCap(L, t);
      t.record = {w:0,l:0,t:0,pf:0,pa:0};
    }
    L.season += 1;
    L.year = (L.year || YEAR_START) + 1;
    L.week = 1;
    L.resultsByWeek = {};
    L.schedule = makeAccurateSchedule(L);
  }

  // Onboarding modal behavior
  function openOnboard(){
    var modal = $("#onboardModal"); if (!modal) return;
    modal.hidden = false;
    var sel = $("#onboardTeam"); if (!sel) return;
    sel.innerHTML = "";
    var base = listByMode(state.namesMode || 'fictional');
    base.forEach(function(t,i){
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = t.abbr + " — " + t.name;
      sel.appendChild(opt);
    });
  }
  function closeOnboard(){ var m=$("#onboardModal"); if (m) m.hidden = true; }

  document.addEventListener("click", function(e){
    if (e.target && e.target.id==="onboardClose"){ closeOnboard(); }
    if (e.target && e.target.id==="onboardRandom"){
      var sel = $("#onboardTeam");
      if (sel){ sel.value = String(Math.floor(Math.random()* (listByMode(state.namesMode).length))); }
    }
    if (e.target && e.target.id==="onboardStart"){
      var chosenMode = (document.querySelector('input[name=namesMode]:checked')||{}).value || "fictional";
      state.namesMode = chosenMode;
      var teamList = listByMode(chosenMode);
      state.league = makeLeague(teamList);
      state.league.year = YEAR_START;
      state.onboarded = true;
      var teamIdx = parseInt(($("#onboardTeam")?$("#onboardTeam").value:"0") || "0", 10);
      var userSel = $("#userTeam"); if (userSel){ fillTeamSelect(userSel); userSel.value = String(teamIdx); }
      rebuildTeamLabels(chosenMode);
      closeOnboard();
      location.hash = "#/hub";
      setStatus("Season started");
      refreshAll();
    }
    if (e.target && e.target.id==="btnApplyNamesMode"){
      var chosenMode2 = (document.querySelector('input[name=settingsNamesMode]:checked')||{}).value || state.namesMode;
      state.namesMode = chosenMode2;
      rebuildTeamLabels(chosenMode2);
      setStatus("Team names updated");
    }
  });

  // Settings: Apply Year
  document.addEventListener("click", function(e){
    if (e.target && e.target.id === "btnApplyYear"){
      var inp = document.getElementById("settingsYear");
      var newY = clampYear(inp ? inp.value : YEAR_START);
      if (!state.league){ setStatus("Start a league first."); return; }
      if (!confirm("This will reseed the schedule and reset the current week. Continue?")) return;
      var L = state.league;
      L.year = newY;
      L.week = 1;
      L.resultsByWeek = {};
      L.schedule = makeAccurateSchedule(L);
      state.pendingSuggestion = null;
      state.pendingOffers = [];
      renderSchedule();
      renderHub();
      setStatus("Year applied and schedule reseeded.");
    }
  });

  // Save/Load/New
  var btnSave = $("#btnSave");
  if (btnSave) btnSave.onclick = function(){
    var payload = JSON.stringify({league: state.league, prospects: state.prospects, freeAgents: state.freeAgents, playoffs: state.playoffs, namesMode: state.namesMode});
    localStorage.setItem(SAVE_KEY, payload);
    setStatus("Saved");
  };
  var btnLoad = $("#btnLoad");
  if (btnLoad) btnLoad.onclick = function(){
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw){ setStatus("Nothing to load"); return; }
    var obj = {};
    try{ obj = JSON.parse(raw)||{}; }catch(e){ obj = {}; }
    state.league = obj.league; state.prospects = obj.prospects||[]; state.freeAgents = obj.freeAgents||[]; state.playoffs = (obj.playoffs===undefined?null:obj.playoffs);
    refreshAll();
    setStatus("Loaded");
  };
  var btnNew = $("#btnNewLeague");
  if (btnNew) btnNew.onclick = function(){
    if (confirm("Start a new league, clears progress")){ state.onboarded=false; openOnboard(); }
  };

  function refreshAll(){
    var userSel = $("#userTeam");
    if (userSel && !userSel.dataset.filled){
      fillTeamSelect(userSel);
      userSel.dataset.filled="1";
      var pitIdx = state.league.teams.findIndex(function(t){return t.abbr==="PIT";});
      userSel.value = String(pitIdx>=0?pitIdx:0);
      userSel.addEventListener("change", function(){ renderRoster(); updateCapSidebar(); });
    }
    renderHub(); renderRoster(); renderCap(); renderSchedule(); renderStandings(); renderTradeUI(); renderFreeAgency(); renderDraft(); renderPlayoffs();
  }

  var btnSimW = $("#btnSimWeek");
  if (btnSimW) btnSimW.onclick = function(){ if(!state.onboarded){ openOnboard(); return; } simulateWeek(); };
  var btnSimS = $("#btnSimSeason");
  if (btnSimS) btnSimS.onclick = function(){ if(!state.onboarded){ openOnboard(); return; } for (var i=0;i<999;i++){ if (state.league.week > state.league.schedule.length) break; simulateWeek(); } };
  var btnSimR = $("#btnSimRound"); if (btnSimR) btnSimR.addEventListener("click", simulatePlayoffRound);

  (function init(){
    var obj = {};
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw){
      try {
        obj = JSON.parse(raw);
        if (typeof obj !== "object" || obj === null) obj = {};
      } catch(e) {
        console.error("Failed to parse saved league data:", e);
      }
    }
    state.league = obj.league || makeLeague();
    state.prospects = obj.prospects || [];
    state.freeAgents = obj.freeAgents || [];
    state.playoffs = (obj.playoffs===undefined ? null : obj.playoffs);
    var seg = location.hash.replace("#/","") || "hub";
    show(routes.indexOf(seg)>=0 ? seg : "hub");
  })();

})();
