// training-fixed.js - Fixed to work without jQuery dependency
'use strict';

/**
 * Helper function to safely get element by ID (replaces $ function)
 */
function getElement(id) {
  return document.getElementById(id);
}

/**
 * Helper function to safely get element value
 */
function getValue(elementOrId) {
  const element = typeof elementOrId === 'string' ? getElement(elementOrId) : elementOrId;
  return element ? element.value : '';
}

/**
 * Renders the training UI card in the Roster view
 * @param {Object} team - Team object to render training for
 */
function renderTrainingUI(team) {
  if (!team || !team.roster) return;
  
  let root = getElement('trainingCard');
  if (!root) {
    const rosterView = getElement('roster');
    if (!rosterView) return;
    
    root = document.createElement('div');
    root.className = 'card';
    root.id = 'trainingCard';
    rosterView.appendChild(root);
  }

  const optsPlayers = team.roster.map(p => {
    return `<option value="${p.id}">${p.name} • ${p.pos} • OVR ${p.ovr}</option>`;
  }).join('');

  root.innerHTML = `
    <h3>Weekly Training</h3>
    <div class="row">
      <label for="trainPlayer">Player</label>
      <select id="trainPlayer" style="min-width:240px">${optsPlayers}</select>
      <div class="spacer"></div>
      <label for="trainStat">Skill</label>
      <select id="trainStat">
        <option value="speed">Speed</option>
        <option value="strength">Strength</option>
        <option value="agility">Agility</option>
        <option value="awareness">Awareness</option>
        <option value="intelligence">Intelligence</option>
        <option value="acceleration">Acceleration</option>
        <option value="catching">Catching</option>
      </select>
      <div class="spacer"></div>
      <button id="btnSetTraining" class="btn">Set For This Week</button>
    </div>
    <div class="muted small">
      One player per team per week. Success chance: ${Math.round(window.Constants?.TRAINING?.SUCCESS_BASE_RATE * 100 || 55)}% base rate, 
      modified by coach skill, player age, and current rating. Results apply after simulating the week.
    </div>
  `;

  const btnSetTraining = getElement('btnSetTraining');
  if (btnSetTraining) {
    btnSetTraining.onclick = setTrainingPlan;
  }
}

/**
 * Sets the user's training plan for the current week
 */
function setTrainingPlan() {
  if (!state.league) return;
  
  try {
    // Fixed: Use proper DOM selection instead of jQuery syntax
    const rosterTeamValue = getValue('rosterTeam');
    const userTeamValue = getValue('userTeam');
    const teamIdx = parseInt(rosterTeamValue || userTeamValue || '0', 10);
    
    const team = state.league.teams[teamIdx];
    
    if (!team) {
      window.setStatus('Invalid team selected.');
      return;
    }
    
    const pid = getValue('trainPlayer');
    const stat = getValue('trainStat');
    
    if (!pid || !stat) {
      window.setStatus('Please select both a player and skill to train.');
      return;
    }
    
    const player = team.roster.find(p => p.id === pid);
    if (!player) {
      window.setStatus('Selected player not found.');
      return;
    }
    
    // Validate training target
    const validationResult = validateTrainingTarget(player, stat);
    if (!validationResult.valid) {
      window.setStatus(validationResult.message);
      return;
    }
    
    state.trainingPlan = { 
      teamIdx, 
      playerId: pid, 
      stat, 
      week: state.league.week 
    };
    
    const playerName = player.name;
    window.setStatus(`Training scheduled: ${stat} for ${playerName}`);
    
  } catch (error) {
    console.error('Error setting training plan:', error);
    window.setStatus('Error setting training plan.');
  }
}

/**
 * Validates whether a player can be trained in a specific stat
 * @param {Object} player - Player object
 * @param {string} stat - Stat to train
 * @returns {Object} Validation result
 */
function validateTrainingTarget(player, stat) {
  const C = window.Constants;
  
  if (!player) {
    return { valid: false, message: 'Invalid player' };
  }
  
  if (player.injuryWeeks && player.injuryWeeks > 0) {
    return { valid: false, message: 'Injured players cannot train' };
  }
  
  const currentRating = player.ratings?.[stat] || player[stat] || 0;
  
  if (currentRating >= C.PLAYER_CONFIG.MAX_OVR) {
    return { valid: false, message: `${stat} already at maximum (${C.PLAYER_CONFIG.MAX_OVR})` };
  }
  
  if (currentRating < C.PLAYER_CONFIG.MIN_OVR) {
    return { valid: false, message: `Invalid current ${stat} rating` };
  }
  
  return { valid: true, message: 'Valid training target' };
}

/**
 * AI logic to pick a training target for a team
 * @param {Object} team - Team object
 * @returns {Object|null} Training plan object or null if no good target
 */
