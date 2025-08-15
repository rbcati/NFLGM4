// trade.js

function valueOf(p) {
    // Defines the baseline importance of each position in trades.
    const positionMultipliers = {
        'QB': 1.6,
        'WR': 1.25,
        'CB': 1.2,
        'DL': 1.15,
        'OL': 1.1,
        'RB': 1.0,
        'LB': 1.0,
        'S': 1.0,
        'TE': 0.9,
        'K': 0.5,
        'P': 0.5
    };
    const posMult = positionMultipliers[p.pos] || 1.0;

    // Value decreases for older players, especially after age 27.
    const agePenalty = Math.max(0, p.age - 27) * 0.75;

    // A good contract (multiple years left) adds value.
    const contractValue = Math.max(0, p.years - 1) * (p.baseAnnual * 0.1);

    // Final calculation: OVR is the base, adjusted by all other factors.
    const finalValue = (p.ovr - agePenalty + contractValue) * posMult;
    
    return Math.max(5, finalValue); // Ensure a minimum trade value.
}
// trade.js

function teamNeedProfile(team) {
    const C = window.Constants;
    const byPos = {};
    C.POSITIONS.forEach(p => { byPos[p] = []; });
    team.roster.forEach(p => {
        if (byPos[p.pos]) {
            byPos[p.pos].push(p);
        }
    });

    const needs = {};
    Object.keys(C.DEPTH_NEEDS).forEach(pos => {
        const targetCount = C.DEPTH_NEEDS[pos];
        const currentPlayers = byPos[pos].sort((a,b) => b.ovr - a.ovr);
        
        // How many players are they short at this position?
        const countGap = Math.max(0, targetCount - currentPlayers.length);

        // How good is their starter compared to a league-average starter (e.g., 82 OVR)?
        const qualityGap = currentPlayers.length > 0 ? Math.max(0, 82 - currentPlayers[0].ovr) : 20;

        // Combine the need for players (quantity) and the need for a better starter (quality)
        needs[pos] = {
            countGap: countGap,
            qualityGap: qualityGap,
            // A simple score to quickly rank the needs. Needing players is a high priority.
            score: (countGap * 15) + (qualityGap * 0.5)
        };
    });
    
    return needs;
}
