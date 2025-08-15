// training.js
'use strict';

// Renders the training UI card in the Roster view
function renderTrainingUI(team) {
  let root = $('#trainingCard');
  if (!root) {
    const rosterView = $('#roster');
    root = document.createElement('div');
    root.className = 'card';
    root.id = 'trainingCard';
    rosterView.appendChild(root);
  }

  const optsPlayers = team.roster.map(p => {
    return `<option value="${p.id}">${p.name} • ${p.pos} • OVR ${p.ovr}</option>`;
  }).join('');

  root.innerHTML = `<h3>Weekly Training</h3>
    <div class="row">
      <label for="trainPlayer">Player</label>
      <select id="trainPlayer" style="min-width:240px">${optsPlayers}</select>
      <div class="spacer"></div>
      <label for="trainStat">Skill</label>
      <select id="trainStat">
        <option value="speed">Speed</option>
        <option value="strength">Strength</option>
        <option value="agility">Agility</option>
        <option value="awareness">Awareness</option>
      </select>
      <div class="spacer"></div>
      <button id="btnSetTraining" class="btn">Set For This Week</button>
    </div>
    <div class="muted small">One player per team per week. Success chance scales with coach skill, age, and current rating. Results apply after you simulate the week.</div>`;

  $('#btnSetTraining').onclick = setTrainingPlan;
}

// Sets the user's training plan for the week
function setTrainingPlan() {
    const teamIdx = parseInt($('#rosterTeam').value || $('#userTeam').value || '0', 10);
    const team = state.league.teams[teamIdx];
    const pid = $('#trainPlayer').value;
    const stat = $('#trainStat').value;
    state.trainingPlan = { teamIdx, playerId: pid, stat, week: state.league.week };
    const playerName = (team.roster.find(p => p.id === pid) || { name: 'player' }).name;
    setStatus(`Training scheduled: ${stat} for ${playerName}`);
}

// AI logic to pick a training target
function pickAITarget(team) {
  const C = window.Constants;
  const byPos = {};
  C.POSITIONS.forEach(pos => { byPos[pos] = []; });
  team.roster.forEach(p => { byPos[p.pos].push(p); });
  C.POSITIONS.forEach(pos => { byPos[pos].sort((a, b) => b.ovr - a.ovr); });

  let starters = [];
  Object.keys(C.DEPTH_NEEDS).forEach(pos => {
    starters = starters.concat(byPos[pos].slice(0, Math.max(1, C.DEPTH_NEEDS[pos])));
  });

  let best = null, bestScore = -1, bestStat = 'awareness';
  const stats = ['speed', 'strength', 'agility', 'awareness'];

  starters.forEach(p => {
    if (p.injuryWeeks > 0) return;
    stats.forEach(st => {
      const cur = p[st] || 0;
      const score = Math.max(0, 99 - cur) - Math.max(0, p.age - 27) * 0.8 + (p.pos === 'QB' && st === 'awareness' ? 3 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = p;
        bestStat = st;
      }
    });
  });

  return best ? { playerId: best.id, stat: bestStat } : null;
}

// Resolves the outcome of a training plan
function resolveTrainingFor(team, plan) {
      const trainingTypes = {
        'strength': { max: 99, rate: 0.7 },
        'speed': { max: 95, rate: 0.5 },
        'agility': { max: 95, rate: 0.6 },
        'awareness': { max: 99, rate: 0.8 },
        'technique': { max: 99, rate: 0.4 } // NEW
  if (!plan) return null;
  const p = team.roster.find(x => x.id === plan.playerId);
  if (!p || p.injuryWeeks > 0 || (p[plan.stat] || 0) >= 99) return { ok: false };

  const stat = plan.stat;
  const cur = p[stat];
  const coach = (team.strategy && team.strategy.coachSkill) || 0.7;
  const successP = Math.max(0.15, Math.min(0.85, 0.55 + 0.15 * (coach - 0.7) - Math.max(0, cur - 70) * 0.01 - Math.max(0, p.age - 27) * 0.015));

  if (Math.random() < successP) {
    const bump = 1 + Math.floor(Math.random() * Math.max(1, (stat === 'awareness' ? 4 : 3) - Math.floor((cur - 75) / 10)));
    p[stat] = Math.min(99, cur + bump);
    if (stat === 'awareness' || stat === 'agility') p.ovr = Math.min(99, p.ovr + 1);
    p.fatigue = (p.fatigue || 0) + 2;
    return { ok: true, success: true, stat, before: cur, after: p[stat] };
  } else {
    p.fatigue = (p.fatigue || 0) + 1;
    return { ok: true, success: false, stat, before: cur };
  }
}

// Runs the training process for all teams for the week
function runWeeklyTraining(league) {
  if (!league || !league.teams) return;
  const weekJustCompleted = league.week - 1;
  const userPlan = (state.trainingPlan && state.trainingPlan.week === weekJustCompleted) ? state.trainingPlan : null;

  league.teams.forEach((team, idx) => {
    const plan = (idx === parseInt($('#userTeam').value || '0', 10) && userPlan) ? userPlan : pickAITarget(team);
    const res = resolveTrainingFor(team, plan);
    if (!res || !res.ok) return;

    const tAbbr = team.abbr || `T${idx}`;
    const logMsg = res.success ?
      `Week ${weekJustCompleted}: ${tAbbr} trained ${res.stat} from ${res.before} to ${res.after}` :
      `Week ${weekJustCompleted}: ${tAbbr} training on ${res.stat} did not improve`;
    league.news.push(logMsg);
  });

  if (userPlan) state.trainingPlan = null; // Consume the plan
}
