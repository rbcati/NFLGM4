// freeAgency.js - Fixed Syntax Error
'use strict';

function ensureFA() {
  if (state.freeAgents && state.freeAgents.length > 0) {
    return; // FA pool already exists
  }
  
  const C = window.Constants;
  const U = window.Utils;
  
  if (!C || !U) {
    console.error('Constants or Utils not available for FA generation');
    return;
  }

  // Initialize free agents array if it doesn't exist
  if (!state.freeAgents) {
    state.freeAgents = [];
  }

  const poolSize = C.FREE_AGENCY?.POOL_SIZE || 120;
  
  for (let i = 0; i < poolSize; i++) {
    const pos = U.choice(C.POSITIONS);
    
    // Use makePlayer if available, otherwise create basic player
    let player;
    if (window.makePlayer) {
      player = window.makePlayer(pos);
    } else {
      // Fallback player creation
      player = {
        id: U.id(),
        name: generateBasicName(),
        pos: pos,
        age: U.rand(22, 35),
        ovr: U.rand(60, 88),
        years: 0,
        yearsTotal: C.FREE_AGENCY?.DEFAULT_YEARS || 2,
        baseAnnual: U.rand(1, 15),
        signingBonus: U.rand(0.5, 8),
        guaranteedPct: C.FREE_AGENCY?.GUARANTEED_PCT || 0.5,
        stats: { game: {}, season: {}, career: {} },
        abilities: []
      };
    }
    
    // Adjust for free agency market
    player.years = 0; // Contract expired
    player.baseAnnual = Math.round(player.baseAnnual * (C.FREE_AGENCY?.CONTRACT_DISCOUNT || 0.9) * 10) / 10;
    player.signingBonus = Math.round((player.baseAnnual * player.yearsTotal * 0.4) * 10) / 10;
    
    // Add abilities if the function exists
    if (window.tagAbilities) {
      window.tagAbilities(player);
    }
    
    state.freeAgents.push(player);
  }
  
  // Sort by overall rating (best players first)
  state.freeAgents.sort((a, b) => b.ovr - a.ovr);
  
  console.log(`Generated ${state.freeAgents.length} free agents`);
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

function renderFreeAgency() {
  console.log('Rendering free agency...');
  
  try {
    ensureFA();
    
    const L = state.league;
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
    
    state.freeAgents.forEach((p, i) => {
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
  
  if (!state.freeAgents || state.freeAgents.length === 0) {
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

  if (isNaN(idx) || idx < 0 || idx >= state.freeAgents.length) {
    window.setStatus('Invalid free agent selection.');
    return;
  }

  try {
    const L = state.league;
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
    
    const player = state.freeAgents[idx];
    if (!player) {
      window.setStatus('Player not found');
      return;
    }
    
    // Check role permissions if in career mode
    if (state.playerRole && state.playerRole !== 'GM') {
      const C = window.Constants;
      const isOffensive = C.OFFENSIVE_POSITIONS.includes(player.pos);
      const canSign = state.playerRole === 'GM' || 
                      (state.playerRole === 'OC' && isOffensive) || 
                      (state.playerRole === 'DC' && !isOffensive);

      if (!canSign) {
        window.setStatus(`As ${state.playerRole}, you cannot sign ${player.pos}s.`);
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
    state.freeAgents.splice(idx, 1);
    
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
  return state.freeAgents || [];
}

// Make sure both function names are available globally
window.generateFreeAgents = generateFreeAgents;
window.ensureFA = ensureFA;
