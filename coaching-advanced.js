// coaching-advanced.js - Advanced Coaching Features
'use strict';

/**
 * Advanced coaching features including contracts, coaching trees, and more
 */

// COACHING CONTRACTS SYSTEM
class CoachingContract {
  constructor(coach, team, details) {
    this.coach = coach;
    this.team = team;
    this.startYear = details.startYear;
    this.length = details.length;
    this.salary = details.salary || this.calculateSalary(coach);
    this.guaranteedYears = details.guaranteedYears || 0;
    this.bonuses = details.bonuses || {};
    this.clauses = details.clauses || [];
  }
  
  calculateSalary(coach) {
    const baseValues = { HC: 8000000, OC: 2000000, DC: 2000000 };
    const base = baseValues[coach.position] || 1000000;
    
    // Adjust based on coach experience and success
    const stats = coach.stats;
    let multiplier = 1.0;
    
    if (coach.position === 'HC' && stats.asHeadCoach) {
      const winPct = stats.asHeadCoach.regularSeason.winPercentage;
      const superBowls = stats.asHeadCoach.championships.superBowls;
      
      multiplier = 0.5 + (winPct * 1.5) + (superBowls * 0.3);
    }
    
    return Math.round(base * multiplier);
  }
  
  getYearsRemaining(currentYear) {
    return Math.max(0, (this.startYear + this.length) - currentYear);
  }
  
  isExpiring(currentYear) {
    return this.getYearsRemaining(currentYear) <= 1;
  }
}

/**
 * Coaching tree tracking system
 */
class CoachingTree {
  constructor() {
    this.relationships = new Map(); // mentorId -> [apprenticeIds]
    this.mentorships = new Map(); // apprenticeId -> mentorId
  }
  
  addRelationship(mentor, apprentice, years) {
    const mentorId = mentor.id;
    const apprenticeId = apprentice.id;
    
    if (!this.relationships.has(mentorId)) {
      this.relationships.set(mentorId, []);
    }
    
    this.relationships.get(mentorId).push({
      id: apprenticeId,
      name: apprentice.name,
      yearsWorkedTogether: years,
      currentPosition: apprentice.position,
      currentTeam: apprentice.currentTeam
    });
    
    this.mentorships.set(apprenticeId, {
      id: mentorId,
      name: mentor.name,
      yearsWorkedTogether: years
    });
  }
  
  getCoachingTree(coachId, maxDepth = 3) {
    const tree = { coach: coachId, apprentices: [] };
    this.buildTree(tree, coachId, maxDepth);
    return tree;
  }
  
  buildTree(node, coachId, depth) {
    if (depth <= 0) return;
    
    const apprentices = this.relationships.get(coachId) || [];
    apprentices.forEach(apprentice => {
      const apprenticeNode = { 
        coach: apprentice, 
        apprentices: [] 
      };
      node.apprentices.push(apprenticeNode);
      this.buildTree(apprenticeNode, apprentice.id, depth - 1);
    });
  }
}

/**
 * Coach development and progression system
 */
class CoachDevelopment {
  static developCoach(coach, team, season) {
    if (!coach.development) {
      coach.development = {
        experience: 0,
        specialties: [],
        tendencies: {},
        reputation: 50
      };
    }
    
    const dev = coach.development;
    dev.experience++;
    
    // Develop based on team performance
    const record = team.record;
    const winPct = record.w / (record.w + record.l + record.t);
    
    if (winPct > 0.75) {
      dev.reputation = Math.min(100, dev.reputation + 5);
    } else if (winPct < 0.3) {
      dev.reputation = Math.max(0, dev.reputation - 3);
    }
    
    // Develop specialties based on team strengths
    CoachDevelopment.developSpecialties(coach, team, season);
    
    // Update coaching ratings
    CoachDevelopment.updateCoachingRatings(coach, dev);
  }
  
