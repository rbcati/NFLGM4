// coaching-roles.js - Coaching Role System with OC/DC Promotion Path
'use strict';

/**
 * Coaching Role System
 * Allows players to start as OC/DC and work their way up to Head Coach
 */

// Coaching role constants
const COACHING_ROLES = {
  OC: {
    name: 'Offensive Coordinator',
    permissions: ['sign_offensive_players', 'view_offensive_stats', 'coordinate_offense'],
    promotionRequirement: { seasons: 2, winPercentage: 0.6, playoffAppearances: 1 },
    salary: { min: 500000, max: 2000000 },
    responsibilities: ['Offensive playcalling', 'QB development', 'Offensive player evaluation']
  },
  DC: {
    name: 'Defensive Coordinator', 
    permissions: ['sign_defensive_players', 'view_defensive_stats', 'coordinate_defense'],
    promotionRequirement: { seasons: 2, winPercentage: 0.6, playoffAppearances: 1 },
    salary: { min: 500000, max: 2000000 },
    responsibilities: ['Defensive playcalling', 'Defensive player development', 'Defensive player evaluation']
  },
  HC: {
    name: 'Head Coach',
    permissions: ['sign_all_players', 'view_all_stats', 'manage_staff', 'make_trades', 'draft_management'],
    promotionRequirement: { seasons: 3, winPercentage: 0.65, playoffAppearances: 2, superBowls: 1 },
    salary: { min: 2000000, max: 10000000 },
    responsibilities: ['Team management', 'Staff coordination', 'Strategic decisions', 'Media relations']
  }
};

/**
 * Initialize coaching role system
 */
function initializeCoachingRoles() {
  // Add coaching role to state if not exists
  if (!window.state.playerRole) {
    window.state.playerRole = 'HC'; // Default to Head Coach
  }
  
  // Add coaching career tracking
  if (!window.state.coachingCareer) {
    window.state.coachingCareer = {
      currentRole: window.state.playerRole,
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
  }
  
  console.log('Coaching roles system initialized');
}

/**
 * Check if player can perform an action based on their role
 * @param {string} action - Action to check
 * @returns {boolean} Whether player can perform action
 */
function canPerformAction(action) {
  const role = window.state.playerRole;
  const roleConfig = COACHING_ROLES[role];
  
  if (!roleConfig) return false;
  
  return roleConfig.permissions.includes(action);
}

/**
 * Get available actions for current role
 * @returns {Array} Array of available actions
 */
function getAvailableActions() {
  const role = window.state.playerRole;
  const roleConfig = COACHING_ROLES[role];
  
  return roleConfig ? roleConfig.permissions : [];
}

/**
 * Check if player is eligible for promotion
 * @returns {Object} Promotion eligibility status
 */
function checkPromotionEligibility() {
  const career = window.state.coachingCareer;
  const currentRole = career.currentRole;
  const roleConfig = COACHING_ROLES[currentRole];
  
  if (!roleConfig || !roleConfig.promotionRequirement) {
    return { eligible: false, reason: 'No promotion available for current role' };
  }
  
  const requirements = roleConfig.promotionRequirement;
  const performance = career.performance;
  
  const checks = {
    seasons: career.seasonsInRole >= requirements.seasons,
    winPercentage: performance.winPercentage >= requirements.winPercentage,
    playoffAppearances: performance.playoffAppearances >= requirements.playoffAppearances,
    superBowls: performance.superBowls >= (requirements.superBowls || 0)
  };
  
  const eligible = Object.values(checks).every(check => check);
  
  return {
    eligible,
    checks,
    requirements,
    currentPerformance: performance
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
      message: 'Not eligible for promotion yet',
      requirements: eligibility.requirements,
      currentPerformance: eligibility.currentPerformance
    };
  }
  
  const career = window.state.coachingCareer;
  const currentRole = career.currentRole;
  
  // Determine next role
  let nextRole;
  if (currentRole === 'OC' || currentRole === 'DC') {
    nextRole = 'HC';
  } else {
    return {
      success: false,
      message: 'Already at highest role'
    };
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
    message: `Congratulations! You've been promoted to ${COACHING_ROLES[nextRole].name}`,
    newRole: nextRole,
    oldRole: oldRole
  };
}

