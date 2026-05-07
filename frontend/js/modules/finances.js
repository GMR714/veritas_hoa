import { API_URL } from '../config.js';

let finState   = { transactions: [], payments: [], summary: {} };
let currency   = 'USD';   // 'USD' | 'BTC'
let btcPrice   = null;    // USD per 1 BTC, fetched once
let btcLoading = false;

// ── Formatters ──────────────────────────────────────────────
function formatUSD(val) {
  return '$' + Number(val || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function formatBTC(val) {
  if (!btcPrice) return formatUSD(val);
  const btc = Number(val || 0) / btcPrice;
  if (btc === 0) return '₿ 0.00000000';
  if (btc < 0.001) return '₿ ' + btc.toFixed(8);
  return '₿ ' + btc.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 8 });
}
function fmt(val) { return currency === 'BTC' ? formatBTC(val) : formatUSD(val); }

// ── Live BTC price (CoinGecko public, no key needed) ───────
async function fetchBTCPrice() {
  if (btcPrice !== null || btcLoading) return;
  btcLoading = true;
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { cache: 'default' });
    const d = await r.json();
    btcPrice = d?.bitcoin?.usd || null;
  } catch (_) {
    btcPrice = null;
  } finally {
    btcLoading = false;
  }
}

// ── Data fetch ──────────────────────────────────────────────
async function fetchFinances() {
  try {
    const res = await fetch(`${API_URL}/finances/dashboard`);
    finState = await res.json();
  } catch (e) { console.error('Finances error:', e); }
}

// ── Render ──────────────────────────────────────────────────
function renderFinances() {
  const container = document.getElementById('finances-content');
  if (!container) return;
  const s = finState.summary;

  // Expense breakdown
  const expenses  = finState.transactions.filter(t => t.type === 'expense');
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const catEntries = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const maxCat     = catEntries[0]?.[1] || 1;
  const catColors  = ['#1B6B7D','#2D5A3D','#7D9B3A','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4'];

  const catBars = catEntries.map(([cat, total], i) => `
    <div class="fin-bar-row">
      <span class="fin-bar-label">${cat}</span>
      <div class="fin-bar-track">
        <div class="fin-bar-fill" style="width:${(total / maxCat * 100)}%;background:${catColors[i % catColors.length]}"></div>
      </div>
      <span class="fin-bar-val">${fmt(total)}</span>
    </div>`).join('');

  // Payment rows
  const statusIcon = { paid: '✅', pending: '⏳', overdue: '🔴' };
  const payRows = finState.payments.slice(0, 15).map(p => `
    <tr class="pay-row pay-${p.status}">
      <td>${p.lot_number}</td>
      <td>${p.resident_name}</td>
      <td>${fmt(p.amount)}</td>
      <td>${p.due_date}</td>
      <td><span class="pay-badge pay-badge-${p.status}">${statusIcon[p.status]} ${p.status}</span></td>
    </tr>`).join('');

  // BTC price tag shown next to toggle when in BTC mode
  const btcTag = (currency === 'BTC' && btcPrice)
    ? `<span class="fin-btc-rate">1 BTC ≈ ${formatUSD(btcPrice)}</span>`
    : '';

  container.innerHTML = `
    <div class="module-header">
      <div class="fin-header-row">
        <div>
          <h2>💰 Community Finances</h2>
          <p>Transparent tracking of community funds and payments</p>
        </div>
        <div class="fin-currency-wrap">
          ${btcTag}
          <div class="fin-currency-toggle" role="group" aria-label="Currency">
            <button class="fin-cur-btn ${currency === 'USD' ? 'active' : ''}" onclick="window.finToggleCurrency('USD')">$ USD</button>
            <button class="fin-cur-btn ${currency === 'BTC' ? 'active' : ''}" onclick="window.finToggleCurrency('BTC')">₿ BTC</button>
          </div>
        </div>
      </div>
    </div>

    <div class="fin-summary-grid">
      <div class="fin-card fin-card-balance glass-card">
        <div class="fin-card-icon">💎</div>
        <div class="fin-card-info">
          <span class="fin-card-label">Total Balance</span>
          <span class="fin-card-value">${fmt(s.balance || 0)}</span>
        </div>
      </div>
      <div class="fin-card glass-card">
        <div class="fin-card-icon">📈</div>
        <div class="fin-card-info">
          <span class="fin-card-label">Total Income</span>
          <span class="fin-card-value fin-green">${fmt(s.totalIncome || 0)}</span>
        </div>
      </div>
      <div class="fin-card glass-card">
        <div class="fin-card-icon">📉</div>
        <div class="fin-card-info">
          <span class="fin-card-label">Total Expenses</span>
          <span class="fin-card-value fin-red">${fmt(s.totalExpense || 0)}</span>
        </div>
      </div>
      <div class="fin-card glass-card">
        <div class="fin-card-icon">👥</div>
        <div class="fin-card-info">
          <span class="fin-card-label">Payments</span>
          <span class="fin-card-value">${s.paidCount || 0} paid · ${s.pendingCount || 0} pending · ${s.overdueCount || 0} overdue</span>
        </div>
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

// ── Global toggle handler ───────────────────────────────────
window.finToggleCurrency = async (cur) => {
  if (cur === currency) return;
  currency = cur;
  if (cur === 'BTC' && btcPrice === null) {
    // Show spinner while fetching price
    const btns = document.querySelectorAll('.fin-cur-btn');
    btns.forEach(b => { b.disabled = true; b.textContent = b.textContent.includes('BTC') ? '₿ …' : b.textContent; });
    await fetchBTCPrice();
  }
  renderFinances();
};

// ── Init ────────────────────────────────────────────────────
async function initFinances() {
  await fetchFinances();
  fetchBTCPrice(); // pre-fetch in background so toggle is instant
  renderFinances();
}

export { initFinances, renderFinances };
