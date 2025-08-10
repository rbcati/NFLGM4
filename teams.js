// teams.js
(function (global) {
  'use strict';
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

  // Optional fictional set if you still support it
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

  // Simple lists if you populate selects from arrays
  var TEAM_LIST_REAL = TEAM_META_REAL.map(function(t){ return [t.abbr, t.name]; });
  var TEAM_LIST_FICTIONAL = TEAM_META_FICTIONAL.map(function(t){ return [t.abbr, t.name]; });

  global.Teams = {
    TEAM_META_REAL,
    TEAM_META_FICTIONAL,
    TEAM_LIST_REAL,
    TEAM_LIST_FICTIONAL
  };
})(window);
