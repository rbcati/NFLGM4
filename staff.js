// staff.js
'use strict';

// Creates a single staff member with ratings
function makeStaff(position) {
    const U = window.Utils;
    return {
        id: U.id(),
        name: U.choice(FIRST_NAMES) + ' ' + U.choice(LAST_NAMES),
        position: position,
        age: U.rand(35, 65),
        // Ratings out of 100
        playerDevelopment: U.rand(50, 99),
        playcalling: U.rand(50, 99),
        scouting: U.rand(50, 99),
    };
}

// Generates a full, initial staff for a team
function generateInitialStaff() {
    return {
        headCoach: makeStaff('HC'),
        offCoordinator: makeStaff('OC'),
        defCoordinator: makeStaff('DC'),
        scout: makeStaff('Scout'),
    };
}

// Make the function available to other scripts
window.generateInitialStaff = generateInitialStaff;
