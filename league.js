// league.js - Core League Generation Logic
'use strict';

window.makeLeague = function(teams, {
    Constants = window.Constants,
    Utils = window.Utils,
    makePlayer = window.makePlayer,
    makeSchedule = window.makeSchedule
} = {}) {
    if (!Constants || !Utils || !makePlayer || !makeSchedule) {
        console.error('Critical dependencies missing for league creation');
        return null;
    }
    
    // Rest of your league creation logic
}

    // Dependency check with detailed logging
    const requiredGlobals = [
        'Constants', 'Utils', 'makePlayer', 
        'makeSchedule', 'state'
    ];

    const missingDependencies = requiredGlobals.filter(
        dep => typeof window[dep] === 'undefined'
    );

    if (missingDependencies.length > 0) {
        console.error('❌ Missing critical dependencies:', missingDependencies);
        console.groupEnd();
        return null;
    }

    // Rest of your existing makeLeague code...
    console.groupEnd();
}

    // Safe access to state object, default to 2025
    const currentYear = (typeof window.state !== 'undefined' && window.state.year) ? window.state.year : 2025;
    const C = window.Constants;
    const U = window.Utils;
    
    // Safety checks
    if (!C) { console.error('❌ Constants (C) not loaded!'); return null; }
    if (!U) { console.error('❌ Utils (U) not loaded!'); return null; }

    const L = {
        teams: [],
        year: currentYear,
        season: 1, 
        week: 1,
        schedule: null,
        resultsByWeek: [],
        transactions: [] // Track trades/signings
    };

    // 1. Initialize Teams, Roster, Picks, and Staff
    L.teams = teams.map((t, i) => {
        const team = { ...t }; // Clone template
        team.id = i;
        
        // Basic Stats
        team.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
        team.history = [];
        
        // --- A. Generate Roster ---
        team.roster = [];
        
        // Iterate through depth needs (QB: 3, RB: 4, etc.)
        if (C.DEPTH_NEEDS) {
            Object.keys(C.DEPTH_NEEDS).forEach(pos => {
                const count = C.DEPTH_NEEDS[pos];
                for (let j = 0; j < count; j++) {
                    // Determine rating range (Starters vs Backups)
                    // If it's the 1st player at pos, give them better odds of being good
                    let ovrRange = C.POS_RATING_RANGES?.[pos] || [60, 85];
                    
                    // Slight boost for the "starters" (first generated)
                    if (j === 0) ovrRange = [Math.max(70, ovrRange[0]), Math.min(99, ovrRange[1] + 5)];
                    
                    const ovr = U.rand(ovrRange[0], ovrRange[1]);
                    const age = U.rand(21, 35);

                    if (window.makePlayer) {
                        const player = window.makePlayer(pos, age, ovr);
                        // Assign player to this team
                        player.teamId = team.id; 
                        team.roster.push(player);
                    }
                }
            });
        }

        // --- B. Calculate Salary Cap ---
        // Sum up the 'baseAnnual' or 'capHit' of all players
        team.capTotal = C.SALARY_CAP?.BASE || 255.4; // Default to 2025 cap if missing
        team.deadCap = 0;
        
        team.capUsed = team.roster.reduce((total, p) => {
            // Use window.capHitFor if available, otherwise raw baseAnnual
            const hit = (window.capHitFor) ? window.capHitFor(p, 0) : (p.baseAnnual || 0);
            return total + hit;
        }, 0);
        
        team.capRoom = team.capTotal - team.capUsed;


        // --- C. Generate Draft Picks (Next 3 Years) ---
        team.picks = [];
        const yearsToGen = 3; 
        for (let y = 0; y < yearsToGen; y++) {
            for (let r = 1; r <= 7; r++) {
                team.picks.push({
                    id: U.id(),
                    round: r,
                    year: currentYear + y,
                    originalOwner: team.id,
                    isCompensatory: false
                });
            }
        }

        // --- D. Generate Coaching Staff ---
        if (window.generateInitialStaff) {
            team.staff = window.generateInitialStaff();
        } else {
            // Fallback if staff.js isn't ready
            team.staff = {
                headCoach: { name: 'Interim HC', ovr: 70 },
                offCoordinator: { name: 'Interim OC', ovr: 70 },
                defCoordinator: { name: 'Interim DC', ovr: 70 },
                scout: { name: 'Head Scout', ovr: 70 }
            };
        }

        // --- E. Set Team Strategies (Playbooks) ---
        // Randomly assign if not present
        team.strategies = team.strategies || {
            offense: U.choice(['Pass Heavy', 'Run Heavy', 'Balanced', 'West Coast', 'Vertical']),
            defense: U.choice(['4-3', '3-4', 'Nickel', 'Aggressive', 'Conservative'])
        };

        return team;
    });

    console.log(`✅ Teams created. Generating schedule...`);

    // 2. Generate Schedule
    if (window.makeSchedule) {
        L.schedule = window.makeSchedule(L.teams);
    } else {
        console.warn('⚠️ makeSchedule not found. Schedule is empty.');
    }
    
    // 3. Initialize Derived Stats (Coaching & Team Ratings)
    
    // Coaching Stats
    if (window.initializeCoachingStats) {
        L.teams.forEach(t => {
            if (t.staff?.headCoach) window.initializeCoachingStats(t.staff.headCoach);
        });
    }
    // Attach league to global state so other systems (trades, standings, etc) see it
    if (typeof window.state === 'object' && window.state !== null) {
        window.state.league = L;

        // Keep core fields in sync
        window.state.year   = L.year;
        window.state.season = L.season;
        window.state.week   = L.week;
    } else {
        window.state = {
            league: L,
            year: L.year,
            season: L.season,
            week: L.week
        };
    }

    // Team Overall Ratings (Off/Def/Ovr)
    if (window.updateAllTeamRatings) {
        window.updateAllTeamRatings(L);
    } else {
        // Fallback simple rating if file missing
        L.teams.forEach(t => {
            if(t.roster.length) {
                const totalOvr = t.roster.reduce((acc, p) => acc + p.ovr, 0);
                t.ovr = Math.round(totalOvr / t.roster.length);
            } else {
                t.ovr = 75;
            }
        });
    }

    console.log('✨ League creation complete!');
    return L;
};
