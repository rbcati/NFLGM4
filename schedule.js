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
        const allTeams = teams.map(t => t.id);

        // Generate a classic round-robin tournament structure, which gives us a base of unique matchups.
        const rounds = [];
        const rotatingTeams = allTeams.slice(1);
        for (let i = 0; i < numTeams - 1; i++) {
            const round = [];
            round.push([allTeams[0], rotatingTeams[0]]);
            for (let j = 1; j < numTeams / 2; j++) {
                round.push([rotatingTeams[j], rotatingTeams[rotatingTeams.length - j]]);
            }
            rounds.push(round);
            // Rotate the array for the next round
            rotatingTeams.unshift(rotatingTeams.pop());
        }

        // We now have a set of unique game weeks. We can shuffle and distribute them.
        const allPossibleGames = rounds.flat();
        shuffleArray(allPossibleGames);

        let gameCursor = 0;
        for (let week = 0; week < 18; week++) {
            const weeklyGames = [];
            const teamsInWeek = new Set();
            
            // Fill each week with up to 16 games.
            while (weeklyGames.length < 16 && teamsInWeek.size < 32) {
                if (gameCursor >= allPossibleGames.length) {
                    gameCursor = 0; // Loop back to the beginning if we need more games than unique matchups
                    shuffleArray(allPossibleGames); // Re-shuffle to avoid identical weeks
                }
                
                const [teamA, teamB] = allPossibleGames[gameCursor];

                if (!teamsInWeek.has(teamA) && !teamsInWeek.has(teamB)) {
                    weeklyGames.push({
                        home: Math.random() < 0.5 ? teamA : teamB,
                        away: Math.random() < 0.5 ? teamB : teamA
                    });
                    teamsInWeek.add(teamA);
                    teamsInWeek.add(teamB);
                }
                gameCursor++;
            }
            schedule.weeks.push({ weekNumber: week + 1, games: weeklyGames });
        }

        console.log(`Generated robust NFL-style schedule: ${schedule.weeks.length} weeks.`);
        return schedule;
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
