import { API_URL } from '../config.js';
let mktState = { listings: [] };

async function fetchMarketplace() {
  try { const res = await fetch(`${API_URL}/marketplace`); mktState.listings = await res.json(); }
  catch (e) { console.error('Marketplace error:', e); }
}

function renderMarketplace() {
  const container = document.getElementById('marketplace-content');
  if (!container) return;
  const catLabels = { for_sale: '🏷️ For Sale', services: '🔧 Services', free: '🎁 Free', wanted: '🔍 Wanted' };
  const catColors = { for_sale: '#1B6B7D', services: '#7D9B3A', free: '#22C55E', wanted: '#F59E0B' };
  const categories = ['for_sale', 'services', 'free', 'wanted'];

  const filterBtns = categories.map(c => `<button class="mkt-filter-btn" data-cat="${c}" onclick="window.mktModule.filter('${c}')">${catLabels[c]}</button>`).join('');

  const listingCards = mktState.listings.map(l => `
    <div class="mkt-card glass-card" data-category="${l.category}">
      <div class="mkt-card-img"><span class="mkt-emoji">${l.image_emoji}</span></div>
      <div class="mkt-card-body">
        <div class="mkt-card-head">
          <span class="mkt-cat-badge" style="background:${catColors[l.category] || '#1B6B7D'}">${catLabels[l.category] || l.category}</span>
          ${l.price > 0 ? `<span class="mkt-price">R$ ${l.price.toFixed(2)}</span>` : '<span class="mkt-price mkt-free">Free</span>'}
        </div>
        <h4 class="mkt-title">${l.title}</h4>
        <p class="mkt-desc">${l.description}</p>
        <div class="mkt-seller">
          <span>👤 ${l.seller_name}</span>
          <span>🏠 ${l.seller_lot}</span>
        </div>
        <button class="btn-sm btn-primary" onclick="window.mktModule.contact(${l.id})">💬 Contact Seller</button>
      </div>
    </div>`).join('');

  container.innerHTML = `
    <div class="module-header"><h2>🛒 Community Marketplace</h2><p>Buy, sell, and offer services within the community</p></div>
    <div class="mkt-filters">
      <button class="mkt-filter-btn active" onclick="window.mktModule.filter('all')">All</button>
      ${filterBtns}
    </div>
    <div class="mkt-grid">${listingCards}</div>`;
}

async function initMarketplace() { await fetchMarketplace(); renderMarketplace(); }

window.mktModule = {
  filter: (cat) => {
    document.querySelectorAll('.mkt-filter-btn').forEach(b => b.classList.toggle('active', b.textContent.includes(cat === 'all' ? 'All' : '') || b.dataset.cat === cat));
    document.querySelectorAll('.mkt-card').forEach(c => {
      c.style.display = (cat === 'all' || c.dataset.category === cat) ? '' : 'none';
    });
  },
  contact: (id) => { alert(`Message functionality coming soon! Listing #${id}`); }
};

export { initMarketplace, renderMarketplace };
