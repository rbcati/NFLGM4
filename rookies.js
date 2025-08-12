// rookies.js
'use strict';

function generateDraftClass(year) {
    const draftClass = [];
    const U = window.Utils;
    const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'P'];
    const numPlayers = 150; // Generate a deep class

    for (let i = 0; i < numPlayers; i++) {
        const pos = U.choice(positions);
        const rookie = makePlayer(pos); // Use the same player generator
        rookie.age = U.rand(21, 23); // Rookies are young
        rookie.year = year;
        
        // "Fog of War" for scouting
        const potentialFloor = U.clamp(rookie.ovr - U.rand(5, 15), 40, 90);
        const potentialCeiling = U.clamp(rookie.ovr + U.rand(5, 15), 50, 99);
        rookie.potentialRange = `${potentialFloor}-${potentialCeiling}`;
        rookie.scouted = false; // Player has not been scouted yet

        draftClass.push(rookie);
    }
    
    // Sort by a projected round (hidden from player)
    draftClass.sort((a,b) => b.ovr - a.ovr);
    return draftClass;
}

window.generateDraftClass = generateDraftClass;
