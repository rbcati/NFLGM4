// state.js - Fixed State Management (avoid duplicates)
'use strict';

// Only declare these if they don't exist
if (typeof YEAR_START === 'undefined') {
  var YEAR_START = 2025;
}

if (typeof SAVE_KEY === 'undefined') {
  var SAVE_KEY = 'nflGM4.league';
}

if (typeof routes === 'undefined') {
  var routes = ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings', 'hallOfFame', 'scouting'];
}

// Initialize state object if it doesn't exist
if (typeof state === 'undefined') {
  window.state = {
    league: null,
    freeAgents: [],
    playoffs: null,
    namesMode: 'fictional',
    onboarded: false,
    pendingOffers: [],
    trainingPlan: null,
    userTeamId: 0,
    draftClass: [],
    gameMode: 'gm',
    playerRole: 'GM'
  };
}

// Name arrays for player generation (now using expanded names for 1,000,000+ combinations)
if (typeof FIRST_NAMES === 'undefined') {
  var FIRST_NAMES = window.EXPANDED_FIRST_NAMES || [
    'James', 'Michael', 'John', 'Robert', 'David', 'William', 'Richard', 'Joseph', 'Thomas', 'Christopher',
    'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Steven', 'Donald', 'Andrew', 'Joshua', 'Paul',
    'Kenneth', 'Kevin', 'Brian', 'Timothy', 'Ronald', 'Jason', 'George', 'Edward', 'Jeffrey', 'Ryan',
    'Jacob', 'Nicholas', 'Gary', 'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Benjamin', 'Scott',
    'Brandon', 'Samuel', 'Gregory', 'Alexander', 'Patrick', 'Frank', 'Jack', 'Raymond', 'Dennis', 'Tyler',
    'Aaron', 'Jerry', 'Jose', 'Nathan', 'Adam', 'Henry', 'Zachary', 'Douglas', 'Peter', 'Kyle', 'Noah',
    'Ethan', 'Jeremy', 'Walter', 'Christian', 'Keith', 'Austin', 'Sean', 'Roger', 'Terry', 'Gerald',
    'Carl', 'Dylan', 'Bryan', 'Jordan', 'Arthur', 'Lawrence', 'Gabriel', 'Logan', 'Alan', 'Juan',
    'Jesse', 'Billy', 'Bruce', 'Albert', 'Willie', 'Joe', 'Roy', 'Ralph', 'Randy', 'Eugene', 'Vincent',
    'Russell', 'Elijah', 'Louis', 'Bobby', 'Philip', 'Johnny', 'Liam', 'Lucas', 'Mason', 'Oliver',
    'Elias', 'Mateo', 'Jaxon', 'Isaiah', 'Caleb', 'Wyatt', 'Carter', 'Owen', 'Connor', 'Luke', 'Jayden',
    'Xavier', 'Leo', 'Julian', 'Hudson', 'Grayson', 'Theodore', 'Levi', 'Ezra', 'Sebastian', 'Samuel',
    'Asher', 'Luca', 'Ethan', 'David', 'Jackson', 'Joseph', 'Mason', 'Theodore', 'Henry', 'Lucas',
    'William', 'Benjamin', 'Levi', 'Sebastian', 'Jack', 'Ezra', 'Michael', 'Daniel', 'Leo', 'Owen',
    'Samuel', 'Hudson', 'Alexander', 'Asher', 'Luca', 'Ethan', 'John', 'David', 'Jackson', 'Joseph',
    'Mason', 'Maverick', 'Miles', 'Wyatt', 'Thomas', 'Isaac', 'Jacob', 'Gabriel', 'Eli', 'Jeremiah',
    'Luka', 'Amir', 'Jaxon', 'Parker', 'Colton', 'Myles', 'Adam', 'Kai', 'Zion', 'Nico', 'Trent',
    'Shawn', 'Brett', 'Marcus', 'Jamal', 'Cameron', 'Trevor', 'Devon', 'Shane', 'Caleb', 'Nick',
    'Matt', 'Jake', 'Josh', 'Troy', 'Chad', 'Cody', 'Jared', 'Joel', 'Alex', 'Adrian', 'Angel',
    'Austin', 'Blake', 'Bradley', 'Calvin', 'Carlos', 'Carson', 'Clayton', 'Cole', 'Colin', 'Connor',
    'Cooper', 'Dalton', 'Dawson', 'Derek', 'Devin', 'Dominic', 'Donovan', 'Dustin', 'Evan', 'Fernando',
    'Forrest', 'Gage', 'Garrett', 'Gavin', 'Grant', 'Hayden', 'Hector', 'Hunter', 'Ian', 'Isaac',
    'Ivan', 'Javier', 'Jesus', 'Jordan', 'Jorge', 'Juan', 'Julian', 'Justin', 'Kaden', 'Kaleb',
    'Landon', 'Lane', 'Leo', 'Leonardo', 'Levi', 'Liam', 'Logan', 'Louis', 'Lucas', 'Luis', 'Luke',
    'Malachi', 'Manuel', 'Marco', 'Marcus', 'Mario', 'Martin', 'Mason', 'Mateo', 'Matthew', 'Max',
    'Maxwell', 'Micah', 'Miguel', 'Miles', 'Mitchell', 'Nathaniel', 'Nicholas', 'Nico', 'Noah', 'Nolan',
    'Omar', 'Orlando', 'Oscar', 'Owen', 'Pablo', 'Parker', 'Pedro', 'Preston', 'Rafael', 'Randy',
    'Raymond', 'Reid', 'Ricardo', 'Riley', 'River', 'Robert', 'Roberto', 'Rocco', 'Roman', 'Rowan',
    'Ryan', 'Ryder', 'Samuel', 'Santiago', 'Saul', 'Sawyer', 'Sean', 'Sebastian', 'Sergio', 'Seth',
    'Shane', 'Shawn', 'Spencer', 'Stephen', 'Tanner', 'Taylor', 'Thomas', 'Timothy', 'Travis', 'Trent',
    'Trevor', 'Tristan', 'Tucker', 'Tyler', 'Tyson', 'Victor', 'Vincent', 'Walker', 'Walter', 'Warren',
    'Waylon', 'Wesley', 'Weston', 'Will', 'William', 'Wyatt', 'Xander', 'Xavier', 'Zachary', 'Zane', 'Zion'
  ];
}

