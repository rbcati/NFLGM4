// schedule.js - Fixed scheduler with proper error handling and fallback

// Configuration constants at the top of the file
const MAX_RETRIES = 100;
const MAX_SCHEDULE_TIME = 5000; // 5 seconds timeout
const DEBUG_MODE = true; // Set to false in production

/**
 * Main scheduling function with improved error handling
 * @param {Array} teams - Array of team objects
 * @param {Object} options - Scheduling options and constraints
 * @returns {Object} Generated schedule or fallback schedule
 */
function makeAccurateSchedule(teams, options = {}) {
    // Initialize variables
    let retries = 0;
    let lastError = null;
    let bestPartialSchedule = null;
    const startTime = Date.now();
    
    // Validate inputs
    if (!teams || !Array.isArray(teams)) {
        throw new Error('Invalid teams array provided to scheduler');
    }
    
    if (teams.length < 2) {
        throw new Error('Need at least 2 teams to create a schedule');
    }
    
    // Default options
    const constraints = {
        weeks: options.weeks || 17,
        gamesPerWeek: options.gamesPerWeek || Math.floor(teams.length / 2),
        divisionGames: options.divisionGames || 6,
        conferenceGames: options.conferenceGames || 4,
        byeWeeks: options.byeWeeks || false,
        ...options
    };
    
    if (DEBUG_MODE) {
        console.log('Starting schedule generation with:', {
            teamCount: teams.length,
            constraints: constraints
        });
    }
    
    // Main scheduling loop
    while (retries < MAX_RETRIES) {
        // Check for timeout
        if (Date.now() - startTime > MAX_SCHEDULE_TIME) {
            console.warn(`Schedule generation timed out after ${MAX_SCHEDULE_TIME}ms`);
            break;
        }
        
        try {
            // Attempt to generate schedule
            const schedule = generateScheduleAttempt(teams, constraints, retries);
            
            // Validate the generated schedule
            const validation = validateSchedule(schedule, teams, constraints);
            
            if (validation.isValid) {
                if (DEBUG_MODE) {
                    console.log(`✓ Valid schedule generated after ${retries + 1} attempts`);
                }
                return schedule;
            } else {
                // Keep track of the best partial schedule
                if (!bestPartialSchedule || validation.score > bestPartialSchedule.score) {
                    bestPartialSchedule = {
                        schedule: schedule,
                        score: validation.score,
                        issues: validation.issues
                    };
                }
                
                lastError = validation.issues.join('; ');
                
                if (DEBUG_MODE && retries % 10 === 0) {
                    console.log(`Attempt ${retries + 1}: ${lastError}`);
                }
            }
            
        } catch (error) {
            lastError = error.message;
            if (DEBUG_MODE) {
                console.error(`Attempt ${retries + 1} error:`, error.message);
            }
        }
        
        retries++;
    }
    
    // If we get here, we couldn't generate a perfect schedule
    if (DEBUG_MODE) {
        const debugInfo = {
            attempts: retries,
            teams: teams.length,
            constraints: constraints,
            lastError: lastError,
            timeElapsed: Date.now() - startTime
        };
        console.error('Schedule generation failed:', debugInfo);
    }
    
    // Try to use the best partial schedule if available
    if (bestPartialSchedule && bestPartialSchedule.score > 0.7) {
        console.warn('Using best partial schedule (score: ' + bestPartialSchedule.score + ')');
        console.warn('Issues:', bestPartialSchedule.issues);
        return bestPartialSchedule.schedule;
    }
    
    // Last resort: use simple round-robin fallback
    console.warn('Using fallback round-robin schedule');
    return createFallbackSchedule(teams, constraints);
}

/**
 * Generate a single schedule attempt
 * @private
 */
function generateScheduleAttempt(teams, constraints, attemptNumber) {
    const schedule = {
        weeks: [],
        teams: teams,
        metadata: {
            generated: new Date().toISOString(),
            attemptNumber: attemptNumber + 1
        }
    };
    
    // Shuffle teams for variety in attempts
    const shuffledTeams = [...teams];
    if (attemptNumber > 0) {
        shuffleArray(shuffledTeams);
    }
    
    // Generate weeks
    for (let week = 0; week < constraints.weeks; week++) {
        const weekGames = generateWeekGames(shuffledTeams, week, constraints, schedule);
        schedule.weeks.push({
            weekNumber: week + 1,
            games: weekGames
        });
    }
    
    return schedule;
}

/**
 * Generate games for a single week
 * @private
 */
