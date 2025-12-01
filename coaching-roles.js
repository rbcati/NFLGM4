// coaching-roles.js - Coaching Role System with GM/President Promotion Path
'use strict';

// --- Dependencies/Utilities ---
const setStatus = window.setStatus || ((msg) => console.log('Status:', msg));

/**
 * Coaching Role System Configuration
 */
const COACHING_ROLES = {
  OC: {
    name: 'Offensive Coordinator',
    permissions: ['sign_offensive_players', 'view_offensive_stats', 'coordinate_offense'],
    promotionPath: 'HC', // New property for clarity
    promotionRequirement: { seasons: 2, winPercentage: 0.60, playoffAppearances: 1 },
    salary: { min: 1000000, max: 3000000 }, // Salary buffed
    responsibilities: ['Offensive playcalling', 'QB development', 'Offensive player evaluation']
  },
  DC: {
    name: 'Defensive Coordinator', 
    permissions: ['sign_defensive_players', 'view_defensive_stats', 'coordinate_defense'],
    promotionPath: 'HC',
    promotionRequirement: { seasons: 2, winPercentage: 0.60, playoffAppearances: 1 },
    salary: { min: 1000000, max: 3000000 }, // Salary buffed
    responsibilities: ['Defensive playcalling', 'Defensive player development', 'Defensive player evaluation']
  },
  HC: {
    name: 'Head Coach',
    permissions: ['sign_all_players', 'view_all_stats', 'manage_staff', 'make_trades', 'draft_management', 'cap_management'],
    promotionPath: 'GM', // New path to GM
    promotionRequirement: { seasons: 5, winPercentage: 0.70, playoffAppearances: 3, superBowls: 2 },
    salary: { min: 3000000, max: 15000000 },
    responsibilities: ['Team management', 'Staff coordination', 'Strategic decisions', 'Media relations', 'Culture setting']
  },
  GM: {
    name: 'General Manager',
    permissions: ['sign_all_players', 'manage_staff', 'make_trades', 'draft_management', 'cap_management', 'set_team_goals'],
    promotionPath: 'President', // Ultimate path
    promotionRequirement: { seasons: 7, winPercentage: 0.75, superBowls: 3, championships: 5 }, // Higher reqs
    salary: { min: 5000000, max: 20000000 },
    responsibilities: ['Total roster construction', 'Head coach hiring/firing', 'Long-term cap strategy', 'Draft strategy']
  },
  President: {
    name: 'Team President',
    permissions: ['sign_all_players', 'manage_staff', 'make_trades', 'draft_management', 'cap_management', 'set_team_goals', 'owner_relations'],
    promotionPath: null, // End of the line
    salary: { min: 8000000, max: 30000000 },
    responsibilities: ['Franchise vision', 'Business operations oversight', 'Stadium projects', 'Ultimate franchise power']
  }
};

/**
 * Initialize coaching role system
 */
function initializeCoachingRoles() {
  // Check if window.state exists and the career tracking is missing
  if (window.state && !window.state.coachingCareer) {
    const defaultRole = 'OC'; // Start all new saves as an OC for the career path
    
    window.state.playerRole = defaultRole;
    window.state.coachingCareer = {
      currentRole: defaultRole,
      startYear: window.state.league?.year || 2025,
      seasonsInRole: 0,
      totalSeasons: 0,
      promotions: [],
      achievements: [],
      performance: {
        winPercentage: 0,
        playoffAppearances: 0,
        superBowls: 0,
        divisionTitles: 0
      }
    };
    console.log('Coaching roles system initialized as OC');
  } else if (window.state && !window.state.playerRole) {
     // If the old save has no playerRole, default to HC (for compatibility)
     window.state.playerRole = 'HC';
  }
}

/**
 * Check if player can perform an action based on their role
 * @param {string} action - Action to check
 * @returns {boolean} Whether player can perform action
 */
function canPerformAction(action) {
  const role = window.state.playerRole || 'HC'; // Default to HC if somehow missing
  const roleConfig = COACHING_ROLES[role];
  
  if (!roleConfig) return false;
  
  return roleConfig.permissions.includes(action);
}

// ... (getAvailableActions remains the same)

/**
 * Get actions available to the current coaching role
 * @returns {Array<string>} List of permitted actions for the active role
 */
function getAvailableActions() {
  const role = window.state?.playerRole || 'HC';
  const roleConfig = COACHING_ROLES[role];
  return roleConfig ? roleConfig.permissions.slice() : [];
}

/**
 * Check if player is eligible for promotion
 * @returns {Object} Promotion eligibility status
 */
