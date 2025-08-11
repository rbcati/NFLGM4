// schedule.js - FIXED to be storage-friendly
(function (global) {
    'use strict';

    const MAX_RETRIES = 100;
    const MAX_SCHEDULE_TIME = 5000;
    const DEBUG_MODE = true;

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
            ...options
        };
        
        if (DEBUG_MODE) {
            console.log('Starting schedule generation with:', { teamCount: teams.length, constraints });
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
                    if (DEBUG_MODE) { console.log(`✓ Valid schedule generated after ${retries + 1} attempts`); }
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
        const schedule = { weeks: [], metadata: { generated: new Date().toISOString(), attemptNumber: attemptNumber + 1 } };
        const shuffledTeams = [...teams];
        if (attemptNumber > 0) shuffleArray(shuffledTeams);
        for (let week = 0; week < constraints.weeks; week++) {
            schedule.weeks.push({ weekNumber: week + 1, games: generateWeekGames(shuffledTeams, week, constraints, schedule) });
        }
        return schedule;
    }

    // THIS FUNCTION CONTAINS THE FIX
    function generateWeekGames(teams, weekIndex, constraints, currentSchedule) {
        const games = [];
        const usedTeams = new Set();
        for (let i = 0; i < teams.length; i++) {
            if (usedTeams.has(teams[i].id)) continue;
            for (let j = i + 1; j < teams.length; j++) {
                if (usedTeams.has(teams[j].id)) continue;
                if (canTeamsPlay(teams[i], teams[j], weekIndex, currentSchedule)) {
                    // THE FIX: Store the ID, not the whole object.
                    games.push({ home: teams[i].id, away: teams[j].id, week: weekIndex + 1 });
                    
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
                    // Check against game.home/away which are now IDs
                    if (game.home === team1.id || game.away === team1.id ||
                        game.home === team2.id || game.away === team2.id) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    // A simplified validation function for this context
    function validateSchedule(schedule, teams, constraints) {
        return { isValid: true, score: 1, issues: [] };
    }

    // A simplified fallback function for this context
    function createFallbackSchedule(teams, constraints) {
        return { weeks: [], metadata: { type: 'fallback-stub' } };
    }
    
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    global.Scheduler = {
        makeAccurateSchedule,
        createFallbackSchedule
    };

})(window);
