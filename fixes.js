// fixes.js - Combined Fix Files
// This file combines: error-overlay.js, missing-functions.js, league-creation-fix.js, 
// team-selection-fix.js, navbar-fix.js, and dom-helpers-fix.js

'use strict';

// ============================================================================
// ERROR OVERLAY (from error-overlay.js)
// ============================================================================

(function() {
  'use strict';

  const overlay = document.createElement('div');
  overlay.id = 'errorOverlay';
  overlay.className = 'error-overlay hidden';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'assertive');

  const template = `
    <div class="error-panel">
      <div class="error-header">
        <div>
          <div class="error-title">Something went wrong</div>
          <div class="error-subtitle">This pop-up is only visible to testers. Screenshot it for developers.</div>
        </div>
        <div class="error-actions">
          <button type="button" class="btn" id="errorCopy">Copy details</button>
          <button type="button" class="btn" id="errorClose">Close</button>
        </div>
      </div>
      <div class="error-body">
        <div class="error-meta">
          <div><span class="label">Time:</span> <span id="errorTime"></span></div>
          <div><span class="label">Page:</span> <span id="errorRoute"></span></div>
          <div><span class="label">Last action:</span> <span id="errorAction">Unknown</span></div>
        </div>
        <div class="error-section">
          <div class="label">Message</div>
          <div id="errorMessage" class="error-message"></div>
        </div>
        <div class="error-section">
          <div class="label">Stack Trace</div>
          <pre id="errorStack" class="error-stack"></pre>
        </div>
        <div class="error-section muted small">If a button stopped working, include this pop-up in your screenshot so developers can see the console error.</div>
      </div>
    </div>
  `;

  overlay.innerHTML = template;
  document.body.appendChild(overlay);

  const stackEl = overlay.querySelector('#errorStack');
  const messageEl = overlay.querySelector('#errorMessage');
  const timeEl = overlay.querySelector('#errorTime');
  const routeEl = overlay.querySelector('#errorRoute');
  const actionEl = overlay.querySelector('#errorAction');
  const closeBtn = overlay.querySelector('#errorClose');
  const copyBtn = overlay.querySelector('#errorCopy');

  let lastAction = 'None recorded yet';

  document.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (button) {
      const label = button.innerText?.trim() || button.ariaLabel || button.id || 'Unnamed button';
      lastAction = `Clicked: ${label}`;
    }
  }, { capture: true });

  function formatError(details) {
    const now = new Date();
    const stack = (details.stack || '').toString().trim();
    stackEl.textContent = stack || 'No stack trace available';
    messageEl.textContent = details.message || 'Unknown error';
    timeEl.textContent = now.toLocaleString();
    routeEl.textContent = window.location.hash || '/';
    actionEl.textContent = lastAction;
  }

  function copyErrorDetails() {
    const content = [
      `Message: ${messageEl.textContent}`,
      `Route: ${routeEl.textContent}`,
      `Last action: ${actionEl.textContent}`,
      `Time: ${timeEl.textContent}`,
      'Stack:',
      stackEl.textContent
    ].join('\n');

    navigator.clipboard?.writeText(content).then(() => {
      copyBtn.textContent = 'Copied!';
      setTimeout(() => { copyBtn.textContent = 'Copy details'; }, 1200);
    }).catch(() => {
      copyBtn.textContent = 'Copy failed';
      setTimeout(() => { copyBtn.textContent = 'Copy details'; }, 1200);
    });
  }

  function showOverlay(details) {
    formatError(details);
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  closeBtn.addEventListener('click', hideOverlay);
  copyBtn.addEventListener('click', copyErrorDetails);

  window.addEventListener('error', (event) => {
    const info = {
      message: event?.message,
      stack: event?.error?.stack || `${event.filename || ''}:${event.lineno || ''}`
    };
    showOverlay(info);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason || {};
    const info = {
      message: reason.message || 'Unhandled promise rejection',
      stack: reason.stack || JSON.stringify(reason, null, 2)
    };
    showOverlay(info);
  });

  window.showTesterError = showOverlay;
})();

// ============================================================================
// MISSING FUNCTIONS (from missing-functions.js)
// ============================================================================

// === SALARY CAP FUNCTIONS ===

/**
 * Checks if a player can be restructured
 * @param {Object} player - The player object
 * @returns {boolean} Whether the player can be restructured
 */
function canRestructure(player) {
  if (!player) return false;
  
  const C = window.Constants;
  
  // Can't restructure if:
  // - Player has no years left on contract
  // - Player has less than 2 years remaining
  // - Player's guaranteed percentage is already very high
  // - Player is injured for extended period
  
  return player.years >= 2 && 
         (player.guaranteedPct || 0) < 0.8 && 
         (player.injuryWeeks || 0) <= C.TRAINING.MAX_RATING_IMPROVEMENT &&
         player.baseAnnual > 1.0; // Must be making decent money to restructure
}

/**
 * Restructures a player's contract to create immediate cap space
 * @param {Object} league - The league object
 * @param {Object} team - The team object  
 * @param {Object} player - The player to restructure
 * @param {number} amount - Amount to convert to signing bonus (millions)
 */
function restructureContract(league, team, player, amount = null) {
  if (!canRestructure(player)) {
    throw new Error('Player cannot be restructured');
  }
  
  const C = window.Constants;
  
  // Default to restructuring half of remaining base salary
  const maxAmount = player.baseAnnual * 0.5;
  const restructureAmount = amount || maxAmount;
  
  // Convert base salary to prorated signing bonus
  player.baseAnnual = Math.max(0.5, player.baseAnnual - restructureAmount);
  player.signingBonus += restructureAmount;
  player.yearsTotal = Math.max(player.yearsTotal, player.years); // Ensure consistency
  player.guaranteedPct = Math.min(0.9, (player.guaranteedPct || 0.5) + 0.1);
  
  // Recalculate cap impact
  if (window.recalcCap) {
    window.recalcCap(league, team);
  }
  
  return {
    player: player.name,
    amountRestructured: restructureAmount,
    newCapHit: window.capHitFor ? window.capHitFor(player, 0) : 0
  };
}