  static developSpecialties(coach, team, season) {
    const offense = team.roster.filter(p => window.Constants?.OFFENSIVE_POSITIONS?.includes(p.pos) || false);
    const defense = team.roster.filter(p => window.Constants?.DEFENSIVE_POSITIONS?.includes(p.pos) || false);
    
    const offenseAvg = offense.reduce((sum, p) => sum + p.ovr, 0) / offense.length;
    const defenseAvg = defense.reduce((sum, p) => sum + p.ovr, 0) / defense.length;
    
    if (coach.position === 'HC') {
      // Head coaches develop based on overall team performance
      if (offenseAvg > 80) {
        CoachDevelopment.addSpecialty(coach, 'Offensive Guru');
      }
      if (defenseAvg > 80) {
        CoachDevelopment.addSpecialty(coach, 'Defensive Mastermind');
      }
      if (team.record.w >= 12) {
        CoachDevelopment.addSpecialty(coach, 'Winner');
      }
    } else if (coach.position === 'OC') {
      if (team.record.pf > 450) { // High scoring
        CoachDevelopment.addSpecialty(coach, 'High-Powered Offense');
      }
    } else if (coach.position === 'DC') {
      if (team.record.pa < 300) { // Low scoring allowed
        CoachDevelopment.addSpecialty(coach, 'Shutdown Defense');
      }
    }
  }
  
  static addSpecialty(coach, specialty) {
    if (!coach.development.specialties.includes(specialty)) {
      coach.development.specialties.push(specialty);
      
      // Add to career history
      if (coach.careerHistory) {
        coach.careerHistory.push({
          year: state.league?.year || 2025,
          event: 'specialty_earned',
          specialty: specialty,
          team: coach.currentTeam
        });
      }
    }
  }
  
  static updateCoachingRatings(coach, development) {
    const expBonus = Math.min(10, development.experience * 0.5);
    const repBonus = (development.reputation - 50) * 0.1;
    
    coach.playerDevelopment = Math.min(99, (coach.playerDevelopment || 75) + expBonus + repBonus);
    coach.playcalling = Math.min(99, (coach.playcalling || 75) + expBonus + repBonus);
  }
}

/**
 * Coach AI personality system
 */
class CoachPersonality {
  static generatePersonality(coach) {
    const U = window.Utils;
    
    coach.personality = {
      aggression: U ? U.rand(1, 100) : 50,        // Play calling aggression
      loyalty: U ? U.rand(1, 100) : 50,           // Loyalty to players/organization
      development: U ? U.rand(1, 100) : 50,       // Focus on player development
      innovation: U ? U.rand(1, 100) : 50,        // Willingness to try new things
      discipline: U ? U.rand(1, 100) : 50,        // Team discipline approach
      media: U ? U.rand(1, 100) : 50             // Media savviness
    };
    
    // Generate coaching philosophy based on personality
    coach.philosophy = CoachPersonality.generatePhilosophy(coach.personality);
  }
  
  static generatePhilosophy(personality) {
    const philosophies = [];
    
    if (personality.aggression > 70) {
      philosophies.push("Aggressive play-calling");
    } else if (personality.aggression < 30) {
      philosophies.push("Conservative approach");
    }
    
    if (personality.development > 70) {
      philosophies.push("Player development focused");
    }
    
    if (personality.discipline > 70) {
      philosophies.push("Disciplinarian");
    }
    
    if (personality.innovation > 70) {
      philosophies.push("Innovative strategist");
    }
    
    return philosophies.length > 0 ? philosophies : ["Traditional approach"];
  }
  
  static getPersonalityDescription(coach) {
    if (!coach.personality) return "Unknown coaching style";
    
    const p = coach.personality;
    let description = "";
    
    if (p.aggression > 75) description += "Aggressive ";
    else if (p.aggression < 25) description += "Conservative ";
    
    if (p.development > 75) description += "Player Developer ";
    if (p.discipline > 75) description += "Disciplinarian ";
    if (p.innovation > 75) description += "Innovator ";
    
    return description.trim() || "Balanced Coach";
  }
}

/**
 * Advanced coaching analytics
 */
