import { API_URL } from '../config.js';
let secState = { guests: [], active: [] };

async function fetchGuests() {
  try { const res = await fetch(`${API_URL}/guests`); secState = await res.json(); }
  catch (e) { console.error('Guests error:', e); }
}

function formatDateTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts * 1000);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderSecurity() {
  const container = document.getElementById('security-content');
  if (!container) return;

  const activeCards = secState.active.map(g => {
    const expires = new Date(g.valid_until * 1000);
    const hoursLeft = Math.max(0, Math.round((g.valid_until - Date.now() / 1000) / 3600));
    return `
    <div class="guest-card glass-card">
      <div class="guest-card-head">
        <div class="guest-info"><h4>👤 ${g.guest_name}</h4><span class="guest-host">Host: ${g.host_resident} (${g.host_lot})</span></div>
        <span class="guest-timer">${hoursLeft}h left</span>
      </div>
      ${g.vehicle_plate ? `<div class="guest-plate">🚗 ${g.vehicle_plate}</div>` : ''}
      ${g.purpose ? `<div class="guest-purpose">📝 ${g.purpose}</div>` : ''}
      <div class="guest-qr-section">
        <div class="guest-qr-box" id="qr-${g.id}">
          <div class="qr-placeholder">📱 QR Code</div>
          <div class="qr-data">${g.qr_code ? '✅ Generated' : '⏳ Pending'}</div>
        </div>
        <div class="guest-validity">Valid until: ${expires.toLocaleString()}</div>
      </div>
    </div>`;
  }).join('');

  const historyRows = secState.guests.slice(0, 10).map(g => `
    <tr>
      <td>${g.guest_name}</td>
      <td>${g.host_resident}</td>
      <td>${g.host_lot}</td>
      <td>${g.vehicle_plate || '-'}</td>
      <td>${formatDateTime(g.created_at)}</td>
      <td>${g.checked_in ? `<span class="pay-badge pay-badge-paid">✅ Checked in</span>` : `<span class="pay-badge pay-badge-pending">⏳ Expected</span>`}</td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="module-header"><h2>🔐 Guest Access & Security</h2><p>Track visitors and issue QR-code permissions</p></div>
    <div class="sec-register glass-card">
      <h3>➕ Register Guest</h3>
      <div class="sec-form">
        <input type="text" id="guest-name" placeholder="Guest name" class="input-lg">
        <input type="text" id="guest-host" placeholder="Your name (host)" class="input-lg">
        <input type="text" id="guest-lot" placeholder="Your lot (e.g. A-01)" class="input-lg">
        <input type="text" id="guest-plate" placeholder="Vehicle plate (optional)" class="input-lg">
        <input type="text" id="guest-purpose" placeholder="Purpose of visit" class="input-lg">
        <select id="guest-hours" class="input-lg">
          <option value="4">4 hours</option><option value="8">8 hours</option>
          <option value="24" selected>24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option>
        </select>
        <button class="btn-primary" onclick="window.secModule.register()">🔑 Register & Generate QR</button>
      </div>
    </div>
    <div class="sec-grid">
      <div class="sec-active">
        <h3>🟢 Active Passes (${secState.active.length})</h3>
        ${activeCards || '<p class="empty-state">No active guest passes</p>'}
      </div>
      <div class="sec-history glass-card">
        <h3>📋 Recent Visitors</h3>
        <div class="fin-table-wrap"><table class="fin-table"><thead><tr><th>Guest</th><th>Host</th><th>Lot</th><th>Vehicle</th><th>Date</th><th>Status</th></tr></thead><tbody>${historyRows}</tbody></table></div>
      </div>
    </div>`;
}

async function initSecurity() { await fetchGuests(); renderSecurity(); }

window.secModule = {
  register: async () => {
    const data = {
      guest_name: document.getElementById('guest-name')?.value,
      host_resident: document.getElementById('guest-host')?.value,
      host_lot: document.getElementById('guest-lot')?.value,
      vehicle_plate: document.getElementById('guest-plate')?.value,
      purpose: document.getElementById('guest-purpose')?.value,
      valid_hours: parseInt(document.getElementById('guest-hours')?.value) || 24
    };
    if (!data.guest_name || !data.host_resident) return alert('Name and host required');
    try {
      await fetch(`${API_URL}/guests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      await fetchGuests(); renderSecurity();
    } catch (e) { console.error(e); }
  }
};

export { initSecurity, renderSecurity };