if (typeof LAST_NAMES === 'undefined') {
  var LAST_NAMES = window.EXPANDED_LAST_NAMES || [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
    'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
    'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
    'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green',
    'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez',
    'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart',
    'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson',
    'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks',
    'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez',
    'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez', 'Powell', 'Jenkins',
    'Perry', 'Barnes', 'Fisher', 'Henderson', 'Coleman', 'Patterson', 'Jordan', 'Graham', 'Reynolds', 'Hamilton',
    'Ford', 'Gibson', 'Wallace', 'Woods', 'Cole', 'West', 'Owens', 'Marshall', 'Harrison', 'Ellis',
    'Murray', 'Mcdonald', 'Snyder', 'Shaw', 'Holmes', 'Palmer', 'Black', 'Robertson', 'Dixon', 'Hunt',
    'Hicks', 'Palmer', 'Wagner', 'Munoz', 'Mason', 'Simpson', 'Crawford', 'Olson', 'Burns', 'Guzman',
    'Webb', 'Tucker', 'Freeman', 'Chen', 'Henry', 'Vargas', 'Wells', 'Castro', 'Ford', 'Marshall',
    'Harrison', 'Owens', 'Jordan', 'West', 'Cole', 'Woods', 'Wallace', 'Gibson', 'Hamilton', 'Graham',
    'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'Mcdonald', 'Cruz', 'Marshall', 'Ortiz', 'Gomez',
    'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks',
    'Crawford', 'Henry', 'Boyd', 'Mason', 'Morrison', 'Kennedy', 'Warren', 'Jordan', 'Reynolds', 'Hamilton',
    'Shaw', 'Gordon', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills',
    'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson',
    'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis',
    'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane',
    'Andrews', 'Ruiz', 'Harper', 'Fox', 'Riley', 'Armstrong', 'Chavez', 'Carpenter', 'Vasquez', 'Berry',
    'Gordon', 'Lawson', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll',
    'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper', 'Fox',
    'Riley', 'Armstrong', 'Chavez', 'Carpenter', 'Vasquez', 'Berry', 'Gordon', 'Lawson', 'Wells', 'West',
    'Austin', 'Beck', 'Bishop', 'Blair', 'Bowman', 'Burke', 'Burns', 'Byrd', 'Cain', 'Carlson',
    'Carr', 'Chambers', 'Chandler', 'Chapman', 'Cohen', 'Cole', 'Coleman', 'Craig', 'Curtis', 'Day',
    'Dean', 'Elliott', 'Ellis', 'Farmer', 'Fields', 'Fletcher', 'Fowler', 'Franklin', 'French', 'Fuller',
    'George', 'Gilbert', 'Goodman', 'Goodwin', 'Graves', 'Greene', 'Griffin', 'Gross', 'Hale', 'Hansen',
    'Hardy', 'Harmon', 'Harvey', 'Haynes', 'Henderson', 'Henry', 'Higgins', 'Holland', 'Hopkins', 'Houston',
    'Huff', 'Ingram', 'Jacobs', 'Jensen', 'Johnston', 'Keller', 'Kim', 'Lamb', 'Lambert', 'Lowe',
    'Lucas', 'Lynch', 'Lyons', 'Mack', 'Maldonado', 'Malone', 'Mann', 'Manning', 'Marks', 'Marsh',
    'Massey', 'Mathis', 'May', 'Mcbride', 'Mccarthy', 'Mccoy', 'Mcdaniel', 'Mckenzie', 'Mcneil', 'Medina',
    'Meyer', 'Miles', 'Moody', 'Moon', 'Moran', 'Morton', 'Moss', 'Mullins', 'Nash', 'Newman', 'Norton',
    'Nunez', 'Obrien', 'Oliver', 'Ortega', 'Osborne', 'Page', 'Phelps', 'Pittman', 'Poole', 'Potter',
    'Powers', 'Quinn', 'Randolph', 'Reese', 'Richards', 'Rios', 'Robbins', 'Robles', 'Rowe', 'Salazar'
  ];
}



