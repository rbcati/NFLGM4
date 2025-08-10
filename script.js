// NFL GM Simulator
(function () {
  // Global error banner for quick diagnosis
  window.addEventListener('error', function(e){
    try{
      const div = document.createElement('div');
      div.style.cssText='position:fixed;left:0;right:0;top:0;z-index:9999;background:#3b0d0d;color:#fff;padding:8px 12px;font-family:system-ui;box-shadow:0 2px 6px rgba(0,0,0,.4)';
      div.textContent = 'JS error: ' + (e.message||'') + ' @ ' + (e.filename||'') + ':' + (e.lineno||'');
      document.body.appendChild(div);
    }catch(_){/* noop */}
  });
  const YEAR_START = 2025;
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const SAVE_KEY = "nflGM.league.contracts.picks";

  const state = { league: null, prospects: [], freeAgents: [], playoffs: null, namesMode: 'fictional', onboarded: false, pendingOffers: [] };

  const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K"];
  const DEPTH_NEEDS = { QB:1, RB:1, WR:3, TE:1, OL:5, DL:4, LB:3, CB:2, S:2, K:1 };
  
  // ---- Standings helpers (top-level) ----
function pct(rec) {
  var w = Number(rec.w) || 0;
  var l = Number(rec.l) || 0;
  var t = Number(rec.t) || 0;
  var g = w + l + t;
  return g ? (w + 0.5 * t) / g : 0;
}

function cmpTeams(aIdx, bIdx) {
  // Uses your existing NFL tiebreaker comparator
  return tieBreakCompare(state.league, aIdx, bIdx, "league");
}

  // Official teams with abbreviations and accurate divisions
  // conf: 0 = AFC, 1 = NFC; div: 0 = East, 1 = North, 2 = South, 3 = West
  const TEAM_META_REAL = [
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

  // Fictional teams (same order length, generic conf/div by index)
  const TEAM_META_FICTIONAL = [
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

  const TEAM_LIST_REAL = [
    ["ARI","Arizona Cardinals"],["ATL","Atlanta Falcons"],["BAL","Baltimore Ravens"],["BUF","Buffalo Bills"],
    ["CAR","Carolina Panthers"],["CHI","Chicago Bears"],["CIN","Cincinnati Bengals"],["CLE","Cleveland Browns"],
    ["DAL","Dallas Cowboys"],["DEN","Denver Broncos"],["DET","Detroit Lions"],["GB","Green Bay Packers"],
    ["HOU","Houston Texans"],["IND","Indianapolis Colts"],["JAX","Jacksonville Jaguars"],["KC","Kansas City Chiefs"],
    ["LV","Las Vegas Raiders"],["LAC","Los Angeles Chargers"],["LAR","Los Angeles Rams"],["MIA","Miami Dolphins"],
    ["MIN","Minnesota Vikings"],["NE","New England Patriots"],["NO","New Orleans Saints"],["NYG","New York Giants"],
    ["NYJ","New York Jets"],["PHI","Philadelphia Eagles"],["PIT","Pittsburgh Steelers"],["SEA","Seattle Seahawks"],
    ["SF","San Francisco 49ers"],["TB","Tampa Bay Buccaneers"],["TEN","Tennessee Titans"],["WAS","Washington Commanders"]
  ];

  const TEAM_LIST = [
    ["ARI","Arizona Scorpions"],["ATL","Atlanta Flight"],["BAL","Baltimore Crabs"],["BUF","Buffalo Blizzard"],
    ["CAR","Carolina Lynx"],["CHI","Chicago Hammers"],["CIN","Cincinnati Tigers"],["CLE","Cleveland Dawgs"],
    ["DAL","Dallas Mustangs"],["DEN","Denver Peaks"],["DET","Detroit Motors"],["GB","Green Bay Wolves"],
    ["HOU","Houston Comets"],["IND","Indianapolis Racers"],["JAX","Jacksonville Sharks"],["KC","Kansas City Kings"],
    ["LV","Las Vegas Aces"],["LAC","Los Angeles Lightning"],["LAR","Los Angeles Guardians"],["MIA","Miami Surge"],
    ["MIN","Minnesota North"],["NE","New England Minutemen"],["NO","New Orleans Spirits"],["NYG","New York Giants*"],
    ["NYJ","New York Jets*"],["PHI","Philadelphia Liberty"],["PIT","Pittsburgh Iron"],["SEA","Seattle Orcas"],
    ["SF","San Francisco Gold"],["TB","Tampa Bay Cannons"],["TEN","Tennessee Twang"],["WAS","Washington Sentinels"]
  ];
  const CONF_NAMES = ["AFC","NFC"];
  const DIV_NAMES = ["East","North","South","West"];

  const CAP_BASE = 220; // M
  const YEARS_OF_PICKS = 3;

  function rand(n, m){return Math.floor(Math.random()*(m-n+1))+n}
  function choice(a){return a[Math.floor(Math.random()*a.length)]}
  function clamp(x, a, b){return Math.max(a, Math.min(b, x))}
  function id(){return Math.random().toString(36).slice(2, 10)}
  function avg(a){return a.length? a.reduce((s,x)=>s+x,0)/a.length : 0}

  // Player factory with contract fields
  function makePlayer(pos){
    const speed = clamp(rand(50, 95) + (pos==="WR"||pos==="CB"?+6:0) + (pos==="OL"||pos==="DL"?-8:0), 40, 99);
    const strength = clamp(rand(50, 95) + (pos==="OL"||pos==="DL"?+6:0) + (pos==="WR"||pos==="CB"?-8:0), 40, 99);
    const agility = clamp(rand(50, 95), 40, 99);
    const awareness = clamp(rand(40, 92), 30, 99);
    const ovr = clamp(Math.round((speed*0.25 + strength*0.25 + agility*0.2 + awareness*0.3)/1.15), 50, 99);
    const baseAnnual = Math.round(0.42*ovr*10)/10;
    const years = rand(1,4);
    const signingBonus = Math.round((baseAnnual * years * (0.25 + Math.random()*0.35))*10)/10; // 25% to 60% of total base
    const guaranteedPct = 0.5;
    return {
      id: id(), name: choice(FIRST)+" "+choice(LAST), pos, age: rand(21,34),
      speed, strength, agility, awareness, ovr,
      // contract
      years, yearsTotal: years, baseAnnual, signingBonus, guaranteedPct,
      injuryWeeks: 0, fatigue: 0, abilities: [],
    };
  }

  const FIRST=["James","Michael","Chris","Alex","Jordan","Tyler","Jacob","Ethan","Logan","Mason","Liam","Noah","Owen","Jaden","Austin","Evan","Blake","Wyatt","Carson","Aiden","Dylan","Hunter","Cole","Kai","Zion","Nico","Xavier","Trent","Shawn","Brett","Marcus","Isaiah","Jamal","Elijah","Cameron","Trevor","Devon","Shane","Aaron","Caleb","Nick","Matt","Jake","Josh","Troy"];
  const LAST=["Johnson","Smith","Williams","Brown","Jones","Miller","Davis","Garcia","Rodriguez","Wilson","Martinez","Anderson","Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lopez","Lee","Gonzalez","Harris","Clark","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Reed","Cook","Bell","Perez","Hill","Green"];

  // League creation
  function makeLeague(teamList){
    const baseList = teamList || TEAM_LIST; const teams = baseList.map((t, idx) => {
      const isArray = Array.isArray(t);
      const abbr = isArray ? t[0] : t.abbr;
      const name = isArray ? t[1] : t.name;
      const conf = isArray ? Math.floor(idx/16) : t.conf;
      const div  = isArray ? Math.floor((idx%16)/4) : t.div;
      return {
        id: idx, abbr, name,
        rating: rand(70, 88), roster: [], record: {w:0,l:0,t:0,pf:0,pa:0},
        conf, div,
        capBook: {}, deadCapBook: {}, capRollover: 0,
        capTotal: CAP_BASE,
        picks: [],
        strategy: { passBias: 0.5, tempo: 1.0, aggression: 1.0, coachSkill: Math.random()*0.4 + 0.6 },
      };
    });
    for (const tm of teams){
      const roster = [];
      const template = {QB:2,RB:3,WR:5,TE:2,OL:7,DL:7,LB:5,CB:5,S:3,K:1};
      for (const [pos, count] of Object.entries(template)){
        for (let i=0;i<count;i++){
          const p = makePlayer(pos);
          tagAbilities(p);
          roster.push(p);
        }
      }
      tm.roster = roster.sort((a,b)=>b.ovr-a.ovr);
      seedTeamPicks(tm, 1, YEARS_OF_PICKS);
      tm.rating = Math.round(0.6*avg(tm.roster.map(p=>p.ovr)) + 0.4*tm.rating);
    }
    const schedule = makeAccurateSchedule(L);
    const L = {
      seed: rand(1, 999999), season: 1, year: YEAR_START, week: 1,
      teams, schedule, resultsByWeek: {}, playoffsDone: false, champion: null
    };
    for (const t of teams) recalcCap(L, t);

    // Seed lastDivisionRank based on current ratings for year 1
    const tmpRanks = computeLastDivisionRanks(L);
    L.teams.forEach((t,i)=>{ t.lastDivisionRank = tmpRanks[i]; });

    return L;
  }

  function seedTeamPicks(team, startSeason, count){
    team.picks = [];
    for (let y=0; y<count; y++){
      for (let r=1; r<=7; r++){
        team.picks.push({year: startSeason + y, round: r, from: team.abbr, id: id()});
      }
    }
  }

  function tagAbilities(p){
    if (p.pos==="QB" && p.speed>=85 && p.agility>=85) p.abilities.push("Dual Threat");
    if (p.pos==="WR" && p.speed>=92) p.abilities.push("Deep Threat");
    if (p.pos==="RB" && p.strength>=92) p.abilities.push("Power Back");
    if (p.pos==="CB" && p.agility>=90 && p.awareness>=85) p.abilities.push("Ball Hawk");
    if (p.pos==="DL" && p.strength>=94) p.abilities.push("Run Stuffer");
    if (p.pos==="K" && p.awareness>=88) p.abilities.push("Clutch");
  }

  // Contract math
  function prorationPerYear(p){ return p.signingBonus / p.yearsTotal; }
  function capHitFor(p, relSeason, leagueSeason){
    // relSeason 0 means current league season
    const yearsFromNow = relSeason;
    if (p.years <= 0) return 0;
    if (yearsFromNow >= p.years) return 0;
    const base = p.baseAnnual;
    const pr = prorationPerYear(p);
    return Math.round((base + pr) * 10)/10;
  }

  function yearKey(league, relSeason){ return league.season + relSeason; }

  function recalcCap(league, team){
    // Sum active cap for current season
    const active = team.roster.reduce((s,p)=> s + capHitFor(p, 0, league.season), 0);
    const dead = team.deadCapBook[league.season] || 0;
    const capTotal = CAP_BASE + (team.capRollover||0);
    team.capTotal = Math.round(capTotal*10)/10;
    team.capUsed = Math.round((active + dead)*10)/10;
    team.deadCap = Math.round(dead*10)/10;
  }

  function releaseWithProration(league, team, p, isPostJune1){
    // Compute dead money split by June 1 logic
    const pr = prorationPerYear(p);
    const yearsLeft = p.years;
    if (yearsLeft <= 0) return;
    const currentSeason = league.season;
    // Guaranteed base for current year
    const gBase = p.baseAnnual * (p.guaranteedPct || 0);
    // Remaining proration including current year
    const remainingPr = pr * yearsLeft;
    if (isPostJune1 && yearsLeft > 1){
      // Current year dead is current year proration + guaranteed base
      addDead(team, currentSeason, pr + gBase);
      // All remaining proration after this year hits next year
      addDead(team, currentSeason + 1, remainingPr - pr);
    } else {
      // Pre-June 1, everything accelerates
      addDead(team, currentSeason, remainingPr + gBase);
    }
    // Remove player
    const idx = team.roster.findIndex(x=>x.id===p.id);
    if (idx>=0) team.roster.splice(idx,1);
    p.years = 0;
    // No FA re-add on release here, assume outright cut
  }

  function addDead(team, season, amount){
    team.deadCapBook[season] = Math.round(((team.deadCapBook[season]||0) + amount)*10)/10;
  }

  // Picks valuation
  function pickValue(pick){
    const base = {1: 25, 2: 15, 3: 8, 4: 5, 5: 3, 6: 2, 7: 1}[pick.round] || 1;
    const yearsOut = pick.year - state.league.season;
    const discount = Math.pow(0.8, yearsOut); // farther picks worth less
    return base * discount;
  }

  // 17-game schedule with byes
  
// ===== Accurate NFL-like schedule generation =====

// Canonical 4x4 host grids for division-vs-division blocks.
// 1 means the row division team hosts the column division team.
// We use the same canonical grid for all pairings and flip on the next cycle.
const HOST_GRID_CANON = [
  [1,0,1,0],
  [0,1,0,1],
  [1,0,1,0],
  [0,1,0,1],
];

function hostByGrid(aIndex, bIndex, flip){
  const bit = HOST_GRID_CANON[aIndex][bIndex];
  const h = flip ? (1-bit) : bit;
  return h === 1;
}

function divisionTeamsByConf(league){
  const by = {0:[[],[],[],[]], 1:[[],[],[],[]]};
  league.teams.forEach((t,i)=>{ by[t.conf][t.div].push(i); });
  return by;
}

function computeLastDivisionRanks(league){
  const ranks = Array(league.teams.length).fill(0);
  for (let conf=0; conf<2; conf++){
    for (let dv=0; dv<4; dv++){
      const idxs = league.teams.map((t,i)=>({i,t})).filter(x=>x.t.conf===conf && x.t.div===dv);
      idxs.sort((a,b)=>{
        const pa = pct(a.t.record), pb = pct(b.t.record);
        if (pa!==pb) return pb - pa;
        const pda = a.t.record.pf - a.t.record.pa;
        const pdb = b.t.record.pf - b.t.record.pa;
        if (pda!==pdb) return pdb - pda;
        return (b.t.rating||0) - (a.t.rating||0);
      });
      idxs.forEach((x,rank)=>{ ranks[x.i] = rank; });
    }
  }
  return ranks;
}

// 8-year inter-conference rotation: each division plays all 4 opposite-conference divisions twice in 8 years.
// Host flips on the second pass.
const INTER_ROT_8 = {
  0: [0,1,2,3, 0,1,2,3], // East
  1: [1,2,3,0, 1,2,3,0], // North
  2: [2,3,0,1, 2,3,0,1], // South
  3: [3,0,1,2, 3,0,1,2], // West
};

// 3-year intra-conference rotation embedded across 8 years (repeats 1,2,3,1,2,3,1,2). Host flips every repeat.
const INTRA_ROT_8 = {
  0: [1,2,3, 1,2,3, 1,2], // East
  1: [2,3,0, 2,3,0, 2,3], // North
  2: [3,0,1, 3,0,1, 3,0], // South
  3: [0,1,2, 0,1,2, 0,1], // West
};

function makeAccurateSchedule(league){
  const year = (league.year || (2025 + ((league.season||1)-1)));
  const by = divisionTeamsByConf(league);
  const lastRanks = computeLastDivisionRanks(league);
  const y8 = (year - 2025) % 8;
  const seventeenthHostConf = (year % 2 === 1) ? 0 : 1; // AFC hosts odd seasons

  const games = [];
  const keyset = new Set();
  function addGame(home, away){
    const k = home < away ? `${home}-${away}` : `${away}-${home}`;
    if (keyset.has(k)) return;
    keyset.add(k);
    games.push({home, away});
  }

  // 1) Division home-and-away (6 each)
  for (let conf=0; conf<2; conf++){
    for (let dv=0; dv<4; dv++){
      const teams = by[conf][dv];
      for (let i=0; i<teams.length; i++){
        for (let j=i+1; j<teams.length; j++){
          const a = teams[i], b = teams[j];
          games.push({home:a, away:b});
          games.push({home:b, away:a});
          keyset.add(`${Math.min(a,b)}-${Math.max(a,b)}`);
        }
      }
    }
  }

  // Host parity flags so the second pass flips home/away for divisional-cross slates
  const intraHostFlip = (Math.floor((season-1)/3) % 2) ? 1 : 0;  // flips every time we repeat the 3-year cycle
  const interHostFlip = (Math.floor((season-1)/4) % 2) ? 1 : 0;  // flips on second 4-year pass in the 8-year cycle

  // 2) Intra-conference 4-game set vs rotated division (2 home / 2 away each team)
  for (let conf=0; conf<2; conf++){
    for (let dv=0; dv<4; dv++){
      const targetDiv = INTRA_ROT_8[dv][y8];
      const A = by[conf][dv], B = by[conf][targetDiv];
      for (let i=0; i<4; i++){
        for (let j=0; j<4; j++){
          const a = A[i], b = B[j];
          // Balanced 2H/2A: base pattern (i+j) even = A hosts. Flip on cycle repeats.
          const hosts = hostByGrid(i, j, !!intraHostFlip);
          const home = hosts ? a : b;
          const away = hosts ? b : a;
          addGame(home, away);
        }
      }
    }
  }

  // 3) Inter-conference 4-game set vs rotated opposite division (2 home / 2 away each)
  for (let conf=0; conf<2; conf++){
    const other = conf===0 ? 1 : 0;
    for (let dv=0; dv<4; dv++){
      const targetDiv = INTER_ROT_8[dv][y8];
      const A = by[conf][dv], B = by[other][targetDiv];
      for (let i=0; i<4; i++){
        for (let j=0; j<4; j++){
          const a = A[i], b = B[j];
          // Balanced, flip on second 4-year pass
          const hosts = hostByGrid(i, j, !!interHostFlip);
          const home = hosts ? a : b;
          const away = hosts ? b : a;
          addGame(home, away);
        }
      }
    }
  }

  // Helper: get same-place team index
  function samePlaceTeam(conf, div, rank){
    const idxs = by[conf][div].slice().sort((x,y)=> lastRanks[x]-lastRanks[y]);
    return idxs[Math.min(rank, idxs.length-1)];
  }

  // 4) Two intra-conference same-place games vs the two divisions not in the 4-game intra set
  for (let conf=0; conf<2; conf++){
    for (let dv=0; dv<4; dv++){
      const A = by[conf][dv];
      const targ = INTRA_ROT_8[dv][y8];
      const otherDivs = [0,1,2,3].filter(x=>x!==dv && x!==targ);
      for (const t of A){
        const r = lastRanks[t];
        for (let k=0; k<otherDivs.length; k++){
          const od = otherDivs[k];
          const opp = samePlaceTeam(conf, od, r);
          if (t === opp) continue;
          // Alternate H/A year-to-year so each year teams get 1H/1A across the two games
          const home = ((year + k + r) % 2 === 0) ? t : opp;
          const away = home===t ? opp : t;
          addGame(home, away);
        }
      }
    }
  }

  // 5) 17th cross-conference same-place vs next inter rotation division; AFC hosts odd seasons
  for (let conf=0; conf<2; conf++){
    const other = conf===0 ? 1 : 0;
    for (let dv=0; dv<4; dv++){
      const A = by[conf][dv];
      const nextDiv = INTER_ROT_8[dv][(y8+1)%8];
      for (const t of A){
        const r = lastRanks[t];
        const opp = samePlaceTeam(other, nextDiv, r);
        if (t === opp) continue;
        const home = (league.teams[t].conf === seventeenthHostConf) ? t : opp;
        const away = home===t ? opp : t;
        addGame(home, away);
      }
    }
  }

  // Build schedule by weeks with byes 6–14
  const needed = Array(league.teams.length).fill(17);
  const byes = assignByes(league.teams.length);
  const weeks = Array.from({length:18}, ()=>[]);
  const played = Array.from({length:18}, ()=>Array(league.teams.length).fill(false));

  // Shuffle for dispersion
  for (let i=games.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [games[i],games[j]]=[games[j],games[i]]; }

  function canPlace(w,g){
    const h=g.home, a=g.away;
    if (byes[w] && (byes[w].has(h) || byes[w].has(a))) return false;
    if (played[w][h] || played[w][a]) return false;
    if (needed[h]<=0 || needed[a]<=0) return false;
    return true;
  }

  for (const g of games){
    if (needed[g.home]<=0 || needed[g.away]<=0) continue;
    let placed=false;
    for (let w=0; w<18; w++){
      if (canPlace(w,g)){
        weeks[w].push({home:g.home, away:g.away});
        played[w][g.home]=true; played[w][g.away]=true;
        needed[g.home]--; needed[g.away]--;
        placed = true; break;
      }
    }
    if (!placed){
      // fallback ignoring byes
      for (let w=0; w<18 && !placed; w++){
        if (!played[w][g.home] && !played[w][g.away]){
          weeks[w].push({home:g.home, away:g.away});
          played[w][g.home]=true; played[w][g.away]=true;
          needed[g.home]--; needed[g.away]--;
          placed=true; break;
        }
      }
    }
  }

  // Insert byes
  for (let w=0; w<18; w++){
    if (!byes[w]) continue;
    for (const t of byes[w]) weeks[w].push({bye:t});
  }

  return weeks;
}

// 1) Byes: weeks 6..14, quotas sum to teamCount (32)
function assignByes(teamCount) {
  // 9 bye weeks covering NFL weeks 6..14
  var quotas = [4,4,4,4,4,4,4,2,2]; // 32 total
  var weeks = new Array(18); // 0..17 regular season weeks
  for (var i = 0; i < weeks.length; i++) weeks[i] = null;

  // Basic sanity
  var sum = 0; for (var q = 0; q < quotas.length; q++) sum += quotas[q];
  if (sum !== teamCount) { throw new Error("assignByes quotas sum " + sum + " != teamCount " + teamCount); }

  // Pool of team indices
  var pool = [];
  for (var t = 0; t < teamCount; t++) pool.push(t);

  // Fisher–Yates shuffle
  for (var a = pool.length - 1; a > 0; a--) {
    var b = Math.floor(Math.random() * (a + 1));
    var tmp = pool[a]; pool[a] = pool[b]; pool[b] = tmp;
  }

  // Place byes into 0-indexed week slots 5..13 which correspond to NFL weeks 6..14
  var p = 0;
  for (var k = 0; k < quotas.length; k++) {
    var w = 5 + k; // 5..13
    var set = new Set();
    for (var c = 0; c < quotas[k] && p < pool.length; c++) {
      set.add(pool[p++]);
    }
    weeks[w] = set;
  }
  return weeks;
}

// 2) Validator to catch mistakes early
function validateByes(byes, teamCount) {
  var seen = new Array(teamCount); for (var i = 0; i < teamCount; i++) seen[i] = 0;
  for (var w = 0; w < byes.length; w++) {
    var s = byes[w];
    if (!s) continue;
    if (typeof s.has !== "function") throw new Error("byes[" + w + "] is not a Set");
    s.forEach(function (t) {
      if (seen[t]) { throw new Error("team " + t + " has multiple byes"); }
      seen[t] = 1;
    });
  }
  var total = 0; for (var j = 0; j < teamCount; j++) total += seen[j];
  if (total !== teamCount) { throw new Error("bye count " + total + " != teamCount " + teamCount); }
}

// 3) Greedy weekly placement that respects byes and avoids double-booking
function placeGamesIntoWeeks(games, teamCount, byes) {
  var weeks = []; for (var i = 0; i < 18; i++) weeks.push([]);
  var hasGame = []; for (var w = 0; w < 18; w++) {
    var row = []; for (var t = 0; t < teamCount; t++) row.push(false);
    hasGame.push(row);
  }

  function canPlace(w, g) {
    var h = g.home, a = g.away;
    var s = byes[w];
    if (s && (s.has(h) || s.has(a))) return false;
    if (hasGame[w][h] || hasGame[w][a]) return false;
    return true;
  }

  // Shuffle a copy for dispersion
  var shuffled = games.slice();
  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
  }

  // First pass: respect byes
  for (var g1 = 0; g1 < shuffled.length; g1++) {
    var G = shuffled[g1];
    var placed = false;
    for (var w1 = 0; w1 < 18; w1++) {
      if (canPlace(w1, G)) {
        weeks[w1].push(G);
        hasGame[w1][G.home] = true;
        hasGame[w1][G.away] = true;
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Second pass: ignore byes but still avoid double games in a week
      for (var w2 = 0; w2 < 18 && !placed; w2++) {
        if (!hasGame[w2][G.home] && !hasGame[w2][G.away]) {
          weeks[w2].push(G);
          hasGame[w2][G.home] = true;
          hasGame[w2][G.away] = true;
          placed = true;
          break;
        }
      }
    }
    if (!placed) {
      throw new Error("Could not place game " + G.home + " vs " + G.away);
    }
  }

  // Insert bye markers
  for (var w3 = 0; w3 < 18; w3++) {
    if (!byes[w3]) continue;
    byes[w3].forEach(function (t) { weeks[w3].push({ bye: t }); });
  }
  return weeks;
}


  
  function listByMode(mode){ return mode==='real' ? TEAM_META_REAL : TEAM_META_FICTIONAL; }
  
  function rebuildTeamLabels(mode){
    const L = state.league;
    const meta = listByMode(mode);
    if (!L || !L.teams || L.teams.length !== meta.length) return;
    L.teams.forEach((tm, i)=>{
      tm.abbr = meta[i].abbr;
      tm.name = meta[i].name;
      tm.conf = meta[i].conf;
      tm.div  = meta[i].div;
    });
    // Refresh selects
    $$("select").forEach(sel=>{
      if (sel.id==="onboardTeam") return;
      const prev = sel.value;
      sel.innerHTML = "";
      L.teams.forEach((t, i)=>{
        const opt = document.createElement("option");
        opt.value = String(i);
        const conf = `${CONF_NAMES[t.conf]} ${DIV_NAMES[t.div]}`;
        opt.textContent = `${t.abbr} — ${t.name} (${conf})`;
        sel.appendChild(opt);
      });
      if (prev) sel.value = prev;
    });
    // Repaint key views
    renderHub(); renderRoster(); renderStandings(); renderDraft();
  }

// UI wiring
  const routes = ["hub","roster","cap","schedule","standings","trade","freeagency","draft","playoffs","settings"];
  function show(route){
    routes.forEach(r => {
      const el = $("#"+r);
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
    if (route === "settings") { const y = (state.league && state.league.year) ? state.league.year : YEAR_START; const el = document.getElementById("settingsYear"); if (el) el.value = y; }
  }
  window.addEventListener("hashchange", () => {
    const seg = location.hash.replace("#/","") || "hub";
    show(routes.includes(seg) ? seg : "hub");
  });

  function setStatus(msg){
    const el = $("#statusMsg"); if (!el) return;
    el.textContent = msg;
    setTimeout(()=>{ el.textContent=""; }, 2000);
  }

  // Hub
  function renderHub(){
    const L = state.league;
    $("#hubSeason").textContent = L.year;
    $("#hubWeek").textContent = L.week;
    $("#hubWeeks").textContent = L.schedule.length;
    $("#seasonNow").textContent = L.year;
    const games = (L.schedule[L.week-1] || []).filter(g=>!g.bye);
    $("#hubGames").textContent = games.length;
    const res = L.resultsByWeek[L.week-1] || [];
    const box = $("#hubResults"); box.innerHTML="";
    res.forEach(g=>{
      if (g.bye) return;
      const t1 = L.teams[g.home].abbr, t2 = L.teams[g.away].abbr;
      const div = document.createElement("div");
      div.className="row";
      div.innerHTML = `<div>${t2} ${g.scoreAway} at ${t1} ${g.scoreHome}</div>
                       <div class="spacer"></div>
                       <div class="muted">${g.homeWin?L.teams[g.home].name:L.teams[g.away].name} wins</div>`;
      box.appendChild(div);
    });
    updateCapSidebar();
  }

  function updateCapSidebar(){
    const L = state.league;
    const t = currentTeam();
    recalcCap(L, t);
    $("#capUsed").textContent = t.capUsed.toFixed(1) + " M";
    $("#capTotal").textContent = t.capTotal.toFixed(1) + " M";
    $("#deadCap").textContent = (t.deadCap||0).toFixed(1) + " M";
    $("#capRoom").textContent = (t.capTotal - t.capUsed).toFixed(1) + " M";
  }

  // Roster
  function renderRoster(){
    const L = state.league;
    const sel = $("#rosterTeam");
    if (!sel.dataset.filled){
      fillTeamSelect(sel);
      sel.dataset.filled = "1";
      sel.addEventListener("change", renderRoster);
    }
    const teamId = parseInt(sel.value || $("#userTeam").value || "0", 10);
    sel.value = teamId;
    const tm = L.teams[teamId];
    $("#rosterTitle").textContent = `Roster — ${tm.name} (${tm.abbr})`;
    const tbl = $("#rosterTable");
    tbl.innerHTML = `<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base (M)</th><th>Bonus (tot)</th><th>Years</th><th>Cap Hit</th><th>Abilities</th><th>Status</th></tr></thead>`;
    const tb = document.createElement("tbody");
    tm.roster.forEach(p=>{
      const inj = p.injuryWeeks>0 ? `Out ${p.injuryWeeks}w` : (p.fatigue>0?`Fatigue ${p.fatigue}`:"OK");
      const cap = capHitFor(p, 0, L.season);
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><input type="checkbox" data-id="${p.id}"></td>
                      <td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td>
                      <td>${p.baseAnnual.toFixed(1)}</td><td>${p.signingBonus.toFixed(1)}</td>
                      <td>${p.years}</td><td>${cap.toFixed(1)}</td>
                      <td>${(p.abilities||[]).join(", ")}</td><td>${inj}</td>`;
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    $("#btnRelease").onclick = ()=>releaseSelected(tm);
    const dc = autoDepthChart(tm);
    const box = $("#depthChart"); box.innerHTML="";
    for (const [pos, list] of Object.entries(dc)){
      const div = document.createElement("div");
      div.className = "row";
      const names = list.map(p=>`${p.name} (${p.ovr})`).join(", ");
      div.innerHTML = `<div><strong>${pos}</strong></div><div class="spacer"></div><div class="muted">${names}</div>`;
      box.appendChild(div);
    }
    updateCapSidebar();
  }

  function releaseSelected(team){
    const ids = $$("input[type=checkbox][data-id]:checked").map(x=>x.dataset.id);
    if (!ids.length){ setStatus("Select players to release."); return; }
    const isPost = $("#postJune1").checked;
    ids.forEach(id=>{
      const p = team.roster.find(x=>x.id===id);
      if (p) releaseWithProration(state.league, team, p, isPost);
    });
    recalcCap(state.league, team);
    setStatus(isPost ? "Released with post-June 1 split." : "Released with acceleration.");
    renderRoster();
  }

  function autoDepthChart(team){
    const byPos = {};
    for (const pos of POSITIONS){ byPos[pos] = []; }
    team.roster.forEach(p=>{ byPos[p.pos].push(p); });
    for (const pos of POSITIONS){ byPos[pos].sort((a,b)=>b.ovr-a.ovr); }
    const depth = {};
    for (const [pos, need] of Object.entries(DEPTH_NEEDS)){
      depth[pos] = byPos[pos].slice(0, need);
    }
    return depth;
  }

  // Cap table
  function renderCap(){
    const L = state.league;
    const t = currentTeam();
    recalcCap(L, t);
    const years = [0,1,2];
    const tbl = $("#capTable");
    tbl.innerHTML = `<thead><tr><th>Player</th>${years.map(y=>`<th>Y${L.year+y}</th>`).join("")}</tr></thead>`;
    const tb = document.createElement("tbody");
    t.roster.forEach(p=>{
      const row = document.createElement("tr");
      row.innerHTML = `<td>${p.name} • ${p.pos}</td>` + years.map(y=>{
        const hit = capHitFor(p, y, L.season);
        return `<td>${hit?hit.toFixed(1):""}</td>`;
      }).join("");
      tb.appendChild(row);
    });
    tbl.appendChild(tb);
    const deadBox = $("#deadLedger"); deadBox.innerHTML="";
    years.forEach(y=>{
      const yr = L.year + y;
      const amt = t.deadCapBook[yr] || 0;
      const div = document.createElement("div");
      div.className = "row";
      div.innerHTML = `<div class="badge">Season ${yr}</div><div class="spacer"></div><div>Dead cap ${amt.toFixed(1)} M</div>`;
      deadBox.appendChild(div);
    });
    const capSummary = $("#capSummary");
    capSummary.textContent = `Current cap used ${t.capUsed.toFixed(1)} M, total ${t.capTotal.toFixed(1)} M, room ${(t.capTotal-t.capUsed).toFixed(1)} M. Rollover after season applies if room is positive.`;
    updateCapSidebar();
  }

  // Schedule and sim minimal (reuse simple model)
  function renderSchedule(){
    const L = state.league;
    $("#btnSimWeek2").onclick = () => simulateWeek();
    const week = L.week;
    const games = L.schedule[week-1] || [];
    const box = $("#scheduleList"); box.innerHTML="";
    const byeTeams = games.filter(g=>g.bye).map(g=>L.teams[g.bye].abbr);
    if (byeTeams.length){
      const d = document.createElement("div");
      d.className = "muted";
      d.textContent = `Byes: ${byeTeams.join(", ")}`;
      box.appendChild(d);
    }
    games.filter(g=>!g.bye).forEach((g, idx)=>{
      const home = L.teams[g.home], away = L.teams[g.away];
      const div = document.createElement("div");
      div.className = "row";
      div.innerHTML = `<div>Game ${idx+1}: ${away.name} at ${home.name}</div>`;
      box.appendChild(div);
    });
  }

  
function renderStandings(){
  const L = state.league;
  const scope = (($("#standingsScope") && $("#standingsScope").value) ? $("#standingsScope").value : "league");
  const leadersOnly = (($("#leadersOnly")) ? $("#leadersOnly").checked : false) || false;
  const highlight = (($("#highlightLeaders")) ? $("#highlightLeaders").checked : false) !== false;
  const wrap = $("#standingsWrap"); wrap.innerHTML="";
  const stats = teamStats(L);

  function rowHtml(tIdx, leader){
    const t = L.teams[tIdx];
    const rec = t.record;
    const cls = leader && highlight ? " class=\"leader-row\"" : "";
    const badge = leader ? ' <span class="badge leader">Leader</span>' : "";
    const pd = rec.pf - rec.pa;
    return `<tr${cls}><td>${t.abbr}${badge}</td><td>${rec.w}</td><td>${rec.l}</td><td>${rec.t}</td><td>${pct(rec).toFixed(3)}</td><td>${rec.pf}</td><td>${rec.pa}</td><td>${pd}</td></tr>`;
  }

  function sorted(list, cmpScope){
    const arr = list.slice();
    arr.sort((a,b)=> tieBreakCompare(L, a, b, cmpScope));
    return arr;
  }

  if (scope==="league"){
    // Group by conference, highlight division leaders
    for (let conf=0; conf<2; conf++){
      const card = document.createElement("div"); card.className="card";
      const title = conf===0 ? "AFC" : "NFC";
      const allIdx = L.teams.map((t,i)=>i).filter(i=>L.teams[i].conf===conf);
      // compute leaders
      const leaders = [];
      for (let dv=0; dv<4; dv++){
        const divIdx = allIdx.filter(i=>L.teams[i].div===dv);
        const winner = sorted(divIdx, "leaders")[0];
        leaders.push(winner);
      }
      const displayIdx = leadersOnly ? leaders : sorted(allIdx, "conference");
      const tbl = document.createElement("table"); tbl.className="table";
      tbl.innerHTML = `<thead><tr><th>${title}</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>`;
      const tb = document.createElement("tbody");
      displayIdx.forEach(i=> tb.innerHTML += rowHtml(i, leaders.includes(i)));
      tbl.appendChild(tb); card.appendChild(tbl); wrap.appendChild(card);
    }
  } else if (scope==="conference"){
    for (let conf=0; conf<2; conf++){
      const card = document.createElement("div"); card.className="card";
      const title = conf===0 ? "AFC" : "NFC";
      const allIdx = L.teams.map((t,i)=>i).filter(i=>L.teams[i].conf===conf);
      const leaders = [];
      for (let dv=0; dv<4; dv++){
        const divIdx = allIdx.filter(i=>L.teams[i].div===dv);
        const winner = sorted(divIdx, "leaders")[0];
        leaders.push(winner);
      }
      const displayIdx = leadersOnly ? leaders : sorted(allIdx, "conference");
      const tbl = document.createElement("table"); tbl.className="table";
      tbl.innerHTML = `<thead><tr><th>${title}</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>`;
      const tb = document.createElement("tbody");
      displayIdx.forEach(i=> tb.innerHTML += rowHtml(i, leaders.includes(i)));
      tbl.appendChild(tb); card.appendChild(tbl); wrap.appendChild(card);
    }
  } else {
    // Division view
    for (let conf=0; conf<2; conf++){
      for (let dv=0; dv<4; dv++){
        const card = document.createElement("div"); card.className="card";
        const title = `${CONF_NAMES[conf]} ${DIV_NAMES[dv]}`;
        const idxs = L.teams.map((t,i)=>i).filter(i=>L.teams[i].conf===conf && L.teams[i].div===dv);
        const order = sorted(idxs, "division");
        const winner = order[0];
        const tbl = document.createElement("table"); tbl.className="table";
        tbl.innerHTML = `<thead><tr><th>${title}</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>`;
        const tb = document.createElement("tbody");
        order.forEach(i=> tb.innerHTML += rowHtml(i, i===winner));
        tbl.appendChild(tb); card.appendChild(tbl); wrap.appendChild(card);
      }
    }
  }

  $("#standingsScope").onchange = renderStandings;
  if ($("#leadersOnly")) $("#leadersOnly").addEventListener("change", renderStandings);
  if ($("#highlightLeaders")) $("#highlightLeaders").addEventListener("change", renderStandings);
  if ($("#btnPlayoffPicture")) $("#btnPlayoffPicture").addEventListener("click", ()=>{
    renderPlayoffPicture();
    $("#playoffPicture").hidden = false;
  }, {once:true});
}
    $("#standingsScope").onchange = renderStandings;
  }
function pct(rec) {
  var g = (rec.w|0) + (rec.l|0) + (rec.t|0);
  return g ? ((rec.w|0) + 0.5 * (rec.t|0)) / g : 0;
}

function cmpTeams(a, b) {
  const pA = pct(a.record ?? {});
  const pB = pct(b.record ?? {});
  if (pA !== pB) return pB - pA;
  const pdA = (a.record?.pf ?? 0) - (a.record?.pa ?? 0);
  const pdB = (b.record?.pf ?? 0) - (b.record?.pa ?? 0);
  if (pdA !== pdB) return pdB - pdA;
  return (b.rating ?? 0) - (a.rating ?? 0);
}
// usage: teams.sort(cmpTeams)

  }
  function standingsRows(scope){
    const L = state.league;
    const rows = [...L.teams].map((t,i)=>({i, t}));
    rows.sort((a,b)=>cmpTeams(b.t, a.t));
    if (scope==="league") return [{"All Teams": rows}];
    if (scope==="conference"){
      const groups = {}; for (const r of rows){ const key = CONF_NAMES[r.t.conf]; (groups[key] = groups[key] || []).push(r); }
      return Object.entries(groups).map(([k,v])=>({[k]:v}));
    }
    const groups = {}; for (const r of rows){ const key = `${CONF_NAMES[r.t.conf]} ${DIV_NAMES[r.t.div]}`; (groups[key] = groups[key] || []).push(r); }
    return Object.entries(groups).map(([k,v])=>({[k]:v}));
  }

  
// ===== Standings stats and NFL-style tiebreakers =====
function teamStats(L){
  const N = L.teams.length;
  const stats = Array.from({length:N}, ()=>({w:0,l:0,t:0,pf:0,pa:0, divW:0,divL:0,divT:0, confW:0,confL:0,confT:0, h2h:{} }));
  // Copy record
  for (let i=0;i<N;i++){
    const r = L.teams[i].record;
    const s = stats[i];
    s.w=r.w; s.l=r.l; s.t=r.t; s.pf=r.pf; s.pa=r.pa;
  }
  // Walk results to compute division and conference splits and head-to-head
  for (const wk in L.resultsByWeek){
    const arr = L.resultsByWeek[wk] || [];
    for (const g of arr){
      if (g.bye) continue;
      const h = g.home, a = g.away;
      const hs = stats[h], as = stats[a];
      const hc = L.teams[h].conf, ac = L.teams[a].conf;
      const hd = L.teams[h].div,  ad = L.teams[a].div;
      const sameConf = hc===ac;
      const sameDiv = sameConf && hd===ad;
      let resH=0, resA=0;
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

function pctRec(w,l,t){ const g=w+l+t; return g? (w + 0.5*t)/g : 0; }
function pctDiv(s){ return pctRec(s.divW, s.divL, s.divT); }
function pctConf(s){ return pctRec(s.confW, s.confL, s.confT); }

function tieBreakCompare(L, aIdx, bIdx, scope){
  if (aIdx===bIdx) return 0;
  const A = L.teams[aIdx], B = L.teams[bIdx];
  const S = teamStats(L);
  // 1) Overall record
  const pA = pctRec(S[aIdx].w, S[aIdx].l, S[aIdx].t);
  const pB = pctRec(S[bIdx].w, S[bIdx].l, S[bIdx].t);
  if (pA !== pB) return pB - pA;

  // 2) Head to head if they played
  const h2h = S[aIdx].h2h[bIdx] || 0;
  if (h2h !== 0) return h2h > 0 ? -1 : 1; // positive means A beat B more

  // 3) Division record if sorting within division or for division leaders
  if (scope==="division" || scope==="leaders"){
    const dA = pctDiv(S[aIdx]), dB = pctDiv(S[bIdx]);
    if (dA !== dB) return dB - dA;
  }

  // 4) Conference record for conference seeding and wildcards
  const cA = pctConf(S[aIdx]), cB = pctConf(S[bIdx]);
  if (cA !== cB) return cB - cA;

  // 5) Strength of victory proxy using PF and PA differential
  const pdA = (S[aIdx].pf - S[aIdx].pa);
  const pdB = (S[bIdx].pf - S[bIdx].pa);
  if (pdA !== pdB) return pdB - pdA;

  // 6) Points for as last resort
  if (S[aIdx].pf !== S[bIdx].pf) return S[bIdx].pf - S[aIdx].pf;

  // 7) Stable order by id
  return aIdx - bIdx;
}

// Trade UI with picks
  function renderTradeUI(){
    const L = state.league;
    const selA = $("#tradeA"), selB = $("#tradeB");
    if (!selA.dataset.filled){ fillTeamSelect(selA); selA.dataset.filled="1"; selA.value = $("#userTeam").value; selA.addEventListener("change", renderTradeLists); }
    if (!selB.dataset.filled){ fillTeamSelect(selB); selB.dataset.filled="1"; selB.value = String((parseInt(selA.value,10)+1)%L.teams.length); selB.addEventListener("change", renderTradeLists); }
    $("#tradeValidate").onclick = validateTrade;
    $("#tradeExecute").onclick = executeTrade;
    renderTradeLists();
  }

  function renderTradeLists(){
    const L = state.league;
    const a = parseInt($("#tradeA").value,10);
    const b = parseInt($("#tradeB").value,10);
    listPlayers("#tradeListA", L.teams[a], "A");
    listPlayers("#tradeListB", L.teams[b], "B");
    listPicks("#pickListA", L.teams[a], "A");
    listPicks("#pickListB", L.teams[b], "B");
    $("#tradeExecute").disabled = true;
    $("#tradeInfo").textContent = "Select players or picks on both sides, then validate.";
  }

  function listPlayers(rootSel, team, side){
    const root = $(rootSel); root.innerHTML = "";
    team.roster.forEach(p=>{
      const row = document.createElement("label");
      row.className = "row";
      const cap = capHitFor(p, 0, state.league.season);
      row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="player" data-id="${p.id}" />
                       <div>${p.name} • ${p.pos}</div>
                       <div class="spacer"></div>
                       <div class="muted">OVR ${p.ovr} • Cap ${cap.toFixed(1)}M (${p.years}y)</div>`;
      root.appendChild(row);
    });
  }

  function listPicks(rootSel, team, side){
    const root = $(rootSel); root.innerHTML = "";
    const now = state.league.year;
    team.picks.slice().sort((a,b)=> a.year===b.year? a.round-b.round : a.year-b.year).forEach(pk=>{
      const row = document.createElement("label");
      row.className = "row";
      row.innerHTML = `<input type="checkbox" data-side="${side}" data-type="pick" data-id="${pk.id}" />
                       <div>Y${now + (pk.year-1)} R${pk.round}</div>
                       <div class="spacer"></div>
                       <div class="muted">from ${pk.from}</div>`;
      root.appendChild(row);
    });
  }

  function collectSelected(side, team){
    const checks = $$(`input[type=checkbox][data-side=${side}]:checked`);
    const players = [], picks = [];
    checks.forEach(c=>{
      if (c.dataset.type==="player"){
        const p = team.roster.find(x=>x.id===c.dataset.id);
        if (p) players.push(p);
      } else {
        const pk = team.picks.find(x=>x.id===c.dataset.id);
        if (pk) picks.push(pk);
      }
    });
    return {players, picks};
  }

  function validateTrade(){
    const L = state.league;
    const a = parseInt($("#tradeA").value,10);
    const b = parseInt($("#tradeB").value,10);
    const A = collectSelected("A", L.teams[a]);
    const B = collectSelected("B", L.teams[b]);
    if ((!A.players.length && !A.picks.length) || (!B.players.length && !B.picks.length)){
      $("#tradeInfo").textContent = "Pick at least one asset on each side.";
      $("#tradeExecute").disabled = true; return;
    }
    const valA = A.players.reduce((s,p)=>s+valueOf(p),0) + A.picks.reduce((s,pk)=>s+pickValue(pk),0);
    const valB = B.players.reduce((s,p)=>s+valueOf(p),0) + B.picks.reduce((s,pk)=>s+pickValue(pk),0);
    const diff = Math.abs(valA - valB);
    const fair = diff <= 15;
    // Cap check only for current-year delta
    const capA = L.teams[a].capUsed - A.players.reduce((s,p)=>s+capHitFor(p,0,L.season),0) + B.players.reduce((s,p)=>s+capHitFor(p,0,L.season),0);
    const capB = L.teams[b].capUsed - B.players.reduce((s,p)=>s+capHitFor(p,0,L.season),0) + A.players.reduce((s,p)=>s+capHitFor(p,0,L.season),0);
    const capOK = capA <= L.teams[a].capTotal && capB <= L.teams[b].capTotal;
    $("#tradeInfo").textContent = `Value A ${valA.toFixed(1)} vs B ${valB.toFixed(1)} — ${fair?"Fair":"Unbalanced"} (delta ${diff.toFixed(1)}). Cap after: A ${capA.toFixed(1)}/${L.teams[a].capTotal}M, B ${capB.toFixed(1)}/${L.teams[b].capTotal}M ${capOK?"":"(CAP VIOLATION)"}`;
    $("#tradeExecute").disabled = !(fair && capOK);
  }

  function executeTrade(){
    const L = state.league;
    const a = parseInt($("#tradeA").value,10);
    const b = parseInt($("#tradeB").value,10);
    const A = collectSelected("A", L.teams[a]);
    const B = collectSelected("B", L.teams[b]);
    // players
    L.teams[a].roster = L.teams[a].roster.filter(p=>!A.players.some(x=>x.id===p.id)).concat(B.players).sort((x,y)=>y.ovr-x.ovr);
    L.teams[b].roster = L.teams[b].roster.filter(p=>!B.players.some(x=>x.id===p.id)).concat(A.players).sort((x,y)=>y.ovr-x.ovr);
    // picks
    L.teams[a].picks = L.teams[a].picks.filter(pk=>!A.picks.some(x=>x.id===pk.id)).concat(B.picks);
    L.teams[b].picks = L.teams[b].picks.filter(pk=>!B.picks.some(x=>x.id===pk.id)).concat(A.picks);
    $("#tradeInfo").textContent = "Trade executed.";
    recalcCap(L, L.teams[a]); recalcCap(L, L.teams[b]);
    renderTradeLists();
    setStatus("Trade complete.");
  }

  function valueOf(p){
    const agePenalty = Math.max(0, p.age - 26) * 0.6;
    const contractValue = Math.max(0, p.years) * (p.baseAnnual*0.6); // crude contract surplus proxy
    return p.ovr - agePenalty + contractValue*0.05 + (p.pos==="QB"?6:0) + (p.pos==="WR"||p.pos==="CB"?2:0);
  }

  // Free Agency kept simple
  function ensureFA(){
    if (!state.freeAgents.length){
      for (let i=0;i<120;i++){
        const pos = choice(POSITIONS);
        const p = makePlayer(pos);
        p.years = 0; p.yearsTotal = 2;
        p.baseAnnual = Math.round(p.baseAnnual*0.9*10)/10;
        p.signingBonus = Math.round((p.baseAnnual*p.yearsTotal*0.4)*10)/10;
        p.guaranteedPct = 0.5;
        tagAbilities(p);
        state.freeAgents.push(p);
      }
      state.freeAgents.sort((a,b)=>b.ovr-a.ovr);
    }
  }
  function renderFreeAgency(){
    ensureFA();
    const L = state.league;
    const tbl = $("#faTable");
    tbl.innerHTML = `<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base</th><th>Bonus</th><th>Years</th><th>Abilities</th></tr></thead>`;
    const tb = document.createElement("tbody");
    state.freeAgents.forEach((p,i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><input type="radio" name="fa" value="${i}"></td><td>${p.name}</td><td>${p.pos}</td><td>${p.ovr}</td><td>${p.baseAnnual.toFixed(1)}</td><td>${p.signingBonus.toFixed(1)}</td><td>${p.yearsTotal}</td><td>${(p.abilities||[]).join(", ")}</td>`;
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    const sel = $("#faTeam"); if (!sel.dataset.filled){ fillTeamSelect(sel); sel.dataset.filled="1"; }
    $("#btnSignFA").disabled = true;
    tbl.addEventListener("change", (e)=>{ if (e.target && e.target.name==="fa") $("#btnSignFA").disabled = false; }, {once:true});
    $("#btnSignFA").onclick = ()=>{
      const idx = Number(($("input[name=fa]:checked")||{}).value);
      if (Number.isNaN(idx)) return;
      const teamId = parseInt($("#faTeam").value || $("#userTeam").value, 10);
      const tm = L.teams[teamId];
      const p = state.freeAgents[idx];
      p.years = p.yearsTotal;
      const capAfter = tm.capUsed + capHitFor(p,0,L.season);
      if (capAfter > tm.capTotal){ setStatus("Cap exceeded. Release or trade first."); return; }
      tm.roster.push(p);
      tm.roster.sort((a,b)=>b.ovr-a.ovr);
      state.freeAgents.splice(idx,1);
      recalcCap(L, tm);
      renderFreeAgency();
      setStatus("Signed free agent");
    };
  }

  // Draft view to show picks
  function renderDraft(){
    const sel = $("#draftTeam");
    if (!sel.dataset.filled){ fillTeamSelect(sel); sel.dataset.filled="1"; }
    const teamId = parseInt(sel.value || $("#userTeam").value || "0", 10);
    sel.value = teamId;
    const t = state.league.teams[teamId];
    const now = state.league.year;
    const box = $("#draftPicks"); box.innerHTML="";
    t.picks.slice().sort((a,b)=> a.year===b.year? a.round-b.round : a.year-b.year).forEach(pk=>{
      const div = document.createElement("div");
      div.className = "row";
      const v = pickValue(pk);
      div.innerHTML = `<div class="badge">Y${now + (pk.year-1)} R${pk.round}</div><div class="spacer"></div><div class="muted">from ${pk.from}</div><div class="muted">value ${v.toFixed(1)}</div>`;
      box.appendChild(div);
    });
  }

  // Simple sim that advances week, plus offseason rollover
  function simulateWeek(){
    const L = state.league;
    if (L.week > L.schedule.length){ if (!state.playoffs) { startPlayoffs(); location.hash = "#/playoffs"; return; } return; }
    const pairings = L.schedule[L.week-1];
    const results = [];
    for (const pair of pairings){
      if (pair.bye !== undefined){
        results.push({bye: pair.bye});
        continue;
      }
      const sH = rand(13,34);
      const sA = rand(10,31);
      const home = L.teams[pair.home], away = L.teams[pair.away];
      results.push({home: pair.home, away: pair.away, scoreHome: sH, scoreAway: sA, homeWin: sH>sA});
      applyResult(home, away, sH, sA);
    }
    L.resultsByWeek[L.week] = results;
    L.week++;
    if (L.week > L.schedule.length){ setStatus("Regular season complete. Playoffs ready."); }
    renderHub();
  }

  function applyResult(home, away, sH, sA){
    home.record.pf += sH; home.record.pa += sA;
    away.record.pf += sA; away.record.pa += sH;
    if (sH === sA){ home.record.t++; away.record.t++; }
    else if (sH > sA){ home.record.w++; away.record.l++; }
    else { away.record.w++; home.record.l++; }
  }

      
  // Offseason rollover and aging
  function runOffseason(){
    const L = state.league;
    const preTeamsLoop = true;

    // Store last-season division rank for scheduling
    const ranks = computeLastDivisionRanks(L);
    L.teams.forEach((t,i)=>{ t.lastDivisionRank = ranks[i]; });

for (const t of L.teams){
      // rollover
      recalcCap(L, t);
      const room = Math.max(0, t.capTotal - t.capUsed);
      t.capRollover = Math.round(room*10)/10;
      // age, contract years decrement
      const survivors = [];
      for (const p of t.roster){
        if (p.years>0) p.years -= 1;
        if (p.years === 0){
          // expire to FA
          state.freeAgents.push(p);
        } else {
          p.age += 1;
          p.ovr = clamp(p.ovr + rand(-2,2), 48, 99);
          survivors.push(p);
        }
      }
      t.roster = survivors.sort((a,b)=>b.ovr-a.ovr);
      // next year picks seeded forward
      for (const pk of t.picks){ pk.year = Math.max(1, pk.year - 1); }
      const needed = 7 - t.picks.filter(pk=>pk.year===YEARS_OF_PICKS).length;
      for (let i=0;i<needed;i++){ t.picks.push({year:YEARS_OF_PICKS, round:i+1, from:t.abbr, id:id()}); }
      // clear dead cap from past year
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

  // Helpers
  function currentTeam(){
    const L = state.league;
    const idx = parseInt($("#userTeam").value || "0", 10);
    return L.teams[idx];
  }
  function fillTeamSelect(sel){
    const L = state.league;
    sel.innerHTML = "";
    L.teams.forEach((t,i)=>{
      const opt = document.createElement("option");
      opt.value = String(i);
      const conf = `${CONF_NAMES[t.conf]} ${DIV_NAMES[t.div]}`;
      opt.textContent = `${t.abbr} — ${t.name} (${conf})`;
      sel.appendChild(opt);
    });
  }

  
// ==== AI trade suggestion with roster-need weighting ====
function teamNeedProfile(team){
  // Compute how far below target depth and quality each position is
  const target = DEPTH_NEEDS;
  const byPos = {}; POSITIONS.forEach(p=>byPos[p]=[]);
  team.roster.forEach(p=>byPos[p.pos].push(p));
  POSITIONS.forEach(p=>byPos[p].sort((a,b)=>b.ovr-a.ovr));
  const profile = {};
  for (const [pos, need] of Object.entries(target)){
    const have = byPos[pos].length;
    const top = byPos[pos].slice(0, Math.max(1, need));
    const quality = top.length? top.reduce((s,x)=>s+x.ovr,0)/top.length : 50;
    const countGap = Math.max(0, need - have);
    const qualityGap = Math.max(0, 80 - quality); // aim for avg 80 in the two-deep
    profile[pos] = {countGap, qualityGap, score: countGap*6 + qualityGap*0.6};
  }
  return profile;
}

function teamSurplusPositions(team){
  const byPos = {}; POSITIONS.forEach(p=>byPos[p]=0);
  team.roster.forEach(p=>byPos[p.pos]++);
  const surplus = [];
  for (const [pos, need] of Object.entries(DEPTH_NEEDS)){
    const extra = byPos[pos] - need;
    if (extra>0) surplus.push(pos);
  }
  return surplus;
}

function pickBestTradeCounterpart(L, teamA){
  // Choose teamB whose surplus matches A's biggest needs
  const needs = teamNeedProfile(teamA);
  const needOrder = Object.entries(needs).sort((a,b)=>b[1].score - a[1].score).map(([pos])=>pos);
  let best = null, bestScore = -1;
  for (const teamB of L.teams){
    if (teamB===teamA) continue;
    const bSurplus = new Set(teamSurplusPositions(teamB));
    let match = 0;
    for (let i=0;i<needOrder.length;i++){
      const pos = needOrder[i];
      const weight = (needOrder.length - i);
      if (bSurplus.has(pos)) match += weight;
    }
    if (match>bestScore){ bestScore = match; best = teamB; }
  }
  return best;
}

function chooseTradePieces(teamA, teamB){
  const needsA = teamNeedProfile(teamA);
  const needsB = teamNeedProfile(teamB);
  const wantA = Object.entries(needsA).sort((a,b)=>b[1].score - a[1].score).map(([pos])=>pos);
  const wantB = Object.entries(needsB).sort((a,b)=>b[1].score - a[1].score).map(([pos])=>pos);

  function bestFrom(team, pos){ return team.roster.filter(p=>p.pos===pos).sort((a,b)=>a.ovr-b.ovr)[0] || null; }
  function tradable(team, pos){
    const pool = team.roster.filter(p=>p.pos===pos).sort((a,b)=>a.ovr-b.ovr);
    // Don't trade away if at or below need count
    if (pool.length <= (DEPTH_NEEDS[pos]||1)) return null;
    return pool[0] || null;
  }

  let offerFromB = null;
  for (const pos of wantA){
    offerFromB = tradable(teamB, pos);
    if (offerFromB) break;
  }
  let offerFromA = null;
  for (const pos of wantB){
    offerFromA = tradable(teamA, pos);
    if (offerFromA) break;
  }
  return {fromB: offerFromB, fromA: offerFromA};
}

function adjustValueForNeed(rawValue, receiverTeam, player){
  // Boost value if the receiver has a big need at player's position
  const needs = teamNeedProfile(receiverTeam);
  const posNeed = (needs[player.pos] ? needs[player.pos].score : 0) || 0;
  // Scale: up to +30% for severe need
  const factor = 1 + Math.min(0.3, posNeed/40);
  return rawValue * factor;
}

function suggestTradeForTeamA(){
  const L = state.league;
  const teamA = L.teams[parseInt($("#tradeA").value,10)];
  const teamB = pickBestTradeCounterpart(L, teamA);
  if (!teamB){ setStatus("No counterpart found"); return null; }
  const pieces = chooseTradePieces(teamA, teamB);
  if (!pieces.fromB && !pieces.fromA){ setStatus("No reasonable pieces to swap"); return null; }

  const packageA = []; const packageB = [];
  if (pieces.fromA) packageA.push(pieces.fromA);
  if (pieces.fromB) packageB.push(pieces.fromB);

  // Balancer using picks
  let valA = 0, valB = 0;
  for (const p of packageA) valA += adjustValueForNeed(valueOf(p), teamB, p);
  for (const p of packageB) valB += adjustValueForNeed(valueOf(p), teamA, p);

  // If imbalance, add smallest possible pick(s) from the side with deficit
  function smallestPick(team){ return team.picks.slice().sort((a,b)=> pickValue(a)-pickValue(b))[0] || null; }
  let guard=0;
  while (Math.abs(valA - valB) > 8 && guard++<4){
    if (valA < valB){
      const pk = smallestPick(teamA);
      if (!pk) break;
      packageA.push(pk);
      valA += pickValue(pk);
      // remove from temp pool to avoid reusing
      teamA.picks = teamA.picks.filter(x=>x.id!==pk.id).concat([pk]); // keep original, just simulate
    } else {
      const pk = smallestPick(teamB);
      if (!pk) break;
      packageB.push(pk);
      valB += pickValue(pk);
      teamB.picks = teamB.picks.filter(x=>x.id!==pk.id).concat([pk]);
    }
  }

  return {teamA, teamB, packageA, packageB, valA, valB};
}

function applySuggestionToUI(sug){
  if (!sug) return;
  const checks = $$('input[type=checkbox][data-side]');
  checks.forEach(c=>c.checked=false);

  function tick(side, item){
    if (!item) return;
    const type = item.round? "pick" : "player";
    const id = item.id;
    const sel = `input[type=checkbox][data-side=${side}][data-type=${type}][data-id="${id}"]`;
    const el = document.querySelector(sel);
    if (el) el.checked = true;
  }
  sug.packageA.forEach(x=>tick("A", x));
  sug.packageB.forEach(x=>tick("B", x));
  $("#tradeInfo").textContent = `Suggested. Revalidate before executing.`;
}

// Wire the Suggest button
document.addEventListener("click", (e)=>{
  if (e.target && e.target.id==="btnSuggest"){
    const sug = suggestTradeForTeamA();
    if (sug){
      applySuggestionToUI(sug);
    }
  }
});


// ===== Weekly trade proposals with NFL-like probabilities and user offers =====
function weeklyTradeProbability(week){
  // No trades after deadline (week 9). Approximate NFL pattern.
  if (week <= 2) return 0.03;     // quiet open
  if (week <= 6) return 0.06;     // early season
  if (week <= 8) return 0.12;     // ramping up
  if (week === 9) return 0.35;    // deadline week spike
  return 0.0;                     // after deadline
}

function aiWeeklyTrades(){
  const L = state.league;
  const wk = Math.min(L.week, 18);
  const p = weeklyTradeProbability(wk);
  if (p <= 0) return;

  // Up to two attempts weekly; higher chance at deadline
  const attempts = wk === 9 ? 2 : 1;
  let executed = 0;

  for (let i=0; i<attempts; i++){
    if (Math.random() > p) continue;
    // 20% chance to target the user team for an offer
    const targetUser = Math.random() < 0.2;
    if (targetUser){
      tryOfferToUser();
    } else {
      const tA = choice(L.teams);
      const tB = pickBestTradeCounterpart(L, tA);
      if (!tB || tA===tB) continue;
      const sug = buildSuggestionForTeams(tA, tB);
      if (!sug) continue;
      if (validateSuggestionCapsAndFairness(sug)){
        executeSuggestion(sug);
        logTrade(sug);
        executed++;
      }
    }
  }
  if (executed>0) setStatus(`${executed} AI trade${executed>1?"s":""} executed.`);
}

function buildSuggestionForTeams(teamA, teamB){
  const pieces = chooseTradePieces(teamA, teamB);
  if (!pieces.fromA && !pieces.fromB) return null;
  const packageA = []; const packageB = [];
  if (pieces.fromA) packageA.push(pieces.fromA);
  if (pieces.fromB) packageB.push(pieces.fromB);

  // Balance with picks like UI suggestion does
  let valA = 0, valB = 0;
  for (const p of packageA) valA += adjustValueForNeed(valueOf(p), teamB, p);
  for (const p of packageB) valB += adjustValueForNeed(valueOf(p), teamA, p);

  function smallestPick(team){ return team.picks.slice().sort((a,b)=> pickValue(a)-pickValue(b))[0] || null; }
  let guard=0;
  while (Math.abs(valA - valB) > 8 && guard++<4){
    if (valA < valB){
      const pk = smallestPick(teamA);
      if (!pk) break;
      packageA.push(pk);
      valA += pickValue(pk);
      teamA.picks = teamA.picks; // no mutation here
    } else {
      const pk = smallestPick(teamB);
      if (!pk) break;
      packageB.push(pk);
      valB += pickValue(pk);
      teamB.picks = teamB.picks;
    }
  }
  return {teamA, teamB, packageA, packageB, valA, valB};
}

function validateSuggestionCapsAndFairness(sug){
  const L = state.league;
  const A = sug.packageA.filter(x=>!x.round); // players
  const B = sug.packageB.filter(x=>!x.round);
  const valA = sug.valA, valB = sug.valB;
  const fair = Math.abs(valA - valB) <= 15;
  const capA = sug.teamA.capUsed - A.reduce((s,p)=>s+capHitFor(p,0,L.season),0) + B.reduce((s,p)=>s+capHitFor(p,0,L.season),0);
  const capB = sug.teamB.capUsed - B.reduce((s,p)=>s+capHitFor(p,0,L.season),0) + A.reduce((s,p)=>s+capHitFor(p,0,L.season),0);
  const capOK = capA <= sug.teamA.capTotal && capB <= sug.teamB.capTotal;
  return fair && capOK;
}

function executeSuggestion(sug){
  const L = state.league;
  const A_players = sug.packageA.filter(x=>!x.round);
  const B_players = sug.packageB.filter(x=>!x.round);
  const A_picks = sug.packageA.filter(x=>x.round);
  const B_picks = sug.packageB.filter(x=>x.round);

  // players
  sug.teamA.roster = sug.teamA.roster.filter(p=>!A_players.some(x=>x.id===p.id)).concat(B_players).sort((x,y)=>y.ovr-x.ovr);
  sug.teamB.roster = sug.teamB.roster.filter(p=>!B_players.some(x=>x.id===p.id)).concat(A_players).sort((x,y)=>y.ovr-x.ovr);
  // picks
  sug.teamA.picks = sug.teamA.picks.filter(pk=>!A_picks.some(x=>x.id===pk.id)).concat(B_picks);
  sug.teamB.picks = sug.teamB.picks.filter(pk=>!B_picks.some(x=>x.id===pk.id)).concat(A_picks);
  recalcCap(L, sug.teamA);
  recalcCap(L, sug.teamB);
}

function assetLabel(asset, nowSeason){
  if (asset.round) return `Y${nowSeason + (asset.year-1)} R${asset.round}`;
  return `${asset.name} (${asset.pos} ${asset.ovr})`;
}

function logTrade(sug){
  const L = state.league;
  L.news = L.news || [];
  const now = L.season;
  const aOut = sug.packageA.map(x=>assetLabel(x, now)).join(", ");
  const bOut = sug.packageB.map(x=>assetLabel(x, now)).join(", ");
  L.news.push(`Trade: ${sug.teamA.abbr} send ${aOut} to ${sug.teamB.abbr} for ${bOut}`);
}

function tryOfferToUser(){
  const L = state.league;
  const user = L.teams[parseInt($("#userTeam").value||"0",10)];
  const counterpart = pickBestTradeCounterpart(L, user);
  if (!counterpart) return;
  const sug = buildSuggestionForTeams(counterpart, user); // they initiate to you
  if (!sug) return;
  if (!validateSuggestionCapsAndFairness(sug)) return;
  // Store as pending offer
  state.pendingOffers = state.pendingOffers || [];
  state.pendingOffers.push({
    from: counterpart.abbr,
    to: user.abbr,
    packageFrom: sug.packageA, // from counterpart
    packageTo: sug.packageB,   // from user
  });
  renderOffers();
}

function renderOffers(){
  const box = $("#hubOffers"); if (!box) return;
  box.innerHTML = "";
  const L = state.league;
  const now = L.season;
  const offers = state.pendingOffers || [];
  if (!offers.length){
    const d = document.createElement("div"); d.className="muted"; d.textContent = "No offers.";
    box.appendChild(d);
    return;
  }
  offers.forEach((off, idx)=>{
    const d = document.createElement("div"); d.className="row";
    const fromList = off.packageFrom.map(x=>assetLabel(x, now)).join(", ");
    const toList = off.packageTo.map(x=>assetLabel(x, now)).join(", ");
    d.innerHTML = `<div>${off.from} offers ${fromList} for ${off.to}'s ${toList}</div>
                   <div class="spacer"></div>
                   <button class="offer-btn decline" data-off="${idx}" data-act="decline">Decline</button>
                   <button class="offer-btn accept" data-off="${idx}" data-act="accept">Accept</button>`;
    box.appendChild(d);
  });
}

document.addEventListener("click", (e)=>{
  const t = e.target;
  if (!t || !t.dataset || !t.dataset.act) return;
  const idx = Number(t.dataset.off);
  if (Number.isNaN(idx)) return;
  if (!state.pendingOffers || !state.pendingOffers[idx]) return;
  const off = state.pendingOffers[idx];
  if (t.dataset.act==="decline"){
    state.pendingOffers.splice(idx,1);
    renderOffers();
    setStatus("Offer declined.");
    return;
  }
  if (t.dataset.act==="accept"){
    // Execute
    const L = state.league;
    const user = L.teams.find(tm=>tm.abbr===off.to);
    const other = L.teams.find(tm=>tm.abbr===off.from);
    const sug = {teamA: other, teamB: user, packageA: off.packageFrom, packageB: off.packageTo, valA: 0, valB:0};
    if (validateSuggestionCapsAndFairness(sug)){
      executeSuggestion(sug);
      logTrade(sug);
      setStatus("Trade accepted.");
    }else{
      setStatus("Offer invalid due to cap or value change.");
    }
    state.pendingOffers.splice(idx,1);
    renderOffers();
    renderRoster();
  }
});

// Hook weekly AI into week advance
const _simulateWeekOrig = simulateWeek;
simulateWeek = function(){
  _simulateWeekOrig();
  aiWeeklyTrades();
  renderOffers();
};


  // Onboarding modal behavior
  function openOnboard(){
    const modal = $("#onboardModal"); if (!modal) return;
    modal.hidden = false;
    // Fill team list for current mode
    const mode = state.namesMode || 'fictional';
    const sel = $("#onboardTeam");
    sel.innerHTML = "";
    const base = listByMode(mode);
    base.forEach((t,i)=>{
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${t.abbr} — ${t.name}`;
      sel.appendChild(opt);
    });
  }
  function closeOnboard(){ const m=$("#onboardModal"); if (m) m.hidden = true; }

  document.addEventListener("click", (e)=>{
    if (e.target && e.target.id==="onboardClose"){ closeOnboard(); }
    if (e.target && e.target.id==="onboardRandom"){
      const sel = $("#onboardTeam");
      sel.value = String(Math.floor(Math.random()* (listByMode(state.namesMode).length)));
    }
    if (e.target && e.target.id==="onboardStart"){
      const chosenMode = ($("input[name=namesMode]:checked")||{}).value || "fictional";
      state.namesMode = chosenMode;
      const teamList = listByMode(chosenMode);
      // Start a fresh league using the chosen names
      state.league = makeLeague(teamList);
      state.league.year = YEAR_START;
      state.onboarded = true;
      // Set user's team
      const teamIdx = parseInt($("#onboardTeam").value || "0", 10);
      const userSel = $("#userTeam");
      fillTeamSelect(userSel);
      userSel.value = String(teamIdx);
      // Apply names to labels
      rebuildTeamLabels(chosenMode);
      closeOnboard();
      location.hash = "#/hub";
      setStatus("Season started");
      refreshAll();
    }
    if (e.target && e.target.id==="btnApplyNamesMode"){
      const chosenMode = ($("input[name=settingsNamesMode]:checked")||{}).value || state.namesMode;
      state.namesMode = chosenMode;
      rebuildTeamLabels(chosenMode);
      setStatus("Team names updated");
    }
  });


  // Settings: Apply Year
  document.addEventListener("click", (e)=>{
    if (e.target && e.target.id === "btnApplyYear"){
      const inp = document.getElementById("settingsYear");
      const newY = clampYear(inp ? inp.value : YEAR_START);
      if (!state.league){ setStatus("Start a league first."); return; }
      if (!confirm("This will reseed the schedule and reset the current week. Continue?")) return;
      const L = state.league;
      L.year = newY;
      // Reset week and schedule, keep rosters and records as-is
      L.week = 1;
      L.resultsByWeek = {};
      // Rebuild schedule from the new calendar year
      L.schedule = makeAccurateSchedule(L);
      // Clear pending suggestion and offers
      state.pendingSuggestion = null;
      state.pendingOffers = [];
      // Refresh UI
      renderSchedule();
      renderHub();
      setStatus("Year applied and schedule reseeded.");
    }
  });


// ===== Playoff seeding: 7 per conference, 1 seed bye, NFL tiebreakers =====
function seedPlayoffs(L){
  const seeds = {AFC:[], NFC:[]};
  for (let conf=0; conf<2; conf++){
    const confKey = conf===0 ? "AFC" : "NFC";
    const allIdx = L.teams.map((t,i)=>i).filter(i=>L.teams[i].conf===conf);
    // Division winners
    const leaders = [];
    for (let dv=0; dv<4; dv++){
      const divIdx = allIdx.filter(i=>L.teams[i].div===dv);
      divIdx.sort((a,b)=> tieBreakCompare(L, a, b, "leaders"));
      leaders.push(divIdx[0]);
    }
    // Seed 1..4 among leaders
    leaders.sort((a,b)=> tieBreakCompare(L, a, b, "conference"));
    // Wildcards
    const others = allIdx.filter(i=>!leaders.includes(i));
    others.sort((a,b)=> tieBreakCompare(L, a, b, "conference"));
    const wc = others.slice(0,3);
    const seven = leaders.concat(wc); // order seeds 1..7
    seeds[confKey] = seven;
  }
  return seeds;
}

function renderPlayoffPicture(){
  const L = state.league;
  const seeds = seedPlayoffs(L);
  const afc = $("#seedsAFC"); const nfc = $("#seedsNFC");
  afc.innerHTML = ""; nfc.innerHTML = "";
  function fill(ol, idxs){
    idxs.forEach((i,seed)=>{
      const t = L.teams[i];
      const li = document.createElement("li");
      const bye = seed===0 ? ' <span class="badge leader">Bye</span>' : '';
      li.innerHTML = `${seed+1}. ${t.name}${bye}`;
      ol.appendChild(li);
    });
  }
  fill(afc, seeds.AFC);
  fill(nfc, seeds.NFC);
}

// Replace random playoffs with seeded bracket
function startPlayoffs(){
  const L = state.league;
  const seeds = seedPlayoffs(L);
  state.playoffs = {
    round: "WC",
    seeds,
    series: {
      AFC: [], NFC: [], SB: []
    },
    results: []
  };
  buildRoundPairings();
  renderPlayoffs();
}

function buildRoundPairings(){
  const P = state.playoffs;
  if (!P) return;
  const L = state.league;
  P.series.AFC = []; P.series.NFC = [];
  if (P.round==="WC"){
    // 2v7, 3v6, 4v5 in each conference
    for (const key of ["AFC","NFC"]){
      const s = P.seeds[key];
      P.series[key] = [
        {home: s[1], away: s[6]},
        {home: s[2], away: s[5]},
        {home: s[3], away: s[4]},
      ];
    }
  } else if (P.round==="DIV"){
    for (const key of ["AFC","NFC"]){
      const s = P.seeds[key];
      const winners = P.lastWinners[key]; // array length 3 from WC
      // Highest remaining plays 1 seed at home, other two reseed
      const remaining = winners.slice().sort((a,b)=> tieBreakCompare(L, a, b, "conference"));
      const top = s[0];
      // Determine opponent as lowest remaining seed
      const low = remaining[remaining.length-1];
      const other = remaining[0];
      // Home fields: 1 seed hosts low, and higher seed hosts in the other matchup
      P.series[key] = [
        {home: top, away: low},
        {home: tieBreakCompare(L, other, remaining[0], "conference")<0 ? other : remaining[0], away: tieBreakCompare(L, other, remaining[0], "conference")<0 ? remaining[0] : other}
      ];
    }
  } else if (P.round==="CONF"){
    for (const key of ["AFC","NFC"]){
      const Lcl = state.league;
      const winners = P.lastWinners[key]; // 2 teams
      // Higher seed hosts
      const order = winners.slice().sort((a,b)=> tieBreakCompare(Lcl, a, b, "conference"));
      P.series[key] = [ {home: order[0], away: order[1]} ];
    }
  } else if (P.round==="SB"){
    // Conference champions meet, host by year alternation as tie breaker if seeds equal
    const champsA = P.lastWinners.AFC[0], champsN = P.lastWinners.NFC[0];
    // Higher overall seed hosts, use conference parity if identical
    const Lcl = state.league;
    const better = tieBreakCompare(Lcl, champsA, champsN, "league");
    const home = better <= 0 ? champsA : champsN;
    const away = home===champsA ? champsN : champsA;
    P.series.SB = [{home, away}];
  }
}

function simPlayoffGame(homeIdx, awayIdx){
  const L = state.league;
  const h = L.teams[homeIdx], a = L.teams[awayIdx];
  // Weighted by rating and point differential
  const pdH = h.record.pf - h.record.pa;
  const pdA = a.record.pf - a.record.pa;
  const base = h.rating - a.rating + 0.1*(pdH - pdA);
  const probHome = 1/(1+Math.exp(-base/8));
  const homeScore = Math.round(17 + Math.random()*17 + probHome*6);
  const awayScore = Math.round(14 + Math.random()*17 + (1-probHome)*6);
  if (homeScore === awayScore){
    return {home:homeIdx, away:awayIdx, scoreHome:homeScore+3, scoreAway:awayScore};
  }
  return {home:homeIdx, away:awayIdx, scoreHome:homeScore, scoreAway:awayScore};
}

function simulatePlayoffRound(){
  const P = state.playoffs;
  const L = state.league;
  if (!P) return;
  if (P.round==="WC" || P.round==="DIV" || P.round==="CONF"){
    const nextWinners = {AFC:[], NFC:[]};
    for (const key of ["AFC","NFC"]){
      const games = P.series[key];
      for (const g of games){
        const res = simPlayoffGame(g.home, g.away);
        const winner = res.scoreHome>res.scoreAway ? g.home : g.away;
        state.playoffs.results.push(`${L.teams[res.away].abbr} ${res.scoreAway} at ${L.teams[res.home].abbr} ${res.scoreHome} — ${L.teams[winner].abbr} advance`);
        nextWinners[key].push(winner);
      }
    }
    P.lastWinners = nextWinners;
    if (P.round==="WC"){ P.round="DIV"; buildRoundPairings(); }
    else if (P.round==="DIV"){ P.round="CONF"; buildRoundPairings(); }
    else if (P.round==="CONF"){ P.round="SB"; buildRoundPairings(); }
  } else if (P.round==="SB"){
    const g = P.series.SB[0];
    const res = simPlayoffGame(g.home, g.away);
    const winner = res.scoreHome>res.scoreAway ? g.home : g.away;
    state.playoffs.results.push(`Super Bowl: ${L.teams[res.away].abbr} ${res.scoreAway} at ${L.teams[res.home].abbr} ${res.scoreHome} — Champion ${L.teams[winner].name}`);
    state.playoffs = null;
    runOffseason();
    location.hash = "#/hub";
    return;
  }
  renderPlayoffs();
}

function renderPlayoffs(){
  const P = state.playoffs;
  const L = state.league;
  const bracket = $("#playoffBracket"); const info = $("#playoffState"); const rs = $("#playoffResults");
  info.textContent = P ? `Round: ${P.round}` : "No playoffs in progress.";
  bracket.innerHTML = "";
  rs.innerHTML = "";
  (((state.playoffs && state.playoffs.results) || []).forEach(line=>{ const d=document.createElement("div"); d.textContent=line; rs.appendChild(d); });
  if (!P) return;
  function listSeries(key){
    const wrap = document.createElement("div");
    wrap.className = "card";
    const title = key==="SB" ? "Super Bowl" : key;
    const header = document.createElement("h3"); header.textContent = title;
    wrap.appendChild(header);
    const games = P.series[key] || [];
    games.forEach((g,idx)=>{
      const row = document.createElement("div"); row.className="row";
      row.innerHTML = `<div>Game ${idx+1}: ${L.teams[g.away].name} at ${L.teams[g.home].name}</div>`;
      wrap.appendChild(row);
    });
    bracket.appendChild(wrap);
  }
  listSeries("AFC");
  listSeries("NFC");
  if (P.round==="SB") listSeries("SB");
}

// Boot
  $("#btnSave").onclick = ()=>{
    const payload = JSON.stringify({league: state.league, prospects: state.prospects, freeAgents: state.freeAgents, playoffs: state.playoffs, namesMode: state.namesMode});
    localStorage.setItem(SAVE_KEY, payload);
    setStatus("Saved");
  };
  $("#btnLoad").onclick = ()=>{
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw){ setStatus("Nothing to load"); return; }
    const obj = JSON.parse(raw);
    state.league = obj.league; state.prospects = obj.prospects||[]; state.freeAgents = obj.freeAgents||[]; state.playoffs = obj.playoffs||null;
    refreshAll();
    setStatus("Loaded");
  };
  $("#btnNewLeague").onclick = ()=>{
    if (confirm("Start a new league, clears progress")){ state.onboarded=false; openOnboard(); }
  };

  function refreshAll(){
    const userSel = $("#userTeam");
    if (!userSel.dataset.filled){
      fillTeamSelect(userSel);
      userSel.dataset.filled="1";
      const pitIdx = state.league.teams.findIndex(t=>t.abbr==="PIT");
      userSel.value = String(pitIdx>=0?pitIdx:0);
      userSel.addEventListener("change", ()=>{ renderRoster(); updateCapSidebar(); });
    }
    renderHub(); renderRoster(); renderCap(); renderSchedule(); renderStandings(); renderTradeUI(); renderFreeAgency(); renderDraft(); renderPlayoffs();
  }
  $("#btnSimWeek").onclick = () => { if(!state.onboarded){ openOnboard(); return; } simulateWeek(); };
  $("#btnSimSeason").onclick = () => { if(!state.onboarded){ openOnboard(); return; } for (let i=0;i<999;i++){ if (state.league.week > state.league.schedule.length) break; simulateWeek(); } };
  if ($("#btnSimRound")) $("#btnSimRound").addEventListener("click", simulatePlayoffRound);

  function startNew(){
    state.league = makeLeague();
    state.prospects = [];
    state.freeAgents = [];
    state.playoffs = null;
    refreshAll();
    location.hash = "#/hub";
  }

  (function init(){
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw){
      try{
        const obj = JSON.parse(raw);
        state.league = obj.league || makeLeague();
        state.prospects = obj.prospects || [];
        state.freeAgents = obj.freeAgents || [];
        state.playoffs = obj.playoffs || null;
      }catch(_){ state.league = makeLeague(); }
    } else {
      state.league = makeLeague();
    }
    const seg = location.hash.replace("#/","") || "hub";
    show(routes.includes(seg) ? seg : "hub");
  })();
})();