function pickAITarget(team) {
  if (!team || !team.roster) return null;
  
  const C = window.Constants;
  
  try {
    // Group players by position and sort by overall
    const byPos = {};
    C.POSITIONS.forEach(pos => { byPos[pos] = []; });
    
    team.roster.forEach(p => { 
      if (p && byPos[p.pos]) {
        byPos[p.pos].push(p); 
      }
    });
    
    C.POSITIONS.forEach(pos => { 
      byPos[pos].sort((a, b) => b.ovr - a.ovr); 
    });

    // Focus on starters (top players at each position)
    let starters = [];
    Object.keys(C.DEPTH_NEEDS).forEach(pos => {
      const needed = Math.max(1, C.DEPTH_NEEDS[pos]);
      starters = starters.concat(byPos[pos].slice(0, needed));
    });

    let bestPlayer = null;
    let bestScore = -1;
    let bestStat = 'awareness';

    const trainableStats = ['speed', 'strength', 'agility', 'awareness', 'intelligence', 'acceleration'];

    starters.forEach(p => {
      if (!p || (p.injuryWeeks && p.injuryWeeks > 0)) return;
      
      trainableStats.forEach(stat => {
        const currentRating = p.ratings?.[stat] || p[stat] || 0;
        
        // Skip if already at max
        if (currentRating >= C.PLAYER_CONFIG.MAX_OVR) return;
        
        // Calculate training priority score
        const improvementPotential = Math.max(0, C.PLAYER_CONFIG.MAX_OVR - currentRating);
        const agePenalty = Math.max(0, p.age - (C.PLAYER_CONFIG.PEAK_AGES[p.pos] || 27)) * 0.8;
        const positionBonus = getPositionStatBonus(p.pos, stat);
        
        const score = improvementPotential - agePenalty + positionBonus;
        
        if (score > bestScore) {
          bestScore = score;
          bestPlayer = p;
          bestStat = stat;
        }
      });
    });

    return bestPlayer ? { playerId: bestPlayer.id, stat: bestStat } : null;
    
  } catch (error) {
    console.error('Error in pickAITarget:', error);
    return null;
  }
}

/**
 * Gets bonus score for training a specific stat for a position
 * @param {string} position - Player position
 * @param {string} stat - Stat being trained
 * @returns {number} Bonus score
 */
function getPositionStatBonus(position, stat) {
  const C = window.Constants;
  const weights = C.OVR_WEIGHTS[position] || {};
  
  // Higher bonus for stats that matter more for the position
  const weight = weights[stat] || 0;
  return weight * 10; // Scale bonus based on importance
}

/**
 * Resolves the outcome of a training plan
 * @param {Object} team - Team object
 * @param {Object} plan - Training plan object
 * @returns {Object|null} Training result
 */
function resolveTrainingFor(team, plan) {
  if (!plan || !team) return null;
  
  const C = window.Constants;
  
  try {
    const player = team.roster.find(x => x.id === plan.playerId);
    if (!player) return { ok: false, message: 'Player not found' };
    
    // Validate training target
    const validation = validateTrainingTarget(player, plan.stat);
    if (!validation.valid) {
      return { ok: false, message: validation.message };
    }
    
    const stat = plan.stat;
    const currentRating = player.ratings?.[stat] || player[stat] || 0;
    
    // Calculate success probability using constants
    const baseRate = C.TRAINING.SUCCESS_BASE_RATE;
    const coachSkill = (team.staff?.headCoach?.playerDevelopment || 75) / 100;
    const coachModifier = (coachSkill - 0.75) * C.TRAINING.COACH_SKILL_MODIFIER;
    const agePenalty = Math.max(0, player.age - (C.PLAYER_CONFIG.PEAK_AGES[player.pos] || 27)) * C.TRAINING.AGE_PENALTY_PER_YEAR;
    const ratingPenalty = Math.max(0, currentRating - 70) * C.TRAINING.HIGH_RATING_PENALTY;
    
    const successProbability = Math.max(
      C.TRAINING.SUCCESS_MIN_RATE, 
      Math.min(
        C.TRAINING.SUCCESS_MAX_RATE, 
        baseRate + coachModifier - agePenalty - ratingPenalty
      )
    );

    const success = Math.random() < successProbability;

    if (success) {
      // Calculate improvement amount
      const maxImprovement = stat === 'awareness' ? C.TRAINING.MAX_RATING_IMPROVEMENT : 3;
      const improvementPenalty = Math.floor((currentRating - 75) / 10);
      const actualImprovement = Math.max(1, maxImprovement - improvementPenalty);
      const improvement = 1 + Math.floor(Math.random() * actualImprovement);
      
      const newRating = Math.min(C.PLAYER_CONFIG.MAX_OVR, currentRating + improvement);
      
      // Update the rating
      if (player.ratings && player.ratings[stat] !== undefined) {
        player.ratings[stat] = newRating;
      } else {
        player[stat] = newRating;
      }
      
      // Update overall rating for key stats
      if (['awareness', 'agility', 'intelligence'].includes(stat)) {
        player.ovr = Math.min(C.PLAYER_CONFIG.MAX_OVR, player.ovr + 1);
      }
      
      // Add fatigue
      player.fatigue = (player.fatigue || 0) + C.TRAINING.FATIGUE_GAIN_SUCCESS;
      
      return { 
        ok: true, 
        success: true, 
        stat, 
        before: currentRating, 
        after: newRating,
        improvement: improvement
      };
      
    } else {
      // Training failed but player still gets tired
      player.fatigue = (player.fatigue || 0) + C.TRAINING.FATIGUE_GAIN_FAIL;
      
      return { 
        ok: true, 
        success: false, 
        stat, 
        before: currentRating 
      };
    }
    
  } catch (error) {
    console.error('Error in resolveTrainingFor:', error);
    return { ok: false, message: 'Training resolution error' };
  }
}

