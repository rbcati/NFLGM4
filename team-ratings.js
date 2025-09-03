// team-ratings.js - Team Rating System
'use strict';

/**
 * Calculates team offensive rating based on offensive players
 * @param {Object} team - Team object
 * @returns {Object} Offensive rating data
 */
function calculateOffensiveRating(team) {
    if (!team || !team.roster) {
        return { overall: 0, breakdown: {}, positions: {} };
    }

    const offensivePositions = ['QB', 'RB', 'WR', 'TE', 'OL', 'K'];
    const offensivePlayers = team.roster.filter(p => offensivePositions.includes(p.pos));
    
    if (offensivePlayers.length === 0) {
        return { overall: 0, breakdown: {}, positions: {} };
    }

    const positionRatings = {};
    let totalRating = 0;
    let totalWeight = 0;

    // Calculate position-specific ratings with weights
    offensivePositions.forEach(pos => {
        const players = offensivePlayers.filter(p => p.pos === pos);
        if (players.length > 0) {
            // Sort by overall rating and get top players
            const sortedPlayers = players.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
            
            // Calculate weighted average based on depth
            let positionRating = 0;
            let weight = 0;
            
            sortedPlayers.forEach((player, index) => {
                const playerWeight = Math.max(0.1, 1 - (index * 0.3)); // Diminishing returns
                positionRating += (player.ovr || 50) * playerWeight;
                weight += playerWeight;
            });
            
            positionRatings[pos] = Math.round(positionRating / weight);
        } else {
            positionRatings[pos] = 0;
        }
    });

    // Position weights for overall offensive rating
    const positionWeights = {
        'QB': 0.35,    // Quarterback is most important
        'OL': 0.25,    // Offensive line is crucial
        'WR': 0.20,    // Wide receivers
        'RB': 0.15,    // Running backs
        'TE': 0.03,    // Tight ends
        'K': 0.02      // Kickers
    };

    // Calculate weighted overall offensive rating
    Object.keys(positionRatings).forEach(pos => {
        if (positionRatings[pos] > 0) {
            totalRating += positionRatings[pos] * (positionWeights[pos] || 0);
            totalWeight += positionWeights[pos] || 0;
        }
    });

    const overall = totalWeight > 0 ? Math.round(totalRating / totalWeight) : 0;

    return {
        overall,
        breakdown: positionRatings,
        positions: offensivePositions,
        playerCount: offensivePlayers.length
    };
}

/**
 * Calculates team defensive rating based on defensive players
 * @param {Object} team - Team object
 * @returns {Object} Defensive rating data
 */
function calculateDefensiveRating(team) {
    if (!team || !team.roster) {
        return { overall: 0, breakdown: {}, positions: {} };
    }

    const defensivePositions = ['DL', 'LB', 'CB', 'S', 'P'];
    const defensivePlayers = team.roster.filter(p => defensivePositions.includes(p.pos));
    
    if (defensivePlayers.length === 0) {
        return { overall: 0, breakdown: {}, positions: {} };
    }

    const positionRatings = {};
    let totalRating = 0;
    let totalWeight = 0;

    // Calculate position-specific ratings with weights
    defensivePositions.forEach(pos => {
        const players = defensivePlayers.filter(p => p.pos === pos);
        if (players.length > 0) {
            // Sort by overall rating and get top players
            const sortedPlayers = players.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
            
            // Calculate weighted average based on depth
            let positionRating = 0;
            let weight = 0;
            
            sortedPlayers.forEach((player, index) => {
                const playerWeight = Math.max(0.1, 1 - (index * 0.3)); // Diminishing returns
                positionRating += (player.ovr || 50) * playerWeight;
                weight += playerWeight;
            });
            
            positionRatings[pos] = Math.round(positionRating / weight);
        } else {
            positionRatings[pos] = 0;
        }
    });

    // Position weights for overall defensive rating
    const positionWeights = {
        'DL': 0.30,    // Defensive line is most important
        'LB': 0.25,    // Linebackers
        'CB': 0.25,    // Cornerbacks
        'S': 0.18,     // Safeties
        'P': 0.02      // Punters
    };

    // Calculate weighted overall defensive rating
    Object.keys(positionRatings).forEach(pos => {
        if (positionRatings[pos] > 0) {
            totalRating += positionRatings[pos] * (positionWeights[pos] || 0);
            totalWeight += positionWeights[pos] || 0;
        }
    });

    const overall = totalWeight > 0 ? Math.round(totalRating / totalWeight) : 0;

    return {
        overall,
        breakdown: positionRatings,
        positions: defensivePositions,
        playerCount: defensivePlayers.length
    };
}

