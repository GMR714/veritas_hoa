import { API_URL, CONTRACT_ADDRESSES, ABIS } from './config.js';

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
};

// ═══════════════════════════════════════════════════════════════
//  API HELPERS
// ═══════════════════════════════════════════════════════════════

async function api(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na API');
  return data;
}

// ═══════════════════════════════════════════════════════════════
//  UI RENDERING
// ═══════════════════════════════════════════════════════════════

function notify(msg, type = 'info') {
  const c = document.getElementById('notifications');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function renderMyNFTs() {
  const list = document.getElementById('my-nfts-list');
  const select = document.getElementById('idea-nft-select');

  if (state.myNFTs.length === 0) {
    list.innerHTML = '<p class="muted" style="padding:4px;">Nenhum NFT encontrado.</p>';
    select.innerHTML = '<option value="">Sem NFT</option>';
    return;
  }

  list.innerHTML = state.myNFTs.map(nft => `
    <div class="nft-chip">
      <h4>NFT #${nft.id}</h4>
      <div class="credits">🪙 ${nft.credits} créditos</div>
    </div>
  `).join('');

  select.innerHTML = state.myNFTs.map(nft =>
    `<option value="${nft.id}">NFT #${nft.id} (${nft.credits} cr)</option>`
  ).join('');
}

function renderIdeaList() {
  const c = document.getElementById('idea-list');
  if (state.ideas.length === 0) {
    c.innerHTML = '<p class="muted center">Nenhuma ideia no cesto ainda. Seja o primeiro!</p>';
    return;
  }

  const nftOpts = state.myNFTs.length > 0
    ? state.myNFTs.map(n => `<option value="${n.id}">NFT #${n.id}</option>`).join('')
    : '<option value="">Sem NFT</option>';

  c.innerHTML = state.ideas.map(idea => {
    const comments = (idea.comments || []).map(cm =>
      `<div class="comment-bubble"><strong>${cm.author.substring(0, 8)}...:</strong> ${cm.text}</div>`
    ).join('');

    return `
    <div class="idea-card">
      <div class="idea-card-top">
        <div class="idea-votes-badge">${idea.qv_votes}<span>votos</span></div>
        <div class="idea-content">
          <h4>${idea.title}</h4>
          <p>${idea.description}</p>
        </div>
      </div>
      <div class="idea-actions">
        <select id="vote-idea-nft-${idea.id}">${nftOpts}</select>
        <input type="number" id="qv-idea-${idea.id}" value="1" min="1" max="100">
        <button class="btn btn-small btn-vote-idea" onclick="window.app.voteIdea(${idea.id})">👍 Votar</button>
      </div>
      <div class="comments-area">
        <div class="comment-list">${comments}</div>
        <div class="comment-form">
          <input type="text" id="comment-input-${idea.id}" placeholder="Comente...">
          <button class="btn btn-small btn-comment" onclick="window.app.addComment(${idea.id})">💬</button>
        </div>
      </div>
    </div>`;
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
    : '<option value="">Sem NFT</option>';

  // Active proposals
  if (active.length === 0) {
    votingContainer.innerHTML = '<p class="muted center">Nenhuma proposta ativa no momento.</p>';
  } else {
    votingContainer.innerHTML = active.map(p => {
      const secs = p.end_time - now;
      const mins = Math.floor(secs / 60);
      const total = p.votes_for + p.votes_against + p.votes_abstain || 1;
      const forPct = Math.round((p.votes_for / total) * 100);
      const againstPct = Math.round((p.votes_against / total) * 100);

      return `
      <div class="proposal-card">
        <div class="proposal-header">
          <h4>${p.title}</h4>
          <span class="timer-badge">⏱ ${mins}min</span>
        </div>
        <p class="proposal-desc">${p.description}</p>
        <div class="vote-bar">
          <div class="vote-bar-for" style="width:${forPct}%"></div>
          <div class="vote-bar-against" style="width:${againstPct}%"></div>
        </div>
        <div class="vote-tally">
          <span class="tally-for">✅ ${p.votes_for} Favor</span>
          <span class="tally-against">❌ ${p.votes_against} Contra</span>
          <span class="tally-abstain">➖ ${p.votes_abstain}</span>
        </div>
        <div class="proposal-actions">
          <select id="vote-prop-nft-${p.id}">${nftOpts}</select>
          <input type="number" id="qv-prop-${p.id}" value="1" min="1" max="100">
          <button class="btn btn-small btn-vote-for" onclick="window.app.voteProposal(${p.id},1)">Favor</button>
          <button class="btn btn-small btn-vote-against" onclick="window.app.voteProposal(${p.id},2)">Contra</button>
        </div>
      </div>`;
    }).join('');
  }

  // Ended proposals
  if (ended.length === 0) {
    resultsContainer.innerHTML = '<p class="muted center">Nenhuma proposta encerrada.</p>';
  } else {
    resultsContainer.innerHTML = ended.map(p => {
      const isApproved = p.votes_for > p.votes_against;
      const total = p.votes_for + p.votes_against + p.votes_abstain || 1;
      const forPct = Math.round((p.votes_for / total) * 100);
      const againstPct = Math.round((p.votes_against / total) * 100);

      return `
      <div class="proposal-card">
        <div class="proposal-header">
          <h4>${p.title}</h4>
          <span class="result-badge ${isApproved ? 'result-approved' : 'result-rejected'}">${isApproved ? '✅ APROVADA' : '❌ REJEITADA'}</span>
        </div>
        <p class="proposal-desc">${p.description}</p>
        <div class="vote-bar">
          <div class="vote-bar-for" style="width:${forPct}%"></div>
          <div class="vote-bar-against" style="width:${againstPct}%"></div>
        </div>
        <div class="vote-tally">
          <span class="tally-for">✅ ${p.votes_for} Favor</span>
          <span class="tally-against">❌ ${p.votes_against} Contra</span>
          <span class="tally-abstain">➖ ${p.votes_abstain}</span>
        </div>
      </div>`;
    }).join('');
  }
}

function renderAdminIdeaList() {
  const c = document.getElementById('admin-idea-list');
  if (!c) return;
  if (state.ideas.length === 0) { c.innerHTML = '<p class="muted">Nenhuma ideia.</p>'; return; }

  c.innerHTML = state.ideas.map(idea => `
    <div class="admin-idea-row">
      <div>
        <strong>${idea.title}</strong>
        <div class="votes-label">${idea.qv_votes} votos</div>
      </div>
      <button class="btn btn-small btn-promote" onclick="window.app.promoteIdea(${idea.id})">Promover →</button>
    </div>
  `).join('');
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${name}`));
}

// ═══════════════════════════════════════════════════════════════
//  WALLET & AUTH
// ═══════════════════════════════════════════════════════════════

async function connectWallet() {
  if (!window.ethereum) return notify('MetaMask não encontrado!', 'error');
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

    notify('Assine a mensagem na MetaMask (grátis)...', 'info');
    const signature = await signer.signMessage(message);

    notify('Verificando seus NFTs...', 'info');
    const authData = await api('/auth', {
      method: 'POST',
      body: JSON.stringify({ address, signature, message })
    });

    authToken = authData.token;
    userAddress = authData.address;
    state.isAdmin = authData.isAdmin;
    state.myNFTs = authData.nftIds.map(id => ({ id, credits: authData.credits[id] }));

    // Update UI state
    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('btn-connect-wallet').style.display = 'none';
    const btnDisc = document.getElementById('btn-disconnect-wallet');
    btnDisc.style.display = 'inline-flex';
    document.getElementById('wallet-label').textContent = userAddress.substring(0, 6) + '...' + userAddress.slice(-4);
    document.getElementById('user-address').textContent = userAddress;
    document.getElementById('my-nfts-section').style.display = 'block';
    document.getElementById('admin-panel').style.display = state.isAdmin ? 'block' : 'none';

    renderMyNFTs();
    notify('Conectado! Todas as ações são gratuitas.', 'success');
    await syncData();

  } catch (err) {
    console.error(err);
    if (err.code !== 4001) notify('Erro: ' + (err.message || ''), 'error');
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

  renderMyNFTs();
  renderIdeaList();
  renderProposalList();
  notify('Desconectado.', 'info');
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
      document.getElementById('admin-panel').style.display = state.isAdmin ? 'block' : 'none';
      renderMyNFTs();
    }

    state.ideas = await api('/ideas');
    state.proposals = await api('/proposals');

    renderIdeaList();
    renderProposalList();
    if (state.isAdmin) renderAdminIdeaList();
  } catch (err) {
    console.error('Sync error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════

window.app = {
  voteIdea: async (ideaId) => {
    if (!authToken) return notify('Conecte a carteira!', 'warning');
    const nftId = parseInt(document.getElementById(`vote-idea-nft-${ideaId}`).value);
    if (!nftId) return notify('Selecione um NFT!', 'error');
    const additionalVotes = parseInt(document.getElementById(`qv-idea-${ideaId}`).value) || 1;

    try {
      const result = await api(`/ideas/${ideaId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ nftId, additionalVotes })
      });
      notify(`Voto registrado! Custo: ${result.marginalCost} cr`, 'success');
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  },

  addComment: async (ideaId) => {
    if (!authToken) return notify('Conecte a carteira!', 'warning');
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
    if (!authToken) return notify('Conecte a carteira!', 'warning');
    const nftId = parseInt(document.getElementById(`vote-prop-nft-${propId}`).value);
    if (!nftId) return notify('Selecione um NFT!', 'error');
    const additionalVotes = parseInt(document.getElementById(`qv-prop-${propId}`).value) || 1;

    try {
      const result = await api(`/proposals/${propId}/vote`, {
        method: 'POST',
        body: JSON.stringify({ nftId, choice, additionalVotes })
      });
      notify(`Voto registrado! Custo: ${result.marginalCost} cr`, 'success');
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  },

  promoteIdea: async (ideaId) => {
    if (!state.isAdmin) return notify('Apenas admin!', 'error');
    try {
      const result = await api(`/admin/promote/${ideaId}`, {
        method: 'POST',
        body: JSON.stringify({ durationMinutes: 2 })
      });
      notify(result.message, 'success');
      await syncData();
      switchTab('voting');
    } catch (e) { notify(e.message, 'error'); }
  }
};

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

