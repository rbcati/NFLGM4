'use strict';

/**
 * Creates the league, teams, and initial rosters.
 */
window.makeLeague = function(teams) {
    console.log('Creating league with', teams.length, 'teams');
    const L = {
        teams: [],
        year: state.year || 2025,
        week: 1,
        schedule: null,
        resultsByWeek: []
    };

    L.teams = teams.map((t, i) => {
        const team = { ...t }; // Create a copy to avoid modifying the original template
        team.id = i;
        
        // **FIXED**: Initialize the record object for each team from the start.
        team.record = { w: 0, l: 0, t: 0, pf: 0, pa: 0 };
        
        team.roster = [];
        team.capUsed = 0;
        team.capTotal = 220;
        team.capRoom = 220;
        team.deadCap = 0;

        const C = window.Constants;
        const U = window.Utils;

        // Generate roster based on position counts
        Object.keys(C.ROSTER_COUNTS).forEach(pos => {
            const count = C.ROSTER_COUNTS[pos];
            for (let j = 0; j < count; j++) {
                // Use position-specific overall ratings
                const ovrRange = C.OVR_BY_POS[pos] || [60, 85];
                const ovr = U.rand(ovrRange[0], ovrRange[1]);
                const age = U.rand(21, 34);
                
                if (window.makePlayer) {
                    const player = makePlayer(pos, age, ovr);
                    team.roster.push(player);
                }
            }
        });

        return team;
    });

    if (window.makeSchedule) {
        L.schedule = makeSchedule(L.teams);
    }

    return L;
};
