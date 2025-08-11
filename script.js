// Clean makeLeague implementation to paste inside your script.js
function makeLeague(teamList) {
  var baseList = teamList || listByMode(state.namesMode);
  var teams = baseList.map(function (t, idx) {
    var abbr = t.abbr || t[0];
    var name = t.name || t[1];
    var conf = typeof t.conf === 'number' ? t.conf : Math.floor(idx/16);
    var div  = typeof t.div  === 'number' ? t.div  : Math.floor((idx%16)/4);

    var roster = [];
    var positions = ['QB','QB','RB','RB','RB','WR','WR','WR','WR','TE','TE',
                     'OL','OL','OL','OL','OL','OL','DL','DL','DL','DL','DL',
                     'LB','LB','LB','LB','CB','CB','CB','CB','S','S','S','K','P'];
    positions.forEach(function(pos) {
      var p = makePlayer(pos);
      tagAbilities(p);
      roster.push(p);
    });
    roster.sort(function(a,b) { return b.ovr - a.ovr; });

    var team = {
      id: idx,
      abbr: abbr,
      name: name,
      rating: U.rand(70, 88),
      roster: roster,
      record: {w:0, l:0, t:0, pf:0, pa:0},
      conf: conf,
      div: div,
      capBook: {},
      deadCapBook: {},
      capRollover: 0,
      capTotal: C.CAP_BASE,
      picks: [],
      strategy: {
        passBias: 0.5,
        tempo: 1.0,
        aggression: 1.0,
        coachSkill: Math.random()*0.4 + 0.6
      }
    };
    seedTeamPicks(team, 1, (C.YEARS_OF_PICKS || 3));
    return team;
  });

  var L = {
    seed: Math.floor(Math.random() * 1e6),
    season: 1,
    year: YEAR_START,
    week: 1,
    teams: teams,
    schedule: [],
    resultsByWeek: {},
    playoffsDone: false,
    champion: null,
    news: []
  };

  if (!S || typeof S.makeAccurateSchedule !== 'function'){
    throw new Error('schedule.js failed to initialize (makeAccurateSchedule missing)');
  }
  L.schedule = S.makeAccurateSchedule(L);

  L.teams.forEach(function (t) { recalcCap(L, t); });
  var tmpRanks = (S.computeLastDivisionRanks ? S.computeLastDivisionRanks(L) : teams.map(function(_,i){ return i % 4; }));
  L.teams.forEach(function (t,i) { t.lastDivisionRank = tmpRanks[i]; });

  return L;
}