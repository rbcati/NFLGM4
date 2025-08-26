// constants.js - Consolidated and Fixed
(function (global) {
  'use strict';
  
  // GAME CONSTANTS - All magic numbers consolidated here
  const GAME_CONFIG = {
    YEAR_START: 2025,
    SAVE_KEY: 'nflGM4.league',
    ROUTES: ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings', 'hallOfFame', 'scouting']
  };

  // SALARY CAP CONSTANTS
  const SALARY_CAP = {
    BASE: 220,                    // Base salary cap in millions
    MAX_ROLLOVER: 10,            // Maximum cap rollover allowed
    ROOKIE_DISCOUNT: 0.9,        // Discount applied to rookie contracts
    GUARANTEED_PCT_DEFAULT: 0.5,  // Default guaranteed percentage
    SIGNING_BONUS_MIN: 0.25,     // Minimum signing bonus as % of total
    SIGNING_BONUS_MAX: 0.6       // Maximum signing bonus as % of total
  };

  // PLAYER CONSTANTS
  const PLAYER_CONFIG = {
    MIN_AGE: 21,
    MAX_AGE: 34,
    ROOKIE_MIN_AGE: 21,
    ROOKIE_MAX_AGE: 23,
    MIN_OVR: 40,
    MAX_OVR: 99,
    PEAK_AGES: { QB: 28, RB: 25, WR: 27, OL: 29, DL: 28, LB: 27, CB: 26, S: 27, TE: 27, K: 30, P: 30 }
  };

  // TRAINING CONSTANTS  
  const TRAINING = {
    SUCCESS_BASE_RATE: 0.55,
    SUCCESS_MIN_RATE: 0.15,
    SUCCESS_MAX_RATE: 0.85,
    COACH_SKILL_MODIFIER: 0.15,
    AGE_PENALTY_PER_YEAR: 0.015,
    HIGH_RATING_PENALTY: 0.01,   // Per point above 70
    FATIGUE_GAIN_SUCCESS: 2,
    FATIGUE_GAIN_FAIL: 1,
    MAX_RATING_IMPROVEMENT: 4
  };

  // DRAFT CONSTANTS
  const DRAFT_CONFIG = {
    TOTAL_PROSPECTS: 250,
    SCOUTABLE_PROSPECTS: 150,
    ROUNDS: 7,
    TEAMS: 32
  };

  // FREE AGENCY CONSTANTS
  const FREE_AGENCY = {
    POOL_SIZE: 120,
    CONTRACT_DISCOUNT: 0.9,      // FA contracts are 90% of normal value
    DEFAULT_YEARS: 2,
    GUARANTEED_PCT: 0.5
  };

  // SIMULATION CONSTANTS
  const SIMULATION = {
    HOME_ADVANTAGE: 2.5,
    BASE_SCORE_MIN: 14,
    BASE_SCORE_MAX: 31,
    SCORE_VARIANCE: 17,
    MIN_PASS_ATTEMPTS: 25,
    MAX_PASS_ATTEMPTS: 45,
    MIN_COMPLETION_PCT: 55,
    MAX_COMPLETION_PCT: 80,
    MIN_RUSH_ATTEMPTS: 15,
    MAX_RUSH_ATTEMPTS: 30,
    YARDS_PER_COMPLETION: { MIN: 8, MAX: 15 },
    YARDS_PER_CARRY: { MIN: 3, MAX: 6 }
  };

  // HALL OF FAME CONSTANTS
  const HALL_OF_FAME = {
    MIN_YEARS: 5,
    LEGACY_THRESHOLD: 30,
    RETIREMENT_AGE_START: 33,
    RETIREMENT_CHANCE_PER_YEAR: 0.20,
    FORCED_RETIREMENT_AGE: 38,
    STATS_THRESHOLDS: {
      QB: { passYd: 30000, passTD: 200 },
      RB: { rushYd: 8000, rushTD: 60 },
      WR: { recYd: 10000, recTD: 65 }
    }
  };

  // POSITIONS AND SCHEMES
  const POSITIONS = ["QB","RB","WR","TE","OL","DL","LB","CB","S","K","P"];
  
  const OFFENSIVE_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'OL', 'K'];
  const DEFENSIVE_POSITIONS = ['DL', 'LB', 'CB', 'S', 'P'];

  // Depth chart requirements
  const DEPTH_NEEDS = {
    QB: 2, RB: 3, WR: 4, TE: 2, OL: 6,
    DL: 5, LB: 4, CB: 4, S: 3, K: 1, P: 1
  };

  // Defines which stats are most important for each position's OVR rating
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

  // Team schemes
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

  // League structure
  const YEARS_OF_PICKS = 3;
  const CONF_NAMES = ["AFC","NFC"];
  const DIV_NAMES = ["East","North","South","West"];

  // Trade value chart for draft picks
  const TRADE_VALUES = {
    PICKS: {
      1: { 1: 3000, 2: 2600, 3: 2200, 4: 1800, 5: 1600, 6: 1400, 7: 1200 },
      2: { 1: 1800, 2: 1600, 3: 1400, 4: 1200, 5: 1000, 6: 800, 7: 600 },
      3: { 1: 800, 2: 600, 3: 400, 4: 300, 5: 200, 6: 150, 7: 100 },
      4: { 1: 300, 2: 200, 3: 150, 4: 100, 5: 75, 6: 50, 7: 25 },
      5: { 1: 150, 2: 100, 3: 75, 4: 50, 5: 25, 6: 15, 7: 10 },
      6: { 1: 75, 2: 50, 3: 25, 4: 15, 5: 10, 6: 8, 7: 5 },
      7: { 1: 25, 2: 15, 3: 10, 4: 8, 5: 5, 6: 3, 7: 1 }
    },
    FUTURE_DISCOUNT: 0.8  // Each year in future reduces value by 20%
  };

  // Position trade value multipliers
  const POSITION_VALUES = {
    QB: 1.6, WR: 1.25, CB: 1.2, DL: 1.15, OL: 1.1,
    RB: 1.0, LB: 1.0, S: 1.0, TE: 0.9, K: 0.5, P: 0.5
  };

  // Export everything
  global.Constants = { 
    // Game config
    GAME_CONFIG,
    SALARY_CAP,
    PLAYER_CONFIG,
    TRAINING,
    DRAFT_CONFIG,
    FREE_AGENCY,
    SIMULATION,
    HALL_OF_FAME,
    
    // Legacy constants (keep for compatibility)
    CAP_BASE: SALARY_CAP.BASE,
    YEARS_OF_PICKS,
    
    // Positions and schemes
    POSITIONS, 
    OFFENSIVE_POSITIONS, 
    DEFENSIVE_POSITIONS,
    DEPTH_NEEDS,
    OVR_WEIGHTS, 
    OFFENSIVE_SCHEMES, 
    DEFENSIVE_SCHEMES,
    
    // League structure
    CONF_NAMES, 
    DIV_NAMES,
    
    // Trade and values
    TRADE_VALUES,
    POSITION_VALUES
  };
})(window);
