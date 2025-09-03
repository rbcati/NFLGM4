// game-results-viewer.js - Game Results Viewer System
'use strict';

/**
 * Game results viewer system
 * Makes last week games clickable and shows detailed game statistics
 */

class GameResultsViewer {
    constructor() {
        this.currentGame = null;
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
        this.setupEventListeners();
    }

    createModal() {
        // Create modal for game results
        this.modal = document.createElement('div');
        this.modal.id = 'gameResultsModal';
        this.modal.className = 'modal';
        this.modal.innerHTML = `
            <div class="modal-content game-results-modal">
                <div class="modal-header">
                    <h2 id="gameModalTitle">Game Results</h2>
                    <span class="close">&times;</span>
                </div>
                <div class="modal-body" id="gameModalBody">
                    <div class="game-info">
                        <div class="game-header">
                            <div class="game-teams" id="gameTeams"></div>
                            <div class="game-score" id="gameScore"></div>
                            <div class="game-week" id="gameWeek"></div>
                        </div>
                        <div class="game-stats-grid" id="gameStatsGrid"></div>
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
        // Make all game result items clickable
        document.addEventListener('click', (e) => {
            if (e.target.closest('.result-item') || e.target.closest('.game-result')) {
                const gameItem = e.target.closest('.result-item') || e.target.closest('.game-result');
                const gameData = this.extractGameData(gameItem);
                if (gameData) {
                    this.showGameResults(gameData);
                }
            }
        });
    }

    extractGameData(gameItem) {
        // Try to extract game data from the DOM element
        const gameData = {
            homeTeam: null,
            awayTeam: null,
            homeScore: null,
            awayScore: null,
            week: null,
            date: null
        };

        // Look for team names and scores in the text content
        const text = gameItem.textContent;
        
        // Common patterns for game results
        const patterns = [
            // Pattern: "Team A 24 - Team B 17"
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+)\s*-\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+)/,
            // Pattern: "Team A vs Team B: 24-17"
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+vs\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):\s*(\d+)-(\d+)/,
            // Pattern: "Team A defeats Team B 24-17"
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+defeats?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+)-(\d+)/
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                gameData.homeTeam = match[1];
                gameData.awayTeam = match[2];
                gameData.homeScore = parseInt(match[3]);
                gameData.awayScore = parseInt(match[4]);
                break;
            }
        }

        // Try to get week from parent elements or data attributes
        const weekElement = gameItem.closest('[data-week]') || gameItem.querySelector('[data-week]');
        if (weekElement) {
            gameData.week = weekElement.dataset.week;
        }

        // If we found valid game data, return it
        if (gameData.homeTeam && gameData.awayTeam && 
            gameData.homeScore !== null && gameData.awayScore !== null) {
            return gameData;
        }

        return null;
    }

    showGameResults(gameData) {
        this.currentGame = gameData;
        this.displayGameResults(gameData);
        this.showModal();
    }

    displayGameResults(gameData) {
        // Update modal title and basic info
        document.getElementById('gameModalTitle').textContent = 'Game Results';
        
        const homeTeam = gameData.homeTeam;
        const awayTeam = gameData.awayTeam;
        const homeScore = gameData.homeScore;
        const awayScore = gameData.awayScore;
        
        // Determine winner
        const homeWin = homeScore > awayScore;
        const awayWin = awayScore > homeScore;
        const tie = homeScore === awayScore;
        
        // Update game header
        document.getElementById('gameTeams').innerHTML = `
            <div class="team ${homeWin ? 'winner' : ''}">${homeTeam}</div>
            <div class="vs">vs</div>
            <div class="team ${awayWin ? 'winner' : ''}">${awayTeam}</div>
        `;
        
        document.getElementById('gameScore').innerHTML = `
            <div class="score ${homeWin ? 'winner' : ''}">${homeScore}</div>
            <div class="score-separator">-</div>
            <div class="score ${awayWin ? 'winner' : ''}">${awayScore}</div>
        `;
        
        if (gameData.week) {
            document.getElementById('gameWeek').textContent = `Week ${gameData.week}`;
        }

        // Generate game stats
        const statsGrid = document.getElementById('gameStatsGrid');
        statsGrid.innerHTML = this.generateGameStatsHTML(gameData);
    }

    generateGameStatsHTML(gameData) {
        const homeTeam = gameData.homeTeam;
        const awayTeam = gameData.awayTeam;
        const homeScore = gameData.homeScore;
        const awayScore = gameData.awayScore;
        
        // Calculate some basic stats
        const totalPoints = homeScore + awayScore;
        const pointDifference = Math.abs(homeScore - awayScore);
        const isCloseGame = pointDifference <= 7;
        const isBlowout = pointDifference >= 21;
        
        let statsHTML = '';
        
        // Game summary
        statsHTML += `
            <div class="stats-section">
                <h3>Game Summary</h3>
                <div class="stats-row">
                    <span class="stat-label">Total Points:</span>
                    <span class="stat-value">${totalPoints}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Point Difference:</span>
                    <span class="stat-value">${pointDifference}</span>
                </div>
                <div class="stats-row">
                    <span class="stat-label">Game Type:</span>
                    <span class="stat-value">${isBlowout ? 'Blowout' : isCloseGame ? 'Close Game' : 'Competitive'}</span>
                </div>
            </div>
        `;

        // Team performance
        statsHTML += `
            <div class="stats-section">
                <h3>Team Performance</h3>
                <div class="team-performance">
                    <div class="team-stats">
                        <h4>${homeTeam}</h4>
                        <div class="stats-row">
                            <span class="stat-label">Score:</span>
                            <span class="stat-value">${homeScore}</span>
                        </div>
                        <div class="stats-row">
                            <span class="stat-label">Result:</span>
                            <span class="stat-value ${homeScore > awayScore ? 'winner' : ''}">${homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'T'}</span>
                        </div>
                    </div>
                    <div class="team-stats">
                        <h4>${awayTeam}</h4>
                        <div class="stats-row">
                            <span class="stat-label">Score:</span>
                            <span class="stat-value">${awayScore}</span>
                        </div>
                        <div class="stats-row">
                            <span class="stat-label">Result:</span>
                            <span class="stat-value ${awayScore > homeScore ? 'winner' : ''}">${awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'T'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Try to get detailed stats from league data
        const L = state.league;
        if (L && L.resultsByWeek) {
            const detailedStats = this.getDetailedGameStats(L, homeTeam, awayTeam);
            if (detailedStats) {
                statsHTML += `
                    <div class="stats-section">
                        <h3>Detailed Statistics</h3>
                        <div class="detailed-stats">
                            ${this.renderDetailedStats(detailedStats)}
                        </div>
                    </div>
                `;
            }
        }

        return statsHTML;
    }

    getDetailedGameStats(league, homeTeam, awayTeam) {
        // Look through league results to find this specific game
        if (!league.resultsByWeek) return null;
        
        for (const weekResults of Object.values(league.resultsByWeek)) {
            if (Array.isArray(weekResults)) {
                for (const result of weekResults) {
                    if (result.home && result.away) {
                        const homeTeamName = this.getTeamNameById(league, result.home);
                        const awayTeamName = this.getTeamNameById(league, result.away);
                        
                        if ((homeTeamName === homeTeam && awayTeamName === awayTeam) ||
                            (homeTeamName === awayTeam && awayTeamName === homeTeam)) {
                            return result;
                        }
                    }
                }
            }
        }
        
        return null;
    }

    getTeamNameById(league, teamId) {
        if (league.teams && league.teams[teamId]) {
            return league.teams[teamId].name;
        }
        return null;
    }

    renderDetailedStats(gameResult) {
        if (!gameResult) return '';
        
        let statsHTML = '';
        
        // Offensive stats
        if (gameResult.homeStats || gameResult.awayStats) {
            statsHTML += '<h4>Offensive Statistics</h4>';
            
            if (gameResult.homeStats) {
                statsHTML += `
                    <div class="team-detailed-stats">
                        <h5>${this.getTeamNameById(state.league, gameResult.home)}</h5>
                        <div class="stats-grid">
                            ${this.renderTeamStats(gameResult.homeStats)}
                        </div>
                    </div>
                `;
            }
            
            if (gameResult.awayStats) {
                statsHTML += `
                    <div class="team-detailed-stats">
                        <h5>${this.getTeamNameById(state.league, gameResult.away)}</h5>
                        <div class="stats-grid">
                            ${this.renderTeamStats(gameResult.awayStats)}
                        </div>
                    </div>
                `;
            }
        }
        
        return statsHTML;
    }

    renderTeamStats(teamStats) {
        let statsHTML = '';
        
        const statCategories = {
            'Passing': ['passYards', 'passTDs', 'passInts', 'sacks'],
            'Rushing': ['rushYards', 'rushTDs', 'rushAttempts'],
            'Receiving': ['recYards', 'recTDs', 'receptions'],
            'Defense': ['tackles', 'sacks', 'interceptions', 'fumbles'],
            'Special Teams': ['fieldGoals', 'extraPoints', 'punts', 'kickoffYards']
        };
        
        Object.entries(statCategories).forEach(([category, stats]) => {
            const categoryStats = stats.filter(stat => teamStats[stat] !== undefined);
            if (categoryStats.length > 0) {
                statsHTML += `
                    <div class="stat-category">
                        <h6>${category}</h6>
                        ${categoryStats.map(stat => `
                            <div class="stat-item">
                                <span class="stat-name">${this.formatStatName(stat)}:</span>
                                <span class="stat-value">${teamStats[stat]}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        });
        
        return statsHTML;
    }

    formatStatName(stat) {
        const statNames = {
            'passYards': 'Pass Yards',
            'passTDs': 'Pass TDs',
            'passInts': 'Interceptions',
            'sacks': 'Sacks',
            'rushYards': 'Rush Yards',
            'rushTDs': 'Rush TDs',
            'rushAttempts': 'Rush Attempts',
            'recYards': 'Rec Yards',
            'recTDs': 'Rec TDs',
            'receptions': 'Receptions',
            'tackles': 'Tackles',
            'fumbles': 'Fumbles',
            'fieldGoals': 'Field Goals',
            'extraPoints': 'Extra Points',
            'punts': 'Punts',
            'kickoffYards': 'Kickoff Yards'
        };
        return statNames[stat] || stat.charAt(0).toUpperCase() + stat.slice(1);
    }

    showModal() {
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        this.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        this.currentGame = null;
    }

    makeGameResultsClickable() {
        // Add click handlers to all game result items
        const gameResults = document.querySelectorAll('.result-item, .game-result');
        gameResults.forEach(item => {
            if (!item.classList.contains('clickable')) {
                item.classList.add('clickable');
                item.style.cursor = 'pointer';
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('button') && !e.target.closest('input')) {
                        const gameData = this.extractGameData(item);
                        if (gameData) {
                            this.showGameResults(gameData);
                        }
                    }
                });
            }
        });
    }
}

// Initialize the game results viewer
let gameResultsViewer;
document.addEventListener('DOMContentLoaded', () => {
    gameResultsViewer = new GameResultsViewer();
});

// Make function globally available
window.gameResultsViewer = gameResultsViewer;
window.makeGameResultsClickable = () => gameResultsViewer?.makeGameResultsClickable();