function checkPromotionEligibility() {
  const career = window.state?.coachingCareer;
  if (!career || !career.currentRole) {
    return { eligible: false, reason: 'Coaching career not initialized' };
  }

  const currentRole = career.currentRole;
  const roleConfig = COACHING_ROLES[currentRole];

  if (!roleConfig || !roleConfig.promotionPath) {
    return { eligible: false, reason: 'Already at highest available role (or no path defined)' };
  }

  const requirements = roleConfig.promotionRequirement;
  const performance = career.performance || {};

  const checks = {
    seasons: (career.seasonsInRole || 0) >= requirements.seasons,
    winPercentage: (performance.winPercentage || 0) >= requirements.winPercentage,
    playoffAppearances: (performance.playoffAppearances || 0) >= requirements.playoffAppearances,
    superBowls: (performance.superBowls || 0) >= (requirements.superBowls || 0)
  };
  
  // Custom check for GM -> President
  if (currentRole === 'GM' && requirements.championships) {
      checks.championships = performance.championships >= requirements.championships;
  }
  
  const eligible = Object.values(checks).every(check => check);
  
  return {
    eligible,
    checks,
    requirements,
    currentPerformance: performance,
    nextRole: roleConfig.promotionPath
  };
}

/**
 * Promote player to next role
 * @returns {Object} Promotion result
 */
function promotePlayer() {
  const eligibility = checkPromotionEligibility();
  
  if (!eligibility.eligible) {
    return {
      success: false,
      message: 'Not eligible for promotion yet. Keep grinding! 😤'
    };
  }
  
  const career = window.state.coachingCareer;
  const currentRole = career.currentRole;
  const nextRole = COACHING_ROLES[currentRole].promotionPath;
  
  if (!nextRole) {
    return { success: false, message: 'You are the GOAT. No higher roles to claim! 🐐' };
  }
  
  // Update role and career
  const oldRole = currentRole;
  window.state.playerRole = nextRole;
  career.currentRole = nextRole;
  career.seasonsInRole = 0;
  career.promotions.push({
    from: oldRole,
    to: nextRole,
    year: window.state.league?.year || 2025,
    reason: 'Met promotion requirements'
  });
  
  // Add achievement
  career.achievements.push({
    type: 'promotion',
    title: `Promoted to ${COACHING_ROLES[nextRole].name}`,
    year: window.state.league?.year || 2025,
    description: `Successfully promoted from ${COACHING_ROLES[oldRole].name} to ${COACHING_ROLES[nextRole].name}`
  });
  
  return {
    success: true,
    message: `Ayy, you got the promotion! You're the new ${COACHING_ROLES[nextRole].name}! 🍾`,
    newRole: nextRole,
    oldRole: oldRole
  };
}

// ... (updateCoachingPerformance remains the same)
// ... (checkForAchievements remains the same)

/**
 * Update coaching performance metrics after a season
 * @param {Object} stats - Season stats { wins, losses, playoffAppearance, superBowlWin, divisionTitle, championships }
 */
function updateCoachingPerformance(stats = {}) {
  if (!window.state?.coachingCareer) return;

  const career = window.state.coachingCareer;
  const perf = career.performance;

  const wins = stats.wins || 0;
  const losses = stats.losses || 0;
  const games = wins + losses;

  perf.totalWins = (perf.totalWins || 0) + wins;
  perf.totalGames = (perf.totalGames || 0) + games;
  if (perf.totalGames > 0) {
    perf.winPercentage = perf.totalWins / perf.totalGames;
  }

  if (stats.playoffAppearance) perf.playoffAppearances += 1;
  if (stats.superBowlWin) perf.superBowls += 1;
  if (stats.divisionTitle) perf.divisionTitles += 1;
  if (stats.championships) {
    perf.championships = (perf.championships || 0) + stats.championships;
  }

  career.seasonsInRole += 1;
  career.totalSeasons += 1;

  career.achievements.push({
    type: 'season',
    title: `Season ${window.state.league?.year || ''} Recap: ${wins}-${losses}`,
    year: window.state.league?.year,
    description: 'Coaching performance updated'
  });

  renderCoachingRoleInterface();
}

/**
 * Render coaching role interface
 */