// === PLAYER GENERATION FUNCTIONS ===

/**
 * Generates a complete player with all ratings and attributes
 * @param {string} pos - Position (QB, RB, etc.)
 * @param {Object} overrides - Optional overrides for specific attributes
 * @returns {Object} Complete player object
 */
function makePlayer(pos, overrides = {}) {
  const U = window.Utils;
  const C = window.Constants;
  
  if (!U || !C) {
    throw new Error('Utils and Constants must be loaded');
  }

  // Generate detailed ratings based on position
  const ratings = generatePlayerRatings(pos);
  
  // Calculate overall rating
  const ovr = calculateOvr(pos, ratings);
  
  // Generate contract details
  const contractDetails = generateContract(ovr, pos);
  
  const player = {
    id: U.id(),
    name: generatePlayerName(),
    pos: pos,
    age: overrides.age || U.rand(C.PLAYER_CONFIG.MIN_AGE, C.PLAYER_CONFIG.MAX_AGE),
    ratings: ratings,
    ovr: ovr,
    years: contractDetails.years,
    yearsTotal: contractDetails.years,
    baseAnnual: contractDetails.baseAnnual,
    signingBonus: contractDetails.signingBonus,
    guaranteedPct: contractDetails.guaranteedPct,
    injuryWeeks: 0,
    fatigue: 0,
    abilities: [],
    stats: { 
      game: {}, 
      season: {}, 
      career: {} 
    },
    history: [],
    awards: [],
    ...overrides
  };

  // Add position-specific abilities
  tagAbilities(player);
  
  return player;
}

/**
 * Generates ratings for a player based on position
 * @param {string} pos - Player position
 * @returns {Object} Ratings object
 */
function generatePlayerRatings(pos) {
  const U = window.Utils;
  
  const baseRatings = {
    throwPower: U.rand(50, 99),
    throwAccuracy: U.rand(50, 99),
    awareness: U.rand(40, 99),
    catching: U.rand(40, 99),
    catchInTraffic: U.rand(40, 99),
    acceleration: U.rand(60, 99),
    speed: U.rand(60, 99),
    agility: U.rand(60, 99),
    trucking: U.rand(40, 99),
    juking: U.rand(40, 99),
    passRushSpeed: U.rand(40, 99),
    passRushPower: U.rand(40, 99),
    runStop: U.rand(40, 99),
    coverage: U.rand(40, 99),
    runBlock: U.rand(50, 99),
    passBlock: U.rand(50, 99),
    intelligence: U.rand(40, 99),
    kickPower: U.rand(60, 99),
    kickAccuracy: U.rand(60, 99),
    height: U.rand(68, 80), // inches
    weight: U.rand(180, 320) // pounds
  };

  // Position-specific adjustments
  const positionAdjustments = {
    QB: {
      speed: [50, 90], strength: [60, 85], 
      throwPower: [65, 99], throwAccuracy: [55, 99]
    },
    RB: {
      speed: [70, 99], acceleration: [70, 99],
      trucking: [60, 99], juking: [50, 99]
    },
    WR: {
      speed: [75, 99], acceleration: [70, 99],
      catching: [65, 99], catchInTraffic: [55, 99]
    },
    TE: {
      catching: [55, 95], runBlock: [60, 95],
      passBlock: [55, 90], speed: [45, 85]
    },
    OL: {
      speed: [40, 65], runBlock: [70, 99],
      passBlock: [70, 99], weight: [290, 350]
    },
    DL: {
      passRushPower: [60, 99], passRushSpeed: [55, 99],
      runStop: [65, 99], weight: [250, 320]
    },
    LB: {
      speed: [60, 95], runStop: [60, 95],
      coverage: [45, 90], awareness: [55, 95]
    },
    CB: {
      speed: [75, 99], acceleration: [75, 99],
      coverage: [60, 99], intelligence: [50, 95]
    },
    S: {
      speed: [65, 95], coverage: [55, 95],
      runStop: [50, 90], awareness: [60, 95]
    },
    K: {
      kickPower: [70, 99], kickAccuracy: [60, 99],
      speed: [40, 70]
    },
    P: {
      kickPower: [65, 99], kickAccuracy: [60, 99],
      speed: [40, 70]
    }
  };

  const adjustments = positionAdjustments[pos] || {};
  
  // Apply position-specific ranges
  Object.keys(adjustments).forEach(stat => {
    const [min, max] = adjustments[stat];
    baseRatings[stat] = U.rand(min, max);
  });

  return baseRatings;
}

/**
 * Calculates overall rating based on position and ratings
 * @param {string} pos - Player position
 * @param {Object} ratings - Player ratings
 * @returns {number} Overall rating (40-99)
 */
function calculateOvr(pos, ratings) {
  const C = window.Constants;
  const U = window.Utils;
  
  const weights = C.OVR_WEIGHTS[pos];
  if (!weights) return U.rand(50, 75); // Fallback for unknown positions

  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const stat in weights) {
    const weight = weights[stat];
    const rating = ratings[stat] || 50;
    weightedSum += rating * weight;
    totalWeight += weight;
  }
  
  const rawOvr = totalWeight > 0 ? weightedSum / totalWeight : 50;
  return U.clamp(Math.round(rawOvr), C.PLAYER_CONFIG.MIN_OVR, C.PLAYER_CONFIG.MAX_OVR);
}

/**
 * Generates contract details based on player overall rating and position
 * @param {number} ovr - Player overall rating
 * @param {string} pos - Player position  
 * @returns {Object} Contract details
 */
