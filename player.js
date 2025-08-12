// player.js
'use strict';

function calculateOvr(pos, ratings) {
    const weights = Constants.OVR_WEIGHTS[pos];
    if (!weights) return U.rand(50, 75); // Fallback for positions without specific weights

    let weightedSum = 0;
    for (const stat in weights) {
        weightedSum += (ratings[stat] || 50) * weights[stat];
    }
    return Math.round(weightedSum);
}

function makePlayer(pos) {
  const U = window.Utils;
  
  // Generate a full spectrum of detailed ratings
  const ratings = {
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
      height: U.rand(68, 80) // in inches
  };

  const ovr = calculateOvr(pos, ratings);
  const baseAnnual = Math.round(0.42 * ovr * 10) / 10;
  const years = U.rand(1, 4);
  const signingBonus = Math.round((baseAnnual * years * (0.25 + Math.random() * 0.35)) * 10) / 10;
  
  const player = {
    id: U.id(),
    name: U.choice(FIRST_NAMES) + ' ' + U.choice(LAST_NAMES),
    pos: pos,
    age: U.rand(21, 34),
    ratings: ratings, // Store all detailed ratings here
    ovr: ovr, // The calculated overall rating
    years, yearsTotal: years,
    baseAnnual, signingBonus,
    guaranteedPct: 0.5,
    injuryWeeks: 0,
    fatigue: 0,
    abilities: [],
    stats: { game: {}, season: {}, career: {} },
    history: [],
    awards: []
  };

  tagAbilities(player); // Add abilities based on new ratings
  return player;
}

function tagAbilities(p) {
    p.abilities = []; // Reset abilities
    const r = p.ratings;

    // QB Abilities
    if (p.pos === 'QB') {
        if (r.throwPower > 95) p.abilities.push('Cannon Arm');
        if (r.throwAccuracy > 95) p.abilities.push('Deadeye');
        if (r.speed > 88) p.abilities.push('Escape Artist');
    }
    // RB Abilities
    if (p.pos === 'RB') {
        if (r.trucking > 95) p.abilities.push('Bruiser');
        if (r.juking > 95) p.abilities.push('Ankle Breaker');
        if (r.catching > 85) p.abilities.push('Mismatch Nightmare');
    }
    // WR/TE Abilities
    if (p.pos === 'WR' || p.pos === 'TE') {
        if (r.speed > 96) p.abilities.push('Deep Threat');
        if (r.catchInTraffic > 95) p.abilities.push('Possession Specialist');
        if (r.catching > 95) p.abilities.push('Sure Hands');
    }
    // Defensive Abilities
    if (p.pos === 'DL' || p.pos === 'LB') {
        if (r.passRushPower > 95) p.abilities.push('Bull Rush');
        if (r.passRushSpeed > 95) p.abilities.push('Edge Threat');
    }
    if (p.pos === 'CB' || p.pos === 'S') {
        if (r.coverage > 95 && r.intelligence > 90) p.abilities.push('Shutdown Corner');
        if (r.runStop > 90) p.abilities.push('Enforcer');
    }
}
