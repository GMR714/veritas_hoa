// ═══════════════════════════════════════════════════════════════
//  SPA Router — Hash-based routing for Veritas Community Platform
// ═══════════════════════════════════════════════════════════════

const routes = [
  { id: 'governance', icon: '🏛️', label: { en: 'Governance', es: 'Gobernanza' } },
  { id: 'chat', icon: '💬', label: { en: 'Chat', es: 'Chat' } },
  { id: 'rules', icon: '📜', label: { en: 'Rules', es: 'Reglas' } },
  { id: 'finances', icon: '💰', label: { en: 'Finances', es: 'Finanzas' } },
  { id: 'food', icon: '🌿', label: { en: 'Food & Nature', es: 'Alimentación' } },
  { id: 'solar', icon: '☀️', label: { en: 'Solar', es: 'Solar' } },
  { id: 'water', icon: '💧', label: { en: 'Water', es: 'Agua' } },
  { id: 'security', icon: '🔐', label: { en: 'Security', es: 'Seguridad' } },
  { id: 'announcements', icon: '📢', label: { en: 'Community', es: 'Comunidad' } },
  { id: 'marketplace', icon: '🛒', label: { en: 'Marketplace', es: 'Mercado' } },
];

let currentRoute = 'governance';
let onRouteChange = null;

function initRouter(callback) {
  onRouteChange = callback;
  window.addEventListener('hashchange', handleHashChange);
  // Set initial route
  handleHashChange();
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'governance';
  navigateTo(hash, false);
}

function navigateTo(routeId, updateHash = true) {
  const route = routes.find(r => r.id === routeId);
  if (!route) return;

  currentRoute = routeId;
  if (updateHash) window.location.hash = routeId;

  // Hide all module sections
  document.querySelectorAll('.module-section').forEach(s => s.style.display = 'none');

  // Show target section
  const target = document.getElementById(`module-${routeId}`);
  if (target) target.style.display = 'block';

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.route === routeId);
  });

  // Callback for module-specific init
  if (onRouteChange) onRouteChange(routeId);
}

function renderSidebar(lang = 'en') {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;

  nav.innerHTML = routes.map(r => `
    <button class="nav-item ${r.id === currentRoute ? 'active' : ''}" data-route="${r.id}" onclick="window.router.navigateTo('${r.id}')">
      <span class="nav-icon">${r.icon}</span>
      <span class="nav-label">${r.label[lang] || r.label.en}</span>
    </button>
  `).join('');
}

function getCurrentRoute() { return currentRoute; }

// Export
window.router = { initRouter, navigateTo, renderSidebar, getCurrentRoute, routes };
export { initRouter, navigateTo, renderSidebar, getCurrentRoute, routes };
