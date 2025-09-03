// draft-fixed.js - Fixed Draft System with proper syntax
'use strict';

/**
 * Generate draft prospects for upcoming draft
 * @param {number} year - Draft year
 * @returns {Array} Array of prospect objects
 */
function generateProspects(year) {
  console.log('Generating prospects for', year);
  
  const C = window.Constants;
  const U = window.Utils;
  
  if (!C || !U) {
    console.error('Constants or Utils not available for prospect generation');
    return [];
  }
  
  const prospects = [];
  const totalProspects = C.DRAFT_CONFIG?.TOTAL_PROSPECTS || 250;
  
  // Position distribution (realistic for NFL draft)
  const positionWeights = {
    'QB': 8,   'RB': 15,  'WR': 25,  'TE': 12,  'OL': 35,
    'DL': 30,  'LB': 20,  'CB': 18,  'S': 15,   'K': 3,   'P': 2
  };
  
  // Create weighted position array
  const weightedPositions = [];
  Object.keys(positionWeights).forEach(pos => {
    for (let i = 0; i < positionWeights[pos]; i++) {
      weightedPositions.push(pos);
    }
  });
  
  for (let i = 0; i < totalProspects; i++) {
    const prospect = makeProspect(year, i, weightedPositions);
    if (prospect) {
      prospects.push(prospect);
    }
  }
  
  // Sort by projected round (best prospects first)
  prospects.sort((a, b) => {
    if (a.projectedRound !== b.projectedRound) {
      return a.projectedRound - b.projectedRound;
    }
    return b.ovr - a.ovr;
  });
  
  // Assign draft rankings
  prospects.forEach((prospect, index) => {
    prospect.draftRanking = index + 1;
  });
  
  console.log('Generated', prospects.length, 'prospects');
  return prospects;
}

/**
 * Create a single draft prospect
 * @param {number} year - Draft year
 * @param {number} index - Prospect index
 * @param {Array} weightedPositions - Weighted array of positions
 * @returns {Object} Prospect object
 */
function makeProspect(year, index, weightedPositions) {
  const U = window.Utils;
  const C = window.Constants;
  
  if (!U) return null;
  
  try {
    const pos = U.choice(weightedPositions || C.POSITIONS);
    const age = U.rand(21, 23); // College players
    
    // Generate base ratings
    let baseOvr;
    if (index < 32) {
      baseOvr = U.rand(75, 88); // First round talent
    } else if (index < 64) {
      baseOvr = U.rand(68, 82); // Second round talent  
    } else if (index < 96) {
      baseOvr = U.rand(62, 78); // Third round talent
    } else if (index < 224) {
      baseOvr = U.rand(55, 72); // Mid-round talent
    } else {
      baseOvr = U.rand(50, 65); // Late round talent
    }
    
    // Calculate projected round
    let projectedRound;
    if (baseOvr >= 80) projectedRound = 1;
    else if (baseOvr >= 75) projectedRound = 2;
    else if (baseOvr >= 70) projectedRound = 3;
    else if (baseOvr >= 65) projectedRound = 4;
    else if (baseOvr >= 60) projectedRound = 5;
    else if (baseOvr >= 55) projectedRound = 6;
    else projectedRound = 7;
    
    // Generate detailed ratings
    const ratings = window.generatePlayerRatings ? window.generatePlayerRatings(pos) : generateBasicRatings(pos, baseOvr);
    
    const prospect = {
      id: U.id(),
      name: generateProspectName(),
      pos: pos,
      age: age,
      year: year,
      
      // Ratings and overall
      ratings: ratings,
      ovr: baseOvr,
      
      // Draft info
      projectedRound: projectedRound,
      draftRanking: 0, // Will be set after sorting
      
      // Scouting info (fog of war)
      scouted: false,
      scoutingReports: [],
      
      // Potential ranges (what scouts think vs reality)
      scoutedOvr: {
        min: Math.max(40, baseOvr - U.rand(5, 15)),
        max: Math.min(99, baseOvr + U.rand(5, 15)),
        confidence: U.rand(50, 90)
      },
      
      // College info
      college: generateCollege(),
      collegeStats: generateCollegeStats(pos),
      
      // Character/background
      character: {
        workEthic: U.rand(60, 95),
        coachability: U.rand(65, 95),
        leadership: U.rand(50, 90),
        injury_prone: Math.random() < 0.15,
        red_flags: Math.random() < 0.05
      },
      
      // Contract info (rookie contracts)
      years: 4,
      yearsTotal: 4,
      baseAnnual: calculateRookieContract(projectedRound, index),
      signingBonus: 0,
      guaranteedPct: 1.0, // Rookie contracts fully guaranteed
      
      // Initialize stats
      stats: { game: {}, season: {}, career: {} },
      abilities: [],
      awards: []
    };
    
    // Add abilities
    if (window.tagAbilities) {
      window.tagAbilities(prospect);
    }
    
    return prospect;
    
  } catch (error) {
    console.error('Error creating prospect:', error);
    return null;
  }
}

