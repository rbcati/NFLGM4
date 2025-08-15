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
    const score = totalChecks > 0 ? validChecks / totalChecks : 0;
    
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
    // Add a dummy "BYE" team if there's an odd number of teams
    const isOdd = numTeams % 2 === 1;
    const teamsArray = isOdd ? [...teams, { id: 'BYE', name: 'Bye Week', isBye: true }] : [...teams];
    const actualTeams = teamsArray.length;
    
    // Generate round-robin schedule for the required number of weeks
    for (let week = 0; week < constraints.weeks; week++) {
        const weekGames = [];
        
        for (let i = 0; i < actualTeams / 2; i++) {
            const home = teamsArray[i];
            const away = teamsArray[actualTeams - 1 - i];
            
            // Skip creating a "game" for the bye week team
            if (!home.isBye && !away.isBye) {
                weekGames.push({
                    home: home.id, // Store by ID
                    away: away.id, // Store by ID
                    week: week + 1
                });
            }
        }
        
        schedule.weeks.push({
            weekNumber: week + 1,
            games: weekGames
        });
        
        // Rotate teams for the next week, keeping the first team fixed
        const fixed = teamsArray[0];
        const rotating = teamsArray.slice(1);
        rotating.unshift(rotating.pop()); // Move the last element to the front
        teamsArray.splice(0, teamsArray.length, fixed, ...rotating);
    }
    
    return schedule;
}