/**
 * Runs the training process for all teams for the week - FIXED VERSION
 * @param {Object} league - League object
 */
function runWeeklyTraining(league) {
  if (!league || !league.teams) return;
  
  try {
    const weekJustCompleted = league.week - 1;
    
    // FIXED: Get user team ID without jQuery
    let userTeamId = 0;
    const userTeamElement = getElement('userTeam');
    if (userTeamElement && userTeamElement.value) {
      userTeamId = parseInt(userTeamElement.value, 10);
    } else if (state.userTeamId !== undefined) {
      userTeamId = state.userTeamId;
    }
    
    const userPlan = (state.trainingPlan && state.trainingPlan.week === weekJustCompleted) ? 
                     state.trainingPlan : null;

    league.teams.forEach((team, idx) => {
      const plan = (idx === userTeamId && userPlan) ? userPlan : pickAITarget(team);
      if (!plan) return; // Skip if no valid plan
      
      const result = resolveTrainingFor(team, plan);
      
      if (!result || !result.ok) return;

      const teamAbbr = team.abbr || `T${idx}`;
      const player = team.roster.find(p => p.id === plan.playerId);
      const playerName = player ? player.name : 'Unknown';
      
      let logMsg;
      if (result.success) {
        logMsg = `Week ${weekJustCompleted}: ${teamAbbr} - ${playerName} improved ${result.stat} from ${result.before} to ${result.after} (+${result.improvement})`;
      } else {
        logMsg = `Week ${weekJustCompleted}: ${teamAbbr} - ${playerName}'s ${result.stat} training showed no improvement`;
      }
      
      if (!league.news) league.news = [];
      league.news.push(logMsg);
      
      // Keep news from getting too long
      if (league.news.length > 100) {
        league.news = league.news.slice(-50);
      }
    });

    // Clear user training plan after use
    if (userPlan) {
      state.trainingPlan = null;
    }
    
  } catch (error) {
    console.error('Error in runWeeklyTraining:', error);
    // Don't throw the error - log it and continue
  }
}

/**
 * Gets training success rate preview for a player/stat combination
 * @param {Object} player - Player object
 * @param {string} stat - Stat to train
 * @param {Object} team - Team object (for coach skill)
 * @returns {number} Success rate as percentage (0-100)
 */
function getTrainingSuccessRate(player, stat, team) {
  if (!player || !stat) return 0;
  
  const C = window.Constants;
  
  try {
    const currentRating = player.ratings?.[stat] || player[stat] || 0;
    const baseRate = C.TRAINING.SUCCESS_BASE_RATE;
    const coachSkill = (team?.staff?.headCoach?.playerDevelopment || 75) / 100;
    const coachModifier = (coachSkill - 0.75) * C.TRAINING.COACH_SKILL_MODIFIER;
    const agePenalty = Math.max(0, player.age - (C.PLAYER_CONFIG.PEAK_AGES[player.pos] || 27)) * C.TRAINING.AGE_PENALTY_PER_YEAR;
    const ratingPenalty = Math.max(0, currentRating - 70) * C.TRAINING.HIGH_RATING_PENALTY;
    
    const successRate = Math.max(
      C.TRAINING.SUCCESS_MIN_RATE, 
      Math.min(
        C.TRAINING.SUCCESS_MAX_RATE, 
        baseRate + coachModifier - agePenalty - ratingPenalty
      )
    );
    
    return Math.round(successRate * 100);
    
  } catch (error) {
    console.error('Error calculating training success rate:', error);
    return 0;
  }
}

// Make functions globally available
window.renderTrainingUI = renderTrainingUI;
window.setTrainingPlan = setTrainingPlan;
window.validateTrainingTarget = validateTrainingTarget;
window.pickAITarget = pickAITarget;
window.getPositionStatBonus = getPositionStatBonus;
window.resolveTrainingFor = resolveTrainingFor;
window.runWeeklyTraining = runWeeklyTraining;
window.getTrainingSuccessRate = getTrainingSuccessRate;

// Also expose helper functions for consistency
window.getElement = getElement;
window.getValue = getValue;

console.log('✅ Training system fixed and loaded');
