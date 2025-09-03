// coaching-integration.js - Integration with Existing Game Systems
'use strict';

/**
 * Integrate coaching stats with existing staff generation
 * Updates the existing generateInitialStaff function
 */
function enhanceStaffGeneration() {
  // Override existing staff generation to include coaching history
  const originalGenerateStaff = window.generateInitialStaff;
  
  window.generateInitialStaff = function() {
    const staff = originalGenerateStaff ? originalGenerateStaff() : {
      headCoach: makeBasicStaff('HC'),
      offCoordinator: makeBasicStaff('OC'), 
      defCoordinator: makeBasicStaff('DC'),
      scout: makeBasicStaff('Scout')
    };
    
    // Initialize coaching stats for all coaching staff
    if (staff.headCoach) {
      staff.headCoach.position = 'HC';
      initializeCoachingStats(staff.headCoach);
      generateCoachingHistory(staff.headCoach);
    }
    
    if (staff.offCoordinator) {
      staff.offCoordinator.position = 'OC';
      initializeCoachingStats(staff.offCoordinator);
      generateCoachingHistory(staff.offCoordinator);
    }
    
    if (staff.defCoordinator) {
      staff.defCoordinator.position = 'DC';
      initializeCoachingStats(staff.defCoordinator);
      generateCoachingHistory(staff.defCoordinator);
    }
    
    return staff;
  };
}

/**
 * Create basic staff member if makeStaff function isn't available
 */
