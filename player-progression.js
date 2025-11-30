// player-progression.js - Player Progression & Skill Tree System
'use strict';

// ----------------------------------------------------
// 🌳 Skill Tree Definitions
// ----------------------------------------------------

/**
 * Defines the progression tiers and rating boosts for each position's skill tree.
 * Key: Position Abbreviation
 * Value: Array of Tiers (Tier 0 is free, Tier 1+ requires spending Skill Points)
 */
const SKILL_TREES = {
  QB: [
    // Tier 1: Core Passing
    { name: 'Pocket Presence', cost: 1, boosts: { awareness: 2, intelligence: 1 } },
    { name: 'Arm Strength I', cost: 1, boosts: { throwPower: 3 } },
    { name: 'Short Accuracy', cost: 1, boosts: { throwAccuracy: 2, awareness: 1 } },
    
    // Tier 2: Advanced Passing (Requires 3 Tier 1 upgrades)
    { name: 'Deep Ball I', cost: 2, boosts: { throwPower: 2, throwAccuracy: 2 } },
    { name: 'Scramble Drill', cost: 2, boosts: { speed: 2, agility: 2, awareness: 1 } },
    { name: 'Play Action Mastery', cost: 2, boosts: { awareness: 3, intelligence: 1 } },

    // Tier 3: Elite Talent (Requires 6 total upgrades)
    { name: 'Clutch Passer', cost: 3, boosts: { awareness: 4, intelligence: 2 } },
    { name: 'Deadeye Elite', cost: 3, boosts: { throwAccuracy: 5 } }
  ],
  
  RB: [
    // Tier 1: Core Running
    { name: 'Evasive Runner', cost: 1, boosts: { juking: 3, agility: 1 } },
    { name: 'Power Runner I', cost: 1, boosts: { trucking: 3, weight: 5 } },
    { name: 'Burst of Speed', cost: 1, boosts: { acceleration: 3 } },

    // Tier 2: Versatility & Durability (Requires 3 Tier 1 upgrades)
    { name: 'Receiving Back', cost: 2, boosts: { catching: 3, agility: 2 } },
    { name: 'Endurance Training', cost: 2, boosts: { fatigue: -0.05, awareness: 1 } }, // Fatigue is a state, use a modifier
    { name: 'Pass Protection', cost: 2, boosts: { passBlock: 3, intelligence: 2 } },
    
    // Tier 3: Elite Talent (Requires 6 total upgrades)
    { name: 'Workhorse', cost: 3, boosts: { trucking: 4, awareness: 3 } },
    { name: 'Human Joystick', cost: 3, boosts: { juking: 4, agility: 4 } }
  ],

  // Add more positions (WR, DL, LB, etc.) following this structure...
};

// ----------------------------------------------------
// 🌟 XP & Point Management
// ----------------------------------------------------

/**
 * Initializes progression stats on a new player.
 * @param {Object} player - Player object
 */
function initProgressionStats(player) {
  if (!player.progression) {
    player.progression = {
      xp: 0,
      skillPoints: 0,
      upgrades: [], // Array of purchased skill names
      treeOvrBonus: 0 // Track OVR gain from tree
    };
  }
}

/**
 * Calculates XP earned based on performance and overall rating difference.
 * @param {Object} gameStats - Player's game statistics
 * @param {number} ovr - Player's current overall rating
 * @returns {number} Amount of XP earned
 */
function calculateGameXP(gameStats, ovr) {
  const U = window.Utils;
  const C = window.Constants;
  let baseXP = 50; // Base XP for playing a game
  
  // Performance Bonus (simplified, real logic uses position-specific stats)
  if (ovr >= 90) baseXP += 50; // Elite players get more for performing
  else if (ovr <= 70) baseXP += 100; // Lower rated players get more to catch up

  // Age/Potential Modifier: Younger players with higher potential earn more
  const age = gameStats.age || 22;
  const potential = gameStats.potential || ovr;
  const potentialDiff = potential - ovr;
  
  baseXP += U.clamp(potentialDiff * 5, 0, 100); 
  
  // Contract Bonus (Players playing for a new deal perform better)
  if (gameStats.years <= 1) baseXP += 25; 

  // Position-Specific Performance
  if (gameStats.passYd && gameStats.passYd > 200) baseXP += Math.floor(gameStats.passYd / 50);
  if (gameStats.rushYd && gameStats.rushYd > 100) baseXP += Math.floor(gameStats.rushYd / 20);
  if (gameStats.interceptions === 0) baseXP += 10;
  
  return U.clamp(baseXP, 50, 500);
}