function renderCoachingRoleInterface() {
  const role = window.state.playerRole || 'HC';
  const career = window.state.coachingCareer;
  const roleConfig = COACHING_ROLES[role];

  // Create or update coaching role container (simplified location logic)
  let container = document.getElementById('coachingRoleInterface');
  if (!container) {
    container = document.createElement('div');
    container.id = 'coachingRoleInterface';
    container.className = 'coaching-role-interface';
    // Append to the main content area (assuming a common main content ID)
    const mainContent = document.getElementById('mainContent') || document.body;
    mainContent.insertBefore(container, mainContent.firstChild);
  }

  if (!career || !career.currentRole) {
    container.innerHTML = `
      <div class="card coaching-card">
        <h2>Coaching Career</h2>
        <p>Pick a starting role to begin your coaching journey.</p>
        <div class="btn-group">
          <button class="btn btn-primary" onclick="startCoachingCareer('OC')">Start as OC</button>
          <button class="btn btn-secondary" onclick="startCoachingCareer('DC')">Start as DC</button>
        </div>
      </div>
    `;
    return;
  }

  const eligibility = checkPromotionEligibility();
  const nextRoleName = eligibility.nextRole ? COACHING_ROLES[eligibility.nextRole].name : 'N/A';

  const startYear = career.startYear || window.state?.league?.year || new Date().getFullYear();
  const seasonsInRole = career.seasonsInRole || 0;
  const totalSeasons = career.totalSeasons || 0;
  const performance = career.performance || {};

  // Added conditional rendering for achievements and simplified requirements

  container.innerHTML = `
    <div class="card coaching-card">
      <h2>${roleConfig.name} Career 🚀</h2>

      <div class="coaching-info-grid">
        <div class="current-status">
          <h3>Current Status:</h3>
          <p>Role Start Year: ${startYear}</p>
          <p>Seasons in Role: **${seasonsInRole}**</p>
          <p>Total Seasons: **${totalSeasons}**</p>
          <p>Estimated Salary: **$${(roleConfig.salary.min/1000000).toFixed(1)}M - $${(roleConfig.salary.max/1000000).toFixed(1)}M**</p>
        </div>

        <div class="performance-metrics">
          <h3>Performance Stats:</h3>
          <div class="metrics-grid">
            <div class="metric"><span class="label">Win %:</span> <span class="value">${((performance.winPercentage || 0) * 100).toFixed(1)}%</span></div>
            <div class="metric"><span class="label">Playoff Apps:</span> <span class="value">${performance.playoffAppearances || 0}</span></div>
            <div class="metric"><span class="label">Super Bowls:</span> <span class="value">${performance.superBowls || 0}</span></div>
            <div class="metric"><span class="label">Division Titles:</span> <span class="value">${performance.divisionTitles || 0}</span></div>
          </div>
        </div>
      </div>

      <hr>

      <div class="role-responsibilities">
        <h4>**Key Responsibilities:**</h4>
        <ul>
          ${roleConfig.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
        </ul>
      </div>

      <hr>

      ${eligibility.eligible ? `
        <div class="promotion-available">
          <h4>🎉 Promotion Available!</h4>
          <p>You're ready to level up to **${nextRoleName}**!</p>
          <button class="btn btn-primary" onclick="requestPromotion()">**Request Promotion**</button>
        </div>
      ` : `
        <div class="promotion-requirements">
          <h4>Promotion Path to **${nextRoleName}**:</h4>
          <div class="metrics-grid">
            <div class="metric ${eligibility.checks.seasons ? 'met' : 'unmet'}">
              <span class="label">Seasons:</span> 
              <span class="value">${career.seasonsInRole}/${eligibility.requirements.seasons}</span>
            </div>
            <div class="metric ${eligibility.checks.winPercentage ? 'met' : 'unmet'}">
              <span class="label">Win %:</span> 
              <span class="value">${(career.performance.winPercentage * 100).toFixed(1)}% / ${(eligibility.requirements.winPercentage * 100)}%</span>
            </div>
            <div class="metric ${eligibility.checks.playoffAppearances ? 'met' : 'unmet'}">
              <span class="label">Playoff Apps:</span> 
              <span class="value">${career.performance.playoffAppearances}/${eligibility.requirements.playoffAppearances}</span>
            </div>
            ${eligibility.requirements.superBowls ? `
              <div class="metric ${eligibility.checks.superBowls ? 'met' : 'unmet'}">
                <span class="label">Super Bowls:</span> 
                <span class="value">${career.performance.superBowls}/${eligibility.requirements.superBowls}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `}
      
      <hr>
      
      <div class="achievements">
        <h4>Recent Achievements:</h4>
        <div class="achievements-list">
          ${career.achievements.length > 0 ? career.achievements.slice(-5).map(achievement => `
            <div class="achievement">
              <span class="achievement-title">${achievement.title}</span>
              <span class="achievement-year">${achievement.year}</span>
            </div>
          `).join('') : '<p>No big wins yet, get back to work! 💻</p>'}
        </div>
      </div>
    </div>
  `;
}

// ... (window.requestPromotion and showPromotionModal remain similar, using setStatus)

/**
 * Start new coaching career
 * @param {string} role - Starting role ('OC' or 'DC')
 */
window.startCoachingCareer = function(role = 'OC') {
  if (!COACHING_ROLES[role] || role === 'HC' || role === 'GM' || role === 'President') {
    setStatus(`Invalid starting role: ${role}. Must start as OC or DC.`, 'error');
    return;
  }
  
  // Reset coaching career
  window.state.playerRole = role;
  window.state.coachingCareer = {
    currentRole: role,
    startYear: window.state.league?.year || 2025,
    seasonsInRole: 0,
    totalSeasons: 0,
    promotions: [],
    achievements: [],
    performance: {
      winPercentage: 0,
      playoffAppearances: 0,
      superBowls: 0,
      divisionTitles: 0
    }
  };
  
  setStatus(`Started coaching career as **${COACHING_ROLES[role].name}**! Time to make a legacy.`, 'success');
  renderCoachingRoleInterface();
};

// Make functions available globally
window.initializeCoachingRoles = initializeCoachingRoles;
window.canPerformAction = canPerformAction;
window.getAvailableActions = getAvailableActions;
window.checkPromotionEligibility = checkPromotionEligibility;
window.promotePlayer = promotePlayer;
window.updateCoachingPerformance = updateCoachingPerformance;
window.renderCoachingRoleInterface = renderCoachingRoleInterface;
window.startCoachingCareer = startCoachingCareer;

// Final, safer initialization check
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCoachingRoles);
} else {
  initializeCoachingRoles();
}