/**
 * State Management System
 */
const State = {
  /**
   * Initialize a clean game state
   * @returns {Object} Fresh state object
   */
  init() {
    console.log('Initializing fresh state...');
    
    const freshState = {
      // Core game data
      league: null,
      season: 1,
      year: YEAR_START,
      
      // Player/Team data
      player: {
        teamId: 0,
        name: 'GM',
        role: 'GM'
      },
      userTeamId: 0,
      
      // Game settings
      namesMode: 'fictional',  // 'fictional' or 'real'
      gameMode: 'gm',         // 'gm' or 'career'
      playerRole: 'GM',       // 'GM', 'OC', 'DC'
      onboarded: false,
      
      // Game systems
      freeAgents: [],
      draftClass: [],
      playoffs: null,
      trainingPlan: null,
      pendingOffers: [],
      
      // User interface
      currentView: 'hub',
      theme: 'dark',
      
      // Settings
      settings: {
        autoSave: true,
        difficulty: 'normal',  // 'easy', 'normal', 'hard'
        simSpeed: 'normal',    // 'slow', 'normal', 'fast'
        notifications: true,
        sound: false
      },
      
      // Version info
      version: '4.0.0',
      lastSaved: null,
      created: new Date().toISOString()
    };
    
    console.log('Fresh state created:', freshState);
    return freshState;
  },
  
  /**
   * Validate that state has all required properties
   * @param {Object} stateObj - State to validate
   * @returns {Object} Validation result
   */
  validate(stateObj) {
    if (!stateObj) {
      return { valid: false, errors: ['State is null or undefined'] };
    }
    
    const errors = [];
    const requiredProps = [
      'namesMode', 'onboarded', 'gameMode', 'playerRole'
    ];
    
    requiredProps.forEach(prop => {
      if (stateObj[prop] === undefined) {
        errors.push(`Missing required property: ${prop}`);
      }
    });
    
    // Validate specific values
    if (!['fictional', 'real'].includes(stateObj.namesMode)) {
      errors.push('Invalid namesMode');
    }
    
    if (!['gm', 'career'].includes(stateObj.gameMode)) {
      errors.push('Invalid gameMode');
    }
    
    if (!['GM', 'OC', 'DC'].includes(stateObj.playerRole)) {
      errors.push('Invalid playerRole');
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  /**
   * Migrate old state to current version
   * @param {Object} oldState - State to migrate
   * @returns {Object} Migrated state
   */
  migrate(oldState) {
    if (!oldState) return this.init();
    
    console.log('Migrating state from version:', oldState.version || 'unknown');
    
    // Start with fresh state and merge in valid old data
    const newState = this.init();
    
    // Safe property copying with fallbacks
    const safeCopy = (prop, fallback) => {
      if (oldState[prop] !== undefined && oldState[prop] !== null) {
        newState[prop] = oldState[prop];
      } else if (fallback !== undefined) {
        newState[prop] = fallback;
      }
    };
    
    // Copy core properties
    safeCopy('league');
    safeCopy('freeAgents', []);
    safeCopy('playoffs');
    safeCopy('namesMode', 'fictional');
    safeCopy('onboarded', false);
    safeCopy('gameMode', 'gm');
    safeCopy('playerRole', 'GM');
    safeCopy('userTeamId', 0);
    safeCopy('trainingPlan');
    safeCopy('pendingOffers', []);
    safeCopy('draftClass', []);
    
    // Handle player object migration
    if (oldState.player) {
      newState.player = { ...newState.player, ...oldState.player };
    } else if (oldState.userTeamId !== undefined) {
      newState.player.teamId = oldState.userTeamId;
    }
    
    // Copy settings
    if (oldState.settings) {
      newState.settings = { ...newState.settings, ...oldState.settings };
    }
    
    // Update version
    newState.version = '4.0.0';
    newState.lastSaved = new Date().toISOString();
    
    console.log('State migration complete');
    return newState;
  },
  
  /**
   * Reset state to initial values
   */
  reset() {
    console.log('Resetting state...');
    const newState = this.init();
    Object.keys(window.state).forEach(key => {
      delete window.state[key];
    });
    Object.assign(window.state, newState);
    return window.state;
  }
};

/**
 * Load game state from localStorage
 * @returns {Object|null} Loaded state or null
 */
function loadState() {
  try {
    console.log('Loading state...');
    
    const saved = localStorage.getItem(SAVE_KEY);
    if (!saved) {
      console.log('No saved state found');
      return null;
    }
    
    const parsed = JSON.parse(saved);
    const validation = State.validate(parsed);
    
    if (!validation.valid) {
      console.warn('Invalid state found, migrating...', validation.errors);
      return State.migrate(parsed);
    }
    
    console.log('Valid state loaded');
    return parsed;
    
  } catch (error) {
    console.error('Error loading state:', error);
    return null;
  }
}

/**
 * Save game state to localStorage  
 * @param {Object} stateToSave - State to save (optional, uses window.state by default)
 * @returns {boolean} Success status
 */
function saveState(stateToSave = null) {
  try {
    const stateObj = stateToSave || window.state;
    
    if (!stateObj) {
      console.error('No state to save');
      return false;
    }
    
    // Update save timestamp
    stateObj.lastSaved = new Date().toISOString();
    
    const serialized = JSON.stringify(stateObj);
    localStorage.setItem(SAVE_KEY, serialized);
    
    console.log('State saved successfully');
    return true;
    
  } catch (error) {
    console.error('Error saving state:', error);
    return false;
  }
}

/**
 * Get current team based on user selection
 * @returns {Object|null} Current team object
 */
function currentTeam() {
  const L = state.league;
  if (!L || !L.teams) return null;
  
  const teamId = state.userTeamId || state.player?.teamId || 0;
  return L.teams[teamId] || null;
}

/**
 * Get teams by conference
 * @param {number} conference - Conference ID (0 = AFC, 1 = NFC)
 * @returns {Array} Teams in conference
 */
function getTeamsByConference(conference) {
  const L = state.league;
  if (!L || !L.teams) return [];
  
  return L.teams.filter(team => team.conf === conference);
}

/**
 * Get teams by division
 * @param {number} conference - Conference ID
 * @param {number} division - Division ID
 * @returns {Array} Teams in division
 */
function getTeamsByDivision(conference, division) {
  const L = state.league;
  if (!L || !L.teams) return [];
  
  return L.teams.filter(team => team.conf === conference && team.div === division);
}

/**
 * Fill a team select element with teams
 * @param {HTMLElement} selectEl - Select element to fill
 * @param {boolean} includeAll - Whether to include "All Teams" option
 */
function fillTeamSelect(selectEl, includeAll = false) {
  if (!selectEl) return;
  
  const L = state.league;
  if (!L || !L.teams) {
    console.warn('No league or teams available for team select');
    return;
  }
  
  selectEl.innerHTML = '';
  
  if (includeAll) {
    const allOption = document.createElement('option');
    allOption.value = '-1';
    allOption.textContent = 'All Teams';
    selectEl.appendChild(allOption);
  }
  
  L.teams.forEach((team, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${team.abbr} — ${team.name}`;
    selectEl.appendChild(option);
  });
  
  // Set to user's team by default
  const userTeamId = state.userTeamId || state.player?.teamId || 0;
  selectEl.value = String(userTeamId);
}

/**
 * Initialize the global state if it doesn't exist
 */
function initializeGlobalState() {
  if (!window.state) {
    console.log('Creating initial global state...');
    window.state = State.init();
  } else {
    console.log('Global state already exists:', window.state);
  }
}

// Initialize state immediately
initializeGlobalState();

// Make everything globally available
window.State = State;
window.loadState = loadState;
window.saveState = saveState;
window.currentTeam = currentTeam;
window.getTeamsByConference = getTeamsByConference;
window.getTeamsByDivision = getTeamsByDivision;
window.fillTeamSelect = fillTeamSelect;
window.initializeGlobalState = initializeGlobalState;
// Also provide legacy aliases for compatibility
window.saveGame = saveState;
window.loadGame = loadState;

console.log('State.js loaded - State object:', !!window.State, 'Global state:', !!window.state);