function init() {
  document.getElementById('btn-connect-wallet').onclick = connectWallet;
  document.getElementById('btn-disconnect-wallet').onclick = disconnectWallet;
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));

  // Submit idea
  document.getElementById('btn-submit-idea').onclick = async () => {
    if (!authToken) return notify('Conecte a carteira!', 'warning');
    const nftId = parseInt(document.getElementById('idea-nft-select').value);
    if (!nftId) return notify('Selecione um NFT!', 'warning');

    const title = document.getElementById('idea-title').value;
    const desc = document.getElementById('idea-desc').value;
    if (!title || !desc) return notify('Preencha título e descrição.', 'warning');

    try {
      await api('/ideas', {
        method: 'POST',
        body: JSON.stringify({ nftId, title, description: desc })
      });
      notify('Ideia enviada! 🎉', 'success');
      document.getElementById('idea-title').value = '';
      document.getElementById('idea-desc').value = '';
      await syncData();
    } catch (e) { notify(e.message, 'error'); }
  };

  // Admin: Mint NFT (on-chain)
  document.getElementById('btn-admin-mint').onclick = async () => {
    if (!state.isAdmin) return notify('Apenas admin!', 'error');
    const address = document.getElementById('admin-mint-address').value;
    if (!ethers.isAddress(address)) return notify('Endereço inválido', 'error');

    try {
      notify('Mintando NFT (on-chain)...', 'info');
      const p = new ethers.BrowserProvider(window.ethereum);
      const s = await p.getSigner();
      const nft = new ethers.Contract(CONTRACT_ADDRESSES.NFT, ABIS.NFT, s);
      const tx = await nft.safeMint(address, { gasLimit: 300000 });
      await tx.wait();
      notify('NFT emitido! ✅', 'success');
      document.getElementById('admin-mint-address').value = '';
      await syncData();
    } catch (e) {
      console.error(e);
      notify(`Falha: ${e.reason || 'Erro'}`, 'error');
    }
  };

  // Admin: Create Proposal
  document.getElementById('btn-admin-create-prop').onclick = async () => {
    if (!state.isAdmin) return notify('Apenas admin!', 'error');
    const title = document.getElementById('admin-prop-title').value;
    const desc = document.getElementById('admin-prop-desc').value;
    const dur = parseInt(document.getElementById('admin-prop-duration').value) || 5;
    if (!title) return notify('Preencha o título', 'error');

    try {
      await api('/admin/create-proposal', {
        method: 'POST',
        body: JSON.stringify({ title, description: desc, durationMinutes: dur })
      });
      notify('Proposta criada! 🗳️', 'success');
      document.getElementById('admin-prop-title').value = '';
      document.getElementById('admin-prop-desc').value = '';
      await syncData();
      switchTab('voting');
    } catch (e) { notify(e.message, 'error'); }
  };

  // MetaMask account change
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length > 0 && userAddress && accounts[0].toLowerCase() !== userAddress.toLowerCase()) {
        notify('Conta alterada — reconecte.', 'info');
        disconnectWallet();
      } else if (accounts.length === 0) {
        disconnectWallet();
      }
    });
  }

  // Admin auto-promote bot
  setInterval(async () => {
    if (!state.isAdmin || !authToken) return;
    const now = Math.floor(Date.now() / 1000);
    for (const idea of state.ideas) {
      if ((now - idea.timestamp) >= 120) {
        try {
          notify(`Autopromovendo "${idea.title}"...`, 'info');
          await api(`/admin/promote/${idea.id}`, {
            method: 'POST',
            body: JSON.stringify({ durationMinutes: 2 })
          });
          notify('Ideia promovida! 🚀', 'success');
          await syncData();
        } catch (e) { console.error('Auto-promote:', e); }
      }
    }
  }, 10000);

  // Auto-refresh
  setInterval(async () => {
    if (authToken) await syncData();
  }, 15000);
}

init();
