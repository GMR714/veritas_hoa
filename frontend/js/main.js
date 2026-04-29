import { API_URL, CONTRACT_ADDRESSES, ABIS } from './config.js';
import { initThreeJS, triggerActionEffect } from './three-scene.js';
const ethers = window.ethers;

// ═══════════════════════════════════════════════════════════════
//  I18N (INTERNATIONALIZATION)
// ═══════════════════════════════════════════════════════════════

const i18n = {
  en: {
    // Dynamic JS Text
    empty_nft: "No NFTs found.",
    no_nft: "No NFT",
    credits: "credits",
    empty_ideas: "No ideas in the basket yet. Be the first! 🌱",
    votes: "votes",
    btn_vote: "👍 Vote",
    btn_comment: "💬",
    ph_comment: "Comment...",
    empty_active: "No active proposals right now.",
    btn_for: "✅ For",
    btn_against: "❌ Against",
    tally_for: "✅ For",
    tally_against: "❌ Against",
    empty_ended: "No closed proposals.",
    res_approved: "✅ APPROVED",
    res_rejected: "❌ REJECTED",
    empty_admin: "No ideas.",
    btn_promote: "Promote →",
    // Notifications
    err_metamask: "MetaMask not found!",
    msg_sign: "Sign message in MetaMask (free)...",
    msg_check_nft: "Verifying your NFTs...",
    msg_connected: "Connected! All actions are free.",
    msg_disconnect: "Disconnected.",
    err_connect: "Connect wallet first!",
    err_select_nft: "Select an NFT!",
    msg_vote_ok: "Vote registered! Cost:",
    err_fill_idea: "Fill in title and description.",
    msg_idea_ok: "Idea submitted! 🎉",
    err_admin_only: "Admin only!",
    err_invalid_addr: "Invalid address",
    msg_minting: "Minting NFT (on-chain)...",
    msg_mint_ok: "NFT minted! ✅",
    err_fill_title: "Fill in the title",
    msg_prop_ok: "Proposal created! 🗳️",
    msg_acct_change: "Account changed — reconnecting.",
    promoting: "Promoting...",
    btn_revoke: "↺ Revoke & Refund",
    msg_revoke_ok: "Vote revoked. Credits refunded:"
  },
  es: {
    // Dynamic JS Text
    empty_nft: "No se encontraron NFTs.",
    no_nft: "Sin NFT",
    credits: "créditos",
    empty_ideas: "No hay ideas en la cesta aún. ¡Sé el primero! 🌱",
    votes: "votos",
    btn_vote: "👍 Votar",
    btn_comment: "💬",
    ph_comment: "Comentar...",
    empty_active: "No hay propuestas activas ahora mismo.",
    btn_for: "✅ A Favor",
    btn_against: "❌ En Contra",
    tally_for: "✅ A Favor",
    tally_against: "❌ En Contra",
    empty_ended: "No hay propuestas cerradas.",
    res_approved: "✅ APROBADA",
    res_rejected: "❌ RECHAZADA",
    empty_admin: "Sin ideas.",
    btn_promote: "Promover →",
    // Notifications
    err_metamask: "¡MetaMask no encontrado!",
    msg_sign: "Firma el mensaje en MetaMask (gratis)...",
    msg_check_nft: "Verificando tus NFTs...",
    msg_connected: "¡Conectado! Todas las acciones son gratis.",
    msg_disconnect: "Desconectado.",
    err_connect: "¡Conecta tu billetera primero!",
    err_select_nft: "¡Selecciona un NFT!",
    msg_vote_ok: "¡Voto registrado! Costo:",
    err_fill_idea: "Completa el título y descripción.",
    msg_idea_ok: "¡Idea enviada! 🎉",
    err_admin_only: "¡Solo administrador!",
    err_invalid_addr: "Dirección inválida",
    msg_minting: "Emitiendo NFT (on-chain)...",
    msg_mint_ok: "¡NFT emitido! ✅",
    err_fill_title: "Completa el título",
    msg_prop_ok: "¡Propuesta creada! 🗳️",
    msg_acct_change: "Cuenta cambiada — reconectando.",
    promoting: "Promoviendo...",
    btn_revoke: "↺ Revocar y Reembolsar",
    msg_revoke_ok: "Voto revocado. Créditos devueltos:"
  }
};

