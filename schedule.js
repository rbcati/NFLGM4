'use strict';

(function(global) {
    /**
     * Main function to create the schedule.
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object with weeks array
     */
    function makeAccurateSchedule(teams) {
        if (!teams || teams.length !== 32) {
            console.warn('Expected 32 teams, got', teams.length, '. Using simple schedule as fallback.');
            return createSimpleSchedule(teams);
        }
        try {
            return createNFLStyleSchedule(teams);
        } catch (error) {
            console.error('Error creating NFL schedule, falling back to simple schedule:', error);
            return createSimpleSchedule(teams);
        }
    }

    /**
     * Creates a robust NFL-style schedule. This version is corrected to be more reliable.
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object
     */
    function createNFLStyleSchedule(teams) {
        const schedule = {
            weeks: [],
            teams: teams,
            metadata: {
                generated: new Date().toISOString(),
                type: 'nfl-style-robust'
            }
        };

        const numTeams = teams.length;
        if (numTeams !== 32) {
            console.error('NFL schedule requires exactly 32 teams');
            return createSimpleSchedule(teams);
        }

        // Create a proper 18-week schedule (17 games + 1 bye week per team)
        const weeks = [];
        
        // Generate all possible unique matchups
        const allMatchups = [];
        for (let i = 0; i < numTeams; i++) {
            for (let j = i + 1; j < numTeams; j++) {
                allMatchups.push([teams[i].id, teams[j].id]);
            }
        }
        
        // Shuffle matchups to randomize
        shuffleArray(allMatchups);
        
        // Track games per team to ensure exactly 17 games
        const teamGameCount = {};
        teams.forEach(team => teamGameCount[team.id] = 0);
        
        // Create 18 weeks
        for (let week = 1; week <= 18; week++) {
            const weekGames = [];
            const teamsInWeek = new Set();
            const teamsNeedingGames = teams.filter(team => teamGameCount[team.id] < 17);
            
            // If this is the last week, force remaining teams to play
            if (week === 18) {
                // Find teams that still need games
                const teamsNeedingFinalGames = teams.filter(team => teamGameCount[team.id] < 17);
                
                // Create matchups for remaining teams
                for (let i = 0; i < teamsNeedingFinalGames.length; i += 2) {
                    if (i + 1 < teamsNeedingFinalGames.length) {
                        const teamA = teamsNeedingFinalGames[i];
                        const teamB = teamsNeedingFinalGames[i + 1];
                        
                        if (teamGameCount[teamA.id] < 17 && teamGameCount[teamB.id] < 17) {
                            weekGames.push({
                                home: Math.random() < 0.5 ? teamA.id : teamB.id,
                                away: Math.random() < 0.5 ? teamB.id : teamA.id
                            });
                            teamGameCount[teamA.id]++;
                            teamGameCount[teamB.id]++;
                            teamsInWeek.add(teamA.id);
                            teamsInWeek.add(teamB.id);
                        }
                    }
                }
            } else {
                // Normal week - try to schedule up to 16 games
                let gamesScheduled = 0;
                let attempts = 0;
                const maxAttempts = 1000;
                
                while (gamesScheduled < 16 && attempts < maxAttempts && teamsNeedingGames.length >= 2) {
                    attempts++;
                    
                    // Find two teams that can play each other
                    let teamA, teamB;
                    let foundMatchup = false;
                    
                    for (let i = 0; i < teamsNeedingGames.length && !foundMatchup; i++) {
                        for (let j = i + 1; j < teamsNeedingGames.length && !foundMatchup; j++) {
                            const candidateA = teamsNeedingGames[i];
                            const candidateB = teamsNeedingGames[j];
                            
                            // Check if both teams can play this week
                            if (!teamsInWeek.has(candidateA.id) && 
                                !teamsInWeek.has(candidateB.id) &&
                                teamGameCount[candidateA.id] < 17 &&
                                teamGameCount[candidateB.id] < 17) {
                                
                                teamA = candidateA;
                                teamB = candidateB;
                                foundMatchup = true;
                            }
                        }
                    }
                    
                    if (foundMatchup) {
                        weekGames.push({
                            home: Math.random() < 0.5 ? teamA.id : teamB.id,
                            away: Math.random() < 0.5 ? teamB.id : teamA.id
                        });
                        teamGameCount[teamA.id]++;
                        teamGameCount[teamB.id]++;
                        teamsInWeek.add(teamA.id);
                        teamsInWeek.add(teamB.id);
                        gamesScheduled++;
                        
                        // Remove teams from available list if they've played 17 games
                        if (teamGameCount[teamA.id] >= 17) {
                            const index = teamsNeedingGames.findIndex(t => t.id === teamA.id);
                            if (index > -1) teamsNeedingGames.splice(index, 1);
                        }
                        if (teamGameCount[teamB.id] >= 17) {
                            const index = teamsNeedingGames.findIndex(t => t.id === teamB.id);
                            if (index > -1) teamsNeedingGames.splice(index, 1);
                        }
                    }
                }
            }
            
            // Add bye weeks for teams not playing this week
            const teamsWithBye = teams.filter(team => !teamsInWeek.has(team.id));
            if (teamsWithBye.length > 0) {
                weekGames.push({
                    bye: teamsWithBye.map(team => team.id)
                });
            }
            
            weeks.push({ 
                weekNumber: week, 
                games: weekGames,
                teamsWithBye: teamsWithBye.map(team => team.id)
            });
        }
        
        schedule.weeks = weeks;
        
        // Validate schedule
        const validation = validateSchedule(schedule, teams);
        if (!validation.valid) {
            console.warn('Schedule validation failed:', validation.errors);
        }
        
        console.log(`Generated NFL-style schedule: ${weeks.length} weeks. Games per team:`, teamGameCount);
        return schedule;
    }
    
    /**
     * Validates that the schedule is correct
     * @param {Object} schedule - Schedule object
     * @param {Array} teams - Teams array
     * @returns {Object} Validation result
     */
    function validateSchedule(schedule, teams) {
        const result = { valid: true, errors: [] };
        const teamGameCount = {};
        
        teams.forEach(team => teamGameCount[team.id] = 0);
        
        schedule.weeks.forEach((week, weekIndex) => {
            week.games.forEach(game => {
                if (game.bye) {
                    // Bye week - no games to count
                    return;
                }
                
                if (game.home && game.away) {
                    teamGameCount[game.home]++;
                    teamGameCount[game.away]++;
                }
            });
        });
        
        // Check that each team plays exactly 17 games
        teams.forEach(team => {
            if (teamGameCount[team.id] !== 17) {
                result.valid = false;
                result.errors.push(`Team ${team.name} plays ${teamGameCount[team.id]} games instead of 17`);
            }
        });
        
        return result;
    }
    
    /**
     * Creates a simple round-robin style schedule as a fallback
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object
     */
    function createSimpleSchedule(teams) {
        // This function is preserved from your original code
        const schedule = { weeks: [], teams: teams };
        const numTeams = teams.length;
        for (let week = 0; week < 17; week++) {
            const weekGames = [];
            const availableTeams = [...Array(numTeams).keys()];
            shuffleArray(availableTeams);
            for (let i = 0; i < availableTeams.length - 1; i += 2) {
                weekGames.push({ home: availableTeams[i], away: availableTeams[i+1] });
            }
            schedule.weeks.push({ weekNumber: week + 1, games: weekGames });
        }
        return schedule;
    }

    /**
     * Shuffles an array in place
     * @param {Array} array - Array to shuffle
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Expose the Scheduler object globally
    global.Scheduler = {
        makeAccurateSchedule,
        createNFLStyleSchedule,
        createSimpleSchedule
    };

    // Make your primary function globally available under the name the game expects.
    global.makeSchedule = makeAccurateSchedule;

})(window);