class CoachingAnalytics {
  static calculateCoachingEfficiency(coach, team, season) {
    const expectedWins = CoachingAnalytics.calculateExpectedWins(team);
    const actualWins = team.record.w;
    
    return {
      efficiency: (actualWins / Math.max(1, expectedWins)) * 100,
      overPerformance: actualWins - expectedWins,
      expectedWins: expectedWins,
      actualWins: actualWins
    };
  }
  
  static calculateExpectedWins(team) {
    // Simple expected wins based on team talent
    const avgOvr = team.roster.reduce((sum, p) => sum + p.ovr, 0) / team.roster.length;
    const baseWins = ((avgOvr - 70) / 30) * 17; // Scale to 0-17 wins
    return Math.max(0, Math.min(17, baseWins));
  }
  
  static getCoachingGrade(coach, team, season) {
    const efficiency = CoachingAnalytics.calculateCoachingEfficiency(coach, team, season);
    const winPct = team.record.w / (team.record.w + team.record.l + team.record.t);
    
    let grade = "F";
    if (efficiency.efficiency > 120 || winPct > 0.75) grade = "A+";
    else if (efficiency.efficiency > 110 || winPct > 0.65) grade = "A";
    else if (efficiency.efficiency > 100 || winPct > 0.55) grade = "B";
    else if (efficiency.efficiency > 90 || winPct > 0.45) grade = "C";
    else if (efficiency.efficiency > 80 || winPct > 0.35) grade = "D";
    
    return {
      grade: grade,
      efficiency: efficiency,
      winPercentage: winPct
    };
  }
}

/**
 * Coach hiring and firing system
 */
class CoachingMarket {
  static getAvailableCoaches(position = 'HC') {
    const availableCoaches = [];
    
    // Generate some unemployed coaches
    for (let i = 0; i < 10; i++) {
      const coach = CoachingMarket.generateUnemployedCoach(position);
      availableCoaches.push(coach);
    }
    
    return availableCoaches.sort((a, b) => b.overallRating - a.overallRating);
  }
  
