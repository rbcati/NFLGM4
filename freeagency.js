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
    tbl.innerHTML = '<thead><tr><th>Name</th><th>POS</th><th>OVR</th><th>Age</th><th>Base</th><th>Bonus</th><th>Years</th><th>Abilities</th><th>Action</th></tr></thead>';
    const tbody = document.createElement('tbody');
    
    window.state.freeAgents.forEach((p, i) => {
      const tr = document.createElement('tr');
      const abilities = (p.abilities || []).join(', ') || 'None';
      
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.pos}</td>
        <td>${p.ovr}</td>
        <td>${p.age}</td>
        <td>$${p.baseAnnual.toFixed(1)}M</td>
        <td>$${p.signingBonus.toFixed(1)}M</td>
        <td>${p.yearsTotal}</td>
        <td>${abilities}</td>
        <td><button class="btn btn-primary btn-sm" onclick="openContractNegotiation(${i})">Negotiate</button></td>
      `;
      
      // Make row clickable for selection
      tr.addEventListener('click', function(e) {
        // Don't select if clicking the button
        if (e.target.tagName === 'BUTTON') return;
        
        // Remove selection from other rows
        document.querySelectorAll('#faTable tbody tr').forEach(row => {
          row.classList.remove('selected');
        });
        
        // Add selection to this row
        tr.classList.add('selected');
        
        // Enable the sign button
        const signBtn = document.getElementById('btnSignFA');
        if (signBtn) {
          signBtn.disabled = false;
        }
      });
      
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
    const signBtn = document.getElementById('btnSignFA');
    if (signBtn && !signBtn.dataset.hasListener) {
      signBtn.addEventListener('click', function() {
        signFreeAgent();
      });
      signBtn.dataset.hasListener = '1';
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
    // Look for selected row in the table
    const selectedRow = document.querySelector('#faTable tbody tr.selected');
    if (!selectedRow) {
      window.setStatus('No free agent selected. Click on a row to select a player.');
      return;
    }
    // Get the row index from the table
    const tbody = document.querySelector('#faTable tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    idx = rows.indexOf(selectedRow);
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
    // Sort roster by overall rating (best players first)
    team.roster.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
    
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

// Contract negotiation functions
function openContractNegotiation(playerIndex) {
  const player = window.state.freeAgents[playerIndex];
  if (!player) {
    window.setStatus('Player not found');
    return;
  }
  
  // Create modal if it doesn't exist
  let modal = document.getElementById('contractModal');
  if (!modal) {
    modal = createContractModal();
    document.body.appendChild(modal);
  }
  
  // Populate modal with player data
  document.getElementById('contractPlayerName').textContent = player.name;
  document.getElementById('contractPlayerPos').textContent = player.pos;
  document.getElementById('contractPlayerOvr').textContent = player.ovr;
  document.getElementById('contractPlayerAge').textContent = player.age;
  
  // Set initial contract values
  const baseSalary = player.baseAnnual;
  const signingBonus = player.signingBonus;
  const years = player.yearsTotal;
  
  document.getElementById('contractYears').value = years;
  document.getElementById('contractBaseSalary').value = baseSalary.toFixed(1);
  document.getElementById('contractSigningBonus').value = signingBonus.toFixed(1);
  
  // Calculate and display total contract value
  updateContractTotal();
  
  // Store player index for later use
  modal.dataset.playerIndex = playerIndex;
  
  // Show modal
  modal.style.display = 'flex';
  
  // Close modal when clicking outside
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeContractModal();
    }
  });
}

function createContractModal() {
  const modal = document.createElement('div');
  modal.id = 'contractModal';
  modal.className = 'modal-overlay';
  modal.style.display = 'none';
  
  modal.innerHTML = `
    <div class="modal-content contract-modal">
      <div class="modal-header">
        <h3>Contract Negotiation</h3>
        <button class="modal-close" onclick="closeContractModal()">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="player-info">
          <h4 id="contractPlayerName"></h4>
          <p><strong>Position:</strong> <span id="contractPlayerPos"></span> | 
             <strong>Overall:</strong> <span id="contractPlayerOvr"></span> | 
             <strong>Age:</strong> <span id="contractPlayerAge"></span></p>
        </div>
        
        <div class="contract-form">
          <div class="form-group">
            <label for="contractYears">Contract Length (Years):</label>
            <input type="number" id="contractYears" min="1" max="7" value="2" 
                   onchange="updateContractTotal()" oninput="updateContractTotal()">
          </div>
          
          <div class="form-group">
            <label for="contractBaseSalary">Base Annual Salary ($M):</label>
            <input type="number" id="contractBaseSalary" min="0.1" step="0.1" 
                   onchange="updateContractTotal()" oninput="updateContractTotal()">
          </div>
          
          <div class="form-group">
            <label for="contractSigningBonus">Signing Bonus ($M):</label>
            <input type="number" id="contractSigningBonus" min="0" step="0.1" 
                   onchange="updateContractTotal()" oninput="updateContractTotal()">
          </div>
          
          <div class="contract-summary">
            <h4>Contract Summary</h4>
            <p><strong>Total Contract Value:</strong> $<span id="contractTotalValue">0.0</span>M</p>
            <p><strong>Average Annual Value:</strong> $<span id="contractAAV">0.0</span>M</p>
            <p><strong>First Year Cap Hit:</strong> $<span id="contractCapHit">0.0</span>M</p>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeContractModal()">Cancel</button>
        <button class="btn btn-primary" onclick="submitContractOffer()">Submit Offer</button>
      </div>
    </div>
  `;
  
  return modal;
}

function updateContractTotal() {
  const years = parseFloat(document.getElementById('contractYears').value) || 0;
  const baseSalary = parseFloat(document.getElementById('contractBaseSalary').value) || 0;
  const signingBonus = parseFloat(document.getElementById('contractSigningBonus').value) || 0;
  
  const totalValue = (baseSalary * years) + signingBonus;
  const aav = years > 0 ? totalValue / years : 0;
  const capHit = baseSalary + (signingBonus / years);
  
  document.getElementById('contractTotalValue').textContent = totalValue.toFixed(1);
  document.getElementById('contractAAV').textContent = aav.toFixed(1);
  document.getElementById('contractCapHit').textContent = capHit.toFixed(1);
}

function closeContractModal() {
  const modal = document.getElementById('contractModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function submitContractOffer() {
  const modal = document.getElementById('contractModal');
  const playerIndex = parseInt(modal.dataset.playerIndex, 10);
  
  if (isNaN(playerIndex)) {
    window.setStatus('Invalid player selection');
    return;
  }
  
  const player = window.state.freeAgents[playerIndex];
  if (!player) {
    window.setStatus('Player not found');
    return;
  }
  
  const years = parseInt(document.getElementById('contractYears').value, 10);
  const baseSalary = parseFloat(document.getElementById('contractBaseSalary').value);
  const signingBonus = parseFloat(document.getElementById('contractSigningBonus').value);
  
  if (years < 1 || baseSalary < 0.1 || signingBonus < 0) {
    window.setStatus('Please enter valid contract terms');
    return;
  }
  
  // Simulate player decision
  const accepted = simulatePlayerDecision(player, years, baseSalary, signingBonus);
  
  if (accepted) {
    // Player accepts the offer
    signFreeAgentWithContract(playerIndex, years, baseSalary, signingBonus);
    closeContractModal();
    window.setStatus(`${player.name} accepted your contract offer!`);
  } else {
    // Player rejects the offer
    closeContractModal();
    window.setStatus(`${player.name} rejected your contract offer. Try a better deal.`);
  }
}

function simulatePlayerDecision(player, offeredYears, offeredBaseSalary, offeredSigningBonus) {
  const U = window.Utils;
  
  // Base acceptance rate starts at 50%
  let acceptanceRate = 0.5;
  
  // Compare with player's asking price
  const askingBaseSalary = player.baseAnnual;
  const askingSigningBonus = player.signingBonus;
  const askingYears = player.yearsTotal;
  
  // Salary comparison (most important factor)
  const salaryRatio = offeredBaseSalary / askingBaseSalary;
  if (salaryRatio >= 1.0) {
    acceptanceRate += 0.3; // 30% bonus for meeting or exceeding asking price
  } else if (salaryRatio >= 0.9) {
    acceptanceRate += 0.1; // 10% bonus for close to asking price
  } else if (salaryRatio >= 0.8) {
    acceptanceRate -= 0.1; // 10% penalty for being 20% below
  } else {
    acceptanceRate -= 0.3; // 30% penalty for being significantly below
  }
  
  // Signing bonus comparison
  const bonusRatio = offeredSigningBonus / askingSigningBonus;
  if (bonusRatio >= 1.0) {
    acceptanceRate += 0.15;
  } else if (bonusRatio >= 0.8) {
    acceptanceRate += 0.05;
  } else if (bonusRatio < 0.5) {
    acceptanceRate -= 0.2;
  }
  
  // Contract length preference
  const yearsDiff = Math.abs(offeredYears - askingYears);
  if (yearsDiff === 0) {
    acceptanceRate += 0.1;
  } else if (yearsDiff === 1) {
    acceptanceRate += 0.05;
  } else if (yearsDiff >= 3) {
    acceptanceRate -= 0.15;
  }
  
  // Age factor (older players more likely to accept shorter deals)
  if (player.age >= 30 && offeredYears <= 3) {
    acceptanceRate += 0.1;
  } else if (player.age < 27 && offeredYears >= 4) {
    acceptanceRate += 0.1;
  }
  
  // Overall rating factor (better players are pickier)
  if (player.ovr >= 85) {
    acceptanceRate -= 0.1;
  } else if (player.ovr <= 70) {
    acceptanceRate += 0.1;
  }
  
  // Add some randomness
  const randomFactor = U.rand(-0.1, 0.1);
  acceptanceRate += randomFactor;
  
  // Clamp between 0 and 1
  acceptanceRate = Math.max(0, Math.min(1, acceptanceRate));
  
  return Math.random() < acceptanceRate;
}

function signFreeAgentWithContract(playerIndex, years, baseSalary, signingBonus) {
  console.log('Signing free agent with negotiated contract:', playerIndex);
  
  if (!window.state?.freeAgents || window.state.freeAgents.length === 0) {
    window.setStatus('No free agents available');
    return;
  }

  if (isNaN(playerIndex) || playerIndex < 0 || playerIndex >= window.state.freeAgents.length) {
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
    
    const player = window.state.freeAgents[playerIndex];
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
    
    // Update player contract with negotiated terms
    player.years = years;
    player.yearsTotal = years;
    player.baseAnnual = baseSalary;
    player.signingBonus = signingBonus;
    
    // Check salary cap
    const capHit = window.capHitFor ? window.capHitFor(player, 0) : baseSalary + (signingBonus / years);
    const capAfter = team.capUsed + capHit;
    
    if (capAfter > team.capTotal) {
      window.setStatus(`Signing would exceed salary cap by $${(capAfter - team.capTotal).toFixed(1)}M`);
      return;
    }

    // Add player to team
    team.roster.push(player);
    // Sort roster by overall rating (best players first)
    team.roster.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
    
    // Remove from free agents
    window.state.freeAgents.splice(playerIndex, 1);
    
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
    
    window.setStatus(`Signed ${player.name} (${player.pos}) for $${capHit.toFixed(1)}M cap hit`);
    console.log('Free agent signed successfully with negotiated contract:', player.name);
    
  } catch (error) {
    console.error('Error signing free agent:', error);
    window.setStatus('Error signing free agent');
  }
}

// Make sure both function names are available globally
window.generateFreeAgents = generateFreeAgents;
window.ensureFA = ensureFA;
window.openContractNegotiation = openContractNegotiation;
window.updateContractTotal = updateContractTotal;
window.closeContractModal = closeContractModal;
window.submitContractOffer = submitContractOffer;
