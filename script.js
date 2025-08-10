// Pro + Contracts & Picks build
(function () {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const SAVE_KEY = "nflGM.league.contracts.picks";

  const state = { league: null, prospects: [], freeAgents: [], playoffs: null };

  const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K"];
  const DEPTH_NEEDS = { QB:1, RB:1, WR:3, TE:1, OL:5, DL:4, LB:3, CB:2, S:2, K:1 };
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
  function makeLeague(){
    const teams = TEAM_LIST.map((t, idx) => ({
      id: idx, abbr: t[0], name: t[1],
      rating: rand(70, 88), roster: [], record: {w:0,l:0,t:0,pf:0,pa:0},
      conf: Math.floor(idx/16), div: Math.floor((idx%16)/4),
      capBook: {}, deadCapBook: {}, capRollover: 0,
      capTotal: CAP_BASE,
      picks: [],
      strategy: { passBias: 0.5, tempo: 1.0, aggression: 1.0, coachSkill: Math.random()*0.4 + 0.6 },
    }));
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
    const schedule = make17GameSchedule(32);
    const L = {
      seed: rand(1, 999999), season: 1, week: 1,
      teams, schedule, resultsByWeek: {}, playoffsDone: false, champion: null
    };
    for (const t of teams) recalcCap(L, t);
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
  function make17GameSchedule(N){
    const weeks = 18;
    const schedule = Array.from({length: weeks}, ()=>[]);
    const teams = Array.from({length:N}, (_,i)=>i);
    // byes weeks 6..14
    const byeWeeks = [6,7,8,9,10,11,12,13,14];
    let idx=0;
    for (const w of byeWeeks){
      for (let k=0;k<4;k++){
        schedule[w-1].push({bye: teams[idx%N]});
        idx++;
      }
    }
    // ensure all have a bye
    const byes = new Set();
    schedule.forEach(week=>week.forEach(g=>{ if (g.bye!==undefined) byes.add(g.bye); }));
    for (let t=0;t<N;t++){
      if (!byes.has(t)) schedule[8].push({bye:t});
    }
    // fill games
    const played = new Set();
    const gamesPerTeam = Array(N).fill(0);
    for (let w=0; w<weeks; w++){
      const avail = teams.filter(t=>!schedule[w].some(g=>g.bye===t));
      shuffle(avail);
      while (avail.length>=2){
        const a = avail.pop();
        const b = avail.pop();
        schedule[w].push({home:a, away:b});
        gamesPerTeam[a]++; gamesPerTeam[b]++;
        played.add(pairKey(a,b));
      }
    }
    return schedule;
  }
  function shuffle(a){ for (let i=a.length-1; i>0; i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }
  function pairKey(a,b){ return a<b? `${a}-${b}` : `${b}-${a}`; }

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
    $("#hubSeason").textContent = L.season;
    $("#hubWeek").textContent = L.week;
    $("#hubWeeks").textContent = L.schedule.length;
    $("#seasonNow").textContent = L.season;
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
    tbl.innerHTML = `<thead><tr><th>Player</th>${years.map(y=>`<th>Y${L.season+y}</th>`).join("")}</tr></thead>`;
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
      const yr = L.season + y;
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
      div.innerHTML = `<div>Game ${idx+1}: ${away.abbr} at ${home.abbr}</div>`;
      box.appendChild(div);
    });
  }

  function renderStandings(){
    const scope = $("#standingsScope").value || "league";
    const wrap = $("#standingsWrap"); wrap.innerHTML="";
    const groups = standingsRows(scope);
    for (const group of groups){
      const title = Object.keys(group)[0];
      const rows = group[title];
      const card = document.createElement("div"); card.className="card";
      const tbl = document.createElement("table"); tbl.className="table";
      tbl.innerHTML = `<thead><tr><th>${title}</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>`;
      const tb = document.createElement("tbody");
      rows.forEach(r=>{
        const t = r.t; const pd = t.record.pf - t.record.pa;
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${t.abbr}</td><td>${t.record.w}</td><td>${t.record.l}</td><td>${t.record.t}</td><td>${pct(t.record).toFixed(3)}</td><td>${t.record.pf}</td><td>${t.record.pa}</td><td>${pd}</td>`;
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); card.appendChild(tbl); wrap.appendChild(card);
    }
    $("#standingsScope").onchange = renderStandings;
  }
  function pct(rec){ const g = rec.w + rec.l + rec.t; return g? (rec.w + 0.5*rec.t)/g : 0; }
  function cmpTeams(a,b){
    const pA = pct(a.record), pB = pct(b.record);
    if (pA !== pB) return pA - pB;
    const pdA = a.record.pf - a.record.pa, pdB = b.record.pf - b.record.pa;
    if (pdA !== pdB) return pdA - pdB;
    return (a.rating||0) - (b.rating||0);
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
    const now = state.league.season;
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
    const now = state.league.season;
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
    if (L.week > L.schedule.length){
      if (!state.playoffs) { startPlayoffs(); location.hash = "#/playoffs"; return; }
      return;
    }
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
    if (L.week > L.schedule.length){
      setStatus("Regular season complete. Playoffs unlocked.");
    }
    renderHub();
  }

  function applyResult(home, away, sH, sA){
    home.record.pf += sH; home.record.pa += sA;
    away.record.pf += sA; away.record.pa += sH;
    if (sH === sA){ home.record.t++; away.record.t++; }
    else if (sH > sA){ home.record.w++; away.record.l++; }
    else { away.record.w++; home.record.l++; }
  }

  // Playoffs minimal, then offseason rollover
  function startPlayoffs(){
    state.playoffs = { round: "CHAMP", bracket: [], results: [] };
    $("#btnSimRound").onclick = simulatePlayoffRound;
  }
  function renderPlayoffs(){
    const P = state.playoffs;
    const rs = $("#playoffResults"); if (!rs) return;
    rs.innerHTML = "";
    (P?.results||[]).forEach(line=>{ const d = document.createElement("div"); d.textContent = line; rs.appendChild(d); });
  }
  function simulatePlayoffRound(){
    const L = state.league;
    const champ = choice(L.teams);
    state.playoffs.results.push(`Champion: ${champ.abbr}`);
    runOffseason();
    state.playoffs = null;
    location.hash = "#/hub";
  }

  // Offseason rollover and aging
  function runOffseason(){
    const L = state.league;
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
    L.week = 1;
    L.resultsByWeek = {};
    L.schedule = make17GameSchedule(32);
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

  // Boot
  $("#btnSave").onclick = ()=>{
    const payload = JSON.stringify({league: state.league, prospects: state.prospects, freeAgents: state.freeAgents, playoffs: state.playoffs});
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
    if (confirm("Start a new league, clears progress")){ startNew(); }
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
  $("#btnSimWeek").onclick = () => simulateWeek();
  $("#btnSimSeason").onclick = () => { for (let i=0;i<999;i++){ if (state.league.week > state.league.schedule.length) break; simulateWeek(); } };
  $("#btnSimRound")?.addEventListener("click", simulatePlayoffRound);

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