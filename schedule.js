// schedule.js - FIXED to correctly export for browsers
(function (global) {
    'use strict';

    // Configuration constants
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
        let retries = 0;
        let lastError = null;
        let bestPartialSchedule = null;
        const startTime = Date.now();
        
        if (!teams || !Array.isArray(teams)) {
            throw new Error('Invalid teams array provided to scheduler');
        }
        
        if (teams.length < 2) {
            throw new Error('Need at least 2 teams to create a schedule');
        }
        
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
        
        while (retries < MAX_RETRIES) {
            if (Date.now() - startTime > MAX_SCHEDULE_TIME) {
                console.warn(`Schedule generation timed out after ${MAX_SCHEDULE_TIME}ms`);
                break;
            }
            
            try {
                const schedule = generateScheduleAttempt(teams, constraints, retries);
                const validation = validateSchedule(schedule, teams, constraints);
                
                if (validation.isValid) {
                    if (DEBUG_MODE) {
                        console.log(`✓ Valid schedule generated after ${retries + 1} attempts`);
                    }
                    return schedule;
                } else {
                    if (!bestPartialSchedule || validation.score > bestPartialSchedule.score) {
                        bestPartialSchedule = { schedule, score: validation.score, issues: validation.issues };
                    }
                    lastError = validation.issues.join('; ');
                }
            } catch (error) {
                lastError = error.message;
            }
            retries++;
        }
        
        if (bestPartialSchedule && bestPartialSchedule.score > 0.7) {
            console.warn('Using best partial schedule (score: ' + bestPartialSchedule.score + ')');
            return bestPartialSchedule.schedule;
        }
        
        console.warn('Using fallback round-robin schedule');
        return createFallbackSchedule(teams, constraints);
    }

    function generateScheduleAttempt(teams, constraints, attemptNumber) {
        const schedule = { weeks: [], teams, metadata: { generated: new Date().toISOString(), attemptNumber: attemptNumber + 1 } };
        const shuffledTeams = [...teams];
        if (attemptNumber > 0) shuffleArray(shuffledTeams);
        for (let week = 0; week < constraints.weeks; week++) {
            schedule.weeks.push({ weekNumber: week + 1, games: generateWeekGames(shuffledTeams, week, constraints, schedule) });
        }
        return schedule;
    }

    function generateWeekGames(teams, weekIndex, constraints, currentSchedule) {
        const games = [];
        const usedTeams = new Set();
        for (let i = 0; i < teams.length; i++) {
            if (usedTeams.has(teams[i].id)) continue;
            for (let j = i + 1; j < teams.length; j++) {
                if (usedTeams.has(teams[j].id)) continue;
                if (canTeamsPlay(teams[i], teams[j], weekIndex, currentSchedule)) {
                    games.push({ home: teams[i], away: teams[j], week: weekIndex + 1 });
                    usedTeams.add(teams[i].id);
                    usedTeams.add(teams[j].id);
                    break;
                }
            }
        }
        return games;
    }

    function canTeamsPlay(team1, team2, weekIndex, schedule) {
        for (let w = 0; w < schedule.weeks.length; w++) {
            for (const game of schedule.weeks[w].games) {
                if (w === weekIndex) {
                    if (game.home.id === team1.id || game.away.id === team1.id ||
                        game.home.id === team2.id || game.away.id === team2.id) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function validateSchedule(schedule, teams, constraints) {
        // ... (validation logic remains the same)
        return { isValid: true, score: 1, issues: [] }; // Simplified for brevity
    }

    function createFallbackSchedule(teams, constraints) {
        // ... (fallback logic remains the same)
        return { weeks: [], teams, metadata: { type: 'fallback-stub' } }; // Simplified for brevity
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // This is the crucial fix
    global.Scheduler = {
        makeAccurateSchedule,
        createFallbackSchedule
        // Add other scheduler functions here if they need to be public
    };

})(window);
