import { API_URL } from '../config.js';

let rulesState = { rules: [], suggestions: [] };

async function fetchRules() {
  try {
    const res = await fetch(`${API_URL}/rules`);
    const data = await res.json();
    rulesState = data;
  } catch (e) { console.error('Rules error:', e); }
}

function renderRules() {
  const container = document.getElementById('rules-content');
  if (!container) return;

  const categories = [...new Set(rulesState.rules.map(r => r.category))];
  const catIcons = { 'Pool': '🏊', 'Noise': '🔇', 'Pets': '🐾', 'Common Areas': '🏘️', 'Food & Nature': '🌿', 'Security': '🔐', 'Infrastructure': '⚡', 'Transport': '🚌' };

  const rulesHtml = categories.map(cat => {
    const catRules = rulesState.rules.filter(r => r.category === cat);
    return `
      <div class="rules-category">
        <h3 class="rules-cat-title">${catIcons[cat] || '📋'} ${cat}</h3>
        ${catRules.map(r => `
          <div class="rule-card glass-card">
            <div class="rule-header">
              <h4>${r.title}</h4>
              <span class="rule-status status-${r.status}">${r.status}</span>
            </div>
            <p class="rule-content">${r.content}</p>
          </div>
        `).join('')}
      </div>`;
  }).join('');

  const sugHtml = rulesState.suggestions.length ? rulesState.suggestions.map(s => {
    const total = s.votes_for + s.votes_against || 1;
    const pct = Math.round((s.votes_for / total) * 100);
    return `
      <div class="suggestion-card glass-card">
        <div class="sug-header">
          <h4>${s.title}</h4>
          <span class="sug-by">by ${s.suggested_by_name}</span>
        </div>
        <p>${s.description}</p>
        <div class="sug-votes">
          <div class="sug-bar"><div class="sug-bar-fill" style="width:${pct}%"></div></div>
          <div class="sug-tally">
            <span class="t-for">👍 ${s.votes_for}</span>
            <span class="t-ag">👎 ${s.votes_against}</span>
          </div>
        </div>
        <div class="sug-actions">
          <button class="btn-sm btn-for" onclick="window.rulesModule.vote(${s.id}, 1)">👍 Support</button>
          <button class="btn-sm btn-against" onclick="window.rulesModule.vote(${s.id}, -1)">👎 Oppose</button>
        </div>
      </div>`;
  }).join('') : '<p class="empty-state">No suggestions yet</p>';

  container.innerHTML = `
    <div class="module-header"><h2>📜 Community Rules</h2><p>Shared repository of community rules and regulations</p></div>
    <div class="rules-grid">
      <div class="rules-list">${rulesHtml}</div>
      <div class="rules-suggestions">
        <div class="sug-section-head"><h3>💡 Suggestions & Voting</h3></div>
        ${sugHtml}
      </div>
    </div>`;
}

async function initRules() { await fetchRules(); renderRules(); }

window.rulesModule = {
  vote: async (id, vote) => {
    try {
      await fetch(`${API_URL}/rules/suggestions/${id}/vote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote })
      });
      await fetchRules(); renderRules();
    } catch (e) { console.error(e); }
  }
};

export { initRules, renderRules };
