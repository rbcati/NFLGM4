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
     * Creates an NFL-style schedule with proper validation
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object
     */
    function createNFLStyleSchedule(teams) {
        console.log('Creating NFL-style schedule...');
        
        if (!teams || teams.length !== 32) {
            console.error('Invalid teams array for NFL schedule');
            return createSimpleSchedule(teams);
        }

        const schedule = { 
            weeks: [], 
            teams: teams,
            metadata: {
                generated: new Date().toISOString(),
                type: 'nfl-style'
            }
        };

        // Initialize tracking objects
        const teamGameCount = {};
        const teamByeWeek = {};
        const teamOpponents = {};
        
        teams.forEach(team => {
            teamGameCount[team.id] = 0;
            teamByeWeek[team.id] = null;
            teamOpponents[team.id] = new Set();
        });

        // Simple bye week distribution - 2 teams per week from weeks 5-18
        const byeWeeks = [];
        for (let week = 5; week <= 18; week++) {
            byeWeeks[week] = [];
        }
        
        // Distribute teams to bye weeks
        let teamIndex = 0;
        for (let week = 5; week <= 18; week++) {
            const teamsThisWeek = week <= 17 ? 2 : 4; // 2 teams per week, 4 in final week
            for (let i = 0; i < teamsThisWeek && teamIndex < teams.length; i++) {
                byeWeeks[week].push(teams[teamIndex].id);
                teamByeWeek[teams[teamIndex].id] = week;
                teamIndex++;
            }
        }

        // Create schedule week by week
        for (let week = 1; week <= 18; week++) {
            const weekData = createWeekSchedule(week, teams, teamByeWeek, teamGameCount, teamOpponents);
            schedule.weeks.push(weekData);
        }

        // Validate and fix schedule if needed
        const validation = validateSchedule(schedule, teams);
        if (!validation.valid) {
            console.warn('Schedule validation failed, attempting to fix:', validation.errors);
            return fixScheduleCompletely(teams);
        }
        
        console.log('Generated NFL-style schedule successfully');
        logScheduleStats(schedule, teams);
        return schedule;
    }

    /**
     * Distributes bye weeks across weeks 5-18
     * @param {Array} teams - Array of team objects
     * @returns {Array} Array of arrays, each containing team IDs for that bye week
     */
    function distributeByeWeeks(teams) {
        const shuffledTeams = [...teams];
        shuffleArray(shuffledTeams);
        
        const byeWeeks = []; // Index 0 = week 5, Index 13 = week 18
        const weeksAvailable = 14; // weeks 5-18
        const teamsPerWeek = Math.floor(32 / weeksAvailable); // 2 teams per week
        const extraWeeks = 32 % weeksAvailable; // 4 extra teams need to be distributed
        
        let teamIndex = 0;
        
        for (let weekIndex = 0; weekIndex < weeksAvailable; weekIndex++) {
            const teamsThisWeek = teamsPerWeek + (weekIndex < extraWeeks ? 1 : 0);
            const weekTeams = [];
            
            for (let i = 0; i < teamsThisWeek && teamIndex < shuffledTeams.length; i++) {
                weekTeams.push(shuffledTeams[teamIndex].id);
                teamIndex++;
            }
            
            byeWeeks.push(weekTeams);
        }
        
        return byeWeeks;
    }

    /**
     * Creates the schedule for a specific week
     * @param {number} week - Week number (1-18)
     * @param {Array} teams - All teams
     * @param {Object} teamByeWeek - Mapping of team ID to bye week
     * @param {Object} teamGameCount - Current game count per team
     * @param {Object} teamOpponents - Set of opponents each team has played
     * @returns {Object} Week schedule object
     */
    function createWeekSchedule(week, teams, teamByeWeek, teamGameCount, teamOpponents) {
        const weekGames = [];
        const teamsOnBye = teams.filter(team => teamByeWeek[team.id] === week);
        
        // Add bye games
        if (teamsOnBye.length > 0) {
            weekGames.push({
                bye: teamsOnBye.map(team => team.id)
            });
        }

        // Get teams available to play this week
        const availableTeams = teams.filter(team => 
            teamByeWeek[team.id] !== week && 
            teamGameCount[team.id] < 17
        );

        // Schedule games for available teams
        const usedThisWeek = new Set();
        const weekPairings = [];

        // Try to pair teams that haven't played each other yet
        for (const team1 of availableTeams) {
            if (usedThisWeek.has(team1.id)) continue;
            
            // Find best opponent for team1
            let bestOpponent = null;
            for (const team2 of availableTeams) {
                if (team2.id === team1.id || usedThisWeek.has(team2.id)) continue;
                if (!teamOpponents[team1.id].has(team2.id)) {
                    bestOpponent = team2;
                    break;
                }
            }
            
            // If no new opponent found, take any available opponent
            if (!bestOpponent) {
                for (const team2 of availableTeams) {
                    if (team2.id === team1.id || usedThisWeek.has(team2.id)) continue;
                    bestOpponent = team2;
                    break;
                }
            }
            
            if (bestOpponent) {
                weekPairings.push([team1, bestOpponent]);
                usedThisWeek.add(team1.id);
                usedThisWeek.add(bestOpponent.id);
                
                // Update tracking
                teamGameCount[team1.id]++;
                teamGameCount[bestOpponent.id]++;
                teamOpponents[team1.id].add(bestOpponent.id);
                teamOpponents[bestOpponent.id].add(team1.id);
            }
        }

        // Create games from pairings
        weekPairings.forEach(([homeTeam, awayTeam]) => {
            weekGames.push({
                home: homeTeam.id,
                away: awayTeam.id,
                week: week
            });
        });

        return { 
            weekNumber: week, 
            games: weekGames,
            teamsWithBye: teamsOnBye.map(team => team.id)
        };
    }

    /**
     * Fixes schedule completely by ensuring all teams get exactly 17 games
     * @param {Array} teams - Array of team objects
     * @returns {Object} Fixed schedule object
     */
    function fixScheduleCompletely(teams) {
        console.log('Fixing schedule completely...');
        
        const schedule = { 
            weeks: [], 
            teams: teams,
            metadata: {
                generated: new Date().toISOString(),
                type: 'fixed-fallback'
            }
        };

        // Initialize tracking
        const teamGameCount = {};
        const teamOpponents = {};
        const teamByeWeek = {};
        
        teams.forEach(team => {
            teamGameCount[team.id] = 0;
            teamOpponents[team.id] = new Set();
            teamByeWeek[team.id] = null;
        });

        // Create 18 weeks
        for (let week = 1; week <= 18; week++) {
            const weekGames = [];
            const availableTeams = teams.filter(team => 
                teamGameCount[team.id] < 17 && 
                teamByeWeek[team.id] !== week
            );

            // Assign bye week if needed (after week 4)
            if (week > 4) {
                const teamsNeedingBye = teams.filter(team => 
                    teamByeWeek[team.id] === null && 
                    teamGameCount[team.id] < 17
                );
                
                if (teamsNeedingBye.length > 0) {
                    const byeTeam = teamsNeedingBye[0];
                    teamByeWeek[byeTeam.id] = week;
                    weekGames.push({
                        bye: [byeTeam.id]
                    });
                }
            }

            // Schedule games for remaining teams
            const teamsToSchedule = availableTeams.filter(team => 
                teamByeWeek[team.id] !== week
            );

            // Pair teams for games
            const usedThisWeek = new Set();
            for (let i = 0; i < teamsToSchedule.length - 1; i += 2) {
                const team1 = teamsToSchedule[i];
                const team2 = teamsToSchedule[i + 1];
                
                if (!usedThisWeek.has(team1.id) && !usedThisWeek.has(team2.id)) {
                    // Check if teams have already played each other too many times
                    const gamesPlayed = teamOpponents[team1.id].has(team2.id) ? 1 : 0;
                    
                    if (gamesPlayed < 2) { // Allow max 2 games between same teams
                        weekGames.push({
                            home: team1.id,
                            away: team2.id,
                            week: week
                        });
                        
                        teamGameCount[team1.id]++;
                        teamGameCount[team2.id]++;
                        teamOpponents[team1.id].add(team2.id);
                        teamOpponents[team2.id].add(team1.id);
                        
                        usedThisWeek.add(team1.id);
                        usedThisWeek.add(team2.id);
                    }
                }
            }

            schedule.weeks.push({ 
                weekNumber: week, 
                games: weekGames,
                teamsWithBye: week > 4 ? [teams.find(t => teamByeWeek[t.id] === week)?.id].filter(Boolean) : []
            });
        }

        // Final validation and adjustment
        const finalValidation = validateSchedule(schedule, teams);
        if (!finalValidation.valid) {
            console.warn('Final validation failed, using simple schedule:', finalValidation.errors);
            return createSimpleSchedule(teams);
        }

        console.log('Schedule fixed successfully');
        logScheduleStats(schedule, teams);
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
        const teamByeCount = {};
        
        teams.forEach(team => {
            teamGameCount[team.id] = 0;
            teamByeCount[team.id] = 0;
        });
        
        schedule.weeks.forEach((week, weekIndex) => {
            // Count bye weeks
            if (week.teamsWithBye) {
                week.teamsWithBye.forEach(teamId => {
                    teamByeCount[teamId]++;
                    
                    // Check if bye is in weeks 1-4 (should not be)
                    if (weekIndex < 4) {
                        result.valid = false;
                        result.errors.push(`Team ${teamId} has bye in week ${week.weekNumber} (should be week 5+)`);
                    }
                });
            }
            
            // Count games
            week.games.forEach(game => {
                if (game.bye) {
                    // Already counted above
                    return;
                }
                
                if (game.home !== undefined && game.away !== undefined) {
                    teamGameCount[game.home]++;
                    teamGameCount[game.away]++;
                }
            });
        });
        
        // Validate game counts
        teams.forEach(team => {
            if (teamGameCount[team.id] !== 17) {
                result.valid = false;
                result.errors.push(`Team ${team.name} plays ${teamGameCount[team.id]} games instead of 17`);
            }
            
            if (teamByeCount[team.id] !== 1) {
                result.valid = false;
                result.errors.push(`Team ${team.name} has ${teamByeCount[team.id]} bye weeks instead of 1`);
            }
        });
        
        // Validate week count
        if (schedule.weeks.length !== 18) {
            result.valid = false;
            result.errors.push(`Schedule has ${schedule.weeks.length} weeks instead of 18`);
        }
        
        return result;
    }

    /**
     * Logs schedule statistics
     */
    function logScheduleStats(schedule, teams) {
        const teamGameCount = {};
        const teamByeWeek = {};
        
        teams.forEach(team => {
            teamGameCount[team.id] = 0;
            teamByeWeek[team.id] = null;
        });
        
        schedule.weeks.forEach(week => {
            if (week.teamsWithBye) {
                week.teamsWithBye.forEach(teamId => {
                    teamByeWeek[teamId] = week.weekNumber;
                });
            }
            
            week.games.forEach(game => {
                if (game.home !== undefined && game.away !== undefined) {
                    teamGameCount[game.home]++;
                    teamGameCount[game.away]++;
                }
            });
        });
        
        console.log('Schedule Statistics:');
        console.log('- Weeks:', schedule.weeks.length);
        console.log('- Games per team:', Object.values(teamGameCount));
        console.log('- Bye week distribution:', 
            schedule.weeks.slice(4).map((week, i) => 
                `Week ${i+5}: ${week.teamsWithBye.length} teams`
            ).join(', ')
        );
    }
    
    /**
     * Creates a simple round-robin style schedule as a fallback
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object
     */
    function createSimpleSchedule(teams) {
        console.log('Creating simple fallback schedule...');
        const schedule = { 
            weeks: [], 
            teams: teams,
            metadata: {
                generated: new Date().toISOString(),
                type: 'simple-fallback'
            }
        };
        const numTeams = teams.length;
        
        // Create 18 weeks
        for (let week = 1; week <= 18; week++) {
            const weekGames = [];
            const availableTeams = [...teams];
            shuffleArray(availableTeams);
            
            // One team gets bye week (rotate through teams)
            const byeTeamIndex = (week - 1) % numTeams;
            const byeTeam = availableTeams.splice(byeTeamIndex, 1)[0];
            
            // Only add bye after week 4
            if (week > 4) {
                weekGames.push({
                    bye: [byeTeam.id]
                });
            }
            
            // Schedule games for remaining teams
            for (let i = 0; i < availableTeams.length - 1; i += 2) {
                weekGames.push({ 
                    home: availableTeams[i].id, 
                    away: availableTeams[i + 1].id 
                });
            }
            
            schedule.weeks.push({ 
                weekNumber: week, 
                games: weekGames,
                teamsWithBye: week > 4 ? [byeTeam.id] : []
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