/**
 * Generate basic ratings for position if detailed function not available
 */
function generateBasicRatings(pos, baseOvr) {
  const U = window.Utils;
  const variance = 8; // +/- variance from base
  
  const ratings = {};
  const allStats = [
    'throwPower', 'throwAccuracy', 'awareness', 'catching', 'catchInTraffic',
    'acceleration', 'speed', 'agility', 'trucking', 'juking', 'passRushSpeed',
    'passRushPower', 'runStop', 'coverage', 'runBlock', 'passBlock',
    'intelligence', 'kickPower', 'kickAccuracy'
  ];
  
  allStats.forEach(stat => {
    ratings[stat] = U.clamp(baseOvr + U.rand(-variance, variance), 40, 99);
  });
  
  return ratings;
}

/**
 * Generate prospect name
 */
function generateProspectName() {
  const U = window.Utils;
  // Use expanded names for maximum variety (1,000,000+ combinations)
  const firstNames = window.EXPANDED_FIRST_NAMES || window.FIRST_NAMES || ['John', 'Mike', 'David', 'Chris', 'Matt'];
  const lastNames = window.EXPANDED_LAST_NAMES || window.LAST_NAMES || ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'];
  
  return U.choice(firstNames) + ' ' + U.choice(lastNames);
}

/**
 * Generate college name
 */
function generateCollege() {
  const U = window.Utils;
  const colleges = [
    'Alabama', 'Ohio State', 'Georgia', 'Clemson', 'Oklahoma', 'LSU', 'Florida',
    'Michigan', 'Penn State', 'Texas', 'Notre Dame', 'USC', 'Oregon', 'Wisconsin',
    'Iowa', 'Miami', 'Florida State', 'Auburn', 'Tennessee', 'Kentucky', 'Utah',
    'TCU', 'Baylor', 'Oklahoma State', 'Michigan State', 'Nebraska', 'UCLA'
  ];
  
  return U.choice(colleges);
}

/**
 * Generate college statistics
 */
function generateCollegeStats(pos) {
  const U = window.Utils;
  const stats = {};
  
  if (pos === 'QB') {
    stats.passYd = U.rand(2500, 4500);
    stats.passTD = U.rand(20, 45);
    stats.interceptions = U.rand(5, 15);
  } else if (pos === 'RB') {
    stats.rushYd = U.rand(800, 2000);
    stats.rushTD = U.rand(8, 25);
    stats.receptions = U.rand(15, 60);
  } else if (pos === 'WR' || pos === 'TE') {
    stats.receptions = U.rand(30, 90);
    stats.recYd = U.rand(600, 1500);
    stats.recTD = U.rand(5, 20);
  }
  
  return stats;
}

/**
 * Calculate rookie contract value
 */
