// player-stats-viewer.js - Player Statistics Viewer System
'use strict';

/**
 * Player statistics viewer system
 * Makes players clickable and shows detailed statistics
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
        const maxAttempts = 50;
        
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

        // Listen for league changes to clean up stale data
        if (window.state) {
            const originalLeague = window.state.league;
            Object.defineProperty(window.state, 'league', {
                get: function() { return originalLeague; },
                set: function(newLeague) {
                    if (newLeague !== originalLeague) {
                        originalLeague = newLeague;
                        // Clean up stale player IDs when league changes
                        this.cleanupStalePlayerIds();
                    }
                }.bind(this)
            });
        }
    }

    cleanupStalePlayerIds() {
        // Remove stale player IDs from DOM elements
        const playerRows = document.querySelectorAll('[data-player-id]');
        const validPlayerIds = new Set();
        
        if (window.state && window.state.league && window.state.league.teams) {
            window.state.league.teams.forEach(team => {
                if (team.players && Array.isArray(team.players)) {
                    team.players.forEach(player => {
                        if (player && player.id) {
                            validPlayerIds.add(player.id);
                        }
                    });
                }
            });
        }

        playerRows.forEach(row => {
            const playerId = row.dataset.playerId;
            if (playerId && !validPlayerIds.has(playerId)) {
                // Remove stale player ID
                row.removeAttribute('data-player-id');
                console.debug('Removed stale player ID:', playerId);
            }
        });
    }

    showPlayerStats(playerId) {
        // Check if league is ready
        if (!this.initialized || !window.state || !window.state.league || !window.state.league.teams) {
            console.warn('PlayerStatsViewer: League not ready, cannot show player stats');
            return;
        }

        const L = window.state.league;
        
        // Validate player ID
        if (!playerId || typeof playerId !== 'string') {
            console.warn('PlayerStatsViewer: Invalid player ID provided:', playerId);
            return;
        }

        // Find player across all teams
        let player = null;
        let playerTeam = null;
        
        for (const team of L.teams) {
            if (team.players && Array.isArray(team.players)) {
                const foundPlayer = team.players.find(p => p && p.id === playerId);
                if (foundPlayer) {
                    player = foundPlayer;
                    playerTeam = team;
                    break;
                }
            }
        }

        if (!player) {
            // Don't log error for missing players - this is expected when DOM has stale data
            console.debug('Player not found (likely stale DOM data):', playerId);
            return;
        }

        this.currentPlayer = player;
        this.displayPlayerStats(player, playerTeam);
        this.showModal();
    }

    displayPlayerStats(player, team) {
        // Update modal title and basic info
        document.getElementById('playerModalTitle').textContent = `${player.name} - Statistics`;
        document.getElementById('playerName').textContent = player.name;
        document.getElementById('playerPosition').textContent = player.position;
        document.getElementById('playerTeam').textContent = team ? team.name : 'Unknown Team';

        // Generate stats grid based on position
        const statsGrid = document.getElementById('playerStatsGrid');
        statsGrid.innerHTML = this.generateStatsHTML(player, team);
    }

    generateStatsHTML(player, team) {
        let statsHTML = '';
        
        // Basic player info
        statsHTML += `
            <div class="stats-section">
                <h3>Player Information</h3>
                <div class="stats-row">
                    <span class="stat-label">Age:</span>
                    <span class="stat-value">${player.age || 'N/A'}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Height:</span>
                    <span class="stat-value">${player.height || 'N/A'}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Weight:</span>
                    <span class="stat-value">${player.weight || 'N/A'}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Experience:</span>
                    <span class="stat-value">${player.experience || 'N/A'} years</span>
                </div>
            </div>
        `;

        // Contract info
        if (player.contract) {
            statsHTML += `
                <div class="stats-section">
                    <h3>Contract Information</h3>
                    <div class="stats-row">
                        <span class="stat-label">Salary:</span>
                        <span class="stat-value">$${(player.contract.salary || 0).toLocaleString()}</span>
                    </div>
                    <div class="stats-row">
                        <span class="stat-label">Years Remaining:</span>
                        <span class="stat-value">${player.contract.years || 'N/A'}</span>
                    </div>
                </div>
            `;
        }

        // Player ratings/attributes
        if (player.ratings) {
            statsHTML += `
                <div class="stats-section">
                    <h3>Player Ratings</h3>
                    <div class="ratings-grid">
            `;
            
            Object.entries(player.ratings).forEach(([rating, value]) => {
                if (typeof value === 'number') {
                    const ratingClass = value >= 80 ? 'rating-high' : value >= 70 ? 'rating-medium' : 'rating-low';
                    statsHTML += `
                        <div class="rating-item">
                            <span class="rating-name">${this.formatRatingName(rating)}</span>
                            <span class="rating-value ${ratingClass}">${value}</span>
                        </div>
                    `;
                }
            });
            
            statsHTML += `
                    </div>
                </div>
            `;
        }

        // Season statistics
        if (player.stats && player.stats.season) {
            statsHTML += `
                <div class="stats-section">
                    <h3>Season Statistics</h3>
                    <div class="season-stats">
            `;
            
            Object.entries(player.stats.season).forEach(([stat, value]) => {
                if (typeof value === 'number' && value > 0) {
                    statsHTML += `
                        <div class="stats-row">
                            <span class="stat-label">${this.formatStatName(stat)}:</span>
                            <span class="stat-value">${this.formatStatValue(stat, value)}</span>
                        </div>
                    `;
                }
            });
            
            statsHTML += `
                    </div>
                </div>
            `;
        }

        // Career statistics
        if (player.stats && player.stats.career) {
            statsHTML += `
                <div class="stats-section">
                    <h3>Career Statistics</h3>
                    <div class="career-stats">
            `;
            
            Object.entries(player.stats.career).forEach(([stat, value]) => {
                if (typeof value === 'number' && value > 0) {
                    statsHTML += `
                        <div class="stats-row">
                            <span class="stat-label">${this.formatStatName(stat)}:</span>
                            <span class="stat-value">${this.formatStatValue(stat, value)}</span>
                        </div>
                    `;
                }
            });
            
            statsHTML += `
                    </div>
                </div>
            `;
        }

        return statsHTML;
    }

    formatRatingName(rating) {
        const ratingNames = {
            'speed': 'Speed',
            'strength': 'Strength',
            'agility': 'Agility',
            'awareness': 'Awareness',
            'catching': 'Catching',
            'carrying': 'Carrying',
            'throwing': 'Throwing',
            'accuracy': 'Accuracy',
            'power': 'Power',
            'tackling': 'Tackling',
            'coverage': 'Coverage',
            'kicking': 'Kicking',
            'punting': 'Punting'
        };
        return ratingNames[rating] || rating.charAt(0).toUpperCase() + rating.slice(1);
    }

    formatStatName(stat) {
        const statNames = {
            'passYards': 'Passing Yards',
            'passTDs': 'Passing TDs',
            'passInts': 'Interceptions',
            'rushYards': 'Rushing Yards',
            'rushTDs': 'Rushing TDs',
            'recYards': 'Receiving Yards',
            'recTDs': 'Receiving TDs',
            'tackles': 'Tackles',
            'sacks': 'Sacks',
            'interceptions': 'Interceptions',
            'fieldGoals': 'Field Goals',
            'extraPoints': 'Extra Points',
            'punts': 'Punts',
            'puntYards': 'Punt Yards'
        };
        return statNames[stat] || stat.charAt(0).toUpperCase() + stat.slice(1);
    }

    formatStatValue(stat, value) {
        if (stat.includes('Yards')) {
            return value.toLocaleString() + ' yds';
        } else if (stat.includes('TDs') || stat.includes('TD')) {
            return value;
        } else if (stat.includes('Ints') || stat.includes('Int')) {
            return value;
        } else if (stat.includes('Tackles') || stat.includes('Sacks')) {
            return value;
        } else {
            return value;
        }
    }

    showModal() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.currentPlayer = null;
    }

    makePlayersClickable() {
        // Add click handlers to all player rows
        const playerRows = document.querySelectorAll('.player-row, tr[data-player-id]');
        playerRows.forEach(row => {
            if (!row.classList.contains('clickable')) {
                row.classList.add('clickable');
                row.style.cursor = 'pointer';
                row.addEventListener('click', (e) => {
                    if (!e.target.closest('button') && !e.target.closest('input')) {
                        const playerId = row.dataset.playerId;
                        if (playerId) {
                            this.showPlayerStats(playerId);
                        }
                    }
                });
            }
        });
    }

    // Public method to clean up stale player IDs
    cleanupStaleData() {
        this.cleanupStalePlayerIds();
    }
}

// Initialize the player stats viewer
let playerStatsViewer;
document.addEventListener('DOMContentLoaded', () => {
    playerStatsViewer = new PlayerStatsViewer();
});

// Make function globally available
window.playerStatsViewer = playerStatsViewer;
window.makePlayersClickable = () => playerStatsViewer?.makePlayersClickable();
window.cleanupStalePlayerData = () => playerStatsViewer?.cleanupStaleData();

// Add cleanup to window state changes
if (window.state) {
    const originalState = window.state;
    Object.defineProperty(window, 'state', {
        get: function() { return originalState; },
        set: function(newState) {
            if (newState !== originalState) {
                originalState = newState;
                // Clean up stale data when state changes
                if (playerStatsViewer && playerStatsViewer.cleanupStaleData) {
                    setTimeout(() => playerStatsViewer.cleanupStaleData(), 100);
                }
            }
        }
    });
}