function makeBasicStaff(position) {
  const U = window.Utils;
  
  // Use expanded names for maximum variety (1,000,000+ combinations)
  const firstNames = window.EXPANDED_FIRST_NAMES || [
    'Mike', 'John', 'Bill', 'Tom', 'Jim', 'Dave', 'Steve', 'Dan', 'Ron', 'Joe',
    'Matt', 'Chris', 'Kevin', 'Brian', 'Mark', 'Jeff', 'Scott', 'Tim', 'Greg', 'Tony',
    'Andy', 'Sean', 'Todd', 'Ken', 'Mike', 'Pat', 'Frank', 'Gary', 'Larry', 'Jerry',
    'Nick', 'Josh', 'Ryan', 'Eric', 'Adam', 'Jason', 'Justin', 'Brandon', 'Travis', 'Cody',
    'Derek', 'Corey', 'Shane', 'Brent', 'Blake', 'Jake', 'Luke', 'Cole', 'Chase', 'Tyler',
    'Zach', 'Nathan', 'Austin', 'Jordan', 'Dylan', 'Logan', 'Cameron', 'Hunter', 'Isaac', 'Evan',
    'Gavin', 'Mason', 'Lucas', 'Aiden', 'Owen', 'Connor', 'Caleb', 'Wyatt', 'Jack', 'Noah',
    'Liam', 'Ethan', 'Alexander', 'Henry', 'Sebastian', 'Michael', 'Daniel', 'David', 'Joseph', 'Christopher',
    'Andrew', 'James', 'Robert', 'William', 'Richard', 'Thomas', 'Charles', 'Donald', 'George', 'Kenneth',
    'Edward', 'Paul', 'Steven', 'Anthony', 'Kenneth', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian',
    'Maria', 'Sarah', 'Jennifer', 'Jessica', 'Amanda', 'Melissa', 'Nicole', 'Stephanie', 'Ashley', 'Heather',
    'Michelle', 'Kimberly', 'Amy', 'Angela', 'Lisa', 'Rebecca', 'Laura', 'Sharon', 'Cynthia', 'Karen',
    'Helen', 'Sandra', 'Donna', 'Carol', 'Ruth', 'Sharon', 'Linda', 'Betty', 'Nancy', 'Helen'
  ];
  
  // Use expanded names for maximum variety (1,000,000+ combinations)
  const lastNames = window.EXPANDED_LAST_NAMES || [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
    'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Perez', 'Hall', 'Young', 'Allen', 'King',
    'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker',
    'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz',
    'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Peterson',
    'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson',
    'Brooks', 'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price',
    'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez', 'Powell',
    'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman', 'Jenkins', 'Perry', 'Russell', 'Sullivan',
    'Bell', 'Coleman', 'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher', 'Vasquez', 'Simmons', 'Romero',
    'Jordan', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant',
    'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan',
    'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison',
    'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Ortiz', 'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb',
    'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason',
    'Morris', 'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes',
    'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight',
    'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens',
    'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson',
    'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper',
    'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Chavez', 'Sims',
    'Austin', 'Peters', 'Kelley', 'Franklin', 'Lawson', 'Fields', 'Gutierrez', 'Ryan', 'Schmidt', 'Carr',
    'Vasquez', 'Callahan', 'Schneider', 'Leach', 'Estrada', 'Beasley', 'Atkins', 'Mejia', 'Stokes', 'Barnes',
    'Erickson', 'Holt', 'Dougherty', 'Brennan', 'Larson', 'Newman', 'Wong', 'Garrett', 'Jacobs', 'Pratt',
    'Williamson', 'Chapman', 'Lawrence', 'Andrews', 'Peterson', 'Franklin', 'Lynch', 'Bishop', 'Arnold', 'Harrison',
    'Spencer', 'Pierce', 'Myers', 'Lynch', 'Zimmerman', 'Guzman', 'McKenzie', 'Craig', 'Bond', 'Duncan',
    'Kennedy', 'Buchanan', 'Valentine', 'Shelton', 'Bates', 'Casey', 'Thornton', 'McLean', 'O\'Connor', 'Walsh',
    'Jeffries', 'Eaton', 'Watkins', 'Burns', 'Spencer', 'Daniels', 'Rojas', 'Chan', 'Mathis', 'Singh',
    'Guerrero', 'Rowland', 'Keller', 'Sherman', 'Morton', 'Berg', 'Lucero', 'Zuniga', 'Bauer', 'Zavala',
    'Jacobson', 'Arellano', 'Phelps', 'McClain', 'Riggs', 'Turner', 'Calhoun', 'O\'Neal', 'Small', 'Pope',
    'Fitzgerald', 'Walton', 'Warren', 'Hodges', 'Jarvis', 'Miranda', 'Aguilar', 'Velasquez', 'Castillo', 'Callahan',
    'Hendrix', 'Collier', 'Lane', 'Thomas', 'Hester', 'Stout', 'Barrera', 'Keith', 'Bradshaw', 'Acosta',
    'Shannon', 'Hendricks', 'Moody', 'Terry', 'Hoffman', 'Blair', 'Daniels', 'Cross', 'Simon', 'James',
    'Rodriguez', 'Jackson', 'Fowler', 'Newman', 'Harvey', 'Li', 'Jiang', 'Kumar', 'Patel', 'Singh',
    'Zhang', 'Wang', 'Liu', 'Chen', 'Yang', 'Huang', 'Wu', 'Zhou', 'Sun', 'Zhu',
    'Kim', 'Park', 'Lee', 'Choi', 'Jung', 'Kang', 'Yoon', 'Jang', 'Han', 'Song',
    'Tanaka', 'Sato', 'Suzuki', 'Takahashi', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
    'Yamada', 'Yamaguchi', 'Sasaki', 'Matsumoto', 'Inoue', 'Hayashi', 'Matsuda', 'Kimura', 'Shimizu', 'Hayakawa',
    'Saito', 'Murakami', 'Ishikawa', 'Sakamoto', 'Endo', 'Aoki', 'Ikeda', 'Fujimoto', 'Nishimura', 'Fukuda',
    'Ota', 'Miura', 'Okada', 'Nakajima', 'Harada', 'Fujita', 'Takeuchi', 'Ishii', 'Hasegawa', 'Ogawa',
    'Goto', 'Matsui', 'Sugiyama', 'Yamashita', 'Saito', 'Hara', 'Sato', 'Takeda', 'Ito', 'Watanabe'
  ];
  
  return {
    id: U ? U.id() : Math.random().toString(36).slice(2),
    name: (U ? U.choice(firstNames) : firstNames[0]) + ' ' + (U ? U.choice(lastNames) : lastNames[0]),
    position: position,
    age: U ? U.rand(35, 65) : 45,
    playerDevelopment: U ? U.rand(50, 99) : 75,
    playcalling: U ? U.rand(50, 99) : 75,
    scouting: U ? U.rand(50, 99) : 75
  };
}

