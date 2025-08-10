// constants.js
(function (global) {
  'use strict';
  var POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K"];
  var DEPTH_NEEDS = { QB:1, RB:1, WR:3, TE:1, OL:5, DL:4, LB:3, CB:2, S:2, K:1 };
  var CAP_BASE = 220;            // million
  var YEARS_OF_PICKS = 3;
  var CONF_NAMES = ["AFC","NFC"];
  var DIV_NAMES = ["East","North","South","West"];

  global.Constants = { POSITIONS, DEPTH_NEEDS, CAP_BASE, YEARS_OF_PICKS, CONF_NAMES, DIV_NAMES };
})(window);