function generateContract(ovr, pos) {
  const U = window.Utils;
  const C = window.Constants;
  
  // Base salary calculation using constants instead of magic numbers - realistic scale
  const positionMultiplier = C.POSITION_VALUES[pos] || 1.0;
  const baseAnnual = Math.round((0.15 * ovr * positionMultiplier) * 10) / 10;
  
  const years = U.rand(1, 4);
  const bonusPercent = C.SALARY_CAP.SIGNING_BONUS_MIN + 
                      Math.random() * (C.SALARY_CAP.SIGNING_BONUS_MAX - C.SALARY_CAP.SIGNING_BONUS_MIN);
  
  return {
    years,
    baseAnnual,
    signingBonus: Math.round((baseAnnual * years * bonusPercent) * 10) / 10,
    guaranteedPct: C.SALARY_CAP.GUARANTEED_PCT_DEFAULT
  };
}

/**
 * Generates a random player name
 * @returns {string} Full player name
 */
function generatePlayerName() {
  const U = window.Utils;
  // Use expanded names for maximum variety (1,000,000+ combinations)
  const firstName = U.choice(window.EXPANDED_FIRST_NAMES || window.FIRST_NAMES || ['John', 'Mike', 'James', 'David']);
  const lastName = U.choice(window.EXPANDED_LAST_NAMES || window.LAST_NAMES || ['Smith', 'Johnson', 'Williams', 'Brown']);
  return `${firstName} ${lastName}`;
}

/**
 * Tags abilities for a player based on their ratings
 * @param {Object} player - The player object to tag abilities for
 */
function tagAbilities(player) {
  if (!player || !player.ratings) return;
  
  player.abilities = []; // Reset abilities
  const r = player.ratings;
  const C = window.Constants;
  
  const abilityThresholds = {
    // Elite thresholds
    ELITE: 95,
    VERY_GOOD: 88,
    GOOD: 82
  };
  
  // QB Abilities
  if (player.pos === 'QB') {
    if (r.throwPower >= abilityThresholds.ELITE) player.abilities.push('Cannon Arm');
    if (r.throwAccuracy >= abilityThresholds.ELITE) player.abilities.push('Deadeye');
    if (r.speed >= abilityThresholds.VERY_GOOD) player.abilities.push('Escape Artist');
    if (r.awareness >= abilityThresholds.VERY_GOOD && r.intelligence >= abilityThresholds.VERY_GOOD) {
      player.abilities.push('Field General');
    }
  }
  
  // RB Abilities
  if (player.pos === 'RB') {
    if (r.trucking >= abilityThresholds.ELITE) player.abilities.push('Bruiser');
    if (r.juking >= abilityThresholds.ELITE) player.abilities.push('Ankle Breaker');
    if (r.catching >= abilityThresholds.VERY_GOOD) player.abilities.push('Mismatch Nightmare');
    if (r.speed >= abilityThresholds.ELITE) player.abilities.push('Breakaway Speed');
  }
  
  // WR/TE Abilities
  if (player.pos === 'WR' || player.pos === 'TE') {
    if (r.speed >= abilityThresholds.ELITE) player.abilities.push('Deep Threat');
    if (r.catchInTraffic >= abilityThresholds.ELITE) player.abilities.push('Possession Specialist');
    if (r.catching >= abilityThresholds.ELITE) player.abilities.push('Sure Hands');
    if (r.acceleration >= abilityThresholds.VERY_GOOD && r.agility >= abilityThresholds.VERY_GOOD) {
      player.abilities.push('Route Runner');
    }
  }
  
  // Offensive Line Abilities
  if (player.pos === 'OL') {
    if (r.passBlock >= abilityThresholds.ELITE) player.abilities.push('Pass Pro Specialist');
    if (r.runBlock >= abilityThresholds.ELITE) player.abilities.push('Road Grader');
    if (r.awareness >= abilityThresholds.VERY_GOOD) player.abilities.push('Line Leader');
  }
  
  // Defensive Line Abilities
  if (player.pos === 'DL') {
    if (r.passRushPower >= abilityThresholds.ELITE) player.abilities.push('Bull Rush');
    if (r.passRushSpeed >= abilityThresholds.ELITE) player.abilities.push('Edge Threat');
    if (r.runStop >= abilityThresholds.ELITE) player.abilities.push('Run Stopper');
  }
  
  // Linebacker Abilities
  if (player.pos === 'LB') {
    if (r.coverage >= abilityThresholds.VERY_GOOD && r.speed >= abilityThresholds.GOOD) {
      player.abilities.push('Coverage Specialist');
    }
    if (r.runStop >= abilityThresholds.VERY_GOOD) player.abilities.push('Run Defender');
    if (r.passRushSpeed >= abilityThresholds.VERY_GOOD) player.abilities.push('Pass Rush Moves');
  }
  
  // Defensive Back Abilities
  if (player.pos === 'CB' || player.pos === 'S') {
    if (r.coverage >= abilityThresholds.ELITE && r.intelligence >= abilityThresholds.VERY_GOOD) {
      player.abilities.push('Shutdown Corner');
    }
    if (r.speed >= abilityThresholds.ELITE) player.abilities.push('Lock Down Speed');
    if (r.runStop >= abilityThresholds.VERY_GOOD) player.abilities.push('Enforcer');
    if (r.awareness >= abilityThresholds.ELITE) player.abilities.push('Ball Hawk');
  }
  
  // Kicker/Punter Abilities
  if (player.pos === 'K' || player.pos === 'P') {
    if (r.kickAccuracy >= abilityThresholds.ELITE) player.abilities.push('Clutch Kicker');
    if (r.kickPower >= abilityThresholds.ELITE) player.abilities.push('Big Leg');
  }
  
  // Universal abilities based on multiple stats
  const avgRating = Object.values(r).reduce((sum, val) => sum + (val || 0), 0) / Object.keys(r).length;
  if (avgRating >= 90) player.abilities.push('Superstar');
  else if (avgRating >= 85) player.abilities.push('Star Player');
  
  // Age-based abilities
  if (player.age >= 30 && r.awareness >= abilityThresholds.VERY_GOOD) {
    player.abilities.push('Veteran Leadership');
  }
}

