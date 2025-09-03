// freeAgency.js - Fixed Syntax Error
'use strict';

function ensureFA() {
  if (window.state?.freeAgents && window.state.freeAgents.length > 0) {
    return; // FA pool already exists
  }
  
  const C = window.Constants;
  const U = window.Utils;
  
  if (!C || !U) {
    console.error('Constants or Utils not available for FA generation');
    return;
  }

  // Initialize free agents array if it doesn't exist
  if (!window.state) {
    console.error('Game state not available for FA generation');
    return;
  }
  
  if (!window.state.freeAgents) {
    window.state.freeAgents = [];
  }

  const poolSize = C.FREE_AGENCY?.POOL_SIZE || 120;
  
  // Create more realistic free agent distribution
  const createRealisticPlayer = (pos, index) => {
    let player;
    
    if (window.makePlayer) {
      player = window.makePlayer(pos);
    } else {
      // Fallback player creation with realistic distribution
      player = {
        id: U.id(),
        name: generateBasicName(),
        pos: pos,
        age: U.rand(22, 35),
        ovr: 0, // Will be set below
        years: 0,
        yearsTotal: C.FREE_AGENCY?.DEFAULT_YEARS || 2,
        baseAnnual: 0, // Will be calculated based on overall
        signingBonus: 0, // Will be calculated
        guaranteedPct: C.FREE_AGENCY?.GUARANTEED_PCT || 0.5,
        stats: { game: {}, season: {}, career: {} },
        abilities: []
      };
    }
    
    // Create realistic overall rating distribution
    // Most players should be in the 60-75 range, fewer in 75-85, very few 85+
    let overall;
    const rand = Math.random();
    
    if (rand < 0.60) {
      // 60% of players: 60-75 overall (depth players)
      overall = U.rand(60, 75);
    } else if (rand < 0.90) {
      // 30% of players: 75-82 overall (solid players)
      overall = U.rand(75, 82);
    } else if (rand < 0.98) {
      // 8% of players: 82-87 overall (good players)
      overall = U.rand(82, 87);
    } else {
      // 2% of players: 87-92 overall (star players)
      overall = U.rand(87, 92);
    }
    
    player.ovr = overall;
    
    // Calculate realistic salary based on overall rating and position
    const baseSalary = calculateRealisticSalary(player.ovr, player.pos, player.age);
    player.baseAnnual = baseSalary;
    
    // Calculate signing bonus (typically 20-40% of total contract value)
    const totalContractValue = baseSalary * player.yearsTotal;
    const bonusPercentage = U.rand(0.2, 0.4);
    player.signingBonus = Math.round(totalContractValue * bonusPercentage * 10) / 10;
    
    // Adjust for free agency market (slight discount)
    const marketDiscount = C.FREE_AGENCY?.CONTRACT_DISCOUNT || 0.95;
    player.baseAnnual = Math.round(player.baseAnnual * marketDiscount * 10) / 10;
    
    // Add abilities if the function exists
    if (window.tagAbilities) {
      window.tagAbilities(player);
    }
    
    return player;
  };
  
  // Generate players with realistic position distribution
  const positionDistribution = {
    'OL': 25,    // Offensive linemen are common in FA
    'DL': 20,    // Defensive linemen
    'LB': 15,    // Linebackers
    'CB': 12,    // Cornerbacks
    'S': 10,     // Safeties
    'WR': 8,     // Wide receivers
    'RB': 5,     // Running backs
    'TE': 3,     // Tight ends
    'QB': 1,     // Quarterbacks (rare in FA)
    'K': 1       // Kickers
  };
  
  let playerIndex = 0;
  Object.entries(positionDistribution).forEach(([pos, count]) => {
    for (let i = 0; i < count; i++) {
      const player = createRealisticPlayer(pos, playerIndex++);
      window.state.freeAgents.push(player);
    }
  });
  
  // Fill remaining slots with random positions
  while (window.state.freeAgents.length < poolSize) {
    const pos = U.choice(C.POSITIONS);
    const player = createRealisticPlayer(pos, playerIndex++);
    window.state.freeAgents.push(player);
  }
  
  // Sort by overall rating (best players first)
  window.state.freeAgents.sort((a, b) => b.ovr - a.ovr);
  
  console.log(`Generated ${window.state.freeAgents.length} free agents`);
}