  static generateUnemployedCoach(position) {
    const U = window.Utils;
    const firstNames = ['Mike', 'John', 'Bill', 'Tom', 'Jim', 'Dave', 'Steve', 'Dan', 'Ron', 'Joe', 'Matt', 'Kyle', 'Sean', 'Andy', 'Rex'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Jackson'];
    
    const coach = {
      id: U ? U.id() : Math.random().toString(36).slice(2),
      name: (U ? U.choice(firstNames) : firstNames[0]) + ' ' + (U ? U.choice(lastNames) : lastNames[0]),
      position: position,
      age: U ? U.rand(35, 65) : 45,
      playerDevelopment: U ? U.rand(40, 95) : 75,
      playcalling: U ? U.rand(40, 95) : 75,
      scouting: U ? U.rand(40, 95) : 75,
      isUnemployed: true,
      yearsUnemployed: U ? U.rand(0, 3) : 1
    };
    
    // Calculate overall rating
    coach.overallRating = Math.round((coach.playerDevelopment + coach.playcalling + coach.scouting) / 3);
    
    // Initialize coaching stats
    if (window.initializeCoachingStats) {
      window.initializeCoachingStats(coach);
    }
    
    // Generate personality
    CoachPersonality.generatePersonality(coach);
    
    // Generate some coaching history
    CoachingMarket.generateCoachHistory(coach);
    
    return coach;
  }
  
  static generateCoachHistory(coach) {
    const U = window.Utils;
    const experience = Math.max(0, coach.age - U.rand(25, 35));
    
    if (experience > 0 && coach.stats) {
      if (coach.position === 'HC') {
        const hcStats = coach.stats.asHeadCoach;
        const seasons = Math.min(experience, U.rand(1, 15));
        
        hcStats.seasons = seasons;
        hcStats.regularSeason.wins = U.rand(seasons * 2, seasons * 12);
        hcStats.regularSeason.losses = (seasons * 17) - hcStats.regularSeason.wins;
        hcStats.regularSeason.winPercentage = hcStats.regularSeason.wins / (hcStats.regularSeason.wins + hcStats.regularSeason.losses);
        
        // Possibly add championships based on success
        if (hcStats.regularSeason.winPercentage > 0.6) {
          hcStats.championships.superBowls = U.rand(0, 2);
          hcStats.championships.conferenceChampionships = U.rand(0, 4);
        }
      }
    }
  }
  
  static calculateHiringCost(coach, team) {
    const baseCost = coach.position === 'HC' ? 8000000 : 2000000;
    const experienceMultiplier = 1 + (coach.stats.asHeadCoach?.seasons || 0) * 0.05;
    const successMultiplier = 1 + (coach.stats.asHeadCoach?.championships?.superBowls || 0) * 0.2;
    
    return Math.round(baseCost * experienceMultiplier * successMultiplier);
  }
}

/**
 * Enhanced coaching view with advanced features
 */
function renderAdvancedCoachingStats() {
  const L = state.league;
  if (!L) return;
  
  // Get all coaches with advanced analytics
  const allCoaches = [];
  
  L.teams.forEach(team => {
    if (team.staff) {
      ['headCoach', 'offCoordinator', 'defCoordinator'].forEach(role => {
        const coach = team.staff[role];
        if (coach) {
          coach.currentTeam = team.abbr;
          coach.currentTeamName = team.name;
          
          // Add advanced analytics
          if (coach.position === 'HC') {
            coach.analytics = CoachingAnalytics.getCoachingGrade(coach, team, L.year);
            coach.efficiency = CoachingAnalytics.calculateCoachingEfficiency(coach, team, L.year);
          }
          
          // Add personality if missing
          if (!coach.personality) {
            CoachPersonality.generatePersonality(coach);
          }
          
          allCoaches.push(coach);
        }
      });
    }
  });
  
  const coachingView = document.getElementById('coaching');
  if (!coachingView) return;
  
  coachingView.innerHTML = `
    <div class="card">
      <h2>Advanced Coaching Analytics</h2>
      <div class="coaching-tabs">
        <button class="tab-btn active" data-tab="active">Active Coaches</button>
        <button class="tab-btn" data-tab="analytics">Performance Analytics</button>
        <button class="tab-btn" data-tab="market">Coaching Market</button>
        <button class="tab-btn" data-tab="trees">Coaching Trees</button>
        <button class="tab-btn" data-tab="hof">Hall of Fame</button>
      </div>
      
      <div id="coaching-content">
        ${renderActiveCoachesAdvanced(allCoaches)}
      </div>
    </div>
  `;
  
  // Set up advanced tab switching
  setupAdvancedCoachingTabs(allCoaches);
}

function renderActiveCoachesAdvanced(coaches) {
  const headCoaches = coaches.filter(c => c.position === 'HC');
  
  return `
    <div class="coaching-section">
      <h3>Head Coaches - Season Performance</h3>
      <table class="coaching-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Team</th>
            <th>Record</th>
            <th>Grade</th>
            <th>Efficiency</th>
            <th>Philosophy</th>
            <th>Contract</th>
          </tr>
        </thead>
        <tbody>
          ${headCoaches.map(coach => renderAdvancedCoachRow(coach)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderAdvancedCoachRow(coach) {
  const team = state.league.teams.find(t => t.abbr === coach.currentTeam);
  const record = team ? `${team.record.w}-${team.record.l}-${team.record.t}` : 'N/A';
  const grade = coach.analytics ? coach.analytics.grade : 'N/A';
  const efficiency = coach.efficiency ? `${coach.efficiency.efficiency.toFixed(1)}%` : 'N/A';
  const philosophy = coach.philosophy ? coach.philosophy.slice(0, 2).join(', ') : 'Traditional';
  
  return `
    <tr${coach.isUser ? ' class="user-row"' : ''}>
      <td>${coach.name}${coach.isUser ? ' (You)' : ''}</td>
      <td>${coach.currentTeamName}</td>
      <td>${record}</td>
      <td><span class="grade-${grade.replace('+', 'plus')}">${grade}</span></td>
      <td>${efficiency}</td>
      <td>${philosophy}</td>
      <td>Year 1 of 4</td>
    </tr>
  `;
}

function setupAdvancedCoachingTabs(allCoaches) {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tab = btn.dataset.tab;
      const content = document.getElementById('coaching-content');
      
      switch(tab) {
        case 'active':
          content.innerHTML = renderActiveCoachesAdvanced(allCoaches);
          break;
        case 'analytics':
          content.innerHTML = renderCoachingAnalytics(allCoaches);
          break;
        case 'market':
          content.innerHTML = renderCoachingMarket();
          break;
        case 'trees':
          content.innerHTML = renderCoachingTrees(allCoaches);
          break;
        case 'hof':
          content.innerHTML = renderCoachingHallOfFame(allCoaches);
          break;
      }
    });
  });
}

function renderCoachingAnalytics(coaches) {
  return `
    <div class="coaching-section">
      <h3>Performance Analytics</h3>
      <div class="analytics-grid">
        ${coaches.filter(c => c.position === 'HC').map(coach => `
          <div class="analytics-card">
            <h4>${coach.name} - ${coach.currentTeamName}</h4>
            <div class="analytics-stats">
              <div class="stat">
                <span class="stat-label">Coaching Grade</span>
                <span class="stat-value grade-${coach.analytics?.grade?.replace('+', 'plus') || 'F'}">${coach.analytics?.grade || 'N/A'}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Efficiency</span>
                <span class="stat-value">${coach.efficiency?.efficiency?.toFixed(1) || 'N/A'}%</span>
              </div>
              <div class="stat">
                <span class="stat-label">Expected Wins</span>
                <span class="stat-value">${coach.efficiency?.expectedWins?.toFixed(1) || 'N/A'}</span>
              </div>
              <div class="stat">
                <span class="stat-label">Over/Under</span>
                <span class="stat-value ${(coach.efficiency?.overPerformance || 0) >= 0 ? 'positive' : 'negative'}">
                  ${coach.efficiency?.overPerformance?.toFixed(1) || 'N/A'}
                </span>
              </div>
            </div>
            <div class="personality">
              <strong>Style:</strong> ${CoachPersonality.getPersonalityDescription(coach)}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderCoachingMarket() {
  const availableHC = CoachingMarket.getAvailableCoaches('HC').slice(0, 5);
  
  return `
    <div class="coaching-section">
      <h3>Available Head Coaches</h3>
      <table class="coaching-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Age</th>
            <th>Overall</th>
            <th>Experience</th>
            <th>Last Job</th>
            <th>Estimated Cost</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${availableHC.map(coach => `
            <tr>
              <td>${coach.name}</td>
              <td>${coach.age}</td>
              <td>${coach.overallRating}</td>
              <td>${coach.stats.asHeadCoach.seasons} seasons</td>
              <td>${coach.yearsUnemployed} years ago</td>
              <td>$${(CoachingMarket.calculateHiringCost(coach) / 1000000).toFixed(1)}M</td>
              <td><button class="btn hire-coach" data-coach-id="${coach.id}">Hire</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderCoachingTrees(coaches) {
  return `
    <div class="coaching-section">
      <h3>Coaching Trees</h3>
      <p class="muted">Coaching tree functionality coming in future update...</p>
      <div class="tree-preview">
        <div class="tree-node">
          <strong>Bill Belichick Tree</strong>
          <div class="tree-branches">
            <div class="branch">• Mike Vrabel (Former HC)</div>
            <div class="branch">• Josh McDaniels (OC)</div>
            <div class="branch">• Matt Patricia (DC)</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Make functions globally available
window.CoachingContract = CoachingContract;
window.CoachingTree = CoachingTree;
window.CoachDevelopment = CoachDevelopment;
window.CoachPersonality = CoachPersonality;
window.CoachingAnalytics = CoachingAnalytics;
window.CoachingMarket = CoachingMarket;
window.renderAdvancedCoachingStats = renderAdvancedCoachingStats;
