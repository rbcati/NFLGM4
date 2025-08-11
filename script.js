// script.js
;(function () {
  'use strict';


  window.addEventListener('error', function (e) {
    try {
      var div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#3b0d0d;color:#fff;padding:8px 12px;font-family:system-ui;box-shadow:0 2px 6px rgba(0,0,0,.4)';
      div.textContent = 'JS error: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '');
      document.body.appendChild(div);
    } catch (_) {}
  });
  // Quick error banner so Netlify previews surface failures immediately
  window.addEventListener('error', function (e) {
    try {
      var div = document.createElement('div');
      div.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:9999;background:#3b0d0d;color:#fff;padding:8px 12px;font-family:system-ui;box-shadow:0 2px 6px rgba(0,0,0,.4)';
      div.textContent = 'JS error: ' + (e.message || '') + ' @ ' + (e.filename || '') + ':' + (e.lineno || '');
      document.body.appendChild(div);
    } catch (_) {}
  });

  // schedule API handle
  const Scheduler = window.Scheduler;
  if (!Scheduler || typeof Scheduler.makeAccurateSchedule !== 'function') {
    throw new Error('schedule.js failed to initialize (makeAccurateSchedule missing)');
const { makeLeague } = window.League;
  // Shortcuts to split globals
  var U = window.Utils;
  var C = window.Constants;
  var T = window.Teams;


  // App constants
  var YEAR_START = 2025;
  var SAVE_KEY = 'nflGM4.league';
  var routes = ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings'];
 
  // State
  var state = {
    league: null,
    freeAgents: [],
    playoffs: null,
    namesMode: 'fictional',
    onboarded: false,
    pendingOffers: []
  };

  // ...build teams first...
  const L = {
    seed: Math.floor(Math.random()*1e6),
    season: 1,
    year: 2025,
    week: 1,
    teams,
    schedule: [],        // fill after L exists
    resultsByWeek: {},
    playoffsDone: false,
    champion: null
  };
  // compute ranks before schedule
  const ranks = Scheduler.computeLastDivisionRanks(L);
  L.teams.forEach((t,i)=>{ t.lastDivisionRank = ranks[i]; });

  // now seed the schedule
  L.schedule = Scheduler.makeAccurateSchedule(L);

  // recalc cap etc...
  return L;
}
  // Name banks for generated players
  var FIRST = ['James','Michael','Chris','Alex','Jordan','Tyler','Jacob','Ethan','Logan','Mason','Liam','Noah','Owen','Jaden','Austin','Evan','Blake','Wyatt','Carson','Aiden','Dylan','Hunter','Cole','Kai','Zion','Nico','Xavier','Trent','Shawn','Brett','Marcus','Isaiah','Jamal','Elijah','Cameron','Trevor','Devon','Shane','Aaron','Caleb','Nick','Matt','Jake','Josh','Troy'];
  var LAST = ['Johnson','Smith','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriguez','Wilson','Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Thompson','White','Lopez','Lee','Gonzalez','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Reed','Cook','Bell','Perez','Hill','Green'];

  // DOM helpers
  var $ = function (sel) { return document.querySelector(sel); };
  var $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  // Team name mode
  function listByMode(mode) {
    return mode === 'real' ? T.TEAM_META_REAL : T.TEAM_META_FICTIONAL;
  }

  function clampYear(v) {
    var y = parseInt(v, 10);
    if (!Number.isFinite(y)) y = YEAR_START;
    return Math.max(1930, Math.min(9999, y));
  }

  // Player factory with contract fields
  function makePlayer(pos) {
    var speed = U.clamp(U.rand(50, 95) + ((pos === 'WR' || pos === 'CB') ? 6 : 0) + ((pos === 'OL' || pos === 'DL') ? -8 : 0), 40, 99);
    var strength = U.clamp(U.rand(50, 95) + ((pos === 'OL' || pos === 'DL') ? 6 : 0) + ((pos === 'WR' || pos === 'CB') ? -8 : 0), 40, 99);
    var agility = U.clamp(U.rand(50, 95), 40, 99);
    var awareness = U.clamp(U.rand(40, 92), 30, 99);
    var ovr = U.clamp(Math.round((speed*0.25 + strength*0.25 + agility*0.2 + awareness*0.3)/1.15), 50, 99);
    var baseAnnual = Math.round(0.42*ovr*10)/10;
    var years = U.rand(1,4);
    var signingBonus = Math.round((baseAnnual * years * (0.25 + Math.random()*0.35))*10)/10;
    return {
      id: U.id(),
      name: U.choice(FIRST) + ' ' + U.choice(LAST),
      pos: pos,
      age: U.rand(21,34),
      speed: speed,
      strength: strength,
      agility: agility,
      awareness: awareness,
      ovr: ovr,
      years: years,
      yearsTotal: years,
      baseAnnual: baseAnnual,
      signingBonus: signingBonus,
      guaranteedPct: 0.5,
      injuryWeeks: 0,
      fatigue: 0,
      abilities: []
    };
  }

  function tagAbilities(p) {
    if (p.pos === 'QB' && p.speed >= 85 && p.agility >= 85) p.abilities.push('Dual Threat');
    if (p.pos === 'WR' && p.speed >= 92) p.abilities.push('Deep Threat');
    if (p.pos === 'RB' && p.strength >= 92) p.abilities.push('Power Back');
    if (p.pos === 'CB' && p.agility >= 90 && p.awareness >= 85) p.abilities.push('Ball Hawk');
    if (p.pos === 'DL' && p.strength >= 94) p.abilities.push('Run Stuffer');
    if (p.pos === 'K' && p.awareness >= 88) p.abilities.push('Clutch');
  }

  // Contracts / cap
  function prorationPerYear(p){ return p.signingBonus / p.yearsTotal; }
  function capHitFor(p, relSeason) {
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
    var active = team.roster.reduce(function (s,p){ return s + capHitFor(p, 0); }, 0);
    var dead = team.deadCapBook[league.season] || 0;
    var capTotal = C.CAP_BASE + (team.capRollover||0);
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
    var idx = team.roster.findIndex(function(x){return x.id===p.id;});
    if (idx>=0) team.roster.splice(idx,1);
    p.years = 0;
  }

  // Picks
  function seedTeamPicks(team, startSeason, count){
    team.picks = [];
    for (var y=0; y<count; y++){
      for (var r=1; r<=7; r++){
        team.picks.push({year: startSeason + y, round: r, from: team.abbr, id: U.id()});
      }
    }
  }
  function pickValue(pick){
    var base = {1: 25, 2: 15, 3: 8, 4: 5, 5: 3, 6: 2, 7: 1}[pick.round] || 1;
    var yearsOut = pick.year - state.league.season;
    var discount = Math.pow(0.8, yearsOut);
    return base * discount;
  }


      // ...build teams...
  const L = {
    seed: rand(1, 999999),
    season: 1,
    year: YEAR_START,
    week: 1,
    teams,
    schedule: [],           // set after L exists
    resultsByWeek: {},
    playoffsDone: false,
    champion: null
  };
  L.schedule = S.makeAccurateSchedule(L);  // <-- call here, not before L
  // ...rest...
  return L;
    var baseList = teamList || listByMode(state.namesMode);
    var teams = baseList.map(function (t, idx) {
      var abbr = t.abbr || t[0];
      var name = t.name || t[1];
      var conf = typeof t.conf === 'number' ? t.conf : Math.floor(idx/16);
      var div  = typeof t.div  === 'number' ? t.div  : Math.floor((idx%16)/4);
      return {
        id: idx,
        abbr: abbr,
        name: name,
        rating: U.rand(70, 88),
        roster: [],
        record: {w:0,l:0,t:0,pf:0,pa:0},
        conf: conf,
        div: div,
        capBook: {},
        deadCapBook: {},
        capRollover: 0,
        capTotal: C.CAP_BASE,
        picks: [],
        strategy: { passBias: 0.5, tempo: 1.0, aggression: 1.0, coachSkill: Math.random()*0.4 + 0.6 }
      };
    });
// schedule after L exists
L.schedule = S.makeAccurateSchedule(L);

// cap setup
L.teams.forEach(function (t) { recalcCap(L, t); });

// stored initial ranks for scheduling next year
var tmpRanks = S.computeLastDivisionRanks(L);
L.teams.forEach(function (t,i) { t.lastDivisionRank = tmpRanks[i]; });

return L;
} // <-- if makeLeague was declared as `function makeLeague(...) {` keep this lone brace
// }; // <-- if makeLeague was assigned like `const makeLeague = function(...) {`, then use `};` instead
// end of makeLeague(...)
return L;
}   // or `};` if makeLeague was assigned

