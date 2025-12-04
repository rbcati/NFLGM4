// schedule-factory.js - Simple schedule generation fallback
'use strict';

(function (global) {
    if (global.makeSchedule) return; // Use existing implementation if already loaded

    global.makeSchedule = function makeSchedule(teams) {
        const schedule = {};
        const teamList = Array.isArray(teams) ? teams : [];

        for (let week = 1; week <= 18; week++) {
            schedule[week] = [];
            for (let i = 0; i < teamList.length; i += 2) {
                if (teamList[i + 1]) {
                    schedule[week].push({
                        home: teamList[i + 1].id,
                        away: teamList[i].id
                    });
                }
            }
        }
        return schedule;
    };
})(window);