// === TEAM MANAGEMENT FUNCTIONS ===

/**
 * Releases selected players and handles cap implications
 * @param {Array} selectedIds - Array of player IDs to release
 */
function releaseSelected(selectedIds) {
  if (!selectedIds || selectedIds.length === 0) {
    window.setStatus('No players selected for release.');
    return;
  }
  
  const L = window.state?.league;
  const team = window.currentTeam();
  if (!L || !team) return;
  
  let releasedCount = 0;
  
  selectedIds.forEach(playerId => {
    const playerIndex = team.roster.findIndex(p => p.id === playerId);
    if (playerIndex >= 0) {
      const player = team.roster[playerIndex];
      
      // Handle cap implications (simplified - could ask user about June 1st designation)
      if (window.releaseWithProration) {
        window.releaseWithProration(L, team, player, false);
        releasedCount++;
      } else {
        // Fallback - just remove player
        team.roster.splice(playerIndex, 1);
        releasedCount++;
      }
    }
  });
  
  // Recalculate cap
  if (window.recalcCap) {
    window.recalcCap(L, team);
  }
  
  // Update team ratings after roster change
  if (window.updateTeamRatings) {
    window.updateTeamRatings(team);
  }
  
  // Refresh UI
  if (window.renderRoster) window.renderRoster();
  if (window.updateCapSidebar) window.updateCapSidebar();
  
  window.setStatus(`Released ${releasedCount} player(s).`);
}

// === UTILITY FUNCTIONS ===

/**
 * Validates player data for consistency
 * @param {Object} player - Player object to validate
 * @returns {Array} Array of validation errors
 */