let currentLang = 'en';

function t(key) {
  return i18n[currentLang][key] || key;
}

function updateStaticTranslations() {
  // Update text nodes
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    // Static translations dictionary embedded for HTML elements
    const staticDict = {
      en: {
        nav_governance: "Governance", btn_connect: "Connect",
        hero_title_1: "Community<br><span>Governance</span>", hero_desc: "Connect your wallet to participate in the decisions that shape our community.", btn_connect_wallet: "Connect MetaMask",
        feat_1_title: "Suggest", feat_1_desc: "Propose ideas", feat_2_title: "Vote", feat_2_desc: "Quadratic Voting",
        feat_3_title: "Debate", feat_3_desc: "Gas-free", feat_4_title: "Results", feat_4_desc: "Transparent",
        admin_panel: "Admin Panel", admin_mint_lbl: "Mint Member NFT", btn_mint: "Mint",
        admin_prop_lbl: "Create Direct Proposal", lbl_minutes: "minutes", btn_create: "Create",
        admin_promote_lbl: "Promote Ideas → Proposal", empty_admin_ideas: "No ideas in the basket",
        my_nfts: "My NFTs", tab_ideas: "Ideas", tab_proposals: "Proposals", tab_results: "Results",
        head_ideas: "Idea Basket", desc_ideas: "Suggest and vote on community ideas", new_idea: "New Idea",
        opt_select_nft: "Select your NFT", btn_submit_idea: "Submit Idea", empty_connect: "Connect wallet to see ideas.",
        head_proposals: "Active Voting", desc_proposals: "Vote on official community proposals", empty_proposals: "No active proposals right now.",
        head_results: "Results", desc_results: "History of closed proposals", empty_results: "No closed proposals.",
        next_batch: "Next Batch"
      },
      es: {
        nav_governance: "Gobernanza", btn_connect: "Conectar",
        hero_title_1: "Gobernanza<br><span>Comunitaria</span>", hero_desc: "Conecta tu billetera para participar en las decisiones que moldean nuestra comunidad.", btn_connect_wallet: "Conectar MetaMask",
        feat_1_title: "Sugerir", feat_1_desc: "Proponer ideas", feat_2_title: "Votar", feat_2_desc: "Quadratic Voting",
        feat_3_title: "Debatir", feat_3_desc: "Sin costo", feat_4_title: "Resultados", feat_4_desc: "Transparente",
        admin_panel: "Panel Admin", admin_mint_lbl: "Emitir NFT de Miembro", btn_mint: "Emitir",
        admin_prop_lbl: "Crear Propuesta Directa", lbl_minutes: "minutos", btn_create: "Crear",
        admin_promote_lbl: "Promover Ideas → Propuesta", empty_admin_ideas: "Sin ideas en la cesta",
        my_nfts: "Mis NFTs", tab_ideas: "Ideas", tab_proposals: "Propuestas", tab_results: "Resultados",
        head_ideas: "Cesta de Ideas", desc_ideas: "Sugiere y vota por ideas de la comunidad", new_idea: "Nueva Idea",
        opt_select_nft: "Selecciona tu NFT", btn_submit_idea: "Enviar Idea", empty_connect: "Conecta la billetera para ver ideas.",
        head_proposals: "Votación Activa", desc_proposals: "Vota en propuestas oficiales de la comunidad", empty_proposals: "No hay propuestas activas.",
        head_results: "Resultados", desc_results: "Historial de propuestas cerradas", empty_results: "No hay propuestas cerradas.",
        next_batch: "Próxima Ronda"
      }
    };
    if (staticDict[currentLang][key]) el.innerHTML = staticDict[currentLang][key];
  });

  // Update placeholders
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    const phDict = {
      en: { ph_prop_title: "Proposal Title", ph_prop_desc: "Description", ph_idea_title: "Your idea title...", ph_idea_desc: "Describe your suggestion for the community..." },
      es: { ph_prop_title: "Título de la propuesta", ph_prop_desc: "Descripción", ph_idea_title: "El título de tu idea...", ph_idea_desc: "Describe tu sugerencia para la comunidad..." }
    };
    if (phDict[currentLang][key]) el.placeholder = phDict[currentLang][key];
  });
}

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════

