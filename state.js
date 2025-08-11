// state.js

// App constants
const YEAR_START = 2025;
const SAVE_KEY = 'nflGM4.league';
const routes = ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings'];

// State
let state = {
  league: null,
  freeAgents: [],
  playoffs: null,
  namesMode: 'fictional',
  onboarded: false,
  pendingOffers: [],
  trainingPlan: null
};

// Name banks for generated players
const FIRST_NAMES = ['James','Michael','Chris','Alex','Jordan','Tyler','Jacob','Ethan','Logan','Mason','Liam','Noah','Owen','Jaden','Austin','Evan','Blake','Wyatt','Carson','Aiden','Dylan','Hunter','Cole','Kai','Zion','Nico','Xavier','Trent','Shawn','Brett','Marcus','Isaiah','Jamal','Elijah','Cameron','Trevor','Devon','Shane','Aaron','Caleb','Nick','Matt','Jake','Josh','Troy'];
const LAST_NAMES = ['Johnson','Smith','Williams','Brown','Jones','Miller','Davis','Garcia','Rodriguez','Wilson','Martinez','Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Thompson','White','Lopez','Lee','Gonzalez','Harris','Clark','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Reed','Cook','Bell','Perez','Hill','Green'];