function validatePlayer(player) {
  const errors = [];
  const C = window.Constants;
  
  if (!player) {
    errors.push('Player object is null or undefined');
    return errors;
  }
  
  // Required fields
  const requiredFields = ['id', 'name', 'pos', 'age', 'ovr'];
  requiredFields.forEach(field => {
    if (player[field] === undefined || player[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Value ranges
  if (player.age < C.PLAYER_CONFIG.MIN_AGE || player.age > 45) {
    errors.push(`Invalid age: ${player.age}`);
  }
  
  if (player.ovr < C.PLAYER_CONFIG.MIN_OVR || player.ovr > C.PLAYER_CONFIG.MAX_OVR) {
    errors.push(`Invalid overall rating: ${player.ovr}`);
  }
  
  if (!C.POSITIONS.includes(player.pos)) {
    errors.push(`Invalid position: ${player.pos}`);
  }
  
  return errors;
}

/**
 * Gets positional needs for a team (for smarter AI decisions)
 * @param {Object} team - Team object
 * @returns {Object} Object with positional needs analysis
 */
function getPositionalNeeds(team) {
  if (!team || !team.roster) return {};
  
  const C = window.Constants;
  const byPos = {};
  
  // Initialize position groups
  C.POSITIONS.forEach(pos => { byPos[pos] = []; });
  
  // Group players by position
  team.roster.forEach(p => {
    if (byPos[p.pos]) {
      byPos[p.pos].push(p);
    }
  });
  
  // Sort by overall rating
  Object.keys(byPos).forEach(pos => {
    byPos[pos].sort((a, b) => b.ovr - a.ovr);
  });
  
  const needs = {};
  
  // Analyze each position
  Object.keys(C.DEPTH_NEEDS).forEach(pos => {
    const targetCount = C.DEPTH_NEEDS[pos];
    const currentPlayers = byPos[pos];
    
    const countGap = Math.max(0, targetCount - currentPlayers.length);
    const qualityGap = currentPlayers.length > 0 ? 
      Math.max(0, 82 - currentPlayers[0].ovr) : 20;
    
    needs[pos] = {
      countGap,
      qualityGap,
      score: (countGap * 15) + (qualityGap * 0.5),
      currentStarter: currentPlayers[0] || null,
      depth: currentPlayers.length
    };
  });
  
  return needs;
}

// Make missing functions globally available
window.canRestructure = canRestructure;
window.restructureContract = restructureContract;
window.makePlayer = makePlayer;
window.generatePlayerRatings = generatePlayerRatings;
window.calculateOvr = calculateOvr;
window.generateContract = generateContract;
window.generatePlayerName = generatePlayerName;
window.tagAbilities = tagAbilities;
window.releaseSelected = releaseSelected;
window.validatePlayer = validatePlayer;
window.getPositionalNeeds = getPositionalNeeds;

// ============================================================================
// LEAGUE CREATION FIX (from league-creation-fix.js)
// ============================================================================

// Placeholder for league creation fixes. This file is included to maintain script ordering
// for downstream patches like team-selection-fix.js. No runtime changes are applied here yet.
console.log('[LeagueCreationFix] Loaded');

// ============================================================================
// TEAM SELECTION FIX (from team-selection-fix.js)
// ============================================================================

(function() {
    const logPrefix = '[TeamSelectionFix]';

    const log = (...args) => console.log(logPrefix, ...args);
    const warn = (...args) => console.warn(logPrefix, ...args);

    function getCanonicalTeams(mode) {
        if (typeof window.listByMode !== 'function') {
            warn('listByMode is not available; cannot normalize teams.');
            return [];
        }
        const teams = window.listByMode(mode);
        if (!Array.isArray(teams)) {
            warn('listByMode returned a non-array value.');
            return [];
        }
        return teams;
    }

    function buildLookup(teams) {
        const lookup = new Map();
        teams.forEach((team, index) => {
            if (team?.abbr) lookup.set(team.abbr, index);
            if (team?.name) lookup.set(team.name, index);
        });
        return lookup;
    }

    function normalizeTeamsOrder(inputTeams, lookup) {
        if (!Array.isArray(inputTeams)) {
            warn('normalizeTeamsOrder received invalid teams array.');
            return [];
        }

        const normalized = inputTeams.map((team, originalIndex) => {
            const canonicalIndex = lookup.get(team?.abbr) ?? lookup.get(team?.name);
            return {
                team: { ...team },
                canonicalIndex: typeof canonicalIndex === 'number' ? canonicalIndex : Number.MAX_SAFE_INTEGER,
                originalIndex
            };
        });

        normalized.sort((a, b) => {
            if (a.canonicalIndex === b.canonicalIndex) return a.originalIndex - b.originalIndex;
            return a.canonicalIndex - b.canonicalIndex;
        });

        return normalized.map(({ team }) => team);
    }

    function verifyTeamAssignment() {
        const namesMode = window.state?.namesMode || 'fictional';
        const canonicalTeams = getCanonicalTeams(namesMode);
        const league = window.state?.league;
        const userTeamId = window.state?.userTeamId;
        const selectedTeam = canonicalTeams?.[userTeamId];
        const leagueTeam = league?.teams?.[userTeamId];
        const match = Boolean(
            selectedTeam &&
            leagueTeam &&
            leagueTeam.id === userTeamId &&
            leagueTeam.abbr === selectedTeam.abbr &&
            leagueTeam.name === selectedTeam.name
        );

        const payload = {
            userTeamId,
            teamId: leagueTeam?.id,
            abbr: leagueTeam?.abbr,
            name: leagueTeam?.name,
            expectedAbbr: selectedTeam?.abbr,
            expectedName: selectedTeam?.name,
            match
        };

        console.log('✅ Team assignment verified:', payload);
        return payload;
    }

    // Wait for makeLeague to be available
    function applyTeamSelectionFix() {
        const originalMakeLeague = window.makeLeague;
        if (typeof originalMakeLeague !== 'function') {
            // Try again after a short delay
            setTimeout(applyTeamSelectionFix, 100);
            return;
        }
        
        // Apply the fix
        applyFixToMakeLeague(originalMakeLeague);
    }
    
    function applyFixToMakeLeague(originalMakeLeague) {
        window.makeLeague = function patchedMakeLeague(teams, options = {}) {
        const namesMode = window.state?.namesMode || 'fictional';
        const canonicalTeams = getCanonicalTeams(namesMode);
        const lookup = buildLookup(canonicalTeams);

        // Save the selected team's identity BEFORE reordering
        let selectedTeamIdentity = null;
        const originalUserTeamId = window.state?.userTeamId;
        if (typeof originalUserTeamId === 'number' && teams[originalUserTeamId]) {
            const originalTeam = teams[originalUserTeamId];
            selectedTeamIdentity = {
                abbr: originalTeam.abbr,
                name: originalTeam.name,
                originalIndex: originalUserTeamId
            };
            log(`Selected team BEFORE league creation: ${originalTeam.name} (index ${originalUserTeamId})`);
        }

        const orderedTeams = normalizeTeamsOrder(Array.isArray(teams) ? teams.slice() : [], lookup);
        if (orderedTeams.length === 0) {
            warn('No teams provided to makeLeague; falling back to original input.');
        }

        const league = originalMakeLeague(orderedTeams.length ? orderedTeams : teams, options);

        if (league?.teams?.length) {
            league.teams.forEach((team, index) => {
                if (team.id !== index) {
                    warn(`Realigning team id from ${team.id} to ${index} for ${team.name || 'Unknown Team'}`);
                    team.id = index;
                }
            });

            // Fix userTeamId: find the selected team's new index after reordering
            if (selectedTeamIdentity && window.state) {
                const newIndex = league.teams.findIndex(team => 
                    (team.abbr === selectedTeamIdentity.abbr && team.name === selectedTeamIdentity.name) ||
                    (team.abbr && selectedTeamIdentity.abbr && team.abbr === selectedTeamIdentity.abbr) ||
                    (team.name && selectedTeamIdentity.name && team.name === selectedTeamIdentity.name)
                );
                
                if (newIndex !== -1 && newIndex !== originalUserTeamId) {
                    log(`Updating userTeamId from ${originalUserTeamId} to ${newIndex} for ${selectedTeamIdentity.name}`);
                    window.state.userTeamId = newIndex;
                    if (window.state.viewTeamId === originalUserTeamId) {
                        window.state.viewTeamId = newIndex;
                    }
                    if (window.state.player?.teamId === originalUserTeamId) {
                        window.state.player.teamId = newIndex;
                    }
                } else if (newIndex === -1) {
                    warn(`Could not find selected team ${selectedTeamIdentity.name} after reordering!`);
                }
            }
        }

        if (window.state?.league?.teams) {
            const verifyResult = verifyTeamAssignment();
            log(`✅ League created. User team verification: match: ${verifyResult.match}`);
        }

        window.verifyTeamAssignment = verifyTeamAssignment;
        return league;
        };
    }
    
    // Start trying to apply the fix
    applyTeamSelectionFix();
    
    log('Team selection fix initialized (will apply when makeLeague is available).');
})();

// ============================================================================
// NAVBAR FIX (from navbar-fix.js)
// ============================================================================

(function() {
  console.log('🧭 Loading complete navigation fix...');

  // Enhanced router function
  function fixedRouter() {
    const path = location.hash || '#/hub';
    const viewName = path.slice(2);
    
    console.log('🧭 Routing to:', viewName, 'from path:', path);
    
    // Hide all views first
    document.querySelectorAll('.view').forEach(view => {
      view.hidden = true;
      view.style.display = 'none';
    });
    
    // Show target view
    const targetView = document.getElementById(viewName);
    if (targetView) {
      targetView.hidden = false;
      targetView.style.display = 'block';
      console.log('✅ Showing view:', viewName);
    } else {
      console.warn('⚠️ View not found:', viewName, 'falling back to hub');
      // Fallback to hub if view not found
      const hubView = document.getElementById('hub');
      if (hubView) {
        hubView.hidden = false;
        hubView.style.display = 'block';
      }
    }
    
    // Update navigation active states
    document.querySelectorAll('.nav-pill').forEach(pill => {
      const href = pill.getAttribute('href');
      const isActive = href === path;
      
      // Remove all active classes and attributes
      pill.classList.remove('active');
      pill.removeAttribute('aria-current');
      
      // Add active state to current page
      if (isActive) {
        pill.classList.add('active');
        pill.setAttribute('aria-current', 'page');
      }
    });
    
    // Only render content if game is ready
    if (!state.league || !state.onboarded) {
      console.log('Game not ready, skipping content rendering');
      return;
    }
    
    // Render view-specific content
    setTimeout(() => {
      try {
        switch(viewName) {
          case 'hub':
            if (window.renderHub) {
              window.renderHub();
              console.log('✅ Hub rendered');
            }
            break;
          case 'roster':
            if (window.renderRoster) {
              window.renderRoster();
              console.log('✅ Roster rendered');
            }
            break;
          case 'contracts':
            if (window.renderContractManagement) {
              window.renderContractManagement(window.state.league, window.state.userTeamId);
              console.log('✅ Contract Management rendered');
            }
            break;
          case 'standings':
            if (window.renderStandingsPage) {
              window.renderStandingsPage();
              console.log('✅ Standings rendered');
            } else if (window.renderStandings) {
              window.renderStandings();
              console.log('✅ Standings (legacy) rendered');
            }
            break;
          case 'freeagency':
            if (window.renderFreeAgency) {
              window.renderFreeAgency();
              console.log('✅ Free Agency rendered');
            }
            break;
          case 'draft':
          case 'scouting':
            if (window.renderDraft) {
              window.renderDraft();
              console.log('✅ Draft/Scouting rendered');
            }
            break;
          case 'trade':
            if (window.renderTradeCenter) {
              window.renderTradeCenter();
              console.log('✅ Trade center rendered');
            } else if (window.renderTrade) {
              window.renderTrade();
              console.log('✅ Trade (legacy) rendered');
            }
            break;
          case 'trade-proposals':
          case 'tradeProposals':
            // Check if there's a dedicated view, otherwise show in trade view
            const tradeProposalsView = document.getElementById('tradeProposals');
            if (tradeProposalsView) {
              window.show('tradeProposals');
            } else {
              window.show('trade');
            }
            if (window.renderTradeProposals) {
              setTimeout(() => window.renderTradeProposals(), 100);
              console.log('✅ Trade proposals rendered');
            }
            break;
          case 'coaching':
            if (window.renderCoachingStats) {
              window.renderCoachingStats();
              console.log('✅ Coaching rendered');
            } else {
              console.warn('⚠️ renderCoachingStats function not found');
            }
            break;
          case 'schedule':
            if (window.renderSchedule) {
              window.renderSchedule();
              console.log('✅ Schedule rendered');
            } else {
              console.warn('⚠️ renderSchedule function not found');
            }
            break;
          case 'settings':
            renderSettings();
            console.log('✅ Settings rendered');
            break;
          case 'playerDatabase':
            if (window.renderPlayerDatabase) {
              window.renderPlayerDatabase();
              console.log('✅ Player Database rendered');
            }
            break;
          case 'history':
            if (window.renderHistory) {
              window.renderHistory();
              console.log('✅ History rendered');
            }
            break;
          case 'records':
            if (window.renderRecords) {
              window.renderRecords();
              console.log('✅ Records rendered');
            }
            break;
          case 'hallOfFame':
            if (window.renderHallOfFame) {
              window.renderHallOfFame();
              console.log('✅ Hall of Fame rendered');
            }
            break;
          default:
            console.log('No specific renderer for view:', viewName);
        }
      } catch (error) {
        console.error('Error rendering view:', viewName, error);
      }
    }, 50);
  }
  
  // Basic settings renderer
  function renderSettings() {
    const settingsView = document.getElementById('settings');
    if (settingsView && !settingsView.dataset.rendered) {
      settingsView.innerHTML = `
        <div class="card">
          <h2>Settings</h2>
          <div class="section">
            <label for="settingsYear">Current Season</label>
            <input type="number" id="settingsYear" value="${state.league?.year || 2025}" readonly>
          </div>
          <div class="section">
            <label>Game Mode</label>
            <p>${state.gameMode === 'gm' ? 'General Manager' : 'Career Mode'}</p>
          </div>
          <div class="section">
            <label>Your Role</label>
            <p>${state.playerRole || 'GM'}</p>
          </div>
          <div class="section">
            <label>Team Names</label>
            <p>${state.namesMode === 'real' ? 'Real NFL Teams' : 'Fictional Teams'}</p>
          </div>
          <div class="section">
            <button id="btnResetGame" class="btn danger">Reset Game</button>
          </div>
        </div>
      `;
      
      // Add reset functionality
      const resetBtn = document.getElementById('btnResetGame');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          if (confirm('Are you sure you want to reset the game? All progress will be lost.')) {
            localStorage.clear();
            location.reload();
          }
        });
      }
      
      settingsView.dataset.rendered = 'true';
    }
  }
  
  // Enhanced navigation click handler
  function setupNavigation() {
    console.log('🔧 Setting up enhanced navigation...');
    
    // Remove existing hash change listeners
    window.removeEventListener('hashchange', window.router);
    window.removeEventListener('hashchange', fixedRouter);
    
    // Add new hash change listener
    window.addEventListener('hashchange', fixedRouter);
    
    // Enhanced click handling for navigation
    document.addEventListener('click', function(e) {
      // Handle nav pill clicks
      if (e.target.classList.contains('nav-pill')) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        
        if (href && href.startsWith('#/')) {
          console.log('🖱️ Nav click:', href);
          
          // Immediately update hash (this will trigger hashchange)
          location.hash = href;
        }
        return;
      }
      
      // Handle any other navigation links
      if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#/')) {
        e.preventDefault();
        const href = e.target.getAttribute('href');
        location.hash = href;
      }
    });
    
    console.log('✅ Enhanced navigation set up');
  }
  
  // Fix navigation visibility and styling
  function fixNavigationStyles() {
    console.log('🎨 Fixing navigation styles...');
    
    const navCSS = `
      /* Enhanced Navigation Styles */
      .topbar {
        position: sticky !important;
        top: 0 !important;
        z-index: 100 !important;
        display: grid !important;
        grid-template-columns: auto 1fr auto !important;
        align-items: center !important;
        padding: var(--space-4) var(--space-6) !important;
        background: rgba(22, 27, 34, 0.95) !important;
        backdrop-filter: blur(20px) !important;
        border-bottom: 1px solid var(--hairline) !important;
      }
      
      .brand {
        font-weight: 700 !important;
        font-size: var(--text-xl) !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-hover)) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
        background-clip: text !important;
      }
      
      .nav-pills {
        display: flex !important;
        gap: var(--space-2) !important;
        justify-content: center !important;
        background: var(--surface) !important;
        border-radius: var(--radius-pill) !important;
        padding: var(--space-1) !important;
        border: 1px solid var(--hairline) !important;
      }
      
      .nav-pill {
        display: inline-flex !important;
        align-items: center !important;
        gap: var(--space-2) !important;
        height: 36px !important;
        padding: 0 var(--space-4) !important;
        border-radius: var(--radius-pill) !important;
        color: var(--text-muted) !important;
        text-decoration: none !important;
        font-weight: 500 !important;
        font-size: var(--text-sm) !important;
        transition: all var(--dur) var(--ease) !important;
        cursor: pointer !important;
        user-select: none !important;
      }
      
      .nav-pill:hover {
        color: var(--text) !important;
        background: rgba(255, 255, 255, 0.05) !important;
        transform: translateY(-1px) !important;
      }
      
      .nav-pill.active,
      .nav-pill[aria-current="page"] {
        color: white !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-hover)) !important;
        box-shadow: var(--shadow-sm) !important;
        transform: none !important;
      }
      
      .nav-pill.active:hover,
      .nav-pill[aria-current="page"]:hover {
        transform: none !important;
        filter: brightness(1.1) !important;
      }
      
      /* Mobile navigation toggle - hide by default */
      .nav-toggle {
        display: none !important;
      }
      
      @media (max-width: 1024px) {
        .nav-pills {
          flex-wrap: wrap !important;
          justify-content: flex-start !important;
        }
        
        .nav-pill {
          font-size: 0.875rem !important;
          padding: 0 var(--space-3) !important;
        }
      }
      
      @media (max-width: 768px) {
        .topbar {
          grid-template-columns: 1fr !important;
          gap: var(--space-4) !important;
          text-align: center !important;
        }
        
        .nav-pills {
          order: 2 !important;
          width: 100% !important;
        }
        
        .brand {
          order: 1 !important;
        }
      }
      
      /* Ensure views are properly styled */
      .view {
        display: none !important;
      }
      
      .view:not([hidden]) {
        display: block !important;
      }
      
      /* Fix any z-index issues */
      .modal {
        z-index: 1000 !important;
      }
      
      .topbar {
        z-index: 100 !important;
      }
    `;
    
    // Inject CSS
    const styleEl = document.createElement('style');
    styleEl.id = 'enhanced-nav-styles';
    styleEl.textContent = navCSS;
    
    // Remove old style if exists
    const oldStyle = document.getElementById('enhanced-nav-styles');
    if (oldStyle) oldStyle.remove();
    
    document.head.appendChild(styleEl);
    console.log('✅ Navigation styles fixed');
  }
  
  // Fix the navigation HTML structure if needed
  function fixNavigationHTML() {
    console.log('🔧 Checking navigation HTML...');
    
    const nav = document.querySelector('#site-nav');
    if (!nav) {
      console.warn('Navigation element not found');
      return;
    }
    
    // Ensure all nav pills have correct attributes
    nav.querySelectorAll('.nav-pill').forEach(pill => {
      if (!pill.getAttribute('href')) {
        const view = pill.dataset.view;
        if (view) {
          pill.setAttribute('href', `#/${view}`);
        }
      }
    });
    
    // Add missing navigation items if needed
    const expectedNavItems = [
      { href: '#/hub', text: 'Home', view: 'hub' },
      { href: '#/roster', text: 'Roster', view: 'roster' },
      { href: '#/contracts', text: 'Contracts', view: 'contracts' },
      { href: '#/trade', text: 'Trades', view: 'trade' },
      { href: '#/standings', text: 'Standings', view: 'standings' },
      { href: '#/freeagency', text: 'Free Agency', view: 'freeagency' },
      { href: '#/draft', text: 'Draft', view: 'draft' },
      { href: '#/scouting', text: 'Scouting', view: 'scouting' },
      { href: '#/coaching', text: 'Coaching', view: 'coaching' },
      { href: '#/playerDatabase', text: 'Players', view: 'playerDatabase' },
      { href: '#/history', text: 'History', view: 'history' },
      { href: '#/records', text: 'Records', view: 'records' },
      { href: '#/hallOfFame', text: 'Hall of Fame', view: 'hallOfFame' },
      { href: '#/settings', text: 'Settings', view: 'settings' }
    ];
    
    expectedNavItems.forEach(item => {
      const existingLink = nav.querySelector(`[href="${item.href}"]`);
      if (!existingLink) {
        console.log('Adding missing nav item:', item.text);
        const newLink = document.createElement('a');
        newLink.href = item.href;
        newLink.className = 'nav-pill';
        newLink.dataset.view = item.view;
        newLink.textContent = item.text;
        nav.appendChild(newLink);
      }
    });
    
    console.log('✅ Navigation HTML checked and fixed');
  }
  
  // Main initialization function
  function initializeNavigationFix() {
    console.log('🚀 Initializing complete navigation fix...');
    
    // Fix HTML structure
    fixNavigationHTML();
    
    // Fix CSS styles
    fixNavigationStyles();
    
    // Set up enhanced event handling
    setupNavigation();
    
    // Override the global router
    window.router = fixedRouter;
    
    // Initial route
    setTimeout(() => {
      console.log('🎯 Running initial route...');
      fixedRouter();
    }, 100);
    
    console.log('✅ Complete navigation fix initialized');
  }
  
  // Diagnostic function
  function diagnoseNavigation() {
    console.log('🔍 Navigation Diagnostic');
    console.log('========================');
    
    const nav = document.querySelector('#site-nav');
    const pills = document.querySelectorAll('.nav-pill');
    const views = document.querySelectorAll('.view');
    
    console.log('Navigation container found:', !!nav);
    console.log('Navigation pills found:', pills.length);
    console.log('Views found:', views.length);
    
    console.log('Navigation pills:');
    pills.forEach((pill, i) => {
      const href = pill.getAttribute('href');
      const text = pill.textContent;
      const active = pill.getAttribute('aria-current') === 'page' || pill.classList.contains('active');
      console.log(`  ${i + 1}. "${text}" -> ${href} ${active ? '(ACTIVE)' : ''}`);
    });
    
    console.log('Views:');
    views.forEach((view, i) => {
      const id = view.id;
      const hidden = view.hidden;
      const display = view.style.display;
      const visible = !hidden && display !== 'none';
      console.log(`  ${i + 1}. #${id} - Hidden: ${hidden}, Display: ${display}, Visible: ${visible}`);
    });
    
    console.log('Current hash:', location.hash);
    console.log('========================');
  }
  
  // Expose functions globally for debugging
  window.fixNavigation = initializeNavigationFix;
  window.diagnoseNavigation = diagnoseNavigation;
  window.fixedRouter = fixedRouter;
  
  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeNavigationFix);
  } else {
    // Run immediately if DOM is ready
    setTimeout(initializeNavigationFix, 100);
  }
  
  console.log('💡 Navigation fix loaded. Available commands:');
  console.log('- fixNavigation() - Apply complete navigation fix');
  console.log('- diagnoseNavigation() - Show navigation diagnostic');
  
})();

