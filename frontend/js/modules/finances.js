import { API_URL } from '../config.js';

let finState = { transactions: [], payments: [], summary: {} };

async function fetchFinances() {
  try {
    const res = await fetch(`${API_URL}/finances/dashboard`);
    finState = await res.json();
  } catch (e) { console.error('Finances error:', e); }
}

function formatBRL(val) { return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }

function renderFinances() {
  const container = document.getElementById('finances-content');
  if (!container) return;
  const s = finState.summary;

  // Expense breakdown by category
  const expenses = finState.transactions.filter(t => t.type === 'expense');
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxCat = catEntries[0]?.[1] || 1;
  const catColors = ['#1B6B7D', '#2D5A3D', '#7D9B3A', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  const catBars = catEntries.map(([cat, total], i) => `
    <div class="fin-bar-row">
      <span class="fin-bar-label">${cat}</span>
      <div class="fin-bar-track">
        <div class="fin-bar-fill" style="width:${(total / maxCat * 100)}%; background:${catColors[i % catColors.length]}"></div>
      </div>
      <span class="fin-bar-val">${formatBRL(total)}</span>
    </div>`).join('');

  // Payment status
  const statusIcon = { paid: '✅', pending: '⏳', overdue: '🔴' };
  const payRows = finState.payments.slice(0, 15).map(p => `
    <tr class="pay-row pay-${p.status}">
      <td>${p.lot_number}</td>
      <td>${p.resident_name}</td>
      <td>${formatBRL(p.amount)}</td>
      <td>${p.due_date}</td>
      <td><span class="pay-badge pay-badge-${p.status}">${statusIcon[p.status]} ${p.status}</span></td>
    </tr>`).join('');

  container.innerHTML = `
    <div class="module-header"><h2>💰 Community Finances</h2><p>Transparent tracking of community funds and payments</p></div>
    <div class="fin-summary-grid">
      <div class="fin-card fin-card-balance glass-card">
        <div class="fin-card-icon">💎</div>
        <div class="fin-card-info"><span class="fin-card-label">Total Balance</span><span class="fin-card-value">${formatBRL(s.balance || 0)}</span></div>
      </div>
      <div class="fin-card glass-card">
        <div class="fin-card-icon">📈</div>
        <div class="fin-card-info"><span class="fin-card-label">Total Income</span><span class="fin-card-value fin-green">${formatBRL(s.totalIncome || 0)}</span></div>
      </div>
      <div class="fin-card glass-card">
        <div class="fin-card-icon">📉</div>
        <div class="fin-card-info"><span class="fin-card-label">Total Expenses</span><span class="fin-card-value fin-red">${formatBRL(s.totalExpense || 0)}</span></div>
      </div>
      <div class="fin-card glass-card">
        <div class="fin-card-icon">👥</div>
        <div class="fin-card-info"><span class="fin-card-label">Payments</span><span class="fin-card-value">${s.paidCount || 0} paid · ${s.pendingCount || 0} pending · ${s.overdueCount || 0} overdue</span></div>
      </div>
    </div>
    <div class="fin-details-grid">
      <div class="fin-breakdown glass-card">
        <h3>📊 Expense Breakdown</h3>
        <div class="fin-bars">${catBars}</div>
      </div>
      <div class="fin-payments glass-card">
        <h3>💳 Payment Status (Current Month)</h3>
        <div class="fin-table-wrap">
          <table class="fin-table">
            <thead><tr><th>Lot</th><th>Resident</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>${payRows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

async function initFinances() { await fetchFinances(); renderFinances(); }
export { initFinances, renderFinances };