/**
 * Update coaching performance after season
 * @param {Object} team - Team object
 * @param {Object} seasonStats - Season statistics
 */
function updateCoachingPerformance(team, seasonStats) {
  const career = window.state.coachingCareer;
  
  // Update season count
  career.seasonsInRole++;
  career.totalSeasons++;
  
  // Update performance metrics
  const wins = seasonStats.wins || 0;
  const losses = seasonStats.losses || 0;
  const ties = seasonStats.ties || 0;
  const totalGames = wins + losses + ties;
  
  if (totalGames > 0) {
    career.performance.winPercentage = (wins + ties * 0.5) / totalGames;
  }
  
  // Update playoff appearances
  if (seasonStats.playoffAppearance) {
    career.performance.playoffAppearances++;
  }
  
  // Update championships
  if (seasonStats.superBowl) {
    career.performance.superBowls++;
  }
  
  // Update division titles
  if (seasonStats.divisionTitle) {
    career.performance.divisionTitles++;
  }
  
  // Check for achievements
  checkForAchievements(seasonStats);
}

/**
 * Check for coaching achievements
 * @param {Object} seasonStats - Season statistics
 */
function checkForAchievements(seasonStats) {
  const career = window.state.coachingCareer;
  const achievements = career.achievements;
  
  // First winning season
  if (seasonStats.wins > seasonStats.losses && !achievements.find(a => a.type === 'first_winning_season')) {
    achievements.push({
      type: 'first_winning_season',
      title: 'First Winning Season',
      year: window.state.league?.year || 2025,
      description: `Achieved first winning season with ${seasonStats.wins}-${seasonStats.losses} record`
    });
  }
  
  // First playoff appearance
  if (seasonStats.playoffAppearance && !achievements.find(a => a.type === 'first_playoff')) {
    achievements.push({
      type: 'first_playoff',
      title: 'First Playoff Appearance',
      year: window.state.league?.year || 2025,
      description: 'Led team to first playoff appearance'
    });
  }
  
  // First Super Bowl
  if (seasonStats.superBowl && !achievements.find(a => a.type === 'first_superbowl')) {
    achievements.push({
      type: 'first_superbowl',
      title: 'Super Bowl Champion',
      year: window.state.league?.year || 2025,
      description: 'Won first Super Bowl championship'
    });
  }
  
  // Perfect season
  if (seasonStats.wins === 16 && seasonStats.losses === 0) {
    achievements.push({
      type: 'perfect_season',
      title: 'Perfect Season',
      year: window.state.league?.year || 2025,
      description: 'Achieved perfect 16-0 regular season'
    });
  }
}

/**
 * Render coaching role interface
 */