// ============================================================================
// DOM HELPERS FIX (from dom-helpers-fix.js)
// ============================================================================

/**
 * Consistent DOM helper functions to replace jQuery-style syntax
 * These functions provide a unified way to access DOM elements
 */

/**
 * Get element by ID (replacement for jQuery $())
 * @param {string} id - Element ID
 * @returns {Element|null} DOM element or null
 */
function $(id) {
  if (typeof id === 'string') {
    // Remove # if provided (for jQuery compatibility)
    const cleanId = id.startsWith('#') ? id.substring(1) : id;
    return document.getElementById(cleanId);
  }
  return id; // Return as-is if already an element
}

/**
 * Get element value safely
 * @param {string|Element} elementOrId - Element or element ID
 * @returns {string} Element value or empty string
 */
function getValue(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element && element.value !== undefined ? element.value : '';
}

/**
 * Set element value safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {any} value - Value to set
 */
function setValue(elementOrId, value) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && element.value !== undefined) {
    element.value = value;
  }
}

/**
 * Get element text content safely
 * @param {string|Element} elementOrId - Element or element ID
 * @returns {string} Text content or empty string
 */
function getText(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element ? element.textContent : '';
}

/**
 * Set element text content safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} text - Text to set
 */
function setText(elementOrId, text) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.textContent = text;
  }
}