/**
 * Generate realistic coaching history for new coaches
 * @param {Object} coach - Coach object
 */
function generateCoachingHistory(coach) {
  if (!coach || !coach.stats) return;
  
  const U = window.Utils;
  const currentYear = state.league ? state.league.year : 2025;
  const coachAge = coach.age || 45;
  const startingAge = Math.max(25, U ? U.rand(25, 35) : 30);
  const careerLength = Math.max(0, coachAge - startingAge);
  
  if (careerLength <= 0) return;
  
  // Generate some career history
  let experienceYears = Math.min(careerLength, U ? U.rand(0, 15) : 5);
  
  if (coach.position === 'HC') {
    // Head coaches might have coordinator experience
    const coordinatorYears = Math.floor(experienceYears * 0.6);
    const headCoachYears = experienceYears - coordinatorYears;
    
    // Generate coordinator stats
    if (coordinatorYears > 0) {
      const coordPosition = U ? U.choice(['OC', 'DC']) : 'OC';
      const coordStats = coach.stats.asCoordinator[coordPosition];
      coordStats.seasons = coordinatorYears;
      
      for (let i = 0; i < coordinatorYears; i++) {
        const year = currentYear - experienceYears + i;
        if (coordPosition === 'OC') {
          coordStats.pointsPerGame.push({
            year: year,
            team: generateRandomTeam(),
            ppg: U ? U.rand(18, 32) : 24
          });
        } else {
          coordStats.pointsAllowedPerGame.push({
            year: year,
            team: generateRandomTeam(),
            papg: U ? U.rand(16, 28) : 22
          });
        }
      }
    }
    
    // Generate head coach stats
    if (headCoachYears > 0) {
      const hcStats = coach.stats.asHeadCoach;
      hcStats.seasons = headCoachYears;
      
      const totalWins = U ? U.rand(headCoachYears * 4, headCoachYears * 14) : headCoachYears * 8;
      const totalLosses = (headCoachYears * 17) - totalWins;
      
      hcStats.regularSeason.wins = totalWins;
      hcStats.regularSeason.losses = totalLosses;
      hcStats.regularSeason.winPercentage = totalWins / (totalWins + totalLosses);
      
      // Possibly add championships
      if (hcStats.regularSeason.winPercentage > 0.65) {
        hcStats.championships.superBowls = U ? U.rand(0, 2) : 0;
        hcStats.championships.conferenceChampionships = U ? U.rand(0, 3) : 1;
      }
    }
  } else {
    // Coordinators
    const coordStats = coach.stats.asCoordinator[coach.position];
    coordStats.seasons = experienceYears;
    
    for (let i = 0; i < experienceYears; i++) {
      const year = currentYear - experienceYears + i;
      if (coach.position === 'OC') {
        coordStats.pointsPerGame.push({
          year: year,
          team: generateRandomTeam(),
          ppg: U ? U.rand(18, 32) : 24
        });
        coordStats.rankings.push({
          year: year,
          team: generateRandomTeam(),
          ranking: U ? U.rand(1, 32) : 16,
          ppg: U ? U.rand(18, 32) : 24
        });
      } else {
        coordStats.pointsAllowedPerGame.push({
          year: year,
          team: generateRandomTeam(),
          papg: U ? U.rand(16, 28) : 22
        });
        coordStats.rankings.push({
          year: year,
          team: generateRandomTeam(),
          ranking: U ? U.rand(1, 32) : 16,
          papg: U ? U.rand(16, 28) : 22
        });
      }
    }
  }
}

