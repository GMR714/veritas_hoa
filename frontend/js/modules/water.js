import { API_URL } from '../config.js';
let waterState = { usage: [], alerts: [], byMonth: {} };

async function fetchWater() {
  try { const res = await fetch(`${API_URL}/water`); waterState = await res.json(); }
  catch (e) { console.error('Water error:', e); }
}

function renderWater() {
  const container = document.getElementById('water-content');
  if (!container) return;

  // Monthly chart
  const months = Object.keys(waterState.byMonth).sort();
  const maxTotal = Math.max(...months.map(m => waterState.byMonth[m].total), 1);
  const chartBars = months.map(m => {
    const d = waterState.byMonth[m];
    const pct = (d.total / maxTotal * 100);
    const label = m.split('-')[1] + '/' + m.split('-')[0].slice(2);
    return `<div class="water-chart-col"><div class="water-chart-bar" style="height:${pct}%"><span class="water-chart-val">${(d.total / 1000).toFixed(0)}k L</span></div><span class="water-chart-label">${label}</span></div>`;
  }).join('');

  // Alerts
  const alertIcons = { info: '💧', warning: '⚠️', critical: '🔴' };
  const alertsHtml = waterState.alerts.map(a => `
    <div class="water-alert water-alert-${a.severity}">
      <span class="water-alert-icon">${alertIcons[a.severity] || '💧'}</span>
      <p>${a.message}</p>
    </div>`).join('');

  // Usage table (latest month)
  const latestMonth = months[months.length - 1] || '';
  const monthUsage = waterState.usage.filter(u => u.month === latestMonth);
  const avgUsage = monthUsage.length ? monthUsage.reduce((s, u) => s + u.usage_liters, 0) / monthUsage.length : 0;
  const usageRows = monthUsage.sort((a, b) => b.usage_liters - a.usage_liters).map(u => {
    const aboveAvg = u.usage_liters > avgUsage * 1.2;
    return `<tr class="${aboveAvg ? 'water-high' : ''}"><td>${u.lot_number}</td><td>${u.resident_name}</td><td>${(u.usage_liters / 1000).toFixed(1)}k L</td><td>R$ ${u.cost.toFixed(2)}</td><td>${aboveAvg ? '⚠️ High' : '✅ Normal'}</td></tr>`;
  }).join('');

  container.innerHTML = `
    <div class="module-header"><h2>💧 Water Usage Monitoring</h2><p>Track consumption and conservation across the community</p></div>
    ${alertsHtml ? `<div class="water-alerts">${alertsHtml}</div>` : ''}
    <div class="water-grid">
      <div class="water-chart-card glass-card">
        <h3>📊 Monthly Community Usage</h3>
        <div class="water-chart">${chartBars}</div>
      </div>
      <div class="water-table-card glass-card">
        <h3>🏠 Usage by Home (${latestMonth})</h3>
        <p class="water-avg">Community average: <strong>${(avgUsage / 1000).toFixed(1)}k L</strong></p>
        <div class="fin-table-wrap"><table class="fin-table"><thead><tr><th>Lot</th><th>Resident</th><th>Usage</th><th>Cost</th><th>Status</th></tr></thead><tbody>${usageRows}</tbody></table></div>
      </div>
    </div>`;
}

async function initWater() { await fetchWater(); renderWater(); }
export { initWater, renderWater };