/**
 * Adds XP to a player and converts excess XP into Skill Points (SP).
 * @param {Object} player - Player object
 * @param {number} xpGained - XP to add
 */
function addXP(player, xpGained) {
  initProgressionStats(player);
  
  const XP_FOR_SP = 1000; // 1000 XP = 1 Skill Point
  player.progression.xp += xpGained;
  
  // Convert excess XP to Skill Points
  while (player.progression.xp >= XP_FOR_SP) {
    player.progression.xp -= XP_FOR_SP;
    player.progression.skillPoints++;
    console.log(`[XP] ${player.name} gained 1 Skill Point!`);
  }
}

// ----------------------------------------------------
// 🛠️ Skill Tree Application
// ----------------------------------------------------

/**
 * Attempts to apply a skill tree upgrade to a player's ratings.
 * @param {Object} player - Player object
 * @param {string} skillName - Name of the skill to purchase
 * @returns {boolean} True if upgrade was successful, false otherwise
 */
function applySkillTreeUpgrade(player, skillName) {
  initProgressionStats(player);
  
  if (!SKILL_TREES[player.pos]) {
    console.error(`Skill tree not defined for position: ${player.pos}`);
    return false;
  }
  
  // Find the skill definition
  const skill = SKILL_TREES[player.pos].find(s => s.name === skillName);
  
  if (!skill) {
    console.error(`Skill not found: ${skillName}`);
    return false;
  }
  
  if (player.progression.upgrades.includes(skillName)) {
    console.warn(`Skill already purchased: ${skillName}`);
    return false;
  }
  
  if (player.progression.skillPoints < skill.cost) {
    console.warn(`Not enough Skill Points. Needed: ${skill.cost}, Have: ${player.progression.skillPoints}`);
    return false;
  }
  
  // Check Tier prerequisites (simplified)
  // Total purchased skills must meet a minimum count for later tiers
  const currentUpgrades = player.progression.upgrades.length;
  const tierMap = { 1: 0, 2: 3, 3: 6 }; // Example: Tier 2 requires 3 total upgrades
  
  const skillTier = Object.keys(tierMap).find(tier => 
    SKILL_TREES[player.pos].slice(tierMap[tier], tierMap[Number(tier) + 1] || Infinity).some(s => s.name === skillName)
  );

  if (skillTier && currentUpgrades < tierMap[skillTier]) {
      console.warn(`Tier ${skillTier} prerequisite not met. Need ${tierMap[skillTier]} upgrades.`);
      return false;
  }
  
  // 1. Spend the points
  player.progression.skillPoints -= skill.cost;
  
  // 2. Apply rating boosts
  let ovrGained = 0;
  for (const [rating, boost] of Object.entries(skill.boosts)) {
    if (player.ratings[rating] !== undefined) {
      player.ratings[rating] = Math.min(99, player.ratings[rating] + boost);
      ovrGained += boost * 0.5; // Rough estimate of OVR impact
    }
  }
  
  // 3. Record the upgrade
  player.progression.upgrades.push(skillName);
  
  // 4. Update the progression OVR bonus (This keeps the OVR tied to the tree)
  player.progression.treeOvrBonus += ovrGained;

  // 5. Recalculate Overall Rating
  // Assuming calculateOvr is globally available from player.js
  player.ovr = window.calculateOvr(player.pos, player.ratings); 
  
  console.log(`✅ ${player.name} upgraded to '${skillName}' for ${skill.cost} SP.`);
  return true;
}

// Make functions globally available
window.SKILL_TREES = SKILL_TREES;
window.initProgressionStats = initProgressionStats;
window.calculateGameXP = calculateGameXP;
window.addXP = addXP;
window.applySkillTreeUpgrade = applySkillTreeUpgrade;
