// staff.js
'use strict';

// Creates a single staff member with ratings
function makeStaff(position) {
    const U = window.Utils;
    
    // Get names from Constants if available, fallback to global arrays
    const firstNames = window.Constants?.FIRST_NAMES || window.FIRST_NAMES || ['John', 'Mike', 'Steve', 'Dave', 'Tom'];
    const lastNames = window.Constants?.LAST_NAMES || window.LAST_NAMES || ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
    
    const staffMember = {
        id: U.id(),
        name: U.choice(firstNames) + ' ' + U.choice(lastNames),
        position: position,
        age: U.rand(35, 65),
        // Ratings out of 100
        playerDevelopment: U.rand(50, 99),
        playcalling: U.rand(50, 99),
        scouting: U.rand(50, 99),
        // Initialize coaching stats
        stats: null, // Will be initialized by coaching system
        careerHistory: []
    };
    
    console.log(`Generated ${position}: ${staffMember.name}`);
    return staffMember;
}

// Generates a full, initial staff for a team
function generateInitialStaff() {
    console.log('Generating initial staff...');
    
    const staff = {
        headCoach: makeStaff('HC'),
        offCoordinator: makeStaff('OC'),
        defCoordinator: makeStaff('DC'),
        scout: makeStaff('Scout'),
    };
    
    console.log('Generated staff:', staff);
    return staff;
}

// Make the function available to other scripts
window.generateInitialStaff = generateInitialStaff;
