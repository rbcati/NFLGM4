// state.js
'use strict';
// App constants from script.js
const YEAR_START = 2025;
const SAVE_KEY = 'nflGM4.league';
const routes = ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings', 'hallOfFame'];

// State object
const state = new GameState();
  league: null,
  freeAgents: [],
  playoffs: null,
  namesMode: 'fictional',
  onboarded: false,
  pendingOffers: [],
  trainingPlan: null,
  userTeamId: 0
};
// ADD: Proper state management class (new addition to file)
class GameState {
    constructor() {
        this.listeners = new Set();
        this.state = { /* existing state object */ };
    }
    setState(updates) { /* ... */ }
    subscribe(callback) { /* ... */ }
}

const FIRST_NAMES = [
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

const LAST_NAMES = [
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