/* Namesets */
function listByMode(mode) {
  var real = window.REAL_TEAMS_32 || window.TEAMS_REAL || (window.T && window.T.TEAM_META_REAL) || [];
  var fict = window.FICTIONAL_TEAMS_32 || window.TEAMS || (window.T && window.T.TEAM_META_FICTIONAL) || [];
  return mode === 'real' ? real : fict;
}

// expose globally only once
if (!window.listByMode) window.listByMode = listByMode;

/* ------------------------------------------------------------------ */
/* Namesets and relabeling                                            */
/* ------------------------------------------------------------------ */


/* Names mode relabel */
window.rebuildTeamLabels ??= function rebuildTeamLabels(mode) {
  const L = state && state.league;
  const meta = window.listByMode(mode);

  if (!L || !Array.isArray(L.teams) || !Array.isArray(meta) || L.teams.length !== meta.length) return;

  for (let i = 0; i < L.teams.length; i++) {
    const src = meta[i], dst = L.teams[i];
    dst.abbr = src.abbr;
    dst.name = src.name;
    dst.conf = src.conf;
    dst.div  = src.div;
  }
};

// Wire the Settings button
document.getElementById('btnApplyNamesMode')?.addEventListener('click', () => {
  const mode = document.querySelector('input[name="settingsNamesMode"]:checked')?.value || 'fictional';
  window.rebuildTeamLabels(mode);
  window.renderStandings && window.renderStandings();
  window.renderRoster && window.renderRoster();
  window.renderHub && window.renderHub();
});


  // Refresh selects
  var selects = document.querySelectorAll('select');
  selects.forEach(function (sel) {
    if (sel.id === 'onboardTeam') return;
    var prev = sel.value;
    sel.innerHTML = '';
    L.teams.forEach(function (t, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      var conf = CONF_NAMES[t.conf] + ' ' + DIV_NAMES[t.div];
      opt.textContent = t.abbr + ' — ' + t.name + ' (' + conf + ')';
      sel.appendChild(opt);
    });
    if (prev) sel.value = prev;
  });

  // Repaint key views
  renderHub();
  renderRoster();
  renderStandings();
  renderDraft();
}

    });
    // refresh selects
    $$('select').forEach(function(sel){
      if (sel.id === 'onboardTeam') return;
      var prev = sel.value;
      sel.innerHTML = '';
      L.teams.forEach(function(t, i){
        var opt = document.createElement('option');
        opt.value = String(i);
        var confTxt = C.CONF_NAMES[t.conf] + ' ' + C.DIV_NAMES[t.div];
        opt.textContent = t.abbr + ' — ' + t.name + ' (' + confTxt + ')';
        sel.appendChild(opt);
      });
      if (prev) sel.value = prev;
    });
    renderHub(); renderRoster(); renderStandings(); renderDraft();
  }

  // UI routing
  function show(route){
    routes.forEach(function (r) {
      var el = $('#'+r);
      if (el) el.hidden = (r !== route);
    });
    if (route === 'hub') renderHub();
    if (route === 'roster') renderRoster();
    if (route === 'cap') renderCap();
    if (route === 'schedule') renderSchedule();
    if (route === 'standings') renderStandings();
    if (route === 'trade') renderTradeUI();
    if (route === 'freeagency') renderFreeAgency();
    if (route === 'draft') renderDraft();
    if (route === 'playoffs') renderPlayoffs();
    if (route === 'settings') {
      var y = (state.league && state.league.year) ? state.league.year : YEAR_START;
      var el = document.getElementById('settingsYear'); if (el) el.value = y;
    }
  }
  window.addEventListener('hashchange', function () {
    var seg = location.hash.replace('#/','') || 'hub';
    show(routes.indexOf(seg) >= 0 ? seg : 'hub');
  });

  function setStatus(msg){
    var el = $('#statusMsg'); if (!el) return;
    el.textContent = msg;
    setTimeout(function(){ el.textContent=''; }, 2000);
  }

  // Hub
  function renderHub(){
    var L = state.league;
    $('#hubSeason').textContent = L.year;
    $('#seasonNow').textContent = L.year;
    $('#hubWeek').textContent = L.week;
    $('#hubWeeks').textContent = L.schedule.length;
    var games = (L.schedule[L.week-1] || []).filter(function(g){return !g.bye;});
    $('#hubGames').textContent = games.length;

    // Power ranking
    var power = L.teams.map(function(t,i){return {i:i,score: t.rating + (t.record.pf - t.record.pa)/20};})
      .sort(function(a,b){return b.score - a.score;})
      .slice(0,10);
    var ol = $('#hubPower'); ol.innerHTML='';
    power.forEach(function(row){
      var li = document.createElement('li');
      li.textContent = L.teams[row.i].name;
      ol.appendChild(li);
    });

    // last week results
    var res = L.resultsByWeek[L.week-2] || []; // previous completed week
    var box = $('#hubResults'); box.innerHTML='';
    res.forEach(function(g){
      if (g.bye) return;
      var t1 = L.teams[g.home].abbr, t2 = L.teams[g.away].abbr;
      var div = document.createElement('div');
      div.className='row';
      div.innerHTML = '<div>'+t2+' '+g.scoreAway+' at '+t1+' '+g.scoreHome+'</div><div class="spacer"></div><div class="muted">'+(g.homeWin?L.teams[g.home].name:L.teams[g.away].name)+' wins</div>';
      box.appendChild(div);
    });
    updateCapSidebar();
    renderOffers();
  }

  function updateCapSidebar(){
    var L = state.league;
    var t = currentTeam();
    recalcCap(L, t);
    $('#capUsed').textContent = t.capUsed.toFixed(1) + ' M';
    $('#capTotal').textContent = t.capTotal.toFixed(1) + ' M';
    $('#deadCap').textContent = (t.deadCap||0).toFixed(1) + ' M';
    $('#capRoom').textContent = (t.capTotal - t.capUsed).toFixed(1) + ' M';
  }

  // Roster
  function renderRoster(){
    var L = state.league;
    var sel = $('#rosterTeam');
    if (!sel.dataset.filled){
      fillTeamSelect(sel);
      sel.dataset.filled = '1';
      sel.addEventListener('change', renderRoster);
    }
    var teamId = parseInt(sel.value || $('#userTeam').value || '0', 10);
    sel.value = teamId;
    var tm = L.teams[teamId];
    $('#rosterTitle').textContent = 'Roster — ' + tm.name + ' ('+tm.abbr+')';
    var tbl = $('#rosterTable');
    tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base (M)</th><th>Bonus (tot)</th><th>Years</th><th>Cap Hit</th><th>Abilities</th><th>Status</th></tr></thead>';
    var tb = document.createElement('tbody');
    tm.roster.forEach(function(p){
      var inj = p.injuryWeeks>0 ? ('Out '+p.injuryWeeks+'w') : (p.fatigue>0?('Fatigue '+p.fatigue):'OK');
      var cap = capHitFor(p, 0);
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><input type="checkbox" data-id="'+p.id+'"></td>'+
                     '<td>'+p.name+'</td><td>'+p.pos+'</td><td>'+p.ovr+'</td>'+
                     '<td>'+p.baseAnnual.toFixed(1)+'</td><td>'+p.signingBonus.toFixed(1)+'</td>'+
                     '<td>'+p.years+'</td><td>'+cap.toFixed(1)+'</td>'+
                     '<td>'+((p.abilities||[]).join(', '))+'</td><td>'+inj+'</td>';
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    $('#btnRelease').onclick = function(){ releaseSelected(tm); };
    var dc = autoDepthChart(tm);
    var box = $('#depthChart'); box.innerHTML='';
    Object.keys(dc).forEach(function(pos){
      var list = dc[pos];
      var div = document.createElement('div');
      div.className = 'row';
      var names = list.map(function(p){return p.name+' ('+p.ovr+')';}).join(', ');
      div.innerHTML = '<div><strong>'+pos+'</strong></div><div class="spacer"></div><div class="muted">'+names+'</div>';
      box.appendChild(div);
    });
    updateCapSidebar();
  }

  function releaseSelected(team){
    var ids = $$('input[type=checkbox][data-id]:checked').map(function(x){return x.dataset.id;});
    if (!ids.length){ setStatus('Select players to release.'); return; }
    var isPost = $('#postJune1').checked;
    ids.forEach(function(pid){
      var p = team.roster.find(function(x){return x.id===pid;});
      if (p) releaseWithProration(state.league, team, p, isPost);
    });
    recalcCap(state.league, team);
    setStatus(isPost ? 'Released with post-June 1 split.' : 'Released with acceleration.');
    renderRoster();
  }

  function autoDepthChart(team){
    var byPos = {}; C.POSITIONS.forEach(function(pos){ byPos[pos] = []; });
    team.roster.forEach(function(p){ byPos[p.pos].push(p); });
    C.POSITIONS.forEach(function(pos){ byPos[pos].sort(function(a,b){return b.ovr-a.ovr;}); });
    var depth = {};
    Object.keys(C.DEPTH_NEEDS).forEach(function(pos){
      var need = C.DEPTH_NEEDS[pos];
      depth[pos] = byPos[pos].slice(0, need);
    });
    return depth;
  }

  // Cap tab
  function renderCap(){
    var L = state.league;
    var t = currentTeam();
    recalcCap(L, t);
    var years = [0,1,2];
    var tbl = $('#capTable');
    tbl.innerHTML = '<thead><tr><th>Player</th>'+years.map(function(y){return '<th>Y'+(L.year+y)+'</th>';}).join('')+'</tr></thead>';
    var tb = document.createElement('tbody');
    t.roster.forEach(function(p){
      var row = document.createElement('tr');
      row.innerHTML = '<td>'+p.name+' • '+p.pos+'</td>' + years.map(function(y){
        var hit = capHitFor(p, y);
        return '<td>'+(hit?hit.toFixed(1):'')+'</td>';
      }).join('');
      tb.appendChild(row);
    });
    tbl.appendChild(tb);
    var deadBox = $('#deadLedger'); deadBox.innerHTML='';
    years.forEach(function(y){
      var yr = L.year + y;
      var amt = t.deadCapBook[yr] || 0;
      var div = document.createElement('div');
      div.className = 'row';
      div.innerHTML = '<div class="badge">Season '+yr+'</div><div class="spacer"></div><div>Dead cap '+amt.toFixed(1)+' M</div>';
      deadBox.appendChild(div);
    });
    var capSummary = $('#capSummary');
    capSummary.textContent = 'Current cap used '+t.capUsed.toFixed(1)+' M, total '+t.capTotal.toFixed(1)+' M, room '+(t.capTotal-t.capUsed).toFixed(1)+' M.';
    updateCapSidebar();
  }

  // Schedule tab
  function renderSchedule(){
    var L = state.league;
    $('#btnSimWeek2').onclick = simulateWeek;
    var week = L.week;
    var games = L.schedule[week-1] || [];
    var box = $('#scheduleList'); box.innerHTML='';
    var byeTeams = games.filter(function(g){return g.bye!==undefined;}).map(function(g){return L.teams[g.bye].abbr;});
    if (byeTeams.length){
      var d = document.createElement('div');
      d.className = 'muted';
      d.textContent = 'Byes: ' + byeTeams.join(', ');
      box.appendChild(d);
    }
    games.filter(function(g){return g.bye===undefined;}).forEach(function (g, idx) {
      var home = L.teams[g.home], away = L.teams[g.away];
      var div = document.createElement('div');
      div.className = 'row';
      div.innerHTML = '<div>Game '+(idx+1)+': '+away.name+' at '+home.name+'</div>';
      box.appendChild(div);
    });
  }

  // Standings and tiebreakers
  function teamStats(L){
    var N = L.teams.length;
    var stats = Array.from({length:N}).map(function(){return {w:0,l:0,t:0,pf:0,pa:0, divW:0,divL:0,divT:0, confW:0,confL:0,confT:0, h2h:{}};});
    for (var i=0;i<N;i++){
      var r = L.teams[i].record;
      var s = stats[i];
      s.w=r.w; s.l=r.l; s.t=r.t; s.pf=r.pf; s.pa=r.pa;
    }
    Object.keys(L.resultsByWeek).forEach(function(wk){
      var arr = L.resultsByWeek[wk] || [];
      arr.forEach(function(g){
        if (g.bye) return;
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
      });
    });
    return stats;
  }
  function pctRec(w,l,t){ var g=w+l+t; return g? (w + 0.5*t)/g : 0; }
  function pctDiv(s){ return pctRec(s.divW, s.divL, s.divT); }
  function pctConf(s){ return pctRec(s.confW, s.confL, s.confT); }

  function tieBreakCompare(L, aIdx, bIdx, scope){
    if (aIdx===bIdx) return 0;
    var Sx = teamStats(L);
    var pA = pctRec(Sx[aIdx].w, Sx[aIdx].l, Sx[aIdx].t);
    var pB = pctRec(Sx[bIdx].w, Sx[bIdx].l, Sx[bIdx].t);
    if (pA !== pB) return pB - pA;
    var h2h = Sx[aIdx].h2h[bIdx] || 0;
    if (h2h !== 0) return h2h > 0 ? -1 : 1;
    if (scope==='division' || scope==='leaders'){
      var dA = pctDiv(Sx[aIdx]), dB = pctDiv(Sx[bIdx]);
      if (dA !== dB) return dB - dA;
    }
    var cA = pctConf(Sx[aIdx]), cB = pctConf(Sx[bIdx]);
    if (cA !== cB) return cB - cA;
    var pdA = (Sx[aIdx].pf - Sx[aIdx].pa);
    var pdB = (Sx[bIdx].pf - Sx[bIdx].pa);
    if (pdA !== pdB) return pdB - pdA;
    if (Sx[aIdx].pf !== Sx[bIdx].pf) return Sx[bIdx].pf - Sx[aIdx].pf;
    return aIdx - bIdx;
  }

  function renderStandings(){
    var L = state.league;
    var scopeSel = $('#standingsScope');
    var scope = scopeSel ? scopeSel.value : 'league';
    var leadersOnly = $('#leadersOnly') ? $('#leadersOnly').checked : false;
    var highlight = $('#highlightLeaders') ? $('#highlightLeaders').checked : true;
    var wrap = $('#standingsWrap'); wrap.innerHTML='';

    function rowHtml(tIdx, leader){
      var t = L.teams[tIdx];
      var rec = t.record;
      var cls = leader && highlight ? ' class="leader-row"' : '';
      var badge = leader ? ' <span class="badge leader">Leader</span>' : '';
      var pd = rec.pf - rec.pa;
      return '<tr'+cls+'><td>'+t.abbr+badge+'</td><td>'+rec.w+
             '</td><td>'+rec.l+'</td><td>'+rec.t+'</td><td>'+U.pct(rec).toFixed(3)+
             '</td><td>'+rec.pf+'</td><td>'+rec.pa+'</td><td>'+pd+'</td></tr>';
    }
    function sorted(list, cmpScope){
      var arr = list.slice();
      arr.sort(function(a,b){ return tieBreakCompare(L, a, b, cmpScope); });
      return arr;
    }

    if (scope==='league'){
      for (var conf=0; conf<2; conf++){
        var card = document.createElement('div'); card.className='card';
        var title = conf===0 ? 'AFC' : 'NFC';
        var allIdx = L.teams.map(function(t,i){return i;}).filter(function(i){return L.teams[i].conf===conf;});
        var leaders = [];
        for (var dv=0; dv<4; dv++){
          var divIdx = allIdx.filter(function(i){return L.teams[i].div===dv;});
          var winner = sorted(divIdx, 'leaders')[0];
          leaders.push(winner);
        }
        var displayIdx = leadersOnly ? leaders : sorted(allIdx, 'conference');
        var tbl = document.createElement('table'); tbl.className='table';
        tbl.innerHTML = '<thead><tr><th>'+title+'</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>';
        var tb = document.createElement('tbody');
        displayIdx.forEach(function(i){ tb.innerHTML += rowHtml(i, leaders.indexOf(i)>=0); });
        tbl.appendChild(tb); card.appendChild(tbl); wrap.appendChild(card);
      }
    } else if (scope==='conference'){
      for (var conf2=0; conf2<2; conf2++){
        var card2 = document.createElement('div'); card2.className='card';
        var title2 = conf2===0 ? 'AFC' : 'NFC';
        var allIdx2 = L.teams.map(function(t,i){return i;}).filter(function(i){return L.teams[i].conf===conf2;});
        var leaders2 = [];
        for (var dv2=0; dv2<4; dv2++){
          var divIdx2 = allIdx2.filter(function(i){return L.teams[i].div===dv2;});
          var winner2 = sorted(divIdx2, 'leaders')[0];
          leaders2.push(winner2);
        }
        var displayIdx2 = leadersOnly ? leaders2 : sorted(allIdx2, 'conference');
        var tbl2 = document.createElement('table'); tbl2.className='table';
        tbl2.innerHTML = '<thead><tr><th>'+title2+'</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>';
        var tb2 = document.createElement('tbody');
        displayIdx2.forEach(function(i){ tb2.innerHTML += rowHtml(i, leaders2.indexOf(i)>=0); });
        tbl2.appendChild(tb2); card2.appendChild(tbl2); wrap.appendChild(card2);
      }
    } else {
      for (var conf3=0; conf3<2; conf3++){
        for (var dv3=0; dv3<4; dv3++){
          var card3 = document.createElement('div'); card3.className='card';
          var title3 = C.CONF_NAMES[conf3] + ' ' + C.DIV_NAMES[dv3];
          var idxs = L.teams.map(function(t,i){return i;}).filter(function(i){var tm=L.teams[i]; return tm.conf===conf3 && tm.div===dv3;});
          var order = sorted(idxs, 'division');
          var winner3 = order[0];
          var tbl3 = document.createElement('table'); tbl3.className='table';
          tbl3.innerHTML = '<thead><tr><th>'+title3+'</th><th>W</th><th>L</th><th>T</th><th>PCT</th><th>PF</th><th>PA</th><th>PD</th></tr></thead>';
          var tb3 = document.createElement('tbody');
          order.forEach(function(i){ tb3.innerHTML += rowHtml(i, i===winner3); });
          tbl3.appendChild(tb3); card3.appendChild(tbl3); wrap.appendChild(card3);
        }
      }
    }

    if ($('#standingsScope')) $('#standingsScope').onchange = renderStandings;
    if ($('#leadersOnly')) $('#leadersOnly').addEventListener('change', renderStandings);
    if ($('#highlightLeaders')) $('#highlightLeaders').addEventListener('change', renderStandings);
    if ($('#btnPlayoffPicture')) $('#btnPlayoffPicture').addEventListener('click', function(){
      renderPlayoffPicture();
      $('#playoffPicture').hidden = false;
    }, {once:true});
  }

  // Trade UI
  function renderTradeUI(){
    var L = state.league;
    var selA = $('#tradeA'), selB = $('#tradeB');
    if (!selA.dataset.filled){ fillTeamSelect(selA); selA.dataset.filled='1'; selA.value = $('#userTeam').value; selA.addEventListener('change', renderTradeLists); }
    if (!selB.dataset.filled){ fillTeamSelect(selB); selB.dataset.filled='1'; selB.value = String((parseInt(selA.value,10)+1)%L.teams.length); selB.addEventListener('change', renderTradeLists); }
    $('#tradeValidate').onclick = validateTrade;
    $('#tradeExecute').onclick = executeTrade;
    renderTradeLists();
  }
  function renderTradeLists(){
    var L = state.league;
    var a = parseInt($('#tradeA').value,10);
    var b = parseInt($('#tradeB').value,10);
    listPlayers('#tradeListA', L.teams[a], 'A');
    listPlayers('#tradeListB', L.teams[b], 'B');
    listPicks('#pickListA', L.teams[a], 'A');
    listPicks('#pickListB', L.teams[b], 'B');
    $('#tradeExecute').disabled = true;
    $('#tradeInfo').textContent = 'Select players or picks on both sides, then validate.';
  }
  function listPlayers(rootSel, team, side){
    var root = $(rootSel); root.innerHTML = '';
    team.roster.forEach(function(p){
      var row = document.createElement('label');
      row.className = 'row';
      var cap = capHitFor(p, 0);
      row.innerHTML = '<input type="checkbox" data-side="'+side+'" data-type="player" data-id="'+p.id+'" />'+
                      '<div>'+p.name+' • '+p.pos+'</div>'+
                      '<div class="spacer"></div>'+
                      '<div class="muted">OVR '+p.ovr+' • Cap '+cap.toFixed(1)+'M ('+p.years+'y)</div>';
      root.appendChild(row);
    });
  }
  function listPicks(rootSel, team, side){
    var root = $(rootSel); root.innerHTML = '';
    var now = state.league.year;
    team.picks.slice().sort(function(a,b){return a.year===b.year? a.round-b.round : a.year-b.year;}).forEach(function(pk){
      var row = document.createElement('label');
      row.className = 'row';
      row.innerHTML = '<input type="checkbox" data-side="'+side+'" data-type="pick" data-id="'+pk.id+'" />'+
                       '<div>Y'+(now + (pk.year-1))+' R'+pk.round+'</div>'+
                       '<div class="spacer"></div>'+
                       '<div class="muted">from '+pk.from+'</div>';
      root.appendChild(row);
    });
  }
  function collectSelected(side, team){
    var checks = $$('input[type=checkbox][data-side='+side+']:checked');
    var players = [], picks = [];
    checks.forEach(function(c){
      if (c.dataset.type==='player'){
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
    return p.ovr - agePenalty + contractValue*0.05 + (p.pos==='QB'?6:0) + ((p.pos==='WR'||p.pos==='CB')?2:0);
  }
  function validateTrade(){
    var L = state.league;
    var a = parseInt($('#tradeA').value,10);
    var b = parseInt($('#tradeB').value,10);
    var A = collectSelected('A', L.teams[a]);
    var B = collectSelected('B', L.teams[b]);
    if ((!A.players.length && !A.picks.length) || (!B.players.length && !B.picks.length)){
      $('#tradeInfo').textContent = 'Pick at least one asset on each side.';
      $('#tradeExecute').disabled = true; return;
    }
    var valA = A.players.reduce(function(s,p){return s+valueOf(p);},0) + A.picks.reduce(function(s,pk){return s+pickValue(pk);},0);
    var valB = B.players.reduce(function(s,p){return s+valueOf(p);},0) + B.picks.reduce(function(s,pk){return s+pickValue(pk);},0);
    var diff = Math.abs(valA - valB);
    var fair = diff <= 15;
    var capA = L.teams[a].capUsed - A.players.reduce(function(s,p){return s+capHitFor(p,0);},0) + B.players.reduce(function(s,p){return s+capHitFor(p,0);},0);
    var capB = L.teams[b].capUsed - B.players.reduce(function(s,p){return s+capHitFor(p,0);},0) + A.players.reduce(function(s,p){return s+capHitFor(p,0);},0);
    var capOK = capA <= L.teams[a].capTotal && capB <= L.teams[b].capTotal;
    $('#tradeInfo').textContent = 'Value A '+valA.toFixed(1)+' vs B '+valB.toFixed(1)+' — '+(fair?'Fair':'Unbalanced')+' (delta '+diff.toFixed(1)+'). Cap after: A '+capA.toFixed(1)+'/'+L.teams[a].capTotal+'M, B '+capB.toFixed(1)+'/'+L.teams[b].capTotal+'M '+(capOK?'':'(CAP VIOLATION)');
    $('#tradeExecute').disabled = !(fair && capOK);
  }
  function executeTrade(){
    var L = state.league;
    var a = parseInt($('#tradeA').value,10);
    var b = parseInt($('#tradeB').value,10);
    var A = collectSelected('A', L.teams[a]);
    var B = collectSelected('B', L.teams[b]);
    L.teams[a].roster = L.teams[a].roster.filter(function(p){return !A.players.some(function(x){return x.id===p.id;});}).concat(B.players).sort(function(x,y){return y.ovr-x.ovr;});
    L.teams[b].roster = L.teams[b].roster.filter(function(p){return !B.players.some(function(x){return x.id===p.id;});}).concat(A.players).sort(function(x,y){return y.ovr-x.ovr;});
    L.teams[a].picks = L.teams[a].picks.filter(function(pk){return !A.picks.some(function(x){return x.id===pk.id;});}).concat(B.picks);
    L.teams[b].picks = L.teams[b].picks.filter(function(pk){return !B.picks.some(function(x){return x.id===pk.id;});}).concat(A.picks);
    recalcCap(L, L.teams[a]); recalcCap(L, L.teams[b]);
    $('#tradeInfo').textContent = 'Trade executed.';
    renderTradeLists();
    setStatus('Trade complete.');
  }

  // Free agency
  function ensureFA(){
    if (state.freeAgents.length) return;
    for (var i=0;i<120;i++){
      var pos = U.choice(C.POSITIONS);
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
  function renderFreeAgency(){
    ensureFA();
    var L = state.league;
    var tbl = $('#faTable');
    tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Base</th><th>Bonus</th><th>Years</th><th>Abilities</th></tr></thead>';
    var tb = document.createElement('tbody');
    state.freeAgents.forEach(function(p,i){
      var tr = document.createElement('tr');
      tr.innerHTML = '<td><input type="radio" name="fa" value="'+i+'"></td><td>'+p.name+'</td><td>'+p.pos+'</td><td>'+p.ovr+'</td><td>'+p.baseAnnual.toFixed(1)+'</td><td>'+p.signingBonus.toFixed(1)+'</td><td>'+p.yearsTotal+'</td><td>'+((p.abilities||[]).join(', '))+'</td>';
      tb.appendChild(tr);
    });
    tbl.appendChild(tb);
    var sel = $('#faTeam'); if (!sel.dataset.filled){ fillTeamSelect(sel); sel.dataset.filled='1'; }
    $('#btnSignFA').disabled = true;
    tbl.addEventListener('change', function (e) { if (e.target && e.target.name==='fa') $('#btnSignFA').disabled = false; }, {once:true});
    $('#btnSignFA').onclick = function(){
      var idx = Number((document.querySelector('input[name=fa]:checked')||{}).value);
      if (Number.isNaN(idx)) return;
      var teamId = parseInt($('#faTeam').value || $('#userTeam').value, 10);
      var tm = L.teams[teamId];
      var p = state.freeAgents[idx];
      p.years = p.yearsTotal;
      var capAfter = tm.capUsed + capHitFor(p,0);
      if (capAfter > tm.capTotal){ setStatus('Cap exceeded. Release or trade first.'); return; }
      tm.roster.push(p);
      tm.roster.sort(function(a,b){return b.ovr-a.ovr;});
      state.freeAgents.splice(idx,1);
      recalcCap(L, tm);
      renderFreeAgency();
      setStatus('Signed free agent');
    };
  }

  // Draft picks view
  function renderDraft(){
    var sel = $('#draftTeam');
    if (!sel.dataset.filled){ fillTeamSelect(sel); sel.dataset.filled='1'; }
    var teamId = parseInt(sel.value || $('#userTeam').value || '0', 10);
    sel.value = teamId;
    var t = state.league.teams[teamId];
    var now = state.league.year;
    var box = $('#draftPicks'); box.innerHTML='';
    t.picks.slice().sort(function(a,b){return a.year===b.year? a.round-b.round : a.year-b.year;}).forEach(function(pk){
      var div = document.createElement('div');
      div.className = 'row';
      var v = pickValue(pk);
      div.innerHTML = '<div class="badge">Y'+(now + (pk.year-1))+' R'+pk.round+'</div><div class="spacer"></div><div class="muted">from '+pk.from+'</div><div class="muted">value '+v.toFixed(1)+'</div>';
      box.appendChild(div);
    });
  }

  // Sim
  function simulateWeek(){
    var L = state.league;
    if (L.week > L.schedule.length){
      if (!state.playoffs) { startPlayoffs(); location.hash = '#/playoffs'; return; }
      return;
    }
    var pairings = L.schedule[L.week-1];
    var results = [];
    pairings.forEach(function(pair){
      if (pair.bye !== undefined){
        results.push({bye: pair.bye});
        return;
      }
      var sH = U.rand(13,34);
      var sA = U.rand(10,31);
      var home = L.teams[pair.home], away = L.teams[pair.away];
      results.push({home: pair.home, away: pair.away, scoreHome: sH, scoreAway: sA, homeWin: sH>sA});
      applyResult(home, away, sH, sA);
    });
    // store results for this completed week at index L.week-1
    L.resultsByWeek[L.week-1] = results;
    L.week++;
    if (L.week > L.schedule.length){ setStatus('Regular season complete. Playoffs ready.'); }
    renderHub(); renderSchedule(); renderStandings();
  }
  function applyResult(home, away, sH, sA){
    home.record.pf += sH; home.record.pa += sA;
    away.record.pf += sA; away.record.pa += sH;
    if (sH === sA){ home.record.t++; away.record.t++; }
    else if (sH > sA){ home.record.w++; away.record.l++; }
    else { away.record.w++; home.record.l++; }
  }

  // Offseason
  function runOffseason(){
    var L = state.league;

    // store last-season division rank for next schedule
    var ranks = S.computeLastDivisionRanks(L);
    L.teams.forEach(function(t,i){ t.lastDivisionRank = ranks[i]; });

    L.teams.forEach(function (t) {
      recalcCap(L, t);
      var room = Math.max(0, t.capTotal - t.capUsed);
      t.capRollover = Math.round(room*10)/10;

      // age and decrement contracts
      var survivors = [];
      t.roster.forEach(function(p){
        if (p.years>0) p.years -= 1;
        if (p.years === 0){
          state.freeAgents.push(p);
        } else {
          p.age += 1;
          p.ovr = U.clamp(p.ovr + U.rand(-2,2), 48, 99);
          survivors.push(p);
        }
      });
      t.roster = survivors.sort(function(a,b){return b.ovr-a.ovr;});

      // move picks forward and reseed future year
      t.picks.forEach(function(pk){ pk.year = Math.max(1, pk.year - 1); });
      var needed = 7 - t.picks.filter(function(pk){return pk.year===C.YEARS_OF_PICKS;}).length;
      for (var i=0;i<needed;i++){ t.picks.push({year:C.YEARS_OF_PICKS, round:i+1, from:t.abbr, id:U.id()}); }

      delete t.deadCapBook[L.season-1];
      recalcCap(L, t);
      t.record = {w:0,l:0,t:0,pf:0,pa:0};
    });

    L.season += 1;
    L.year = (L.year || YEAR_START) + 1;
    L.week = 1;
    L.resultsByWeek = {};
    L.schedule = S.makeAccurateSchedule(L);
  }

  // Helpers
  function currentTeam(){
    var L = state.league;
    var idx = parseInt($('#userTeam').value || '0', 10);
    return L.teams[idx];
  }
  function fillTeamSelect(sel){
    var L = state.league;
    sel.innerHTML = '';
    L.teams.forEach(function(t,i){
      var opt = document.createElement('option');
      opt.value = String(i);
      var confTxt = C.CONF_NAMES[t.conf] + ' ' + C.DIV_NAMES[t.div];
      opt.textContent = t.abbr + ' — ' + t.name + ' (' + confTxt + ')';
      sel.appendChild(opt);
    });
  }

  // ===== Simple AI trade cadence =====

  function teamNeedProfile(team){
    var target = C.DEPTH_NEEDS;
    var byPos = {}; C.POSITIONS.forEach(function(p){byPos[p]=[];});
    team.roster.forEach(function(p){byPos[p.pos].push(p);});
    C.POSITIONS.forEach(function(p){byPos[p].sort(function(a,b){return b.ovr-a.ovr;});});
    var profile = {};
    Object.keys(target).forEach(function(pos){
      var need = target[pos];
      var have = byPos[pos].length;
      var top = byPos[pos].slice(0, Math.max(1, need));
      var quality = top.length? top.reduce(function(s,x){return s+x.ovr;},0)/top.length : 50;
      var countGap = Math.max(0, need - have);
      var qualityGap = Math.max(0, 80 - quality);
      profile[pos] = {countGap:countGap, qualityGap:qualityGap, score: countGap*6 + qualityGap*0.6};
    });
    return profile;
  }
  function teamSurplusPositions(team){
    var byPos = {}; C.POSITIONS.forEach(function(p){byPos[p]=0;});
    team.roster.forEach(function(p){byPos[p.pos]++;});
    var surplus = [];
    Object.keys(C.DEPTH_NEEDS).forEach(function(pos){
      var extra = byPos[pos] - C.DEPTH_NEEDS[pos];
      if (extra>0) surplus.push(pos);
    });
    return surplus;
  }
  function pickBestTradeCounterpart(L, teamA){
    var needs = teamNeedProfile(teamA);
    var needOrder = Object.keys(needs).sort(function(a,b){return needs[b].score - needs[a].score;});
    var best = null, bestScore = -1;
    L.teams.forEach(function(teamB){
      if (teamB===teamA) return;
      var bSurplus = new Set(teamSurplusPositions(teamB));
      var match = 0;
      for (var i=0;i<needOrder.length;i++){
        var pos = needOrder[i];
        var weight = (needOrder.length - i);
        if (bSurplus.has(pos)) match += weight;
      }
      if (match>bestScore){ bestScore = match; best = teamB; }
    });
    return best;
  }
  function chooseTradePieces(teamA, teamB){
    var needsA = teamNeedProfile(teamA);
    var needsB = teamNeedProfile(teamB);
    var wantA = Object.keys(needsA).sort(function(a,b){return needsA[b].score - needsA[a].score;});
    var wantB = Object.keys(needsB).sort(function(a,b){return needsB[b].score - needsB[a].score;});

    function tradable(team, pos){
      var pool = team.roster.filter(function(p){return p.pos===pos;}).sort(function(a,b){return a.ovr-b.ovr;});
      if (pool.length <= (C.DEPTH_NEEDS[pos]||1)) return null;
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

    var valA = packageA.reduce(function(s,p){return s+adjustValueForNeed(valueOf(p), teamB, p);},0);
    var valB = packageB.reduce(function(s,p){return s+adjustValueForNeed(valueOf(p), teamA, p);},0);

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
    var fair = Math.abs(sug.valA - sug.valB) <= 15;
    var capA = sug.teamA.capUsed - A.reduce(function(s,p){return s+capHitFor(p,0);},0) + B.reduce(function(s,p){return s+capHitFor(p,0);},0);
    var capB = sug.teamB.capUsed - B.reduce(function(s,p){return s+capHitFor(p,0);},0) + A.reduce(function(s,p){return s+capHitFor(p,0);},0);
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
    recalcCap(L, sug.teamA);
    recalcCap(L, sug.teamB);
  }
  function assetLabel(asset, nowSeason){
    if (asset.round) return 'Y'+(nowSeason + (asset.year-1))+' R'+asset.round;
    return asset.name + ' ('+asset.pos+' '+asset.ovr+')';
  }
  function logTrade(sug){
    var L = state.league;
    L.news = L.news || [];
    var now = L.season;
    var aOut = sug.packageA.map(function(x){return assetLabel(x, now);}).join(', ');
    var bOut = sug.packageB.map(function(x){return assetLabel(x, now);}).join(', ');
    L.news.push('Trade: '+sug.teamA.abbr+' send '+aOut+' to '+sug.teamB.abbr+' for '+bOut);
  }
  function tryOfferToUser(){
    var L = state.league;
    var user = L.teams[parseInt($('#userTeam').value||'0',10)];
    var counterpart = pickBestTradeCounterpart(L, user);
    if (!counterpart) return;
    var sug = buildSuggestionForTeams(counterpart, user);
    if (!sug) return;
    if (!validateSuggestionCapsAndFairness(sug)) return;
    state.pendingOffers.push({
      from: counterpart.abbr,
      to: user.abbr,
      packageFrom: sug.packageA,
      packageTo: sug.packageB
    });
    renderOffers();
  }
  function renderOffers(){
    var box = $('#hubOffers'); if (!box) return;
    box.innerHTML = '';
    var L = state.league;
    var now = L.season;
    var offers = state.pendingOffers || [];
    if (!offers.length){
      var d = document.createElement('div'); d.className='muted'; d.textContent = 'No offers.';
      box.appendChild(d);
      return;
    }
    offers.forEach(function(off, idx){
      var d = document.createElement('div'); d.className='row';
      var fromList = off.packageFrom.map(function(x){return assetLabel(x, now);}).join(', ');
      var toList = off.packageTo.map(function(x){return assetLabel(x, now);}).join(', ');
      d.innerHTML = '<div>'+off.from+' offers '+fromList+' for '+off.to+'\'s '+toList+'</div>'+
                    '<div class="spacer"></div>'+
                    '<button class="offer-btn decline" data-off="'+idx+'" data-act="decline">Decline</button>'+
                    '<button class="offer-btn accept" data-off="'+idx+'" data-act="accept">Accept</button>';
      box.appendChild(d);
    });
  }
  document.addEventListener('click', function(e){
    var t = e.target;
    if (!t || !t.dataset || !t.dataset.act) return;
    var idx = Number(t.dataset.off);
    if (Number.isNaN(idx)) return;
    if (!state.pendingOffers || !state.pendingOffers[idx]) return;
    var off = state.pendingOffers[idx];
    if (t.dataset.act==='decline'){
      state.pendingOffers.splice(idx,1);
      renderOffers();
      setStatus('Offer declined.');
      return;
    }
    if (t.dataset.act==='accept'){
      var L = state.league;
      var user = L.teams.find(function(tm){return tm.abbr===off.to;});
      var other = L.teams.find(function(tm){return tm.abbr===off.from;});
      var sug = {teamA: other, teamB: user, packageA: off.packageFrom, packageB: off.packageTo, valA: 0, valB:0};
      if (validateSuggestionCapsAndFairness(sug)){
        executeSuggestion(sug);
        logTrade(sug);
        setStatus('Trade accepted.');
      } else {
        setStatus('Offer invalid due to cap or value change.');
      }
      state.pendingOffers.splice(idx,1);
      renderOffers();
      renderRoster();
    }
  });

  // Weekly AI tick
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
        var tA = U.choice(L.teams);
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

  // Hook AI into sim
  var _simulateWeekOrig = simulateWeek;
  simulateWeek = function(){
    _simulateWeekOrig();
    aiWeeklyTrades();
    renderOffers();
  }
  // NEW: run player training for all teams once per completed week
  runWeeklyTraining(state.league);

  aiWeeklyTrades();
  renderOffers();
  // training affects roster and sidebar, so refresh a couple of views
  updateCapSidebar();
  if (location.hash === '#/roster') renderRoster();
};;

  // Playoffs
  function seedPlayoffs(L){
    var seeds = {AFC:[], NFC:[]};
    for (var conf=0; conf<2; conf++){
      var confKey = conf===0 ? 'AFC' : 'NFC';
      var allIdx = L.teams.map(function(t,i){return i;}).filter(function(i){return L.teams[i].conf===conf;});
      var leaders = [];
      for (var dv=0; dv<4; dv++){
        var divIdx = allIdx.filter(function(i){return L.teams[i].div===dv;});
        divIdx.sort(function(a,b){ return tieBreakCompare(L, a, b, 'leaders'); });
        leaders.push(divIdx[0]);
      }
      leaders.sort(function(a,b){ return tieBreakCompare(L, a, b, 'conference'); });
      var others = allIdx.filter(function(i){return leaders.indexOf(i)<0;});
      others.sort(function(a,b){ return tieBreakCompare(L, a, b, 'conference'); });
      var wc = others.slice(0,3);
      var seven = leaders.concat(wc);
      seeds[confKey] = seven;
    }
    return seeds;
  }
  function renderPlayoffPicture(){
    var L = state.league;
    var seeds = seedPlayoffs(L);
    var afc = $('#seedsAFC'); var nfc = $('#seedsNFC');
    afc.innerHTML = ''; nfc.innerHTML = '';
    function fill(ol, idxs){
      idxs.forEach(function(i,seed){
        var t = L.teams[i];
        var li = document.createElement('li');
        var bye = seed===0 ? ' <span class="badge leader">Bye</span>' : '';
        li.innerHTML = (seed+1)+'. '+t.name+bye;
        ol.appendChild(li);
      });
    }
    fill(afc, seeds.AFC);
    fill(nfc, seeds.NFC);
  }
  function startPlayoffs(){
    var L = state.league;
    var seeds = seedPlayoffs(L);
    state.playoffs = {
      round: 'WC',
      seeds: seeds,
      series: {AFC: [], NFC: [], SB: []},
      results: []
    };
    buildRoundPairings();
    renderPlayoffs();
  }
  function buildRoundPairings(){
    var P = state.playoffs; if (!P) return;
    var L = state.league;
    P.series.AFC = []; P.series.NFC = [];
    if (P.round==='WC'){
      ['AFC','NFC'].forEach(function(key){
        var s = P.seeds[key];
        P.series[key] = [
          {home: s[1], away: s[6]},
          {home: s[2], away: s[5]},
          {home: s[3], away: s[4]}
        ];
      });
    } else if (P.round==='DIV'){
      ['AFC','NFC'].forEach(function(key){
        var s = P.seeds[key];
        var remaining = P.lastWinners[key].slice().sort(function(a,b){ return tieBreakCompare(L, a, b, 'conference'); });
        var top = s[0];
        var low = remaining[remaining.length-1];
        var other = remaining[0];
        P.series[key] = [
          {home: top, away: low},
          {home: tieBreakCompare(L, other, remaining[0], 'conference')<0 ? other : remaining[0],
           away: tieBreakCompare(L, other, remaining[0], 'conference')<0 ? remaining[0] : other}
        ];
      });
    } else if (P.round==='CONF'){
      ['AFC','NFC'].forEach(function(key){
        var winners = P.lastWinners[key];
        var order = winners.slice().sort(function(a,b){ return tieBreakCompare(state.league, a, b, 'conference'); });
        P.series[key] = [{home: order[0], away: order[1]}];
      });
    } else if (P.round==='SB'){
      var champsA = P.lastWinners.AFC[0], champsN = P.lastWinners.NFC[0];
      var better = tieBreakCompare(state.league, champsA, champsN, 'league');
      var home = better <= 0 ? champsA : champsN;
      var away = home===champsA ? champsN : champsA;
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
    var P = state.playoffs; var L = state.league;
    if (!P) return;
    if (P.round==='WC' || P.round==='DIV' || P.round==='CONF'){
      var nextWinners = {AFC:[], NFC:[]};
      ['AFC','NFC'].forEach(function(key){
        var games = P.series[key];
        games.forEach(function(g){
          var res = simPlayoffGame(g.home, g.away);
          var winner = res.scoreHome>res.scoreAway ? g.home : g.away;
          state.playoffs.results.push(L.teams[res.away].abbr+' '+res.scoreAway+' at '+L.teams[res.home].abbr+' '+res.scoreHome+' — '+L.teams[winner].abbr+' advance');
          nextWinners[key].push(winner);
        });
      });
      P.lastWinners = nextWinners;
      if (P.round==='WC'){ P.round='DIV'; buildRoundPairings(); }
      else if (P.round==='DIV'){ P.round='CONF'; buildRoundPairings(); }
      else if (P.round==='CONF'){ P.round='SB'; buildRoundPairings(); }
    } else if (P.round==='SB'){
      var g = P.series.SB[0];
      var res2 = simPlayoffGame(g.home, g.away);
      var winner2 = res2.scoreHome>res2.scoreAway ? g.home : g.away;
      state.playoffs.results.push('Super Bowl: '+L.teams[res2.away].abbr+' '+res2.scoreAway+' at '+L.teams[res2.home].abbr+' '+res2.scoreHome+' — Champion '+L.teams[winner2].name);
      state.playoffs = null;
      runOffseason();
      location.hash = '#/hub';
      return;
    }
    renderPlayoffs();
  }
  function renderPlayoffs(){
    var P = state.playoffs;
    var L = state.league;
    var bracket = $('#playoffBracket'); var info = $('#playoffState'); var rs = $('#playoffResults');
    info.textContent = P ? ('Round: '+P.round) : 'No playoffs in progress.';
    bracket.innerHTML = '';
    rs.innerHTML = '';
    var results = (state.playoffs && state.playoffs.results) || [];
    results.forEach(function(line){
      var d = document.createElement('div');
      d.textContent = line;
      rs.appendChild(d);
    });
    if (!P) return;
    function listSeries(key){
      var wrap = document.createElement('div');
      wrap.className = 'card';
      var title = key==='SB' ? 'Super Bowl' : key;
      var header = document.createElement('h3'); header.textContent = title;
      wrap.appendChild(header);
      var games = P.series[key] || [];
      games.forEach(function(g,idx){
        var row = document.createElement('div'); row.className='row';
        row.innerHTML = '<div>Game '+(idx+1)+': '+L.teams[g.away].name+' at '+L.teams[g.home].name+'</div>';
        wrap.appendChild(row);
      });
      bracket.appendChild(wrap);
    }
    listSeries('AFC'); listSeries('NFC'); if (P.round==='SB') listSeries('SB');
  }

  // Onboarding
  function openOnboard(){
    var modal = $('#onboardModal'); if (!modal) return;
    modal.hidden = false;
    var mode = state.namesMode || 'fictional';
    var sel = $('#onboardTeam');
    sel.innerHTML = '';
    listByMode(mode).forEach(function(t,i){
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = t.abbr + ' — ' + t.name;
      sel.appendChild(opt);
    });
    var y = $('#onboardYear'); if (y) y.value = YEAR_START;
  }
  function closeOnboard(){ var m=$('#onboardModal'); if (m) m.hidden = true; }

  document.addEventListener('click', function(e){
    if (e.target && e.target.id==='onboardClose'){ closeOnboard(); }
    if (e.target && e.target.id==='onboardRandom'){
      var sel = $('#onboardTeam');
      sel.value = String(Math.floor(Math.random()* (listByMode(state.namesMode).length)));
    }
    if (e.target && e.target.id==='onboardStart'){
      var chosenMode = (document.querySelector('input[name=namesMode]:checked')||{}).value || 'fictional';
      state.namesMode = chosenMode;
      var startYear = clampYear($('#onboardYear').value || YEAR_START);
      state.league = makeLeague(listByMode(chosenMode));
      state.league.year = startYear;
      state.onboarded = true;
      var teamIdx = parseInt($('#onboardTeam').value || '0', 10);
      var userSel = $('#userTeam');
      fillTeamSelect(userSel);
      userSel.value = String(teamIdx);
      rebuildTeamLabels(chosenMode);
      closeOnboard();
      location.hash = '#/hub';
      setStatus('Season started');
      refreshAll();
    }
    if (e.target && e.target.id==='btnApplyNamesMode'){
      var chosenMode2 = (document.querySelector('input[name=settingsNamesMode]:checked')||{}).value || state.namesMode;
      state.namesMode = chosenMode2;
      rebuildTeamLabels(chosenMode2);
      setStatus('Team names updated');
    }
    if (e.target && e.target.id==='btnApplyYear'){
      var inp = document.getElementById('settingsYear');
      var newY = clampYear(inp ? inp.value : YEAR_START);
      if (!state.league){ setStatus('Start a league first.'); return; }
      if (!confirm('This will reseed the schedule and reset the current week. Continue?')) return;
      var L = state.league;
      L.year = newY;
      L.week = 1;
      L.resultsByWeek = {};
      L.schedule = S.makeAccurateSchedule(L);
      state.pendingOffers = [];
      renderSchedule(); renderHub();
      setStatus('Year applied and schedule reseeded.');
    }
    if (e.target && e.target.id==='btnSuggest'){
      var sug = (function(){
        var L = state.league;
        var teamA = L.teams[parseInt($('#tradeA').value,10)];
        var teamB = pickBestTradeCounterpart(L, teamA);
        if (!teamB) return null;
        var s = buildSuggestionForTeams(teamA, teamB);
        return s;
      })();
      if (!sug) { setStatus('No suggestion available.'); return; }
      // tick UI checkboxes
      var checks = $$('input[type=checkbox][data-side]');
      checks.forEach(function(c){ c.checked=false; });
      function tick(side, item){
        if (!item) return;
        var type = item.round? 'pick' : 'player';
        var id = item.id;
        var sel = 'input[type=checkbox][data-side='+side+'][data-type='+type+'][data-id="'+id+'"]';
        var el = document.querySelector(sel); if (el) el.checked = true;
      }
      sug.packageA.forEach(function(x){tick('A', x);});
      sug.packageB.forEach(function(x){tick('B', x);});
      $('#tradeInfo').textContent = 'Suggested. Revalidate before executing.';
    }
  });
// ===== Weekly Training =====

// Persist the user’s pick for the current week
state.trainingPlan = null; // { teamIdx, playerId, stat }

// Inject a small Training card under the Roster view
function renderTrainingUI(team) {
  var root = document.getElementById('trainingCard');
  if (!root) {
    // create once and insert after depth chart card
    var rosterView = document.getElementById('roster');
    root = document.createElement('div');
    root.className = 'card';
    root.id = 'trainingCard';
    rosterView.appendChild(root);
  }

  // Build player options for current visible roster team
  var teamIdx = parseInt(document.getElementById('rosterTeam').value || document.getElementById('userTeam').value || '0', 10);
  var optsPlayers = team.roster.map(function (p) {
    return '<option value="'+p.id+'">'+p.name+' • '+p.pos+' • OVR '+p.ovr+'</option>';
  }).join('');

  root.innerHTML =
    '<h3>Weekly Training</h3>' +
    '<div class="row">' +
      '<label for="trainPlayer">Player</label>' +
      '<select id="trainPlayer" style="min-width:240px">'+optsPlayers+'</select>' +
      '<div class="spacer"></div>' +
      '<label for="trainStat">Skill</label>' +
      '<select id="trainStat">' +
        '<option value="speed">Speed</option>' +
        '<option value="strength">Strength</option>' +
        '<option value="agility">Agility</option>' +
        '<option value="awareness">Awareness</option>' +
      '</select>' +
      '<div class="spacer"></div>' +
      '<button id="btnSetTraining" class="btn">Set For This Week</button>' +
    '</div>' +
    '<div class="muted small">One player per team per week. Success chance scales with coach skill, age, and current rating. Results apply after you simulate the week.</div>';

  document.getElementById('btnSetTraining').onclick = function () {
    var pid = document.getElementById('trainPlayer').value;
    var stat = document.getElementById('trainStat').value;
    state.trainingPlan = { teamIdx: teamIdx, playerId: pid, stat: stat, week: state.league.week };
    setStatus('Training scheduled: ' + stat + ' for ' + (team.roster.find(function(x){return x.id===pid;}) || {name:'player'}).name);
  };
}

// Pick the AI’s target: prefer a healthy starter with the lowest targeted stat
function pickAITarget(team) {
  // starters = first in each depth slot
  var byPos = {}; window.Constants.POSITIONS.forEach(function(pos){ byPos[pos] = []; });
  team.roster.forEach(function(p){ byPos[p.pos].push(p); });
  window.Constants.POSITIONS.forEach(function(pos){ byPos[pos].sort(function(a,b){ return b.ovr - a.ovr; }); });

  var starters = [];
  Object.keys(window.Constants.DEPTH_NEEDS).forEach(function(pos){
    var need = window.Constants.DEPTH_NEEDS[pos];
    starters = starters.concat(byPos[pos].slice(0, Math.max(1, need)));
  });

  // score candidates by potential gain: lower stat, younger, not injured
  var best = null, bestScore = -1, bestStat = 'awareness';
  var stats = ['speed','strength','agility','awareness'];

  starters.forEach(function(p) {
    if (p.injuryWeeks > 0) return;
    stats.forEach(function(st) {
      var cur = p[st] | 0;
      var headroom = Math.max(0, 99 - cur);
      var agePenalty = Math.max(0, p.age - 27);
      var score = headroom - 0.8*agePenalty + (p.pos==='QB' && st==='awareness' ? 3 : 0);
      if (score > bestScore) { bestScore = score; best = p; bestStat = st; }
    });
  });

  if (!best) return null;
  return { playerId: best.id, stat: bestStat };
}

// Core training math
function resolveTrainingFor(team, plan, league) {
  if (!plan) return null;
  var p = team.roster.find(function(x){ return x.id === plan.playerId; });
  if (!p) return { ok:false, reason:'not-found' };
  if (p.injuryWeeks > 0) return { ok:false, reason:'injured' };

  var stat = plan.stat;
  var cur = p[stat] | 0;
  if (cur >= 99) return { ok:false, reason:'capped' };

  // success chance
  var coach = (team.strategy && team.strategy.coachSkill) || 0.7;          // 0.6..1.0
  var base = 0.55 + 0.15*(coach - 0.7);                                    // around 55 percent, better coach helps
  var dim = Math.max(0, (cur - 70)) * 0.01;                                 // harder above 70
  var agePen = Math.max(0, (p.age - 27)) * 0.015;                           // older is harder
  var successP = Math.max(0.15, Math.min(0.85, base - dim - agePen));

  var roll = Math.random();
  var success = roll < successP;

  // delta magnitude is smaller for high current ratings, bigger for awareness
  var maxBump = stat === 'awareness' ? 4 : 3;
  var bump = success ? 1 + Math.floor(Math.random() * Math.max(1, maxBump - Math.floor((cur - 75)/10))) : 0;
  bump = Math.max(1, Math.min(bump, 3));
  var newVal = success ? Math.min(99, cur + bump) : cur;

  // fatigue tick
  p.fatigue = (p.fatigue|0) + (success ? 2 : 1);

  // write back
  if (success) p[stat] = newVal;

  // small OVR nudge if awareness or agility improved
  if (success && (stat === 'awareness' || stat === 'agility')) {
    p.ovr = Math.min(99, p.ovr + 1);
  }

  return { ok:true, success:success, stat:stat, before:cur, after:p[stat], bump: success ? (p[stat]-cur) : 0, prob:successP };
}

// Run once per completed week
function runWeeklyTraining(league) {
  if (!league || !league.teams) return;

  var weekJustCompleted = league.week - 1; // after simulateWeek, week already incremented

  // User plan is consumed only once and only for the week it was set
  var userPlan = (state.trainingPlan && state.trainingPlan.week === weekJustCompleted) ? state.trainingPlan : null;

  league.teams.forEach(function(team, idx){
    var plan = null;

    // user team uses explicit plan if provided
    var userIdx = parseInt(document.getElementById('userTeam').value || '0', 10);
    if (idx === userIdx && userPlan) {
      plan = { playerId: userPlan.playerId, stat: userPlan.stat };
    } else {
      // AI chooses automatically
      var ai = pickAITarget(team);
      if (ai) plan = ai;
    }

    var res = resolveTrainingFor(team, plan, league);
    if (!res || !res.ok) return;

    // Log to news
    var tAbbr = team.abbr || ('T'+idx);
    if (res.success) {
      league.news.push('Week '+weekJustCompleted+': '+tAbbr+' trained '+res.stat+' from '+res.before+' to '+res.after);
    } else {
      league.news.push('Week '+weekJustCompleted+': '+tAbbr+' training on '+res.stat+' did not improve');
    }
  });

  // consume the user plan
  if (userPlan) state.trainingPlan = null;
}

  // Save/Load/New
  $('#btnSave').onclick = function(){
    var payload = JSON.stringify({
      league: state.league,
      freeAgents: state.freeAgents,
      playoffs: state.playoffs,
      namesMode: state.namesMode,
      onboarded: state.onboarded,
      pendingOffers: state.pendingOffers
    });
    localStorage.setItem(SAVE_KEY, payload);
    setStatus('Saved');
  };
  $('#btnLoad').onclick = function(){
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw){ setStatus('Nothing to load'); return; }
    var obj = {};
    try { obj = JSON.parse(raw) || {}; } catch(e) { obj = {}; }
    state.league = obj.league || makeLeague(listByMode(state.namesMode));
    state.freeAgents = obj.freeAgents || [];
    state.playoffs = obj.playoffs || null;
    state.namesMode = obj.namesMode || state.namesMode;
    state.onboarded = !!obj.onboarded;
    state.pendingOffers = obj.pendingOffers || [];
    refreshAll();
    setStatus('Loaded');
  };
  $('#btnNewLeague').onclick = function(){
    if (confirm('Start a new league, clears progress')){ state.onboarded=false; openOnboard(); }
  };

  $('#btnSimWeek').onclick = function(){ if(!state.onboarded){ openOnboard(); return; } simulateWeek(); };
  $('#btnSimSeason').onclick = function(){ if(!state.onboarded){ openOnboard(); return; } for (var i=0;i<999;i++){ if (state.league.week > state.league.schedule.length) break; simulateWeek(); } };
  if ($('#btnSimRound')) $('#btnSimRound').addEventListener('click', simulatePlayoffRound);

  function refreshAll(){
    var userSel = $('#userTeam');
    if (!userSel.dataset.filled){
      fillTeamSelect(userSel);
      userSel.dataset.filled='1';
      var pitIdx = state.league.teams.findIndex(function(t){return t.abbr==='PIT';});
      userSel.value = String(pitIdx>=0?pitIdx:0);
      userSel.addEventListener('change', function(){ renderRoster(); updateCapSidebar(); });
    }
    renderHub(); renderRoster(); renderCap(); renderSchedule(); renderStandings(); renderTradeUI(); renderFreeAgency(); renderDraft(); renderPlayoffs();
  }

  // Boot
  (function init(){
    var obj = {};
    var raw = localStorage.getItem(SAVE_KEY);
    if (raw){
      try { obj = JSON.parse(raw); if (typeof obj !== 'object' || obj === null) obj = {}; }
      catch(e) { obj = {}; }
    }
    state.namesMode = obj.namesMode || state.namesMode;
    state.league = obj.league || makeLeague(listByMode(state.namesMode));
    state.freeAgents = obj.freeAgents || [];
    state.playoffs = obj.playoffs || null;
    state.onboarded = !!obj.onboarded;
    state.pendingOffers = obj.pendingOffers || [];

// Discover route ids from the DOM
const __routeIds = Array.from(document.querySelectorAll('.view')).map(v => v.id);

// Define show() if missing. Updates views and any nav pills.
window.show ||= function show(id) {
  const target = __routeIds.includes(id) ? id : 'hub';
  document.querySelectorAll('.view').forEach(v => v.toggleAttribute('hidden', v.id !== target));
  document.querySelectorAll('.nav-pill').forEach(a => {
    a.setAttribute('aria-current', a.dataset.view === target ? 'page' : null);
  });
  document.querySelectorAll('.nav-item').forEach(a => {
    a.setAttribute('aria-current', a.dataset.view === target ? 'page' : null);
  });
};

// Initial route
const seg = (location.hash || '#hub').replace(/^#\/?/, '');
show(__routeIds.includes(seg) ? seg : 'hub');


    if (!state.onboarded) openOnboard();
    else refreshAll();
    ;(() => {
  // Keep hash in sync and support clicking the pills
  function initFromHash() {
    const id = (location.hash || '#hub').replace(/^#\/?/, '');
    show(id);
  }

  document.addEventListener('click', e => {
    const pill = e.target.closest('.nav-pill,[data-view].nav-item');
    if (!pill) return;
    const id = pill.dataset.view;
    if (!id) return;
    e.preventDefault();
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    show(id);
    const pills = document.getElementById('site-nav');
    const toggle = document.querySelector('.nav-toggle');
    if (pills?.classList.contains('open')) {
      pills.classList.remove('open');
      toggle?.setAttribute('aria-expanded', 'false');
    }
  });

  window.addEventListener('hashchange', initFromHash);
  initFromHash();
})();




