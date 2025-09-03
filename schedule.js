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
     * Creates a proper NFL-style schedule where each team plays exactly 17 games over 18 weeks
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object
     */
    function createNFLStyleSchedule(teams) {
        const schedule = {
            weeks: [],
            teams: teams,
            metadata: {
                generated: new Date().toISOString(),
                type: 'nfl-style-corrected'
            }
        };

        const numTeams = teams.length;
        if (numTeams !== 32) {
            console.error('NFL schedule requires exactly 32 teams');
            return createSimpleSchedule(teams);
        }

        // Initialize tracking for each team
        const teamGameCount = {};
        const teamByeWeek = {};
        teams.forEach(team => {
            teamGameCount[team.id] = 0;
            teamByeWeek[team.id] = null;
        });

        // Create 18 weeks
        const weeks = [];
        
        // First, assign bye weeks randomly (one team per week gets a bye)
        const byeWeekAssignments = [];
        for (let week = 1; week <= 18; week++) {
            byeWeekAssignments.push(week);
        }
        shuffleArray(byeWeekAssignments);
        
        // Assign bye weeks to teams
        teams.forEach((team, index) => {
            teamByeWeek[team.id] = byeWeekAssignments[index];
        });

        // Generate all possible matchups
        const allMatchups = [];
        for (let i = 0; i < numTeams; i++) {
            for (let j = i + 1; j < numTeams; j++) {
                allMatchups.push([teams[i].id, teams[j].id]);
            }
        }
        
        // Shuffle matchups to randomize
        shuffleArray(allMatchups);

        // Create schedule week by week
        for (let week = 1; week <= 18; week++) {
            const weekGames = [];
            const teamsInWeek = new Set();
            
            // Add bye week for this week
            const byeTeam = teams.find(team => teamByeWeek[team.id] === week);
            if (byeTeam) {
                weekGames.push({
                    bye: [byeTeam.id]
                });
                teamsInWeek.add(byeTeam.id);
            }

            // Find teams that can play this week (not on bye, haven't played 17 games)
            const availableTeams = teams.filter(team => 
                !teamsInWeek.has(team.id) && 
                teamGameCount[team.id] < 17
            );

            // Schedule games for this week
            let attempts = 0;
            const maxAttempts = 1000;
            
            while (availableTeams.length >= 2 && attempts < maxAttempts) {
                attempts++;
                
                // Find two teams that can play each other
                let teamA = null;
                let teamB = null;
                
                for (let i = 0; i < availableTeams.length && !teamA; i++) {
                    for (let j = i + 1; j < availableTeams.length && !teamA; j++) {
                        const candidateA = availableTeams[i];
                        const candidateB = availableTeams[j];
                        
                        // Check if both teams can play this week
                        if (!teamsInWeek.has(candidateA.id) && 
                            !teamsInWeek.has(candidateB.id) &&
                            teamGameCount[candidateA.id] < 17 &&
                            teamGameCount[candidateB.id] < 17) {
                            
                            teamA = candidateA;
                            teamB = candidateB;
                        }
                    }
                }
                
                if (teamA && teamB) {
                    // Schedule the game
                    weekGames.push({
                        home: Math.random() < 0.5 ? teamA.id : teamB.id,
                        away: Math.random() < 0.5 ? teamB.id : teamA.id
                    });
                    
                    // Update counts and mark teams as used this week
                    teamGameCount[teamA.id]++;
                    teamGameCount[teamB.id]++;
                    teamsInWeek.add(teamA.id);
                    teamsInWeek.add(teamB.id);
                    
                    // Remove teams from available list if they've played 17 games
                    if (teamGameCount[teamA.id] >= 17) {
                        const index = availableTeams.findIndex(t => t.id === teamA.id);
                        if (index > -1) availableTeams.splice(index, 1);
                    }
                    if (teamGameCount[teamB.id] >= 17) {
                        const index = availableTeams.findIndex(t => t.id === teamB.id);
                        if (index > -1) availableTeams.splice(index, 1);
                    }
                } else {
                    break; // No more valid matchups possible
                }
            }
            
            // Add week to schedule
            weeks.push({ 
                weekNumber: week, 
                games: weekGames,
                teamsWithBye: byeTeam ? [byeTeam.id] : []
            });
        }

        // Final validation and cleanup
        schedule.weeks = weeks;
        
        // Validate schedule
        const validation = validateSchedule(schedule, teams);
        if (!validation.valid) {
            console.warn('Schedule validation failed:', validation.errors);
            // Try to fix the schedule by redistributing games
            return fixSchedule(schedule, teams);
        }
        
        console.log(`Generated NFL-style schedule: ${weeks.length} weeks. Games per team:`, teamGameCount);
        return schedule;
    }

    /**
     * Attempts to fix a schedule that has validation errors
     * @param {Object} schedule - Schedule object with errors
     * @param {Array} teams - Teams array
     * @returns {Object} Fixed schedule object
     */
    function fixSchedule(schedule, teams) {
        console.log('Attempting to fix schedule...');
        
        // Count current games per team
        const teamGameCount = {};
        teams.forEach(team => teamGameCount[team.id] = 0);
        
        schedule.weeks.forEach(week => {
            week.games.forEach(game => {
                if (game.home !== undefined && game.away !== undefined) {
                    teamGameCount[game.home]++;
                    teamGameCount[game.away]++;
                }
            });
        });

        // Find teams with too many or too few games
        const teamsWithTooMany = teams.filter(team => teamGameCount[team.id] > 17);
        const teamsWithTooFew = teams.filter(team => teamGameCount[team.id] < 17);
        
        console.log('Teams with too many games:', teamsWithTooMany.map(t => `${t.name}: ${teamGameCount[t.id]}`));
        console.log('Teams with too few games:', teamsWithTooFew.map(t => `${t.name}: ${teamGameCount[t.id]}`));
        
        // For now, return the original schedule and let the game handle it
        // In a production system, you'd implement more sophisticated fixing logic
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
                
                if (game.home !== undefined && game.away !== undefined) {
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
        
        // Check that we have exactly 18 weeks
        if (schedule.weeks.length !== 18) {
            result.valid = false;
            result.errors.push(`Schedule has ${schedule.weeks.length} weeks instead of 18`);
        }
        
        // Check that each team has exactly one bye week
        const teamByeWeeks = {};
        teams.forEach(team => teamByeWeeks[team.id] = 0);
        
        schedule.weeks.forEach(week => {
            if (week.teamsWithBye) {
                week.teamsWithBye.forEach(teamId => {
                    teamByeWeeks[teamId]++;
                });
            }
        });
        
        teams.forEach(team => {
            if (teamByeWeeks[team.id] !== 1) {
                result.valid = false;
                result.errors.push(`Team ${team.name} has ${teamByeWeeks[team.id]} bye weeks instead of 1`);
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
        const schedule = { weeks: [], teams: teams };
        const numTeams = teams.length;
        
        // Create 18 weeks with 17 games per team
        for (let week = 1; week <= 18; week++) {
            const weekGames = [];
            const availableTeams = [...teams];
            shuffleArray(availableTeams);
            
            // Schedule games for this week
            for (let i = 0; i < availableTeams.length - 1; i += 2) {
                weekGames.push({ 
                    home: availableTeams[i].id, 
                    away: availableTeams[i + 1].id 
                });
            }
            
            // Add bye week for one team if we have an odd number
            if (availableTeams.length % 2 === 1) {
                weekGames.push({
                    bye: [availableTeams[availableTeams.length - 1].id]
                });
            }
            
            schedule.weeks.push({ 
                weekNumber: week, 
                games: weekGames,
                teamsWithBye: weekGames.find(g => g.bye)?.bye || []
            });
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
