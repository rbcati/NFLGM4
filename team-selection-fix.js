'use strict';

(function() {
    const logPrefix = '[TeamSelectionFix]';

    const log = (...args) => console.log(logPrefix, ...args);
    const warn = (...args) => console.warn(logPrefix, ...args);

    function getCanonicalTeams(mode) {
        if (typeof window.listByMode !== 'function') {
            warn('listByMode is not available; cannot normalize teams.');
            return [];
        }
        const teams = window.listByMode(mode);
        if (!Array.isArray(teams)) {
            warn('listByMode returned a non-array value.');
            return [];
        }
        return teams;
    }

    function buildLookup(teams) {
        const lookup = new Map();
        teams.forEach((team, index) => {
            if (team?.abbr) lookup.set(team.abbr, index);
            if (team?.name) lookup.set(team.name, index);
        });
        return lookup;
    }

    function normalizeTeamsOrder(inputTeams, lookup) {
        if (!Array.isArray(inputTeams)) {
            warn('normalizeTeamsOrder received invalid teams array.');
            return [];
        }

        const normalized = inputTeams.map((team, originalIndex) => {
            const canonicalIndex = lookup.get(team?.abbr) ?? lookup.get(team?.name);
            return {
                team: { ...team },
                canonicalIndex: typeof canonicalIndex === 'number' ? canonicalIndex : Number.MAX_SAFE_INTEGER,
                originalIndex
            };
        });

        normalized.sort((a, b) => {
            if (a.canonicalIndex === b.canonicalIndex) return a.originalIndex - b.originalIndex;
            return a.canonicalIndex - b.canonicalIndex;
        });

        return normalized.map(({ team }) => team);
    }

    function verifyTeamAssignment() {
        const namesMode = window.state?.namesMode || 'fictional';
        const canonicalTeams = getCanonicalTeams(namesMode);
        const league = window.state?.league;
        const userTeamId = window.state?.userTeamId;
        const selectedTeam = canonicalTeams?.[userTeamId];
        const leagueTeam = league?.teams?.[userTeamId];
        const match = Boolean(
            selectedTeam &&
            leagueTeam &&
            leagueTeam.id === userTeamId &&
            leagueTeam.abbr === selectedTeam.abbr &&
            leagueTeam.name === selectedTeam.name
        );

        const payload = {
            userTeamId,
            teamId: leagueTeam?.id,
            abbr: leagueTeam?.abbr,
            name: leagueTeam?.name,
            expectedAbbr: selectedTeam?.abbr,
            expectedName: selectedTeam?.name,
            match
        };

        console.log('✅ Team assignment verified:', payload);
        return payload;
    }

    const originalMakeLeague = window.makeLeague;
    if (typeof originalMakeLeague !== 'function') {
        warn('makeLeague is not available; cannot apply team selection fix.');
        return;
    }

    window.makeLeague = function patchedMakeLeague(teams, options = {}) {
        const namesMode = window.state?.namesMode || 'fictional';
        const canonicalTeams = getCanonicalTeams(namesMode);
        const lookup = buildLookup(canonicalTeams);

        const selected = window.state?.userTeamId;
        if (typeof selected === 'number' && canonicalTeams[selected]) {
            log(`Selected team BEFORE league creation: ${canonicalTeams[selected].name}`);
        }

        const orderedTeams = normalizeTeamsOrder(Array.isArray(teams) ? teams.slice() : [], lookup);
        if (orderedTeams.length === 0) {
            warn('No teams provided to makeLeague; falling back to original input.');
        }

        const league = originalMakeLeague(orderedTeams.length ? orderedTeams : teams, options);

        if (league?.teams?.length) {
            league.teams.forEach((team, index) => {
                if (team.id !== index) {
                    warn(`Realigning team id from ${team.id} to ${index} for ${team.name || 'Unknown Team'}`);
                    team.id = index;
                }
            });
        }

        if (window.state?.league?.teams) {
            const verifyResult = verifyTeamAssignment();
            log(`✅ League created. User team verification: match: ${verifyResult.match}`);
        }

        window.verifyTeamAssignment = verifyTeamAssignment;
        return league;
    };

    log('Team selection fix initialized.');
})();
