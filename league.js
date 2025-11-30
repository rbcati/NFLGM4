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
        season: 1, // Add season property for cap calculations
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
        team.capTotal = C.SALARY_CAP.BASE;
        team.capRoom = C.SALARY_CAP.BASE;
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
        
        // Generate coaching staff for the team
        if (typeof window.generateInitialStaff === 'function') {
            try {
                team.staff = window.generateInitialStaff();
                console.log(`Generated coaching staff for ${team.name}:`, team.staff);
            } catch (error) {
                console.error(`Error generating staff for ${team.name}:`, error);
                // Create basic staff as fallback
                team.staff = {
                    headCoach: { name: 'Vacant HC', position: 'HC', age: 45, playerDevelopment: 50, playcalling: 50, scouting: 50 },
                    offCoordinator: { name: 'Vacant OC', position: 'OC', age: 40, playerDevelopment: 50, playcalling: 50, scouting: 50 },
                    defCoordinator: { name: 'Vacant DC', position: 'DC', age: 40, playerDevelopment: 50, playcalling: 50, scouting: 50 },
                    scout: { name: 'Vacant Scout', position: 'Scout', age: 35, playerDevelopment: 50, playcalling: 50, scouting: 50 }
                };
            }
        } else {
            console.warn('generateInitialStaff function not found, creating basic staff');
            // Create basic staff as fallback
            team.staff = {
                headCoach: { name: 'Vacant HC', position: 'HC', age: 45, playerDevelopment: 50, playcalling: 50, scouting: 50 },
                offCoordinator: { name: 'Vacant OC', position: 'OC', age: 40, playerDevelopment: 50, playcalling: 50, scouting: 50 },
                defCoordinator: { name: 'Vacant DC', position: 'DC', age: 40, playerDevelopment: 50, playcalling: 50, scouting: 50 },
                scout: { name: 'Vacant Scout', position: 'Scout', age: 35, playerDevelopment: 50, playcalling: 50, scouting: 50 }
            };
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
    
    // Initialize coaching stats for all teams if the coaching system is available
    if (typeof window.initializeCoachingStats === 'function') {
        try {
            L.teams.forEach(team => {
                if (team.staff) {
                    if (team.staff.headCoach) {
                        window.initializeCoachingStats(team.staff.headCoach);
                    }
                    if (team.staff.offCoordinator) {
                        window.initializeCoachingStats(team.staff.offCoordinator);
                    }
                    if (team.staff.defCoordinator) {
                        window.initializeCoachingStats(team.staff.defCoordinator);
                    }
                }
            });
            console.log('Initialized coaching stats for all teams');
        } catch (error) {
            console.error('Error initializing coaching stats:', error);
        }
    } else {
        console.log('Coaching system not available, skipping coaching stats initialization');
    }
    
    // Initialize team ratings for all teams
    if (typeof window.updateAllTeamRatings === 'function') {
        try {
            window.updateAllTeamRatings(L);
            console.log('Initialized team ratings for all teams');
        } catch (error) {
            console.error('Error initializing team ratings:', error);
        }
    } else {
        console.log('Team ratings system not available, skipping team ratings initialization');
    }
team.picks = [];  // initialize draft picks here if you want them in trades
    return L;
};
