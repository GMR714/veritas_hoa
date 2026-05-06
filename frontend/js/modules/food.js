import { API_URL } from '../config.js';
let foodState = { gardens: [], harvests: [], schedules: [] };

async function fetchFood() {
  try { const res = await fetch(`${API_URL}/food`); foodState = await res.json(); }
  catch (e) { console.error('Food error:', e); }
}

function renderFood() {
  const container = document.getElementById('food-content');
  if (!container) return;
  const typeIcons = { garden: '🥬', orchard: '🥭', herb_garden: '🌿', pond: '🐟' };
  const typeLabels = { garden: 'Vegetable Garden', orchard: 'Orchard', herb_garden: 'Herb Garden', pond: 'Fish Pond' };

  const gardenCards = foodState.gardens.map(g => {
    const gHarvests = foodState.harvests.filter(h => h.garden_id === g.id).slice(0, 3);
    const gSchedules = foodState.schedules.filter(s => s.garden_id === g.id);
    return `
    <div class="food-card glass-card">
      <div class="food-card-head">
        <span class="food-emoji">${g.image_emoji}</span>
        <div><h4>${g.name}</h4><span class="food-type">${typeLabels[g.type] || g.type}</span></div>
        <span class="food-status status-${g.status}">${g.status}</span>
      </div>
      <p class="food-desc">${g.description}</p>
      <div class="food-location">📍 ${g.location}</div>
      ${gHarvests.length ? `<div class="food-harvests"><h5>Recent Harvests</h5>${gHarvests.map(h => `<div class="harvest-row"><span>${h.item}</span><span>${h.quantity}</span><span class="harvest-by">${h.harvested_by}</span><span class="harvest-date">${h.date}</span></div>`).join('')}</div>` : ''}
      ${gSchedules.length ? `<div class="food-schedules"><h5>Upcoming Schedule</h5>${gSchedules.map(s => `<div class="schedule-row"><span>📅 ${s.date}</span><span>⏰ ${s.time_slot}</span><span>${s.resident_name}</span><span class="sched-act">${s.activity}</span></div>`).join('')}</div>` : ''}
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="module-header"><h2>🌿 Food & Nature</h2><p>Community orchards, gardens, and the tilapia pond</p></div>
    <div class="food-grid">${gardenCards}</div>`;
}

async function initFood() { await fetchFood(); renderFood(); }
export { initFood, renderFood };