function generateBasicName() {
  // Use expanded names for maximum variety (1,000,000+ combinations)
  const firstNames = window.EXPANDED_FIRST_NAMES || ['John', 'Mike', 'David', 'Chris', 'Matt', 'Ryan', 'Josh', 'Jake', 'Alex', 'Tyler'];
  const lastNames = window.EXPANDED_LAST_NAMES || ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'];
  
  const U = window.Utils;
  if (U) {
    return U.choice(firstNames) + ' ' + U.choice(lastNames);
  }
  
  return firstNames[Math.floor(Math.random() * firstNames.length)] + ' ' + 
         lastNames[Math.floor(Math.random() * lastNames.length)];
}

/**
 * Calculates realistic salary based on overall rating, position, and age
 * @param {number} overall - Player overall rating
 * @param {string} position - Player position
 * @param {number} age - Player age
 * @returns {number} Base annual salary in millions
 */
function calculateRealisticSalary(overall, position, age) {
  const U = window.Utils;
  
  // Base salary multiplier by position (relative to overall rating)
  const positionMultipliers = {
    'QB': 1.8,    // Quarterbacks get paid the most
    'OL': 1.2,    // Offensive linemen are valuable
    'DL': 1.1,    // Defensive linemen
    'WR': 1.0,    // Wide receivers
    'CB': 0.95,   // Cornerbacks
    'LB': 0.9,    // Linebackers
    'RB': 0.85,   // Running backs (shorter careers)
    'S': 0.8,     // Safeties
    'TE': 0.75,   // Tight ends
    'K': 0.4,     // Kickers
    'P': 0.3      // Punters
  };
  
  const multiplier = positionMultipliers[position] || 1.0;
  
  // Base salary calculation based on overall rating
  let baseSalary;
  if (overall >= 90) {
    // Elite players: $15-25M
    baseSalary = U.rand(15, 25);
  } else if (overall >= 85) {
    // Star players: $8-15M
    baseSalary = U.rand(8, 15);
  } else if (overall >= 80) {
    // Good players: $4-8M
    baseSalary = U.rand(4, 8);
  } else if (overall >= 75) {
    // Solid players: $2-4M
    baseSalary = U.rand(2, 4);
  } else if (overall >= 70) {
    // Average players: $1-2M
    baseSalary = U.rand(1, 2);
  } else if (overall >= 65) {
    // Below average: $0.5-1M
    baseSalary = U.rand(0.5, 1);
  } else {
    // Depth players: $0.3-0.8M
    baseSalary = U.rand(0.3, 0.8);
  }
  
  // Apply position multiplier
  baseSalary *= multiplier;
  
  // Age adjustment (older players get slight discount, younger players slight premium)
  if (age >= 30) {
    baseSalary *= U.rand(0.8, 0.95); // 5-20% discount for older players
  } else if (age <= 25) {
    baseSalary *= U.rand(1.0, 1.1); // 0-10% premium for young players
  }
  
  // Add some randomness (±10%)
  const randomFactor = U.rand(0.9, 1.1);
  baseSalary *= randomFactor;
  
  return Math.round(baseSalary * 10) / 10; // Round to 1 decimal place
}

function renderFreeAgency() {
  console.log('Rendering free agency...');
  
  try {
    ensureFA();
    
    const L = window.state?.league;
    if (!L) {
      console.error('No league available for free agency');
      return;
    }
    
    const tbl = document.getElementById('faTable');
    if (!tbl) {
      console.error('Free agency table not found');
      return;
    }
    
    // Clear and rebuild table
    tbl.innerHTML = '<thead><tr><th></th><th>Name</th><th>POS</th><th>OVR</th><th>Age</th><th>Base</th><th>Bonus</th><th>Years</th><th>Abilities</th></tr></thead>';
    const tbody = document.createElement('tbody');
    
    window.state.freeAgents.forEach((p, i) => {
      const tr = document.createElement('tr');
      const abilities = (p.abilities || []).join(', ') || 'None';
      
      tr.innerHTML = `
        <td><input type="radio" name="fa" value="${i}"></td>
        <td>${p.name}</td>
        <td>${p.pos}</td>
        <td>${p.ovr}</td>
        <td>${p.age}</td>
        <td>$${p.baseAnnual.toFixed(1)}M</td>
        <td>$${p.signingBonus.toFixed(1)}M</td>
        <td>${p.yearsTotal}</td>
        <td>${abilities}</td>
      `;
      tbody.appendChild(tr);
    });
    
    tbl.appendChild(tbody);

    // Set up team selector
    const sel = document.getElementById('faTeam');
    if (sel && !sel.dataset.filled) {
      if (window.fillTeamSelect) {
        window.fillTeamSelect(sel);
        sel.dataset.filled = '1';
      }
    }
    
    // Set up sign button
    const btnSign = document.getElementById('btnSignFA');
    if (btnSign) {
      btnSign.disabled = true;
      
      // Enable button when a player is selected
      tbl.addEventListener('change', function(e) {
        if (e.target && e.target.name === 'fa') {
          btnSign.disabled = false;
        }
      });
    }
    
    console.log('Free agency rendered successfully');
    
  } catch (error) {
    console.error('Error rendering free agency:', error);
  }
}