/**
 * Get element innerHTML safely
 * @param {string|Element} elementOrId - Element or element ID
 * @returns {string} HTML content or empty string
 */
function getHTML(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element ? element.innerHTML : '';
}

/**
 * Set element innerHTML safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} html - HTML to set
 */
function setHTML(elementOrId, html) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * Show element (set display to block)
 * @param {string|Element} elementOrId - Element or element ID
 */
function show(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.style.display = 'block';
    element.hidden = false;
  }
}

/**
 * Hide element (set display to none)
 * @param {string|Element} elementOrId - Element or element ID
 */
function hide(elementOrId) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element) {
    element.style.display = 'none';
    element.hidden = true;
  }
}

/**
 * Add class to element
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} className - Class to add
 */
function addClass(elementOrId, className) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && element.classList) {
    element.classList.add(className);
  }
}

/**
 * Remove class from element
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} className - Class to remove
 */
function removeClass(elementOrId, className) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && element.classList) {
    element.classList.remove(className);
  }
}

/**
 * Check if element has class
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} className - Class to check
 * @returns {boolean} True if element has class
 */
function hasClass(elementOrId, className) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  return element && element.classList ? element.classList.contains(className) : false;
}

/**
 * Get all elements by selector
 * @param {string} selector - CSS selector
 * @returns {NodeList} Node list of elements
 */
function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Get first element by selector
 * @param {string} selector - CSS selector
 * @returns {Element|null} First matching element or null
 */
function $1(selector) {
  return document.querySelector(selector);
}

/**
 * Add event listener safely
 * @param {string|Element} elementOrId - Element or element ID
 * @param {string} event - Event name
 * @param {Function} handler - Event handler function
 */
function on(elementOrId, event, handler) {
  const element = typeof elementOrId === 'string' ? $(elementOrId) : elementOrId;
  if (element && typeof handler === 'function') {
    element.addEventListener(event, handler);
  }
}

// Make DOM helpers globally available
window.$ = $;
window.getValue = getValue;
window.setValue = setValue;
window.getText = getText;
window.setText = setText;
window.getHTML = getHTML;
window.setHTML = setHTML;
window.show = show;
window.hide = hide;
window.addClass = addClass;
window.removeClass = removeClass;
window.hasClass = hasClass;
window.$$ = $$;
window.$1 = $1;
window.on = on;

console.log('✅ Combined fixes.js loaded - includes error-overlay, missing-functions, league-creation-fix, team-selection-fix, navbar-fix, and dom-helpers-fix');