/**
 * Calculates overall team rating
 * @param {Object} team - Team object
 * @returns {Object} Complete team rating data
 */
function calculateTeamRating(team) {
    if (!team || !team.roster) {
        return {
            overall: 0,
            offense: { overall: 0, breakdown: {}, positions: [] },
            defense: { overall: 0, breakdown: {}, positions: [] },
            specialTeams: 0,
            depth: 0,
            starPower: 0
        };
    }

    const offensiveRating = calculateOffensiveRating(team);
    const defensiveRating = calculateDefensiveRating(team);
    
    // Calculate special teams rating (K + P + return specialists)
    const specialTeamsPlayers = team.roster.filter(p => ['K', 'P'].includes(p.pos));
    const specialTeamsRating = specialTeamsPlayers.length > 0 
        ? Math.round(specialTeamsPlayers.reduce((sum, p) => sum + (p.ovr || 50), 0) / specialTeamsPlayers.length)
        : 0;

    // Calculate depth rating (how many quality players beyond starters)
    const depthRating = calculateDepthRating(team);
    
    // Calculate star power (players with 85+ overall)
    const starPlayers = team.roster.filter(p => (p.ovr || 0) >= 85);
    const starPower = starPlayers.length;

    // Overall team rating (weighted average)
    const overall = Math.round(
        (offensiveRating.overall * 0.45) + 
        (defensiveRating.overall * 0.45) + 
        (specialTeamsRating * 0.10)
    );

    return {
        overall,
        offense: offensiveRating,
        defense: defensiveRating,
        specialTeams: specialTeamsRating,
        depth: depthRating,
        starPower,
        totalPlayers: team.roster.length
    };
}

/**
 * Calculates team depth rating
 * @param {Object} team - Team object
 * @returns {number} Depth rating (0-100)
 */
function calculateDepthRating(team) {
    if (!team || !team.roster) return 0;

    const positions = ['QB', 'RB', 'WR', 'TE', 'OL', 'DL', 'LB', 'CB', 'S'];
    let totalDepthScore = 0;
    let positionCount = 0;

    positions.forEach(pos => {
        const players = team.roster.filter(p => p.pos === pos);
        if (players.length > 0) {
            // Sort by overall rating
            const sortedPlayers = players.sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
            
            // Calculate depth score based on quality of backups
            let depthScore = 0;
            if (sortedPlayers.length >= 2) {
                // Starter quality
                depthScore += (sortedPlayers[0].ovr || 50) * 0.5;
                // Backup quality
                depthScore += (sortedPlayers[1].ovr || 50) * 0.3;
                // Additional depth
                if (sortedPlayers.length >= 3) {
                    depthScore += (sortedPlayers[2].ovr || 50) * 0.2;
                }
            } else {
                depthScore = sortedPlayers[0].ovr || 50;
            }
            
            totalDepthScore += depthScore;
            positionCount++;
        }
    });

    return positionCount > 0 ? Math.round(totalDepthScore / positionCount) : 0;
}

/**
 * Updates team ratings and stores them in the team object
 * @param {Object} team - Team object
 * @returns {Object} Updated team with ratings
 */
function updateTeamRatings(team) {
    if (!team) return team;

    const ratings = calculateTeamRating(team);
    team.ratings = ratings;
    
    // Also store individual ratings for easy access
    team.offensiveRating = ratings.offense.overall;
    team.defensiveRating = ratings.defense.overall;
    team.overallRating = ratings.overall;
    team.specialTeamsRating = ratings.specialTeams;
    team.depthRating = ratings.depth;
    team.starPower = ratings.starPower;

    return team;
}

/**
 * Updates ratings for all teams in a league
 * @param {Object} league - League object
 * @returns {Object} League with updated team ratings
 */
function updateAllTeamRatings(league) {
    if (!league || !league.teams) return league;

    league.teams.forEach(team => {
        updateTeamRatings(team);
    });

    // Sort teams by overall rating for power rankings
    league.teams.sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));

    return league;
}