function calculateRookieContract(round, pick) {
  // Simplified rookie wage scale
  const roundValues = {
    1: { min: 4.0, max: 8.5 },
    2: { min: 2.5, max: 4.0 },
    3: { min: 1.8, max: 2.5 },
    4: { min: 1.2, max: 1.8 },
    5: { min: 0.9, max: 1.2 },
    6: { min: 0.7, max: 0.9 },
    7: { min: 0.5, max: 0.7 }
  };
  
  const values = roundValues[round] || roundValues[7];
  const U = window.Utils;
  
  return U ? U.rand(values.min * 10, values.max * 10) / 10 : values.min;
}

/**
 * Render the draft/scouting view
 */
function renderDraft() {
  console.log('Rendering draft...');
  
  try {
    const L = state.league;
    if (!L) {
      console.error('No league available for draft');
      return;
    }
    
    // Ensure draft class exists
    if (!state.draftClass || state.draftClass.length === 0) {
      const draftYear = L.year + 1;
      state.draftClass = generateProspects(draftYear);
      console.log('Generated draft class for', draftYear);
    }
    
    // Update draft year display
    const draftYearEl = document.getElementById('draftYear');
    if (draftYearEl) {
      draftYearEl.textContent = L.year + 1;
    }
    
    // Get team for picks display
    const teamSelect = document.getElementById('draftTeam');
    if (teamSelect && !teamSelect.dataset.filled && window.fillTeamSelect) {
      window.fillTeamSelect(teamSelect);
      teamSelect.dataset.filled = '1';
    }
    
    const teamId = parseInt(teamSelect?.value || state.userTeamId || '0', 10);
    const team = L.teams[teamId];
    
    if (team) {
      // Render team's picks
      renderTeamPicks(team, L);
    }
    
    // Render top prospects  
    renderTopProspects();
    
    console.log('✅ Draft rendered successfully');
    
  } catch (error) {
    console.error('Error rendering draft:', error);
  }
}

/**
 * Render team's draft picks
 */
