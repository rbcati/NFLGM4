// constants.js
(function (global) {
  'use strict';
  
  const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"];
  // constants.js
(function (global) {
  'use strict';
  
  const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"];
  
  // **THE UPGRADE:** We now have a clear definition for each side of the ball.
  const OFFENSIVE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'K'];
  const DEFENSIVE_POSITIONS = ['DL', 'LB', 'CB', 'S', 'P'];

  // ... (the rest of your constants like OVR_WEIGHTS, SCHEMES, etc., remain the same)

  global.Constants = { 
    POSITIONS, 
    OFFENSIVE_POSITIONS, 
    DEFENSIVE_POSITIONS,
    OVR_WEIGHTS, 
    OFFENSIVE_SCHEMES, 
    DEFENSIVE_SCHEMES, 
    CAP_BASE, 
    YEARS_OF_PICKS, 
    CONF_NAMES, 
    DIV_NAMES 
  };
})(window);

  // Defines which new, detailed stats are most important for each position's OVR rating
  const OVR_WEIGHTS = {
    QB: { throwPower: 0.2, throwAccuracy: 0.3, awareness: 0.3, speed: 0.1, intelligence: 0.1 },
    RB: { speed: 0.2, acceleration: 0.2, trucking: 0.15, juking: 0.15, catching: 0.1, awareness: 0.2 },
    WR: { speed: 0.3, acceleration: 0.2, catching: 0.3, catchInTraffic: 0.2 },
    TE: { speed: 0.15, catching: 0.25, catchInTraffic: 0.2, runBlock: 0.2, passBlock: 0.2 },
    OL: { runBlock: 0.5, passBlock: 0.5 },
    DL: { passRushPower: 0.3, passRushSpeed: 0.3, runStop: 0.4 },
    LB: { speed: 0.2, runStop: 0.3, coverage: 0.3, awareness: 0.2 },
    CB: { speed: 0.3, acceleration: 0.2, coverage: 0.4, intelligence: 0.1 },
    S:  { speed: 0.25, coverage: 0.3, runStop: 0.25, awareness: 0.2 },
    K:  { kickPower: 0.6, kickAccuracy: 0.4 },
    P:  { kickPower: 0.6, kickAccuracy: 0.4 }
  };

  // --- SCHEMES ---
  const OFFENSIVE_SCHEMES = {
    'West Coast': { keyStats: ['throwAccuracy', 'catching', 'passBlock'], description: 'High-percentage, short passes.' },
    'Vertical': { keyStats: ['throwPower', 'speed', 'passBlock'], description: 'Deep shots and explosive plays.' },
    'Run Heavy': { keyStats: ['trucking', 'runBlock', 'passRushPower'], description: 'Ground and pound to control the clock.' },
    'Spread': { keyStats: ['acceleration', 'juking', 'throwAccuracy'], description: 'Uses speed and space to create mismatches.'}
  };

  const DEFENSIVE_SCHEMES = {
    '4-3 Zone': { keyStats: ['coverage', 'awareness', 'intelligence'], description: 'Disciplined zone coverage to prevent big plays.' },
    '3-4 Man': { keyStats: ['passRushPower', 'speed', 'coverage'], description: 'Aggressive man coverage with a strong pass rush.' },
    'Blitz Heavy': { keyStats: ['passRushSpeed', 'acceleration', 'runStop'], description: 'Sends extra rushers to create chaos.' }
  };

  const CAP_BASE = 220;
  const YEARS_OF_PICKS = 3;
  const CONF_NAMES = ["AFC","NFC"];
  const DIV_NAMES = ["East","North","South","West"];

  global.Constants = { POSITIONS, OVR_WEIGHTS, OFFENSIVE_SCHEMES, DEFENSIVE_SCHEMES, CAP_BASE, YEARS_OF_PICKS, CONF_NAMES, DIV_NAMES };
})(window);