/**
 * Generate random team abbreviation for history
 */
function generateRandomTeam() {
  const teams = ['NYJ', 'BUF', 'MIA', 'NE', 'KC', 'LAC', 'DEN', 'LV', 'PIT', 'CLE', 'BAL', 'CIN'];
  const U = window.Utils;
  return U ? U.choice(teams) : teams[0];
}

/**
 * Integrate coaching stats with game simulation
 */
function enhanceGameSimulation() {
  // Override simulateWeek to include coaching stat updates
  const originalSimulateWeek = window.simulateWeek;
  
  window.simulateWeek = function() {
    const L = state.league;
    if (!L) return;
    
    // Run original simulation
    if (originalSimulateWeek) {
      originalSimulateWeek();
    }
    
    // Update coaching stats for all games this week
    const weekResults = L.resultsByWeek[L.week - 2] || [];
    
    weekResults.forEach(result => {
      if (result.bye) return;
      
      const homeTeam = L.teams[result.home];
      const awayTeam = L.teams[result.away];
      
      if (!homeTeam || !awayTeam) return;
      
      // Update home team coaching stats
      if (homeTeam.staff && homeTeam.staff.headCoach) {
        updateCoachingGameStats(homeTeam.staff.headCoach, {
          win: result.homeWin,
          tie: result.scoreHome === result.scoreAway,
          pointsFor: result.scoreHome,
          pointsAgainst: result.scoreAway
        }, homeTeam);
      }
      
      // Update away team coaching stats  
      if (awayTeam.staff && awayTeam.staff.headCoach) {
        updateCoachingGameStats(awayTeam.staff.headCoach, {
          win: !result.homeWin && result.scoreHome !== result.scoreAway,
          tie: result.scoreHome === result.scoreAway,
          pointsFor: result.scoreAway,
          pointsAgainst: result.scoreHome
        }, awayTeam);
      }
      
      // Update coordinator stats
      if (homeTeam.staff && homeTeam.staff.offCoordinator) {
        updateCoachingGameStats(homeTeam.staff.offCoordinator, {
          pointsFor: result.scoreHome
        }, homeTeam);
      }
      
      if (homeTeam.staff && homeTeam.staff.defCoordinator) {
        updateCoachingGameStats(homeTeam.staff.defCoordinator, {
          pointsAgainst: result.scoreAway
        }, homeTeam);
      }
      
      if (awayTeam.staff && awayTeam.staff.offCoordinator) {
        updateCoachingGameStats(awayTeam.staff.offCoordinator, {
          pointsFor: result.scoreAway
        }, awayTeam);
      }
      
      if (awayTeam.staff && awayTeam.staff.defCoordinator) {
        updateCoachingGameStats(awayTeam.staff.defCoordinator, {
          pointsAgainst: result.scoreHome
        }, awayTeam);
      }
    });
  };
}

/**
 * Integrate coaching stats with offseason processing
 */
function enhanceOffseasonProcessing() {
  // Override runOffseason to include coaching stat updates
  const originalRunOffseason = window.runOffseason;
  
  window.runOffseason = function() {
    const L = state.league;
    if (!L) return;
    
    // Update coaching season stats before running original offseason
    updateAllCoachingSeasonStats(L);
    
    // Run original offseason processing
    if (originalRunOffseason) {
      originalRunOffseason();
    }
    
    // Handle coaching changes in offseason
    handleCoachingChanges(L);
  };
}

/**
 * Update coaching season stats for all teams
 * @param {Object} league - League object
 */