function renderTeamPicks(team, league) {
  const picksContainer = document.getElementById('draftPicks');
  if (!picksContainer) return;
  
  try {
    const draftYear = league.year + 1;
    const teamPicks = team.picks?.filter(pick => pick.year === draftYear) || [];
    
    if (teamPicks.length === 0) {
      picksContainer.innerHTML = '<div class="card"><p>No picks for upcoming draft</p></div>';
      return;
    }
    
    // Sort picks by round
    teamPicks.sort((a, b) => a.round - b.round);
    
    picksContainer.innerHTML = `
      <div class="card">
        <h3>${team.name} - ${draftYear} Draft Picks</h3>
        <div class="draft-picks-grid">
          ${teamPicks.map(pick => {
            const value = window.pickValue ? window.pickValue(pick) : calculateBasicPickValue(pick);
            return `
              <div class="draft-pick-card">
                <div class="round">Round ${pick.round}</div>
                <div class="details">
                  <div>Year: ${pick.year}</div>
                  <div>From: ${pick.from}</div>
                  <div>Value: ${value.toFixed(1)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error rendering team picks:', error);
    picksContainer.innerHTML = '<div class="card"><p>Error loading draft picks</p></div>';
  }
}

/**
 * Render top prospects
 */
function renderTopProspects() {
  const draftContainer = document.getElementById('scoutingList');
  if (!draftContainer || !state.draftClass) return;
  
  try {
    const topProspects = state.draftClass.slice(0, 50); // Show top 50
    
    draftContainer.innerHTML = topProspects.map(prospect => {
      const scoutingInfo = getScoutingInfo(prospect);
      
      return `
        <div class="prospect-card">
          <div class="prospect-header">
            <h4>${prospect.name}</h4>
            <div class="prospect-info">
              <span class="pos">${prospect.pos}</span>
              <span class="college">${prospect.college}</span>
              <span class="age">Age ${prospect.age}</span>
            </div>
          </div>
          <div class="prospect-ratings">
            <div class="rating-item">
              <span>Overall</span>
              <span class="ovr-${getOvrClass(scoutingInfo.ovr)}">${scoutingInfo.ovr}</span>
            </div>
            <div class="rating-item">
              <span>Projected</span>
              <span>Round ${prospect.projectedRound}</span>
            </div>
            <div class="rating-item">
              <span>Confidence</span>
              <span>${scoutingInfo.confidence}%</span>
            </div>
          </div>
          <div class="prospect-actions">
            <button class="btn btn-scout" data-prospect-id="${prospect.id}">
              ${prospect.scouted ? 'Scouted' : 'Scout Player'}
            </button>
          </div>
        </div>
      `;
    }).join('');
    
    // Set up scouting buttons
    draftContainer.addEventListener('click', handleProspectClick);
    
  } catch (error) {
    console.error('Error rendering prospects:', error);
  }
}

/**
 * Handle clicking on prospect cards
 */
function handleProspectClick(e) {
  if (e.target.classList.contains('btn-scout')) {
    const prospectId = e.target.dataset.prospectId;
    scoutProspect(prospectId);
  }
}

/**
 * Scout a prospect (reveals more accurate information)
 */
function scoutProspect(prospectId) {
  const prospect = state.draftClass?.find(p => p.id === prospectId);
  if (!prospect) return;
  
  if (prospect.scouted) {
    window.setStatus(prospect.name + ' has already been scouted');
    return;
  }
  
  // Mark as scouted
  prospect.scouted = true;
  
  // Improve scouting accuracy
  const U = window.Utils;
  const actualOvr = prospect.ovr;
  const scoutingAccuracy = U.rand(85, 95); // Pretty accurate scouting
  
  prospect.scoutedOvr = {
    min: Math.max(40, actualOvr - U.rand(2, 5)),
    max: Math.min(99, actualOvr + U.rand(2, 5)),
    confidence: scoutingAccuracy
  };
  
  // Add scouting report
  prospect.scoutingReports.push({
    date: new Date().toISOString(),
    scout: 'Head Scout',
    notes: generateScoutingNotes(prospect),
    grade: getProspectGrade(prospect)
  });
  
  window.setStatus(`Scouted ${prospect.name} - ${getProspectGrade(prospect)} grade`);
  
  // Re-render to show updated info
  renderTopProspects();
}

/**
 * Generate scouting notes
 */
function generateScoutingNotes(prospect) {
  const notes = [];
  
  if (prospect.character.workEthic >= 90) notes.push('Exceptional work ethic');
  if (prospect.character.leadership >= 85) notes.push('Natural leader');
  if (prospect.character.injury_prone) notes.push('Injury concerns');
  if (prospect.character.red_flags) notes.push('Character questions');
  
  const r = prospect.ratings;
  if (r.speed >= 90) notes.push('Elite speed');
  if (r.awareness >= 85) notes.push('High football IQ');
  
  return notes.length > 0 ? notes.join(', ') : 'Solid prospect';
}

/**
 * Get prospect grade
 */
function getProspectGrade(prospect) {
  if (prospect.ovr >= 85) return 'A';
  if (prospect.ovr >= 80) return 'B+';
  if (prospect.ovr >= 75) return 'B';
  if (prospect.ovr >= 70) return 'B-';
  if (prospect.ovr >= 65) return 'C+';
  if (prospect.ovr >= 60) return 'C';
  return 'C-';
}

/**
 * Get scouting information (respects fog of war)
 */
function getScoutingInfo(prospect) {
  if (prospect.scouted) {
    return {
      ovr: `${prospect.scoutedOvr.min}-${prospect.scoutedOvr.max}`,
      confidence: prospect.scoutedOvr.confidence
    };
  } else {
    // Very rough estimate before scouting
    return {
      ovr: `${prospect.scoutedOvr.min}-${prospect.scoutedOvr.max}`,
      confidence: prospect.scoutedOvr.confidence
    };
  }
}

/**
 * Get CSS class for overall rating
 */
function getOvrClass(ovr) {
  if (typeof ovr === 'string') {
    const nums = ovr.split('-').map(n => parseInt(n));
    ovr = Math.max(...nums);
  }
  
  if (ovr >= 85) return 'elite';
  if (ovr >= 80) return 'very-good'; 
  if (ovr >= 75) return 'good';
  if (ovr >= 65) return 'average';
  return 'below-average';
}

/**
 * Calculate basic pick value if main function not available
 */
function calculateBasicPickValue(pick) {
  const baseValues = { 1: 25, 2: 15, 3: 8, 4: 5, 5: 3, 6: 2, 7: 1 };
  const baseValue = baseValues[pick.round] || 1;
  
  // Discount for future years
  const yearsOut = pick.year - (state.league?.year || 2025);
  const discount = Math.pow(0.8, Math.max(0, yearsOut));
  
  return baseValue * discount;
}

/**
 * Execute a draft pick
 */
function makeDraftPick(teamId, prospectId) {
  const L = state.league;
  const team = L.teams[teamId];
  const prospect = state.draftClass?.find(p => p.id === prospectId);
  
  if (!team || !prospect) {
    window.setStatus('Invalid draft pick selection');
    return false;
  }
  
  try {
    // Add player to team roster
    team.roster.push(prospect);
    team.roster.sort((a, b) => b.ovr - a.ovr);
    
    // Remove from draft class
    const prospectIndex = state.draftClass.findIndex(p => p.id === prospectId);
    if (prospectIndex >= 0) {
      state.draftClass.splice(prospectIndex, 1);
    }
    
    // Remove used pick from team
    const draftYear = L.year + 1;
    const pickIndex = team.picks.findIndex(p => p.year === draftYear);
    if (pickIndex >= 0) {
      team.picks.splice(pickIndex, 1);
    }
    
    // Update salary cap
    if (window.recalcCap) {
      window.recalcCap(L, team);
    }
    
    window.setStatus(`${team.name} drafts ${prospect.name} (${prospect.pos})`);
    
    // Re-render
    renderDraft();
    
    return true;
    
  } catch (error) {
    console.error('Error making draft pick:', error);
    return false;
  }
}

// Make functions globally available
window.generateProspects = generateProspects;
window.makeProspect = makeProspect;
window.generateBasicRatings = generateBasicRatings;
window.generateProspectName = generateProspectName;
window.generateCollege = generateCollege;
window.generateCollegeStats = generateCollegeStats;
window.calculateRookieContract = calculateRookieContract;
window.renderDraft = renderDraft;
window.renderTopProspects = renderTopProspects;
window.scoutProspect = scoutProspect;
window.makeDraftPick = makeDraftPick;

// Add draft CSS
const draftCSS = `
.draft-picks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.draft-pick-card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-md);
  padding: 1rem;
  text-align: center;
}

.draft-pick-card .round {
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 0.5rem;
}

.prospect-card {
  background: var(--surface);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-lg);
  padding: 1rem;
  margin-bottom: 1rem;
}

.prospect-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.prospect-header h4 {
  color: var(--text);
  margin: 0;
}

.prospect-info {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--text-muted);
}

.prospect-ratings {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

.rating-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rating-item span:first-child {
  font-size: 0.875rem;
  color: var(--text-muted);
}

.rating-item span:last-child {
  font-weight: 600;
  color: var(--text);
}

.prospect-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-scout {
  background: var(--accent);
  color: white;
  border: none;
}

.btn-scout:hover {
  background: var(--accent-hover);
}

.ovr-elite { color: #34C759; }
.ovr-very-good { color: #00D4AA; }
.ovr-good { color: var(--accent); }
.ovr-average { color: var(--warning); }
.ovr-below-average { color: var(--danger); }
`;

// Inject draft CSS
const draftStyleElement = document.createElement('style');
draftStyleElement.textContent = draftCSS;
document.head.appendChild(draftStyleElement);

console.log('✅ Draft system fixed and loaded');