function signFreeAgent(playerIndex) {
  console.log('Attempting to sign free agent:', playerIndex);
  
  if (!window.state?.freeAgents || window.state.freeAgents.length === 0) {
    window.setStatus('No free agents available');
    return;
  }
  
  let idx = playerIndex;
  if (idx === undefined || idx === null) {
    const selectedRadio = document.querySelector('input[name=fa]:checked');
    if (!selectedRadio) {
      window.setStatus('No free agent selected.');
      return;
    }
    idx = parseInt(selectedRadio.value, 10);
  }

  if (isNaN(idx) || idx < 0 || idx >= window.state.freeAgents.length) {
    window.setStatus('Invalid free agent selection.');
    return;
  }

  try {
    const L = window.state.league;
    if (!L) {
      window.setStatus('No league available');
      return;
    }
    
    const teamSelect = document.getElementById('faTeam') || document.getElementById('userTeam');
    const teamId = parseInt(teamSelect?.value || '0', 10);
    const team = L.teams[teamId];
    
    if (!team) {
      window.setStatus('Invalid team selected');
      return;
    }
    
    const player = window.state.freeAgents[idx];
    if (!player) {
      window.setStatus('Player not found');
      return;
    }
    
    // Check role permissions if in career mode
    if (window.state.playerRole && window.state.playerRole !== 'GM') {
      const C = window.Constants;
      const isOffensive = C.OFFENSIVE_POSITIONS.includes(player.pos);
      const canSign = window.state.playerRole === 'GM' || 
                      (window.state.playerRole === 'OC' && isOffensive) || 
                      (window.state.playerRole === 'DC' && !isOffensive);

      if (!canSign) {
        window.setStatus(`As ${window.state.playerRole}, you cannot sign ${player.pos}s.`);
        return;
      }
    }
    
    // Set contract years for signing
    player.years = player.yearsTotal;
    
    // Check salary cap
    const capHit = window.capHitFor ? window.capHitFor(player, 0) : player.baseAnnual;
    const capAfter = team.capUsed + capHit;
    
    if (capAfter > team.capTotal) {
      window.setStatus(`Signing would exceed salary cap by $${(capAfter - team.capTotal).toFixed(1)}M`);
      return;
    }

    // Add player to team
    team.roster.push(player);
    team.roster.sort((a, b) => b.ovr - a.ovr);
    
    // Remove from free agents
    window.state.freeAgents.splice(idx, 1);
    
    // Update team ratings after roster change
    if (window.updateTeamRatings) {
      window.updateTeamRatings(team);
    }
    
    // Update salary cap
    if (window.recalcCap) {
      window.recalcCap(L, team);
    }
    
    // Refresh displays
    renderFreeAgency();
    if (window.updateCapSidebar) {
      window.updateCapSidebar();
    }
    
    window.setStatus(`Signed ${player.name} (${player.pos}) for $${capHit.toFixed(1)}M`);
    console.log('Free agent signed successfully:', player.name);
    
  } catch (error) {
    console.error('Error signing free agent:', error);
    window.setStatus('Error signing free agent');
  }
}

// Make the functions globally available
window.ensureFA = ensureFA;
window.renderFreeAgency = renderFreeAgency;
window.signFreeAgent = signFreeAgent;
window.generateBasicName = generateBasicName;

// Add this to the END of your freeAgency.js file

/**
 * Alternative name for ensureFA function (for compatibility)
 * @returns {Array} Generated free agents
 */
function generateFreeAgents() {
  console.log('generateFreeAgents called - delegating to ensureFA');
  ensureFA();
  return window.state?.freeAgents || [];
}

// Make sure both function names are available globally
window.generateFreeAgents = generateFreeAgents;
window.ensureFA = ensureFA;
