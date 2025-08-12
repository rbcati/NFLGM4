// league.js
'use strict';

function makeLeague(teamList) {
  const U = window.Utils;
  const C = window.Constants;
  const Scheduler = window.Scheduler;

  const baseList = teamList || listByMode(state.namesMode);
  const teams = baseList.map((t, idx) => {
    const abbr = t.abbr || t[0];
    const name = t.name || t[1];
    const conf = typeof t.conf === 'number' ? t.conf : Math.floor(idx / 16);
    const div = typeof t.div === 'number' ? t.div : Math.floor((idx % 16) / 4);

    const roster = [];
    const positions = ['QB', 'QB', 'RB', 'RB', 'RB', 'WR', 'WR', 'WR', 'WR', 'TE', 'TE',
      'OL', 'OL', 'OL', 'OL', 'OL', 'OL', 'DL', 'DL', 'DL', 'DL', 'DL',
      'LB', 'LB', 'LB', 'LB', 'CB', 'CB', 'CB', 'CB', 'S', 'S', 'S', 'K', 'P'
    ];
    positions.forEach(pos => {
      const p = makePlayer(pos);
      tagAbilities(p);
      roster.push(p);
    });
    roster.sort((a, b) => b.ovr - a.ovr);

      const team = {
      id: idx,
      abbr: t.abbr || t[0],
      name: t.name || t[1],
      conf: typeof t.conf === 'number' ? t.conf : Math.floor(idx / 16),
      div: typeof t.div === 'number' ? t.div : Math.floor((idx % 16) / 4),
      rating: U.rand(70, 88),
      roster: [], // Roster is populated below
      // **THE UPGRADE:** Each team now gets a full staff
      staff: generateInitialStaff(),
      record: {w:0, l:0, t:0, pf:0, pa:0, streak:0, divW:0, divL:0, homeW:0, homeL:0, awayW:0, awayL:0},
      capBook: {},
      deadCapBook: {},
      capRollover: 0,
      capTotal: C.CAP_BASE,
      picks: [],
      strategy: { passBias: 0.5, tempo: 1.0, aggression: 1.0 } // Coach skill is now on the coach
    };

    
    seedTeamPicks(team, 1, C.YEARS_OF_PICKS || 3);
    return team;
  });

  const L = {
    seed: Math.floor(Math.random() * 1e6),
    season: 1,
    year: YEAR_START,
    teams: teams,
    schedule: [],
    resultsByWeek: {},
    playoffsDone: false,
    champion: null,
   history: {
        superBowlWinners: [],
        awards: {} // Store yearly awards like MVP
    },
    hallOfFame: [],
    news: []
  };

  };

  L.schedule = Scheduler.makeAccurateSchedule(L.teams);
  
  L.teams.forEach(t => recalcCap(L, t));

  const tmpRanks = Scheduler.computeLastDivisionRanks ?
    Scheduler.computeLastDivisionRanks(L) :
    L.teams.map((t, i) => i % 4);

  L.teams.forEach((t, i) => { t.lastDivisionRank = tmpRanks[i]; });

  return L;
}

// **THE FIX:** Make the makeLeague function globally available to other scripts.
window.makeLeague = makeLeague;
