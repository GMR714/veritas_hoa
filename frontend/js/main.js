import { API_URL, CONTRACT_ADDRESSES, ABIS } from './config.js';

// ═══════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════

let userAddress = null;
let authToken = null;

const state = {
  myNFTs: [],       // Array de { id, credits }
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

function notify(msg, type='info') {
  const c = document.getElementById('notifications');
  const t = document.createElement('div');
  t.className = `toast toast-${type} show`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}

function renderMyNFTs() {
  const list = document.getElementById('my-nfts-list');
  const select = document.getElementById('idea-nft-select');
  
  if (state.myNFTs.length === 0) {
    list.innerHTML = '<p class="muted" style="padding: 5px;">Você não possui nenhum NFT.</p>';
    select.innerHTML = '<option value="">Nenhum NFT</option>';
    return;
  }

  list.innerHTML = state.myNFTs.map(nft => `
    <div class="nft-card">
      <h4>NFT #${nft.id}</h4>
      <p>🪙 Créditos de Voto: <strong>${nft.credits}</strong></p>
    </div>
  `).join('');

  select.innerHTML = state.myNFTs.map(nft => `<option value="${nft.id}">NFT #${nft.id} (${nft.credits} cr)</option>`).join('');
}

function renderIdeaList() {
  const c = document.getElementById('idea-list');
  if (state.ideas.length === 0) { c.innerHTML = '<p class="muted">Nenhuma ideia no cesto.</p>'; return; }
  
  const nftOptions = state.myNFTs.length > 0 
    ? state.myNFTs.map(nft => `<option value="${nft.id}">NFT #${nft.id}</option>`).join('')
    : '<option value="">Sem NFT</option>';

  c.innerHTML = state.ideas.map(idea => {
    const commentsHtml = (idea.comments || []).map(c => 
      `<div class="comment-item"><strong>${c.author.substring(0, 8)}...:</strong> ${c.text}</div>`
    ).join('');

    return `
    <div class="idea-card">
      <div class="idea-votes">${idea.qv_votes}<span>votos</span></div>
      <div class="idea-body">
        <h4>${idea.title}</h4>
        <p>${idea.description}</p>
        <div class="vote-controls">
          <select id="vote-idea-nft-${idea.id}" style="width:110px; margin:0; padding:6px; font-size:0.8rem;">${nftOptions}</select>
          <input type="number" id="qv-idea-${idea.id}" value="1" min="1" max="100">
          <button class="btn btn-small btn-blue" onclick="window.app.voteIdea(${idea.id})">Votar (Custo x²)</button>
        </div>
        
        <div class="comments-section">
          ${commentsHtml}
          <div class="comment-input-row">
            <input type="text" id="comment-input-${idea.id}" placeholder="Adicione um comentário..." style="flex:1;">
            <button class="btn btn-small btn-purple" onclick="window.app.addComment(${idea.id})">Comentar</button>
          </div>
        </div>
      </div>
    </div>
  `}).join('');
}

function renderProposalList() {
  const votingContainer = document.getElementById('proposal-list');
  const resultsContainer = document.getElementById('results-list');

  const now = Math.floor(Date.now() / 1000);
  const active = state.proposals.filter(p => now <= p.end_time);
  const ended = state.proposals.filter(p => now > p.end_time);

  const nftOptions = state.myNFTs.length > 0 
    ? state.myNFTs.map(nft => `<option value="${nft.id}">NFT #${nft.id}</option>`).join('')
    : '<option value="">Sem NFT</option>';

  // Active Proposals
  if (active.length === 0) {
    votingContainer.innerHTML = '<p class="muted">Nenhuma proposta ativa.</p>';
  } else {
    votingContainer.innerHTML = active.map(p => {
      const minutes = Math.floor((p.end_time - now) / 60);
      return `
      <div class="proposal-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${p.title}</h4>
          <span class="text-gold" style="font-size:0.75rem; font-weight:bold;">Faltam ${minutes} min</span>
        </div>
        <p>${p.description}</p>
        
        <div style="display:flex; gap: 15px; margin-bottom: 15px; font-size: 0.85rem;">
          <span class="text-green">✅ Favor: <strong>${p.votes_for}</strong></span>
          <span class="text-red">❌ Contra: <strong>${p.votes_against}</strong></span>
          <span style="color:#aaa;">➖ Abstenção: <strong>${p.votes_abstain}</strong></span>
        </div>

        <div class="vote-controls">
          <select id="vote-prop-nft-${p.id}" style="width:110px; margin:0; padding:6px; font-size:0.8rem;">${nftOptions}</select>
          <input type="number" id="qv-prop-${p.id}" value="1" min="1" max="100">
          <button class="btn btn-small btn-green" onclick="window.app.voteProposal(${p.id}, 1)">Favor</button>
          <button class="btn btn-small btn-red" onclick="window.app.voteProposal(${p.id}, 2)">Contra</button>
        </div>
      </div>`;
    }).join('');
  }

  // Ended Proposals (Results)
  if (ended.length === 0) {
    resultsContainer.innerHTML = '<p class="muted">Nenhuma proposta encerrada.</p>';
  } else {
    resultsContainer.innerHTML = ended.map(p => {
      const isApproved = p.votes_for > p.votes_against;
      return `
      <div class="proposal-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${p.title}</h4>
          <span style="font-size:0.75rem; font-weight:bold; color: ${isApproved ? '#22c55e' : '#ef4444'}">${isApproved ? 'APROVADA' : 'REJEITADA'}</span>
        </div>
        <p>${p.description}</p>
        <div style="display:flex; gap: 15px; margin-top: 10px; font-size: 0.85rem;">
          <span class="text-green">✅ Favor: <strong>${p.votes_for}</strong></span>
          <span class="text-red">❌ Contra: <strong>${p.votes_against}</strong></span>
          <span style="color:#aaa;">➖ Abstenção: <strong>${p.votes_abstain}</strong></span>
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
      <div style="display:flex; flex-direction:column;">
        <strong>${idea.title}</strong>
        <span style="font-size:0.7rem; color:var(--text-dim);">${idea.qv_votes} votos</span>
      </div>
      <button class="btn btn-small btn-purple" onclick="window.app.promoteIdea(${idea.id})">Promover</button>
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
    // Force MetaMask popup
    await window.ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    const address = accounts[0];

    // Sign a message (FREE - no gas)
    const message = `Veritas Governance Login\nTimestamp: ${Date.now()}`;
    const providerEthers = new ethers.BrowserProvider(window.ethereum);
    const signer = await providerEthers.getSigner();
    
    notify('Assine a mensagem na MetaMask (grátis)...', 'info');
    const signature = await signer.signMessage(message);

    // Send to backend for verification
    notify('Verificando NFTs...', 'info');
    const authData = await api('/auth', {
      method: 'POST',
      body: JSON.stringify({ address, signature, message })
    });

    // Store session
    authToken = authData.token;
    userAddress = authData.address;
    state.isAdmin = authData.isAdmin;
    state.myNFTs = authData.nftIds.map(id => ({ id, credits: authData.credits[id] }));

    // Update UI
    document.getElementById('btn-connect-wallet').style.display = 'none';
    const btnDisconnect = document.getElementById('btn-disconnect-wallet');
    btnDisconnect.style.display = 'block';
    btnDisconnect.textContent = '🔌 ' + userAddress.substring(0,6) + '... (Sair)';
    document.getElementById('user-address').textContent = userAddress;
    document.getElementById('my-nfts-section').style.display = 'block';
    document.getElementById('admin-panel').style.display = state.isAdmin ? 'block' : 'none';

    renderMyNFTs();
    notify('Conectado com sucesso! Ações agora são gratuitas.', 'success');
    await syncData();

  } catch (err) {
    console.error(err);
    if (err.code !== 4001) notify('Erro ao conectar: ' + (err.message || ''), 'error');
  }
}

function disconnectWallet() {
  userAddress = null;
  authToken = null;
  state.isAdmin = false;
  state.myNFTs = [];
  state.ideas = [];
  state.proposals = [];

  document.getElementById('btn-connect-wallet').style.display = 'block';
  document.getElementById('btn-disconnect-wallet').style.display = 'none';
  document.getElementById('user-address').textContent = 'Carteira não conectada.';
  document.getElementById('my-nfts-section').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'none';

  renderMyNFTs();
  renderIdeaList();
  renderProposalList();
  notify('Desconectado.', 'info');
}

// ═══════════════════════════════════════════════════════════════
//  DATA SYNC (from backend, not blockchain)
// ═══════════════════════════════════════════════════════════════

async function syncData() {
  try {
    // Refresh NFT data
    if (authToken) {
      const userData = await api('/auth/refresh');
      state.myNFTs = userData.nftIds.map(id => ({ id, credits: userData.credits[id] }));
      state.isAdmin = userData.isAdmin;
      document.getElementById('admin-panel').style.display = state.isAdmin ? 'block' : 'none';
      renderMyNFTs();
    }

    // Fetch ideas from backend
    state.ideas = await api('/ideas');

    // Fetch proposals from backend
    state.proposals = await api('/proposals');

    renderIdeaList();
    renderProposalList();
    if (state.isAdmin) renderAdminIdeaList();

  } catch (err) {
    console.error('Sync error:', err);
  }
}

// ═══════════════════════════════════════════════════════════════
//  ACTION HANDLERS (all via backend API - NO gas costs)
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
      notify(`${result.message} (Custo: ${result.marginalCost} cr)`, 'success');
      await syncData();
    } catch (e) {
      notify(`Falha ao votar: ${e.message}`, 'error');
    }
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
    } catch (e) {
      notify(`Erro: ${e.message}`, 'error');
    }
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
      notify(`${result.message} (Custo: ${result.marginalCost} cr)`, 'success');
      await syncData();
    } catch (e) {
      notify(`Falha ao votar: ${e.message}`, 'error');
    }
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
    } catch (e) {
      notify(`Erro: ${e.message}`, 'error');
    }
  },

  executeProposal: async (propId) => {
    notify('Proposta encerrada (resultados visíveis na aba Resultados)', 'info');
    await syncData();
  }
};

// ═══════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function init() {
  document.getElementById('btn-connect-wallet').onclick = connectWallet;
  document.getElementById('btn-disconnect-wallet').onclick = disconnectWallet;

  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));

  // Submit Idea
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
      notify('Ideia enviada para o cesto!', 'success');
      document.getElementById('idea-title').value = '';
      document.getElementById('idea-desc').value = '';
      await syncData();
    } catch (e) {
      notify(`Falha: ${e.message}`, 'error');
    }
  };

  // Admin: Mint NFT (this stays on-chain since it's a blockchain operation)
  document.getElementById('btn-admin-mint').onclick = async () => {
    if (!state.isAdmin) return notify('Apenas admin!', 'error');
    const address = document.getElementById('admin-mint-address').value;
    if (!ethers.isAddress(address)) return notify('Endereço inválido', 'error');

    try {
      notify('Mintando NFT (on-chain)...', 'info');
      const providerEthers = new ethers.BrowserProvider(window.ethereum);
      const signer = await providerEthers.getSigner();
      const nftContract = new ethers.Contract(CONTRACT_ADDRESSES.NFT, ABIS.NFT, signer);
      const tx = await nftContract.safeMint(address, { gasLimit: 300000 });
      await tx.wait();
      notify('NFT emitido com sucesso!', 'success');
      document.getElementById('admin-mint-address').value = '';
      await syncData();
    } catch (e) {
      console.error(e);
      notify(`Falha ao emitir NFT: ${e.reason || 'Erro'}`, 'error');
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
      notify('Proposta Criada!', 'success');
      document.getElementById('admin-prop-title').value = '';
      document.getElementById('admin-prop-desc').value = '';
      await syncData();
      switchTab('voting');
    } catch (e) {
      notify(`Erro: ${e.message}`, 'error');
    }
  };

  // Listen for account changes in MetaMask
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts.length > 0 && userAddress && accounts[0].toLowerCase() !== userAddress.toLowerCase()) {
        notify('Conta alterada — reconecte para atualizar.', 'info');
        disconnectWallet();
      } else if (accounts.length === 0) {
        disconnectWallet();
      }
    });
  }

  // Admin auto-promotion bot (every 10 seconds)
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
          notify('Ideia promovida automaticamente!', 'success');
          await syncData();
        } catch (e) {
          console.error('Auto-promote error:', e);
        }
      }
    }
  }, 10000);

  // Auto-refresh data every 15 seconds to keep UI updated
  setInterval(async () => {
    if (authToken) await syncData();
  }, 15000);
}

// Start app
init();