function renderCoachingRoleInterface() {
  const role = window.state.playerRole;
  const career = window.state.coachingCareer;
  const roleConfig = COACHING_ROLES[role];
  
  // Create or update coaching role container
  let container = document.getElementById('coachingRoleInterface');
  if (!container) {
    container = document.createElement('div');
    container.id = 'coachingRoleInterface';
    container.className = 'coaching-role-interface';
    
    // Insert after hub content
    const hubContent = document.querySelector('#hub .card');
    if (hubContent) {
      hubContent.parentNode.insertBefore(container, hubContent.nextSibling);
    }
  }
  
  const eligibility = checkPromotionEligibility();
  
  container.innerHTML = `
    <div class="card">
      <h2>Coaching Career</h2>
      
      <div class="coaching-role-info">
        <div class="current-role">
          <h3>Current Role: ${roleConfig.name}</h3>
          <p>Seasons in Role: ${career.seasonsInRole}</p>
          <p>Total Seasons: ${career.totalSeasons}</p>
        </div>
        
        <div class="role-responsibilities">
          <h4>Responsibilities:</h4>
          <ul>
            ${roleConfig.responsibilities.map(resp => `<li>${resp}</li>`).join('')}
          </ul>
        </div>
        
        <div class="performance-metrics">
          <h4>Performance:</h4>
          <div class="metrics-grid">
            <div class="metric">
              <span class="label">Win %:</span>
              <span class="value">${(career.performance.winPercentage * 100).toFixed(1)}%</span>
            </div>
            <div class="metric">
              <span class="label">Playoff Apps:</span>
              <span class="value">${career.performance.playoffAppearances}</span>
            </div>
            <div class="metric">
              <span class="label">Super Bowls:</span>
              <span class="value">${career.performance.superBowls}</span>
            </div>
            <div class="metric">
              <span class="label">Division Titles:</span>
              <span class="value">${career.performance.divisionTitles}</span>
            </div>
          </div>
        </div>
        
        ${eligibility.eligible ? `
          <div class="promotion-available">
            <h4>🎉 Promotion Available!</h4>
            <p>You're eligible for promotion to ${role === 'OC' || role === 'DC' ? 'Head Coach' : 'Next Level'}!</p>
            <button class="btn btn-primary" onclick="requestPromotion()">Request Promotion</button>
          </div>
        ` : `
          <div class="promotion-requirements">
            <h4>Promotion Requirements:</h4>
            <ul>
              <li class="${eligibility.checks.seasons ? 'met' : 'unmet'}">
                Seasons: ${career.seasonsInRole}/${eligibility.requirements.seasons}
              </li>
              <li class="${eligibility.checks.winPercentage ? 'met' : 'unmet'}">
                Win %: ${(career.performance.winPercentage * 100).toFixed(1)}%/${(eligibility.requirements.winPercentage * 100)}%
              </li>
              <li class="${eligibility.checks.playoffAppearances ? 'met' : 'unmet'}">
                Playoff Apps: ${career.performance.playoffAppearances}/${eligibility.requirements.playoffAppearances}
              </li>
              ${eligibility.requirements.superBowls ? `
                <li class="${eligibility.checks.superBowls ? 'met' : 'unmet'}">
                  Super Bowls: ${career.performance.superBowls}/${eligibility.requirements.superBowls}
                </li>
              ` : ''}
            </ul>
          </div>
        `}
        
        <div class="achievements">
          <h4>Recent Achievements:</h4>
          <div class="achievements-list">
            ${career.achievements.slice(-5).map(achievement => `
              <div class="achievement">
                <span class="achievement-title">${achievement.title}</span>
                <span class="achievement-year">${achievement.year}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Request promotion (called from UI)
 */
window.requestPromotion = function() {
  const result = promotePlayer();
  
  if (result.success) {
    window.setStatus(result.message, 'success');
    renderCoachingRoleInterface();
    
    // Show promotion modal
    showPromotionModal(result);
  } else {
    window.setStatus(result.message, 'error');
  }
};

/**
 * Show promotion celebration modal
 * @param {Object} promotionResult - Promotion result
 */
function showPromotionModal(promotionResult) {
  const modal = document.createElement('div');
  modal.className = 'modal promotion-modal';
  modal.innerHTML = `
    <div class="modal-content promotion-content">
      <h2>🎉 Congratulations!</h2>
      <p>You've been promoted from ${COACHING_ROLES[promotionResult.oldRole].name} to ${COACHING_ROLES[promotionResult.newRole].name}!</p>
      
      <div class="promotion-benefits">
        <h3>New Responsibilities:</h3>
        <ul>
          ${COACHING_ROLES[promotionResult.newRole].responsibilities.map(resp => `<li>${resp}</li>`).join('')}
        </ul>
      </div>
      
      <button class="btn btn-primary" onclick="this.closest('.modal').remove()">Continue</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'block';
}

/**
 * Start new coaching career
 * @param {string} role - Starting role ('OC' or 'DC')
 */
window.startCoachingCareer = function(role = 'OC') {
  if (!COACHING_ROLES[role]) {
    console.error('Invalid coaching role:', role);
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
  
  window.setStatus(`Started coaching career as ${COACHING_ROLES[role].name}`, 'success');
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

// Initialize on load
if (window.state) {
  initializeCoachingRoles();
} else {
  window.addEventListener('load', initializeCoachingRoles);
}