function generateWeekGames(teams, weekIndex, constraints, currentSchedule) {
    const games = [];
    const usedTeams = new Set();
    
    // Pair up teams for this week
    for (let i = 0; i < teams.length; i++) {
        if (usedTeams.has(teams[i].id)) continue;
        
        for (let j = i + 1; j < teams.length; j++) {
            if (usedTeams.has(teams[j].id)) continue;
            
            // Check if this matchup is valid
            if (canTeamsPlay(teams[i], teams[j], weekIndex, currentSchedule)) {
                games.push({
                    home: teams[i],
                    away: teams[j],
                    week: weekIndex + 1
                });
                
                usedTeams.add(teams[i].id);
                usedTeams.add(teams[j].id);
                break;
            }
        }
    }
    
    return games;
}

/**
 * Check if two teams can play in a given week
 * @private
 */
function canTeamsPlay(team1, team2, weekIndex, schedule) {
    // Check if teams have already played this week
    for (let w = 0; w < schedule.weeks.length; w++) {
        const weekGames = schedule.weeks[w].games;
        for (const game of weekGames) {
            // Check if either team is already scheduled this week
            if (w === weekIndex) {
                if (game.home.id === team1.id || game.away.id === team1.id ||
                    game.home.id === team2.id || game.away.id === team2.id) {
                    return false;
                }
            }
            
            // You can add more constraints here (e.g., max games between teams)
        }
    }
    
    return true;
}

/**
 * Validate a generated schedule
 * @private
 */
function validateSchedule(schedule, teams, constraints) {
    const issues = [];
    let validChecks = 0;
    let totalChecks = 0;
    
    // Check 1: All teams play the correct number of games
    totalChecks++;
    const gamesPerTeam = {};
    teams.forEach(team => gamesPerTeam[team.id] = 0);
    
    schedule.weeks.forEach(week => {
        week.games.forEach(game => {
            if (game.home && game.home.id) gamesPerTeam[game.home.id]++;
            if (game.away && game.away.id) gamesPerTeam[game.away.id]++;
        });
    });
    
    const expectedGames = constraints.weeks;
    let allTeamsCorrectGames = true;
    
    for (const teamId in gamesPerTeam) {
        if (gamesPerTeam[teamId] !== expectedGames) {
            allTeamsCorrectGames = false;
            issues.push(`Team ${teamId} has ${gamesPerTeam[teamId]} games, expected ${expectedGames}`);
        }
    }
    
    if (allTeamsCorrectGames) validChecks++;
    
    // Check 2: No team plays twice in the same week
    totalChecks++;
    let noDoubleGames = true;
    
    schedule.weeks.forEach((week, weekIndex) => {
        const teamsThisWeek = new Set();
        week.games.forEach(game => {
            if (game.home && teamsThisWeek.has(game.home.id)) {
                noDoubleGames = false;
                issues.push(`Team ${game.home.id} plays twice in week ${weekIndex + 1}`);
            }
            if (game.away && teamsThisWeek.has(game.away.id)) {
                noDoubleGames = false;
                issues.push(`Team ${game.away.id} plays twice in week ${weekIndex + 1}`);
            }
            if (game.home) teamsThisWeek.add(game.home.id);
            if (game.away) teamsThisWeek.add(game.away.id);
        });
    });
    
    if (noDoubleGames) validChecks++;
    
    // Calculate validation score
    const score = validChecks / totalChecks;
    
    return {
        isValid: issues.length === 0,
        score: score,
        issues: issues
    };
}

/**
 * Create a simple round-robin fallback schedule
 * @private
 */
function createFallbackSchedule(teams, constraints) {
    console.log('Generating fallback round-robin schedule');
    
    const schedule = {
        weeks: [],
        teams: teams,
        metadata: {
            generated: new Date().toISOString(),
            type: 'fallback-roundrobin'
        }
    };
    
    const numTeams = teams.length;
    const isOdd = numTeams % 2 === 1;
    const teamsArray = isOdd ? [...teams, { id: 'BYE', name: 'Bye Week', isBye: true }] : [...teams];
    const actualTeams = teamsArray.length;
    
    // Generate round-robin schedule
    for (let week = 0; week < constraints.weeks; week++) {
        const weekGames = [];
        
        for (let i = 0; i < actualTeams / 2; i++) {
            const home = teamsArray[i];
            const away = teamsArray[actualTeams - 1 - i];
            
            // Skip bye week games
            if (!home.isBye && !away.isBye) {
                weekGames.push({
                    home: home,
                    away: away,
                    week: week + 1
                });
            }
        }
        
        schedule.weeks.push({
            weekNumber: week + 1,
            games: weekGames
        });
        
        // Rotate teams for next week (keep first team fixed)
        const fixed = teamsArray[0];
        const rotating = teamsArray.slice(1);
        rotating.unshift(rotating.pop());
        teamsArray.splice(0, teamsArray.length, fixed, ...rotating);
    }
    
    return schedule;
}

/**
 * Utility function to shuffle an array
 * @private
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        makeAccurateSchedule,
        createFallbackSchedule
    };
}