let userAddress = null;
let authToken = null;

const state = {
  myNFTs: [],
  ideas: [],
  proposals: [],
  isAdmin: false,
  nextBatchTime: 0,
  myIdeaVotes: [],
  myPropVotes: []
};

// ═══════════════════════════════════════════════════════════════
//  API HELPERS
// ═══════════════════════════════════════════════════════════════

async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API Error');
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  UI RENDERING
// ═══════════════════════════════════════════════════════════════

function notify(msg, type = 'info') {
  const c = document.getElementById('notifications');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  c.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function renderMyNFTs() {
  const list = document.getElementById('my-nfts-list');
  const select = document.getElementById('idea-nft-select');

  if (state.myNFTs.length === 0) {
    list.innerHTML = `<p class="muted" style="padding:4px;">${t('empty_nft')}</p>`;
    select.innerHTML = `<option value="">${t('no_nft')}</option>`;
    return;
  }

  list.innerHTML = state.myNFTs.map(nft => `
    <div class="nft-chip">
      <h4>NFT #${nft.id}</h4>
      <div class="credits">🪙 ${nft.credits} ${t('credits')}</div>
    </div>
  `).join('');

  select.innerHTML = state.myNFTs.map(nft =>
    `<option value="${nft.id}">NFT #${nft.id} (${nft.credits} cr)</option>`
  ).join('');
}

function renderIdeaList() {
  const c = document.getElementById('idea-list');
  if (state.ideas.length === 0) {
    c.innerHTML = `<p class="empty-state">${t('empty_ideas')}</p>`;
    return;
  }

  const nftOpts = state.myNFTs.length > 0
    ? state.myNFTs.map(n => `<option value="${n.id}">NFT #${n.id}</option>`).join('')
    : `<option value="">${t('no_nft')}</option>`;

  c.innerHTML = state.ideas.map((idea, index) => {
    const isTop10 = index < 10;
    const rankBadge = isTop10 ? `<span style="font-size:0.7rem; background:var(--gold); color:#000; padding:2px 6px; border-radius:4px; font-weight:700;">TOP ${index+1}</span>` : '';
    
    const comments = (idea.comments || []).map(cm =>
      `<div class="comment-bubble"><strong>${cm.author.substring(0, 8)}...:</strong> ${cm.text}</div>`
    ).join('');

    let html = `
    <div class="idea-card ${isTop10 ? 'top-idea' : ''}" ${isTop10 ? 'style="border-color: rgba(245,158,11,0.4);"' : ''}>
      <div class="idea-top">
        <div class="vote-badge">${idea.qv_votes}<small>${t('votes')}</small></div>
        <div class="idea-body">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <h4 style="margin:0;">${idea.title}</h4>
            ${rankBadge}
          </div>
          <p style="margin-top:4px;">${idea.description}</p>
        </div>
      </div>
      <div class="idea-actions">`;

    // Check if user has voted on this idea
    const userVote = state.myIdeaVotes.find(v => v.idea_id === idea.id);

    if (userVote) {
      html += `
        <div style="flex:1; display:flex; align-items:center; gap:8px;">
          <span style="font-size:0.8rem; color:var(--olive-l);">✓ Voted with NFT #${userVote.nft_id} (${userVote.votes_allocated} votes)</span>
        </div>
        <button class="btn-sm btn-against" onclick="window.app.revokeIdeaVote(${idea.id}, ${userVote.nft_id})">${t('btn_revoke')}</button>
      `;
    } else {
      html += `
        <select id="vote-idea-nft-${idea.id}">${nftOpts}</select>
        <input type="number" id="qv-idea-${idea.id}" value="1" min="1" max="100">
        <button class="btn-sm btn-vote" onclick="window.app.voteIdea(${idea.id})">${t('btn_vote')}</button>
      `;
    }

    html += `
      </div>
      <div class="comments-area">
        <div class="comment-list">${comments}</div>
        <div class="comment-form">
          <input type="text" id="comment-input-${idea.id}" placeholder="${t('ph_comment')}">
          <button class="btn-sm btn-ghost" onclick="window.app.addComment(${idea.id})">${t('btn_comment')}</button>
        </div>
      </div>
    </div>`;
    
    return html;
  }).join('');
}

function renderProposalList() {
  const votingContainer = document.getElementById('proposal-list');
  const resultsContainer = document.getElementById('results-list');

  const now = Math.floor(Date.now() / 1000);
  const active = state.proposals.filter(p => now <= p.end_time);
  const ended = state.proposals.filter(p => now > p.end_time);

  const nftOpts = state.myNFTs.length > 0
    ? state.myNFTs.map(n => `<option value="${n.id}">NFT #${n.id}</option>`).join('')
    : `<option value="">${t('no_nft')}</option>`;

  if (active.length === 0) {
    votingContainer.innerHTML = `<p class="empty-state">${t('empty_active')}</p>`;
  } else {
    votingContainer.innerHTML = active.map(p => {
      const mins = Math.floor((p.end_time - now) / 60);
      const total = p.votes_for + p.votes_against + p.votes_abstain || 1;
      const forPct = Math.round((p.votes_for / total) * 100);
      const againstPct = Math.round((p.votes_against / total) * 100);

      let html = `
      <div class="proposal-card">
        <div class="prop-header">
          <h4>${p.title}</h4>
          <span class="timer-pill">⏱ ${mins}min</span>
        </div>
        <p class="prop-desc">${p.description}</p>
        <div class="vote-bar">
          <div class="vb-for" style="width:${forPct}%"></div>
          <div class="vb-ag" style="width:${againstPct}%"></div>
        </div>
        <div class="vote-tally">
          <span class="t-for">${t('tally_for')}: ${p.votes_for}</span>
          <span class="t-ag">${t('tally_against')}: ${p.votes_against}</span>
        </div>
        <div class="proposal-actions">`;

      const userVote = state.myPropVotes.find(v => v.proposal_id === p.id);

      if (userVote) {
        const choiceStr = userVote.choice === 1 ? t('tally_for') : (userVote.choice === 2 ? t('tally_against') : 'Abstain');
        html += `
          <div style="flex:1; display:flex; align-items:center; gap:8px;">
            <span style="font-size:0.8rem; color:var(--olive-l);">✓ Voted ${choiceStr} (NFT #${userVote.nft_id})</span>
          </div>
          <button class="btn-sm btn-against" onclick="window.app.revokePropVote(${p.id}, ${userVote.nft_id})">${t('btn_revoke')}</button>
        `;
      } else {
        html += `
          <select id="vote-prop-nft-${p.id}">${nftOpts}</select>
          <input type="number" id="qv-prop-${p.id}" value="1" min="1" max="100">
          <button class="btn-sm btn-for" onclick="window.app.voteProposal(${p.id},1)">${t('btn_for')}</button>
          <button class="btn-sm btn-against" onclick="window.app.voteProposal(${p.id},2)">${t('btn_against')}</button>
        `;
      }

      html += `
        </div>
      </div>`;
      return html;
    }).join('');
  }

  if (ended.length === 0) {
    resultsContainer.innerHTML = `<p class="empty-state">${t('empty_ended')}</p>`;
  } else {
    resultsContainer.innerHTML = ended.map(p => {
      const isApproved = p.votes_for > p.votes_against;
      const total = p.votes_for + p.votes_against + p.votes_abstain || 1;
      const forPct = Math.round((p.votes_for / total) * 100);
      const againstPct = Math.round((p.votes_against / total) * 100);

      return `
      <div class="proposal-card">
        <div class="prop-header">
          <h4>${p.title}</h4>
          <span class="result-pill ${isApproved ? 'result-yes' : 'result-no'}">${isApproved ? t('res_approved') : t('res_rejected')}</span>
        </div>
        <p class="prop-desc">${p.description}</p>
        <div class="vote-bar">
          <div class="vb-for" style="width:${forPct}%"></div>
          <div class="vb-ag" style="width:${againstPct}%"></div>
        </div>
        <div class="vote-tally">
          <span class="t-for">${t('tally_for')}: ${p.votes_for}</span>
          <span class="t-ag">${t('tally_against')}: ${p.votes_against}</span>
        </div>
      </div>`;
    }).join('');
  }
}

function renderAdminIdeaList() {
  const c = document.getElementById('admin-idea-list');
  if (!c) return;
  if (state.ideas.length === 0) { c.innerHTML = `<p class="muted">${t('empty_admin')}</p>`; return; }

  c.innerHTML = state.ideas.map(idea => `
    <div class="admin-idea-row">
      <div>
        <strong>${idea.title}</strong>
        <div class="votes-label">${idea.qv_votes} ${t('votes')}</div>
      </div>
      <button class="btn-sm btn-promote" onclick="window.app.promoteIdea(${idea.id})">${t('btn_promote')}</button>
    </div>
  `).join('');
}

function refreshUI() {
  updateStaticTranslations();
  renderMyNFTs();
  renderIdeaList();
  renderProposalList();
  if (state.isAdmin) renderAdminIdeaList();
}

// ═══════════════════════════════════════════════════════════════
//  WALLET & AUTH
// ═══════════════════════════════════════════════════════════════

async function connectWallet() {
  if (!window.ethereum) return notify(t('err_metamask'), 'error');
  try {
    await window.ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const address = accounts[0];

    const message = `Veritas Villages Login\nTimestamp: ${Date.now()}`;
    const providerEthers = new ethers.BrowserProvider(window.ethereum);
    const signer = await providerEthers.getSigner();

    notify(t('msg_sign'), 'info');
    const signature = await signer.signMessage(message);

    notify(t('msg_check_nft'), 'info');
    const authData = await api('/auth', {
      method: 'POST',
      body: JSON.stringify({ address, signature, message })
    });

    authToken = authData.token;
    userAddress = authData.address;
    state.isAdmin = authData.isAdmin;
    state.myNFTs = authData.nftIds.map(id => ({ id, credits: authData.credits[id] }));
    state.myIdeaVotes = authData.ideaVotes || [];
    state.myPropVotes = authData.proposalVotes || [];

    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('btn-connect-wallet').style.display = 'none';
    const btnDisc = document.getElementById('btn-disconnect-wallet');
    btnDisc.style.display = 'inline-flex';
    document.getElementById('wallet-label').textContent = userAddress.substring(0, 6) + '...' + userAddress.slice(-4);
    document.getElementById('user-address').textContent = userAddress;
    document.getElementById('my-nfts-section').style.display = 'block';
    document.getElementById('admin-panel').style.display = state.isAdmin ? 'block' : 'none';

    refreshUI();
    notify(t('msg_connected'), 'success');
    await syncData();

  } catch (err) {
    console.error(err);
    if (err.code !== 4001) notify('Error: ' + (err.message || ''), 'error');
  }
}

function disconnectWallet() {
  userAddress = null;
  authToken = null;
  state.isAdmin = false;
  state.myNFTs = [];
  state.ideas = [];
  state.proposals = [];

  document.getElementById('welcome-screen').style.display = '';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('btn-connect-wallet').style.display = '';
  document.getElementById('btn-disconnect-wallet').style.display = 'none';
  document.getElementById('my-nfts-section').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'none';

  refreshUI();
  notify(t('msg_disconnect'), 'info');
}

// ═══════════════════════════════════════════════════════════════
//  DATA SYNC
// ═══════════════════════════════════════════════════════════════

async function syncData() {
  try {
    if (authToken) {
      const userData = await api('/auth/refresh');
      state.myNFTs = userData.nftIds.map(id => ({ id, credits: userData.credits[id] }));
      state.isAdmin = userData.isAdmin;
      state.myIdeaVotes = userData.ideaVotes || [];
      state.myPropVotes = userData.proposalVotes || [];
      document.getElementById('admin-panel').style.display = state.isAdmin ? 'block' : 'none';
    }
    const ideasData = await api('/ideas');
    state.ideas = ideasData.ideas;
    state.nextBatchTime = ideasData.nextBatchTime;
    
    state.proposals = await api('/proposals');
    refreshUI();
  } catch (err) {
    console.error('Sync error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════

window.app = {
  setLanguage: (lang) => {
    currentLang = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-lang-${lang}`).classList.add('active');
    refreshUI();
  },

  voteIdea: async (ideaId) => {
    if (!authToken) return notify(t('err_connect'), 'warning');
    const nftId = parseInt(document.getElementById(`vote-idea-nft-${ideaId}`).value);
    if (!nftId) return notify(t('err_select_nft'), 'error');
    const additionalVotes = parseInt(document.getElementById(`qv-idea-${ideaId}`).value) || 1;

    try {
      const result = await api(`/ideas/${ideaId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ nftId, additionalVotes })
      });
      notify(`${t('msg_vote_ok')} ${result.marginalCost} cr`, 'success');
      triggerActionEffect('vote');
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  },

  revokeIdeaVote: async (ideaId, nftId) => {
    if (!authToken) return;
    try {
      const result = await api(`/ideas/${ideaId}/vote`, {
        method: 'DELETE',
        body: JSON.stringify({ nftId })
      });
      notify(`${t('msg_revoke_ok')} ${result.refunded} cr`, 'success');
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  },

  addComment: async (ideaId) => {
    if (!authToken) return notify(t('err_connect'), 'warning');
    const input = document.getElementById(`comment-input-${ideaId}`);
    const text = input.value.trim();
    if (!text) return;

    try {
      await api(`/ideas/${ideaId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ text })
      });
      input.value = '';
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  },

  voteProposal: async (propId, choice) => {
    if (!authToken) return notify(t('err_connect'), 'warning');
    const nftId = parseInt(document.getElementById(`vote-prop-nft-${propId}`).value);
    if (!nftId) return notify(t('err_select_nft'), 'error');
    const additionalVotes = parseInt(document.getElementById(`qv-prop-${propId}`).value) || 1;

    try {
      const result = await api(`/proposals/${propId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ nftId, choice, additionalVotes })
      });
      notify(`${t('msg_vote_ok')} ${result.marginalCost} cr`, 'success');
      triggerActionEffect('vote');
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  },

  revokePropVote: async (propId, nftId) => {
    if (!authToken) return;
    try {
      const result = await api(`/proposals/${propId}/vote`, {
        method: 'DELETE',
        body: JSON.stringify({ nftId })
      });
      notify(`${t('msg_revoke_ok')} ${result.refunded} cr`, 'success');
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  },

  promoteIdea: async (ideaId) => {
    if (!state.isAdmin) return notify(t('err_admin_only'), 'error');
    try {
      const result = await api(`/admin/promote/${ideaId}`, {
        method: 'POST',
        body: JSON.stringify({ durationMinutes: 2 })
      });
      notify(t('msg_promoted_ok'), 'success');
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  }
};

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

function init() {
  // Init ThreeJS background
  initThreeJS();

  // Init static UI language
  updateStaticTranslations();

  document.getElementById('btn-connect-wallet').onclick = connectWallet;
  document.getElementById('btn-disconnect-wallet').onclick = disconnectWallet;

  // Submit idea
  document.getElementById('btn-submit-idea').onclick = async () => {
    if (!authToken) return notify(t('err_connect'), 'warning');
    const nftId = parseInt(document.getElementById('idea-nft-select').value);
    if (!nftId) return notify(t('err_select_nft'), 'warning');

    const title = document.getElementById('idea-title').value;
    const desc = document.getElementById('idea-desc').value;
    if (!title || !desc) return notify(t('err_fill_idea'), 'warning');

    try {
      await api('/ideas', {
        method: 'POST',
        body: JSON.stringify({ nftId, title, description: desc })
      });
      notify(t('msg_idea_ok'), 'success');
      document.getElementById('idea-title').value = '';
      document.getElementById('idea-desc').value = '';
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  };

  // Admin: Mint NFT (on-chain)
  document.getElementById('btn-admin-mint').onclick = async () => {
    if (!state.isAdmin) return notify(t('err_admin_only'), 'error');
    const address = document.getElementById('admin-mint-address').value;
    if (!ethers.isAddress(address)) return notify(t('err_invalid_addr'), 'error');

    try {
      notify(t('msg_minting'), 'info');
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const nft = new ethers.Contract(CONTRACT_ADDRESSES.NFT, ABIS.NFT, s);
      const tx = await nft.safeMint(address, { gasLimit: 300000 });
      await tx.wait();
      notify(t('msg_mint_ok'), 'success');
      document.getElementById('admin-mint-address').value = '';
      await syncData();
    } catch (e) {
      console.error(e);
      notify(`Fail: ${e.reason || 'Error'}`, 'error');
    }
  };

  // Admin: Create Proposal
  document.getElementById('btn-admin-create-prop').onclick = async () => {
    if (!state.isAdmin) return notify(t('err_admin_only'), 'error');
    const title = document.getElementById('admin-prop-title').value;
    const desc = document.getElementById('admin-prop-desc').value;
    const dur = parseInt(document.getElementById('admin-prop-duration').value) || 5;
    if (!title) return notify(t('err_fill_title'), 'error');

    try {
      await api('/admin/create-proposal', {
        method: 'POST',
        body: JSON.stringify({ title, description: desc, durationMinutes: dur })
      });
      notify(t('msg_prop_ok'), 'success');
      document.getElementById('admin-prop-title').value = '';
      document.getElementById('admin-prop-desc').value = '';
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  };

  // MetaMask account change
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0 && userAddress && accounts[0].toLowerCase() !== userAddress.toLowerCase()) {
        notify(t('msg_acct_change'), 'info');
        disconnectWallet();
      } else if (accounts.length === 0) {
        disconnectWallet();
      }
    });
  }

  // Auto-refresh
  setInterval(async () => {
    if (authToken) await syncData();
  }, 10000);

  // Global batch timer tick
  setInterval(() => {
    const el = document.getElementById('global-batch-timer');
    if (!el || !state.nextBatchTime) return;
    
    const now = Math.floor(Date.now() / 1000);
    const left = state.nextBatchTime - now;
    
    if (left > 0) {
      const m = Math.floor(left / 60);
      const s = left % 60;
      el.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      el.style.color = "var(--gold)";
    } else {
      el.textContent = `00:00`;
      el.style.color = "var(--green)";
      // If we are at zero, trigger a quick sync to get the new batch
      if (left === 0 && authToken) syncData();
    }
  }, 1000);
}

init();