/**
 * Renders team ratings in the UI
 * @param {Object} team - Team object
 * @param {string} containerId - ID of container to render ratings
 */
function renderTeamRatings(team, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !team) return;

    const ratings = team.ratings || calculateTeamRating(team);
    
    const html = `
        <div class="team-ratings">
            <h3>Team Ratings</h3>
            <div class="rating-grid">
                <div class="rating-item overall">
                    <div class="rating-label">Overall</div>
                    <div class="rating-value rating-${getRatingClass(ratings.overall)}">${ratings.overall}</div>
                </div>
                <div class="rating-item offense">
                    <div class="rating-label">Offense</div>
                    <div class="rating-value rating-${getRatingClass(ratings.offense.overall)}">${ratings.offense.overall}</div>
                </div>
                <div class="rating-item defense">
                    <div class="rating-label">Defense</div>
                    <div class="rating-value rating-${getRatingClass(ratings.defense.overall)}">${ratings.defense.overall}</div>
                </div>
                <div class="rating-item special">
                    <div class="rating-label">Special Teams</div>
                    <div class="rating-value rating-${getRatingClass(ratings.specialTeams)}">${ratings.specialTeams}</div>
                </div>
            </div>
            <div class="rating-details">
                <div class="detail-item">
                    <span class="label">Depth:</span>
                    <span class="value">${ratings.depth}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Star Players:</span>
                    <span class="value">${ratings.starPower}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Total Players:</span>
                    <span class="value">${ratings.totalPlayers}</span>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * Gets CSS class for rating styling
 * @param {number} rating - Rating value
 * @returns {string} CSS class name
 */
function getRatingClass(rating) {
    if (rating >= 90) return 'elite';
    if (rating >= 85) return 'excellent';
    if (rating >= 80) return 'very-good';
    if (rating >= 75) return 'good';
    if (rating >= 70) return 'average';
    if (rating >= 65) return 'below-average';
    return 'poor';
}

/**
 * Renders league-wide team ratings overview
 * @param {Object} league - League object
 * @param {string} containerId - ID of container to render ratings
 */
function renderLeagueTeamRatings(league, containerId) {
    const container = document.getElementById(containerId);
    if (!container || !league?.teams) return;

    // Update all team ratings first
    updateAllTeamRatings(league);
    
    // Sort teams by overall rating
    const sortedTeams = [...league.teams].sort((a, b) => (b.overallRating || 0) - (a.overallRating || 0));
    
    const html = `
        <div class="league-ratings-overview">
            ${sortedTeams.map((team, index) => {
                const ratings = team.ratings || calculateTeamRating(team);
                const rank = index + 1;
                const rankClass = rank <= 3 ? 'top-rank' : rank <= 8 ? 'playoff-rank' : 'regular-rank';
                
                return `
                    <div class="league-team-card ${rankClass}">
                        <div class="league-team-header">
                            <div class="league-team-name">${rank}. ${team.name}</div>
                            <div class="league-team-overall rating-${getRatingClass(ratings.overall)}">${ratings.overall}</div>
                        </div>
                        <div class="league-team-stats">
                            <div class="league-team-stat">
                                <span class="label">Offense</span>
                                <span class="value rating-${getRatingClass(ratings.offense.overall)}">${ratings.offense.overall}</span>
                            </div>
                            <div class="league-team-stat">
                                <span class="label">Defense</span>
                                <span class="value rating-${getRatingClass(ratings.defense.overall)}">${ratings.defense.overall}</span>
                            </div>
                            <div class="league-team-stat">
                                <span class="label">Special Teams</span>
                                <span class="value rating-${getRatingClass(ratings.specialTeams)}">${ratings.specialTeams}</span>
                            </div>
                            <div class="league-team-stat">
                                <span class="label">Depth</span>
                                <span class="value">${ratings.depth}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    container.innerHTML = html;
}

// Make functions globally available
window.calculateOffensiveRating = calculateOffensiveRating;
window.calculateDefensiveRating = calculateDefensiveRating;
window.calculateTeamRating = calculateTeamRating;
window.updateTeamRatings = updateTeamRatings;
window.updateAllTeamRatings = updateAllTeamRatings;
window.renderTeamRatings = renderTeamRatings;
window.renderLeagueTeamRatings = renderLeagueTeamRatings;