function updateAllCoachingSeasonStats(league) {
  if (!league || !league.teams) return;
  
  league.teams.forEach(team => {
    const seasonStats = {
      wins: team.wins || 0,
      losses: team.losses || 0,
      ties: team.ties || 0,
      pointsFor: team.ptsFor || 0,
      pointsAgainst: team.ptsAgainst || 0
    };
    
    // Update head coach stats
    if (team.staff && team.staff.headCoach) {
      updateCoachingSeasonStats(team.staff.headCoach, seasonStats, team, league.year);
    }
    
    // Update coordinator stats
    if (team.staff && team.staff.offCoordinator) {
      updateCoachingSeasonStats(team.staff.offCoordinator, seasonStats, team, league.year);
    }
    
    if (team.staff && team.staff.defCoordinator) {
      updateCoachingSeasonStats(team.staff.defCoordinator, seasonStats, team, league.year);
    }
  });
}

/**
 * Handle coaching changes during offseason
 * @param {Object} league - League object
 */
function handleCoachingChanges(league) {
  if (!league || !league.teams) return;
  
  const U = window.Utils;
  
  league.teams.forEach(team => {
    if (!team.staff) return;
    
    // Chance for coaching changes based on performance
    const record = team.record;
    const winPct = record.w / (record.w + record.l + record.t);
    
    // Poor performance increases chance of coaching change
    let changeChance = 0;
    if (winPct < 0.3) changeChance = 0.4; // 40% chance if very bad
    else if (winPct < 0.4) changeChance = 0.2; // 20% chance if bad
    else if (winPct < 0.5) changeChance = 0.1; // 10% chance if below average
    
    // Randomly fire head coach
    if (team.staff.headCoach && Math.random() < changeChance) {
      if (league.news) {
        league.news.push(`${team.name} fires head coach ${team.staff.headCoach.name}`);
      }
      
      // Promote coordinator or hire externally
      if (Math.random() < 0.6 && team.staff.offCoordinator) {
        // Promote OC
        promoteCoordinatorToHeadCoach(team.staff.offCoordinator, team, league.year);
        team.staff.headCoach = team.staff.offCoordinator;
        team.staff.offCoordinator = makeBasicStaff('OC');
        initializeCoachingStats(team.staff.offCoordinator);
        
        if (league.news) {
          league.news.push(`${team.name} promotes ${team.staff.headCoach.name} from OC to Head Coach`);
        }
      } else if (Math.random() < 0.3 && team.staff.defCoordinator) {
        // Promote DC
        promoteCoordinatorToHeadCoach(team.staff.defCoordinator, team, league.year);
        team.staff.headCoach = team.staff.defCoordinator;
        team.staff.defCoordinator = makeBasicStaff('DC');
        initializeCoachingStats(team.staff.defCoordinator);
        
        if (league.news) {
          league.news.push(`${team.name} promotes ${team.staff.headCoach.name} from DC to Head Coach`);
        }
      } else {
        // Hire external coach
        team.staff.headCoach = makeBasicStaff('HC');
        team.staff.headCoach.position = 'HC';
        initializeCoachingStats(team.staff.headCoach);
        generateCoachingHistory(team.staff.headCoach);
        
        if (league.news) {
          league.news.push(`${team.name} hires ${team.staff.headCoach.name} as new Head Coach`);
        }
      }
    }
    
    // Smaller chance for coordinator changes
    if (Math.random() < changeChance * 0.5) {
      if (team.staff.offCoordinator) {
        team.staff.offCoordinator = makeBasicStaff('OC');
        team.staff.offCoordinator.position = 'OC';
        initializeCoachingStats(team.staff.offCoordinator);
        generateCoachingHistory(team.staff.offCoordinator);
      }
    }
    
    if (Math.random() < changeChance * 0.5) {
      if (team.staff.defCoordinator) {
        team.staff.defCoordinator = makeBasicStaff('DC');
        team.staff.defCoordinator.position = 'DC';
        initializeCoachingStats(team.staff.defCoordinator);
        generateCoachingHistory(team.staff.defCoordinator);
      }
    }
  });
}

