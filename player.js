// player.js
'use strict';

function makePlayer(pos) {
  const U = window.Utils;
  const speed = U.clamp(U.rand(50, 95) + ((pos === 'WR' || pos === 'CB') ? 6 : 0) + ((pos === 'OL' || pos === 'DL') ? -8 : 0), 40, 99);
  const strength = U.clamp(U.rand(50, 95) + ((pos === 'OL' || pos === 'DL') ? 6 : 0) + ((pos === 'WR' || pos === 'CB') ? -8 : 0), 40, 99);
  const agility = U.clamp(U.rand(50, 95), 40, 99);
  const awareness = U.clamp(U.rand(40, 92), 30, 99);
  const ovr = U.clamp(Math.round((speed * 0.25 + strength * 0.25 + agility * 0.2 + awareness * 0.3) / 1.15), 50, 99);
  const baseAnnual = Math.round(0.42 * ovr * 10) / 10;
  const years = U.rand(1, 4);
  const signingBonus = Math.round((baseAnnual * years * (0.25 + Math.random() * 0.35)) * 10) / 10;
  return {
    id: U.id(),
    name: U.choice(FIRST_NAMES) + ' ' + U.choice(LAST_NAMES),
    pos: pos,
    age: U.rand(21, 34),
    speed, strength, agility, awareness, ovr,
    years, yearsTotal: years,
    baseAnnual, signingBonus,
    guaranteedPct: 0.5,
    injuryWeeks: 0,
    fatigue: 0,
    abilities: []
  };
}

function tagAbilities(p) {
  if (p.pos === 'QB' && p.speed >= 85 && p.agility >= 85) p.abilities.push('Dual Threat');
  if (p.pos === 'WR' && p.speed >= 92) p.abilities.push('Deep Threat');
  if (p.pos === 'RB' && p.strength >= 92) p.abilities.push('Power Back');
  if (p.pos === 'CB' && p.agility >= 90 && p.awareness >= 85) p.abilities.push('Ball Hawk');
  if (p.pos === 'DL' && p.strength >= 94) p.abilities.push('Run Stuffer');
  if (p.pos === 'K' && p.awareness >= 88) p.abilities.push('Clutch');
}
