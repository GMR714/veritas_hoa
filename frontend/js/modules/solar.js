import { API_URL } from '../config.js';
let solarState = { systems: [], maintenance: [], summary: {} };

async function fetchSolar() {
  try { const res = await fetch(`${API_URL}/solar`); solarState = await res.json(); }
  catch (e) { console.error('Solar error:', e); }
}

function renderSolar() {
  const container = document.getElementById('solar-content');
  if (!container) return;
  const s = solarState.summary;

  const sysCards = solarState.systems.map(sys => {
    const maint = solarState.maintenance.filter(m => m.solar_id === sys.id);
    const statusClass = sys.status === 'active' ? 'status-active' : 'status-maintenance';
    return `
    <div class="solar-card glass-card">
      <div class="solar-card-head">
        <div class="solar-lot"><span class="solar-lot-badge">${sys.lot_number}</span><strong>${sys.resident_name}</strong></div>
        <span class="solar-status ${statusClass}">${sys.status === 'active' ? '🟢 Active' : '🟡 Maintenance'}</span>
      </div>
      <div class="solar-stats">
        <div class="solar-stat"><span class="solar-stat-val">${sys.capacity_kw}</span><span class="solar-stat-lbl">kW</span></div>
        <div class="solar-stat"><span class="solar-stat-val">${sys.panel_count}</span><span class="solar-stat-lbl">Panels</span></div>
        <div class="solar-stat"><span class="solar-stat-val">${sys.inverter_model}</span><span class="solar-stat-lbl">Inverter</span></div>
      </div>
      <div class="solar-meta">
        <span>📅 Installed: ${sys.install_date}</span>
        ${sys.last_maintenance ? `<span>🔧 Last maint: ${sys.last_maintenance}</span>` : '<span>🔧 No maintenance yet</span>'}
      </div>
      ${maint.length ? `<div class="solar-maint"><h5>Maintenance Log</h5>${maint.map(m => `<div class="maint-row"><span class="maint-type maint-${m.type}">${m.type}</span><span>${m.description}</span><span>${m.date}</span><span class="maint-cost">R$ ${m.cost}</span></div>`).join('')}</div>` : ''}
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="module-header"><h2>☀️ Solar System Tracking</h2><p>Monitor solar installations across the community</p></div>
    <div class="solar-summary-grid">
      <div class="solar-sum glass-card"><span class="solar-sum-icon">⚡</span><span class="solar-sum-val">${s.totalCapacity?.toFixed(1)} kW</span><span class="solar-sum-lbl">Total Capacity</span></div>
      <div class="solar-sum glass-card"><span class="solar-sum-icon">🔲</span><span class="solar-sum-val">${s.totalPanels}</span><span class="solar-sum-lbl">Total Panels</span></div>
      <div class="solar-sum glass-card"><span class="solar-sum-icon">🏠</span><span class="solar-sum-val">${s.activeCount}/${s.totalSystems}</span><span class="solar-sum-lbl">Active Systems</span></div>
    </div>
    <div class="solar-grid">${sysCards}</div>`;
}

async function initSolar() { await fetchSolar(); renderSolar(); }
export { initSolar, renderSolar };