/**
 * Integrate coaching stats with playoffs
 */
function enhancePlayoffProcessing() {
  // This would integrate with your existing playoff system
  // For now, we'll create a hook that can be called when playoff results are known
  
  window.updateCoachingPlayoffResults = function(team, playoffResult) {
    if (!team.staff || !team.staff.headCoach) return;
    
    updateCoachingPlayoffStats(team.staff.headCoach, playoffResult, state.league.year);
  };
}

/**
 * Add coaching view to the UI system
 */
function addCoachingToUI() {
  // Add coaching to the routes
  const routes = window.Constants?.GAME_CONFIG?.ROUTES || 
                 ['hub','roster','cap','schedule','standings','trade','freeagency','draft','playoffs','settings', 'hallOfFame', 'scouting'];
  
  if (!routes.includes('coaching')) {
    routes.push('coaching');
  }
  
  // Update the show function to handle coaching view
  const originalShow = window.show;
  window.show = function(route) {
    if (route === 'coaching') {
      // Show coaching view
      document.querySelectorAll('.view').forEach(v => v.hidden = true);
      
      let coachingView = document.getElementById('coaching');
      if (!coachingView) {
        // Create coaching view if it doesn't exist
        coachingView = document.createElement('section');
        coachingView.id = 'coaching';
        coachingView.className = 'view';
        coachingView.hidden = false;
        
        const contentSection = document.querySelector('.content');
        if (contentSection) {
          contentSection.appendChild(coachingView);
        }
      } else {
        coachingView.hidden = false;
      }
      
      // Update navigation
      document.querySelectorAll('.nav-pill').forEach(a => {
        a.setAttribute('aria-current', a.dataset.view === route ? 'page' : null);
      });
      
      // Render coaching stats
      renderCoachingStats();
    } else {
      // Call original show function
      if (originalShow) {
        originalShow(route);
      }
    }
  };
}

/**
 * Add coaching navigation to the header
 */
function addCoachingNavigation() {
  const nav = document.querySelector('#site-nav');
  if (nav && !document.querySelector('a[href="#/coaching"]')) {
    const coachingLink = document.createElement('a');
    coachingLink.href = '#/coaching';
    coachingLink.className = 'nav-pill';
    coachingLink.dataset.view = 'coaching';
    coachingLink.textContent = 'Coaching';
    
    // Insert before settings
    const settingsLink = document.querySelector('a[href="#/settings"]');
    if (settingsLink) {
      nav.insertBefore(coachingLink, settingsLink);
    } else {
      nav.appendChild(coachingLink);
    }
  }
}

/**
 * Initialize the coaching system integration
 */
function initializeCoachingIntegration() {
  try {
    console.log('Initializing coaching system integration...');
    
    // Enhance existing systems
    enhanceStaffGeneration();
    enhanceGameSimulation();
    enhanceOffseasonProcessing();
    enhancePlayoffProcessing();
    
    // Add to UI
    addCoachingToUI();
    
    // Add navigation (after DOM is ready)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addCoachingNavigation);
    } else {
      addCoachingNavigation();
    }
    
    console.log('Coaching system integration complete!');
    
  } catch (error) {
    console.error('Error initializing coaching integration:', error);
  }
}

// Initialize when this script loads
initializeCoachingIntegration();

// Make functions globally available
window.enhanceStaffGeneration = enhanceStaffGeneration;
window.enhanceGameSimulation = enhanceGameSimulation;
window.enhanceOffseasonProcessing = enhanceOffseasonProcessing;
window.updateAllCoachingSeasonStats = updateAllCoachingSeasonStats;
window.handleCoachingChanges = handleCoachingChanges;
window.initializeCoachingIntegration = initializeCoachingIntegration;
