'use strict';

/**
 * Creates the league, teams, and initial rosters.
 */
window.makeLeague = function(teams) {
    console.log('Creating league with', teams.length, 'teams');
    
    // Safe access to state object
    const currentYear = (typeof state !== 'undefined' && state.year) ? state.year : 2025;
    
    const L = {
        teams: [],
        year: currentYear,
        week: 1,
        schedule: null,
        resultsByWeek: []
    };

    // Check if Constants exists
    const C = window.Constants;
    const U = window.Utils;
    
    if (!C) {
        console.error('Constants object not found');
        return L;
    }
    
    if (!U) {
        console.error('Utils object not found');
        return L;
    }

    L.teams = teams.map((t, i) => {
        const team = { ...t }; // Create a copy to avoid modifying the original template
        team.id = i;
        
        // Initialize the record object so standings and power rankings work correctly
        team.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
        
        team.roster = [];
        team.capUsed = 0;
        team.capTotal = 220;
        team.capRoom = 220;
        team.deadCap = 0;

        // Check if DEPTH_NEEDS exists before using it
        if (C.DEPTH_NEEDS && typeof C.DEPTH_NEEDS === 'object') {
            Object.keys(C.DEPTH_NEEDS).forEach(pos => {
                const count = C.DEPTH_NEEDS[pos];
                
                // Validate count is a positive number
                if (typeof count === 'number' && count > 0) {
                    for (let j = 0; j < count; j++) {
                        // Use position-specific overall ratings from constants with proper fallback
                        let ovrRange = [60, 85]; // Default range
                        
                        if (C.POS_RATING_RANGES && 
                            C.POS_RATING_RANGES[pos] && 
                            Array.isArray(C.POS_RATING_RANGES[pos]) &&
                            C.POS_RATING_RANGES[pos].length >= 2) {
                            ovrRange = C.POS_RATING_RANGES[pos];
                        }
                        
                        const ovr = U.rand(ovrRange[0], ovrRange[1]);
                        
                        // Safe access to PLAYER_CONFIG with fallbacks
                        const minAge = (C.PLAYER_CONFIG && C.PLAYER_CONFIG.MIN_AGE) ? C.PLAYER_CONFIG.MIN_AGE : 22;
                        const maxAge = (C.PLAYER_CONFIG && C.PLAYER_CONFIG.MAX_AGE) ? C.PLAYER_CONFIG.MAX_AGE : 35;
                        const age = U.rand(minAge, maxAge);
                        
                        // Check if makePlayer function exists
                        if (typeof window.makePlayer === 'function') {
                            try {
                                const player = window.makePlayer(pos, age, ovr);
                                if (player) {
                                    team.roster.push(player);
                                }
                            } catch (error) {
                                console.error('Error creating player:', error);
                            }
                        } else {
                            console.warn('makePlayer function not found');
                        }
                    }
                }
            });
        } else {
            console.warn('DEPTH_NEEDS not found in Constants');
        }

        return team;
    });

    // Check if makeSchedule function exists before calling it
    if (typeof window.makeSchedule === 'function') {
        try {
            L.schedule = window.makeSchedule(L.teams);
        } catch (error) {
            console.error('Error creating schedule:', error);
        }
    } else {
        console.warn('makeSchedule function not found');
    }

    return L;
};
