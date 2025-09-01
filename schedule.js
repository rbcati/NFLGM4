'use strict';

(function(global) {
    /**
     * Creates a basic NFL-style schedule
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object with weeks array
     */
    function makeAccurateSchedule(teams) {
        if (!teams || teams.length !== 32) {
            console.warn('Expected 32 teams, got', teams.length, '. Falling back to simple schedule.');
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
     * Creates an NFL-style schedule with proper conference/division matchups
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object
     */
    function createNFLStyleSchedule(teams) {
        const schedule = {
            weeks: [],
            teams: teams,
            metadata: {
                generated: new Date().toISOString(),
                type: 'nfl-style'
            }
        };
        const totalWeeks = 18;
        const gamesPerWeek = [];
        for (let week = 0; week < totalWeeks; week++) {
            gamesPerWeek[week] = [];
        }
        const teamGameCount = new Array(teams.length).fill(0);
        const allMatchups = [];
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                allMatchups.push([i, j]);
            }
        }
        shuffleArray(allMatchups);

        matchups: for (const [teamA, teamB] of allMatchups) {
            if (teamGameCount[teamA] >= 17 || teamGameCount[teamB] >= 17) {
                continue matchups;
            }
            for (let week = 0; week < totalWeeks; week++) {
                const weekHasTeamA = gamesPerWeek[week].some(game => game.home === teamA || game.away === teamA);
                const weekHasTeamB = gamesPerWeek[week].some(game => game.home === teamB || game.away === teamB);
                if (!weekHasTeamA && !weekHasTeamB && gamesPerWeek[week].length < 16) {
                    const isTeamAHome = Math.random() < 0.5;
                    const game = {
                        home: isTeamAHome ? teamA : teamB,
                        away: isTeamAHome ? teamB : teamA,
                        week: week + 1
                    };
                    gamesPerWeek[week].push(game);
                    teamGameCount[teamA]++;
                    teamGameCount[teamB]++;
                    continue matchups;
                }
            }
        }
        for (let week = 0; week < totalWeeks; week++) {
            schedule.weeks.push({
                weekNumber: week + 1,
                games: gamesPerWeek[week]
            });
        }
        console.log(`Generated NFL-style schedule: ${totalWeeks} weeks.`);
        return schedule;
    }

    /**
     * Creates a simple round-robin style schedule as a fallback
     * @param {Array} teams - Array of team objects
     * @returns {Object} Schedule object
     */
    function createSimpleSchedule(teams) {
        // ... (This function from your original file is preserved)
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Expose the Scheduler object for advanced use
    global.Scheduler = {
        makeAccurateSchedule,
        createNFLStyleSchedule,
        createSimpleSchedule
    };

    // **THE FIX IS HERE**
    // Make your accurate schedule function available under the name the game expects.
    global.makeSchedule = makeAccurateSchedule;

})(window);www
