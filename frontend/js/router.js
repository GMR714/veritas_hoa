// ═══════════════════════════════════════════════════════════════
//  SPA Router — Hash-based routing with grouped navigation
// ═══════════════════════════════════════════════════════════════

const routes = [
  { id: 'governance',   icon: '🏛️', label: { en: 'Voting',          es: 'Votación' } },
  { id: 'rules',        icon: '📜', label: { en: 'Rules',           es: 'Reglas' } },
  { id: 'finances',     icon: '💰', label: { en: 'Finances',        es: 'Finanzas' } },
  { id: 'food',         icon: '🌿', label: { en: 'Food & Nature',   es: 'Alimentación' } },
  { id: 'solar',        icon: '☀️', label: { en: 'Solar',           es: 'Solar' } },
  { id: 'water',        icon: '💧', label: { en: 'Water',           es: 'Agua' } },
  { id: 'chat',         icon: '💬', label: { en: 'Chat',            es: 'Chat' } },
  { id: 'announcements',icon: '📢', label: { en: 'News & Events',   es: 'Novedades' } },
  { id: 'marketplace',  icon: '🛒', label: { en: 'Marketplace',     es: 'Mercado' } },
  { id: 'security',     icon: '🔐', label: { en: 'Security',        es: 'Seguridad' } },
];

const groups = [
  {
    id: 'g_governance', icon: '🏛️',
    label: { en: 'Governance',  es: 'Gobernanza' },
    desc:  { en: 'Vote, rules & finances', es: 'Vota, reglas y finanzas' },
    members: ['governance', 'rules', 'finances'],
  },
  {
    id: 'g_resources', icon: '🌱',
    label: { en: 'Resources',   es: 'Recursos' },
    desc:  { en: 'Food, solar and water', es: 'Alimentos, solar y agua' },
    members: ['food', 'solar', 'water'],
  },
  {
    id: 'g_community', icon: '👥',
    label: { en: 'Community',   es: 'Comunidad' },
    desc:  { en: 'Chat, news & marketplace', es: 'Chat, novedades y mercado' },
    members: ['chat', 'announcements', 'marketplace'],
  },
  {
    id: 'g_security', icon: '🔐',
    label: { en: 'Security',    es: 'Seguridad' },
    desc:  { en: 'Guest passes & access', es: 'Pases de visitantes' },
    members: ['security'],
  },
];

let currentRoute = 'governance';
let currentLang  = 'en';
let onRouteChange = null;

function getGroupForRoute(routeId) {
  return groups.find(g => g.members.includes(routeId));
}

function initRouter(callback) {
  onRouteChange = callback;
  window.addEventListener('hashchange', handleHashChange);
  handleHashChange();
}

function handleHashChange() {
  const hash = window.location.hash.replace('#', '') || 'governance';
  // Allow navigating to a group hash too (e.g. #g_resources)
  const grp = groups.find(g => g.id === hash);
  if (grp) return navigateTo(grp.members[0], false);
  navigateTo(hash, false);
}

function navigateTo(routeId, updateHash = true) {
  const route = routes.find(r => r.id === routeId);
  if (!route) return;

  currentRoute = routeId;
  if (updateHash) window.location.hash = routeId;

  document.querySelectorAll('.module-section').forEach(s => s.style.display = 'none');
  const target = document.getElementById(`module-${routeId}`);
  if (target) target.style.display = 'block';

  renderSidebar(currentLang);
  renderSubtabs(currentLang);

  // Scroll to top of content area when switching
  const main = document.getElementById('app-main');
  if (main) main.scrollTop = 0;
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { window.scrollTo(0, 0); }

  if (onRouteChange) onRouteChange(routeId);
}

function navigateToGroup(groupId) {
  const g = groups.find(x => x.id === groupId);
  if (!g) return;
  navigateTo(g.members[0]);
}

function renderSidebar(lang = currentLang) {
  currentLang = lang;
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  const currentGroup = getGroupForRoute(currentRoute);

  nav.innerHTML = groups.map(g => {
    const isActive = currentGroup && g.id === currentGroup.id;
    const desc = g.desc[lang] || g.desc.en;
    return `
      <button class="nav-item ${isActive ? 'active' : ''}" data-group="${g.id}"
              onclick="window.router.navigateToGroup('${g.id}')"
              aria-label="${g.label[lang] || g.label.en}">
        <span class="nav-icon" aria-hidden="true">${g.icon}</span>
        <span class="nav-text">
          <span class="nav-label">${g.label[lang] || g.label.en}</span>
          <span class="nav-sublabel">${desc}</span>
        </span>
      </button>`;
  }).join('');
}

function renderSubtabs(lang = currentLang) {
  const bar = document.getElementById('subtab-bar');
  if (!bar) return;
  const group = getGroupForRoute(currentRoute);
  if (!group) { bar.innerHTML = ''; bar.style.display = 'none'; return; }

  // Single-member group → no tab strip, just header
  if (group.members.length <= 1) {
    bar.style.display = '';
    bar.innerHTML = `
      <div class="subtab-head">
        <span class="subtab-group-icon" aria-hidden="true">${group.icon}</span>
        <div class="subtab-titles">
          <h2>${group.label[lang] || group.label.en}</h2>
          <p>${group.desc[lang] || group.desc.en}</p>
        </div>
      </div>`;
    return;
  }

  bar.style.display = '';
  bar.innerHTML = `
    <div class="subtab-head">
      <span class="subtab-group-icon" aria-hidden="true">${group.icon}</span>
      <div class="subtab-titles">
        <h2>${group.label[lang] || group.label.en}</h2>
        <p>${group.desc[lang] || group.desc.en}</p>
      </div>
    </div>
    <div class="subtab-tabs" role="tablist">
      ${group.members.map(m => {
        const r = routes.find(x => x.id === m);
        const active = m === currentRoute;
        return `<button class="subtab ${active ? 'active' : ''}" role="tab"
                        aria-selected="${active}"
                        onclick="window.router.navigateTo('${m}')">
          <span class="subtab-icon" aria-hidden="true">${r.icon}</span>
          <span class="subtab-label">${r.label[lang] || r.label.en}</span>
        </button>`;
      }).join('')}
    </div>`;
}

function getCurrentRoute() { return currentRoute; }

window.router = { initRouter, navigateTo, navigateToGroup, renderSidebar, renderSubtabs, getCurrentRoute, routes, groups };
export { initRouter, navigateTo, navigateToGroup, renderSidebar, renderSubtabs, getCurrentRoute, routes, groups };
