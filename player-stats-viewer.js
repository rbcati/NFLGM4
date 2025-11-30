// player-stats-viewer.js - ENHANCED Player Statistics Viewer System
'use strict';

/**
 * Player statistics viewer system
 * Now includes Progression (XP/Skill Tree) and Legacy data.
 */

class PlayerStatsViewer {
    constructor() {
        this.currentPlayer = null;
        this.modal = null;
        this.initialized = false;
        this.waitForLeague();
    }

    async waitForLeague() {
        // Wait for league to be ready before initializing
        let attempts = 0;
        const maxAttempts = 100; 
        
        while (attempts < maxAttempts) {
            if (window.state && window.state.league && window.state.league.teams) {
                this.init();
                this.initialized = true;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        console.warn('PlayerStatsViewer: League not ready after timeout, initializing anyway');
        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();
        
        // Auto-make players clickable after a short delay
        setTimeout(() => {
            this.makePlayersClickable();
        }, 500);
        
        // Set up observer to watch for new player rows
        this.setupDOMObserver();
    }

    createModal() {
        // Create modal for player stats
        this.modal = document.createElement('div');
        this.modal.id = 'playerStatsModal';
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="playerModalTitle">Player Statistics</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body" id="playerModalBody">
                    <div class="player-info">
                        <div class="player-header">
                            <div class="player-name" id="playerName"></div>
                            <div class="player-position" id="playerPosition"></div>
                            <div class="player-team" id="playerTeam"></div>
                        </div>
                        <div class="player-stats-grid" id="playerStatsGrid"></div>
                    </div>
                </div>
                <div class="modal-progression-ui" id="playerProgressionUI"></div>
            </div>
        `;
        
        document.body.appendChild(this.modal);
        
        // Close modal when clicking X
        const closeBtn = this.modal.querySelector('.close');
        closeBtn.onclick = () => this.hideModal();
        
        // Close modal when clicking outside
        this.modal.onclick = (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        };
    }

    setupEventListeners() {
        // Make all player rows clickable
        document.addEventListener('click', (e) => {
            if (e.target.closest('.player-row') || e.target.closest('tr[data-player-id]')) {
                const playerRow = e.target.closest('.player-row') || e.target.closest('tr[data-player-id]');
                const playerId = playerRow.dataset.playerId;
                if (playerId) {
                    this.showPlayerStats(playerId);
                }
            }
        });
    }

    // Existing cleanupStalePlayerIds, showPlayerStats, displayPlayerStats are UNCHANGED

    /**
     * Finds and displays player information and dynamically generated stats.
     */
    displayPlayerStats(player, team) {
        // Update modal title and basic info
        document.getElementById('playerModalTitle').textContent = `${player.name} - Statistics`;
        document.getElementById('playerName').textContent = player.name;
        document.getElementById('playerPosition').textContent = player.pos || player.position || 'N/A';
        document.getElementById('playerTeam').textContent = team ? team.name : 'Unknown Team';

        // Generate stats grid based on position
        const statsGrid = document.getElementById('playerStatsGrid');
        statsGrid.innerHTML = this.generateStatsHTML(player, team);

        // Generate and display the Skill Tree UI
        const progressionUI = document.getElementById('playerProgressionUI');
        progressionUI.innerHTML = this.generateProgressionUI(player);
    }
    
    // ----------------------------------------------------
    // 🌳 NEW: Skill Tree UI Generation (For Display Only)
    // ----------------------------------------------------
    generateProgressionUI(player) {
        const prog = player.progression;
        const skillTree = window.SKILL_TREES?.[player.pos] || [];
        let html = '<div class="progression-panel">';

        html += `
            <h3 class="progression-header">🚀 Progression & Skill Tree</h3>
            <div class="xp-bar">
                <span class="xp-label">XP:</span> 
                <span class="xp-value">${prog?.xp || 0} / 1000</span>
                | 
                <span class="sp-label">Skill Points:</span>
                <span class="sp-value">${prog?.skillPoints || 0} SP</span>
            </div>
            <div class="progression-info">
                <div class="stats-row">
                    <span class="stat-label">Development Trait:</span>
                    <span class="stat-value">${player.devTrait || 'Normal'}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Potential (POT):</span>
                    <span class="stat-value">${player.potential || 'N/A'}</span>
                </div>
            </div>
            <hr>
            <h4>Available Upgrades (${player.pos} Tree)</h4>
        `;

        if (skillTree.length === 0) {
            html += '<p>No defined skill tree for this position. This player progresses passively.</p>';
        } else {
            html += '<ul class="skill-tree-list">';
            skillTree.forEach(skill => {
                const isPurchased = prog?.upgrades.includes(skill.name);
                const statusClass = isPurchased ? 'skill-purchased' : 'skill-available';
                const buttonText = isPurchased ? 'Purchased' : `Buy (${skill.cost} SP)`;

                // Display Boosts nicely
                const boostString = Object.entries(skill.boosts).map(([stat, boost]) => 
                    `${this.formatRatingName(stat)} +${boost}`
                ).join(', ');

                html += `
                    <li class="${statusClass}">
                        <span class="skill-name">${skill.name}</span>
                        <span class="skill-boosts">(${boostString})</span>
                        <button class="skill-buy-btn" data-skill="${skill.name}" 
                                ${isPurchased || (prog?.skillPoints || 0) < skill.cost ? 'disabled' : ''}>
                            ${buttonText}
                        </button>
                    </li>
                `;
            });
            html += '</ul>';
            
            // Add handler for buying skills (example, requires back-end integration)
            setTimeout(() => {
                this.modal.querySelectorAll('.skill-buy-btn').forEach(btn => {
                    btn.onclick = (e) => {
                        const skillName = e.target.dataset.skill;
                        console.log(`Attempting to purchase: ${skillName}`);
                        // In a real game, you would call: 
                        // window.applySkillTreeUpgrade(this.currentPlayer, skillName);
                        alert(`Functionality placeholder: You bought ${skillName}!`);
                        // Then reload player stats
                        // this.showPlayerStats(this.currentPlayer.id); 
                    };
                });
            }, 100);
        }
        
        html += '</div>';
        return html;
    }
    
    // ----------------------------------------------------
    // 🏆 Enhanced Stats Grid Generation
    // ----------------------------------------------------
    generateStatsHTML(player, team) {
        let statsHTML = '';
        
        // Basic player info and contract... (UNCHANGED)
        const salary = player.contract?.salary || player.baseAnnual || player.salary || 0;
        const years = player.contract?.years || player.years || player.yearsTotal || 'N/A';
        
        // Section 1: Player Info & Contract (UNCHANGED)
        statsHTML += `
            <div class="stats-section">
                <h3>Player Information</h3>
                <div class="stats-row"><span class="stat-label">Age:</span><span class="stat-value">${player.age || 'N/A'}</span></div>
                <div class="stats-row"><span class="stat-label">College:</span><span class="stat-value">${player.college || 'N/A'}</span></div>
                <div class="stats-row"><span class="stat-label">Injury:</span><span class="stat-value">${player.injuryWeeks > 0 ? `${player.injuryWeeks} weeks` : 'Healthy'}</span></div>
                <div class="stats-row"><span class="stat-label">Morale:</span><span class="stat-value">${player.morale || 'N/A'}%</span></div>
            </div>
        `;
        
        if (salary > 0 || years !== 'N/A') {
             statsHTML += `
                <div class="stats-section">
                    <h3>Contract</h3>
                    <div class="stats-row"><span class="stat-label">Annual Salary:</span><span class="stat-value">$${salary.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M</span></div>
                    <div class="stats-row"><span class="stat-label">Years Remaining:</span><span class="stat-value">${years}</span></div>
                    <div class="stats-row"><span class="stat-label">Signing Bonus:</span><span class="stat-value">$${(player.signingBonus || 0).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M</span></div>
                </div>
            `;
        }

        // Section 2: Player Ratings/Attributes (UNCHANGED)
        if (player.ratings) {
            statsHTML += `
                <div class="stats-section">
                    <h3>Player Ratings (${player.ovr || '??'} OVR)</h3>
                    <div class="ratings-grid">
            `;
            
            Object.entries(player.ratings).forEach(([rating, value]) => {
                if (typeof value === 'number') {
                    const ratingClass = value >= 80 ? 'rating-high' : value >= 70 ? 'rating-medium' : 'rating-low';
                    statsHTML += `
                        <div class="rating-item">
                            <span class="rating-name">${this.formatRatingName(rating)}</span>
                            <span class="rating-value ${ratingClass}">${Math.round(value)}</span>
                        </div>
                    `;
                }
            });
            
            statsHTML += `
                    </div>
                </div>
            `;
        }

        // Section 3: Legacy Metrics
        if (player.legacy?.metrics) {
            const m = player.legacy.metrics;
            statsHTML += `
                <div class="stats-section">
                    <h3>🏆 Legacy Metrics</h3>
                    <div class="legacy-metrics">
                        <div class="stats-row"><span class="stat-label">Legacy Score:</span><span class="stat-value">${m.legacyScore || 0}</span></div>
                        <div class="stats-row"><span class="stat-label">Impact Score:</span><span class="stat-value">${m.impactScore || 0}</span></div>
                        <div class="stats-row"><span class="stat-label">Peak Score:</span><span class="stat-value">${m.peakScore || 0}</span></div>
                        <div class="stats-row"><span class="stat-label">Clutch Score:</span><span class="stat-value">${m.clutchScore || 0}</span></div>
                        <div class="stats-row"><span class="stat-label">Durability:</span><span class="stat-value">${player.legacy.healthRecord?.durabilityRating || 100}%</span></div>
                    </div>
                </div>
            `;
        }

        // Section 4: Abilities & Awards
        statsHTML += `
            <div class="stats-section">
                <h3>Abilities & Awards</h3>
                <div class="abilities-list">
                    <p class="list-title">Abilities:</p>
                    ${(player.abilities && player.abilities.length > 0) ? 
                        player.abilities.map(a => `<span class="ability-tag">${a}</span>`).join('') : '<span class="ability-tag">None</span>'}
                    
                    <p class="list-title">Career Awards:</p>
                    ${(player.awards && player.awards.length > 0) ? 
                        player.awards.map(a => `<span class="award-tag">${a.year}: ${a.award}</span>`).join('') : '<span class="award-tag">None</span>'}
                </div>
            </div>
        `;

        // Section 5: Statistics (Season/Career)
        if (player.stats && (Object.keys(player.stats.season).length > 0 || Object.keys(player.stats.career).length > 0)) {
            statsHTML += `
                <div class="stats-section full-width">
                    <h3>Detailed Stats</h3>
                    <div class="stats-table">
                        <div class="stats-header">
                            <span>Statistic</span>
                            <span>Season</span>
                            <span>Career</span>
                        </div>
            `;
            
            // Compile all unique stats
            const allStats = new Set([
                ...Object.keys(player.stats.season), 
                ...Object.keys(player.stats.career)
            ]);
            
            allStats.forEach(stat => {
                const seasonValue = player.stats.season[stat] || 0;
                const careerValue = player.stats.career[stat] || 0;
                
                if (seasonValue > 0 || careerValue > 0) {
                    statsHTML += `
                        <div class="stats-row">
                            <span class="stat-label">${this.formatStatName(stat)}:</span>
                            <span class="stat-value">${this.formatStatValue(stat, seasonValue)}</span>
                            <span class="stat-value">${this.formatStatValue(stat, careerValue)}</span>
                        </div>
                    `;
                }
            });
            
            statsHTML += `
                    </div>
                </div>
            `;
        }


        // Section 6: Milestones (from Legacy)
        if (player.legacy?.milestones && player.legacy.milestones.length > 0) {
             statsHTML += `
                <div class="stats-section full-width">
                    <h3>✨ Milestones</h3>
                    <ul class="milestone-list">
                        ${player.legacy.milestones.map(m => 
                            `<li class="rarity-${m.rarity.toLowerCase()}">${m.description} (${m.year})</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        return statsHTML;
    }

    // Existing formatRatingName, formatStatName, formatStatValue are UNCHANGED (but optimized slightly for the new data)

    formatRatingName(rating) {
        const ratingNames = {
            'throwPower': 'Throw Power', 'throwAccuracy': 'Throw Acc',
            'speed': 'Speed', 'acceleration': 'Accel', 'agility': 'Agility',
            'awareness': 'Awareness', 'intelligence': 'IQ',
            'catching': 'Catching', 'catchInTraffic': 'Traffic Catch',
            'trucking': 'Trucking', 'juking': 'Juking',
            'passRushSpeed': 'PR Speed', 'passRushPower': 'PR Power',
            'runStop': 'Run Stop', 'coverage': 'Coverage',
            'runBlock': 'Run Block', 'passBlock': 'Pass Block',
            'kickPower': 'Kick Power', 'kickAccuracy': 'Kick Acc'
        };
        return ratingNames[rating] || rating.charAt(0).toUpperCase() + rating.slice(1);
    }
    
    // Existing showModal, hideModal, makePlayersClickable, cleanupStaleData, refreshClickablePlayers, setupDOMObserver, disconnect are UNCHANGED

}

// Initialize the player stats viewer (UNCHANGED)
let playerStatsViewer;

function initializePlayerStatsViewer() {
    if (!playerStatsViewer) {
        playerStatsViewer = new PlayerStatsViewer();
        
        // Make functions globally available
        window.playerStatsViewer = playerStatsViewer;
        window.makePlayersClickable = () => playerStatsViewer?.makePlayersClickable();
        window.cleanupStalePlayerData = () => playerStatsViewer?.cleanupStaleData();
        window.refreshClickablePlayers = () => playerStatsViewer?.refreshClickablePlayers();
        
        // Add debug function
        window.debugPlayerStats = (playerId) => {
             // ... (UNCHANGED DEBUG LOGIC) ...
        };
        
        console.log('✅ PlayerStatsViewer initialized');
    }
}

// ... (Rest of initialization/watchForGameState logic is UNCHANGED) ...
