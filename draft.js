// draft.js

function renderDraft() {
  const L = state.league;
  if (!L) return;
function runDraft(league) {
    const draftOrder = calculateDraftOrder(league);
    const prospects = generateProspects();
    // ... draft logic
  function generateProspects() {
    // Generate draft class
    const prospects = [];
    for (let i = 0; i < 250; i++) {
        prospects.push(makeProspect());
    }
    return prospects;
}

function makeProspect() {
  const sel = $('#draftTeam');
  if (!sel) return;

  if (!sel.dataset.filled) {
    fillTeamSelect(sel);
    sel.dataset.filled = '1';
  }

  const teamId = parseInt(sel.value || (currentTeam() ? currentTeam().id : '0'), 10);
  sel.value = teamId;
  const t = L.teams[teamId];
  const now = L.year;

  const box = $('#draftPicks');
  if (!box) return;

  // Use a grid for better layout
  box.className = 'draft-picks-grid'; 
  box.innerHTML = '';

  t.picks.slice().sort((a, b) => a.year === b.year ? a.round - b.round : a.year - b.year).forEach(pk => {
    const card = document.createElement('div');
    card.className = 'draft-pick-card';
    const v = pickValue(pk);
    
    card.innerHTML = `
      <div class="round">Year ${now + (pk.year - 1)} - Round ${pk.round}</div>
      <div class="details">
        <div>Original Team: ${pk.from}</div>
        <div>Trade Value: ${v.toFixed(1)}</div>
      </div>
    `;
    box.appendChild(card);
  });
}
