import { CONTRACT_ADDRESSES, ABIS } from './config.js';

// ═══════════════════════════════════════════════════════════════
//  WEB3 STATE
// ═══════════════════════════════════════════════════════════════

let provider;
let signer;
let userAddress = null;
const contracts = {};
const RSK_TESTNET_CHAIN_ID = '0x1f'; // 31 em hex

// ═══════════════════════════════════════════════════════════════
//  APP STATE
// ═══════════════════════════════════════════════════════════════

const state = {
  myNFTs: [], // Array de { id, credits }
  ideas: [],
  proposals: [],
  isAdmin: false,
};

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

function getComments(ideaId) {
  return JSON.parse(localStorage.getItem(`veritas_comments_${ideaId}`) || '[]');
}

window.app = window.app || {};
window.app.addComment = (ideaId) => {
  const input = document.getElementById(`comment-input-${ideaId}`);
  const text = input.value.trim();
  if (!text) return;
  const comments = getComments(ideaId);
  const author = userAddress ? userAddress.substring(0, 6) + '...' : 'Anônimo';
  comments.push({ author, text });
  localStorage.setItem(`veritas_comments_${ideaId}`, JSON.stringify(comments));
  input.value = '';
  renderIdeaList(); // re-render para mostrar o novo comentário
};

function renderIdeaList() {
  const c = document.getElementById('idea-list');
  if (state.ideas.length === 0) { c.innerHTML = '<p class="muted">Nenhuma ideia no cesto.</p>'; return; }
  
  // Opções de NFT para votar (se o usuário não tiver, desabilita)
  const nftOptions = state.myNFTs.length > 0 
    ? state.myNFTs.map(nft => `<option value="${nft.id}">NFT #${nft.id}</option>`).join('')
    : '<option value="">Sem NFT</option>';

  c.innerHTML = state.ideas.map(idea => {
    const comments = getComments(idea.id);
    const commentsHtml = comments.map(c => `<div class="comment-item"><strong>${c.author}:</strong> ${c.text}</div>`).join('');

    return `
    <div class="idea-card">
      <div class="idea-votes">${idea.qvVotes}<span>votos</span></div>
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
  
  const active = state.proposals.filter(p => p.exists && !p.executed && Math.floor(Date.now() / 1000) <= p.endTime);
  const ended = state.proposals.filter(p => p.exists && (p.executed || Math.floor(Date.now() / 1000) > p.endTime));
  
  const nftOptions = state.myNFTs.length > 0 
    ? state.myNFTs.map(nft => `<option value="${nft.id}">NFT #${nft.id}</option>`).join('')
    : '<option value="">Sem NFT</option>';

  // Render Active Proposals (Voting)
  if (active.length === 0) { 
    votingContainer.innerHTML = '<p class="muted">Nenhuma proposta ativa.</p>'; 
  } else {
    votingContainer.innerHTML = active.map(p => {
      const now = Math.floor(Date.now() / 1000);
      const minutes = Math.floor((p.endTime - now) / 60);
      return `
      <div class="proposal-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${p.title}</h4>
          <span class="text-gold" style="font-size:0.75rem; font-weight:bold;">Faltam ${minutes} minutos</span>
        </div>
        <p>${p.description}</p>
        
        <div style="display:flex; gap: 15px; margin-bottom: 15px; font-size: 0.85rem;">
          <span class="text-green">✅ Favor: <strong>${p.votesFor}</strong></span>
          <span class="text-red">❌ Contra: <strong>${p.votesAgainst}</strong></span>
          <span style="color:#aaa;">➖ Abstenção: <strong>${p.votesAbstain}</strong></span>
        </div>

        <div class="vote-controls">
          <select id="vote-prop-nft-${p.id}" style="width:110px; margin:0; padding:6px; font-size:0.8rem;">${nftOptions}</select>
          <input type="number" id="qv-prop-${p.id}" value="1" min="1" max="100">
          <button class="btn btn-small btn-green" onclick="window.app.voteProposal(${p.id}, 1)">Favor</button>
          <button class="btn btn-small btn-red" onclick="window.app.voteProposal(${p.id}, 2)">Contra</button>
        </div>
      </div>
      `
    }).join('');
  }

  // Render Ended Proposals (Results)
  if (ended.length === 0) {
    resultsContainer.innerHTML = '<p class="muted">Nenhuma proposta encerrada.</p>';
  } else {
    resultsContainer.innerHTML = ended.map(p => {
      const isApproved = p.votesFor > p.votesAgainst;
      return `
      <div class="proposal-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4>${p.title}</h4>
          <span style="font-size:0.75rem; font-weight:bold; color: ${isApproved ? '#22c55e' : '#ef4444'}">${isApproved ? 'APROVADA' : 'REJEITADA'}</span>
        </div>
        <p>${p.description}</p>
        
        <div style="display:flex; gap: 15px; margin-top: 10px; font-size: 0.85rem;">
          <span class="text-green">✅ Favor: <strong>${p.votesFor}</strong></span>
          <span class="text-red">❌ Contra: <strong>${p.votesAgainst}</strong></span>
          <span style="color:#aaa;">➖ Abstenção: <strong>${p.votesAbstain}</strong></span>
        </div>
      </div>
      `
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
        <span style="font-size:0.7rem; color:var(--text-dim);">${idea.qvVotes} votos</span>
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
//  WEB3 HANDLERS
// ═══════════════════════════════════════════════════════════════

async function connectWallet() {
  if (!window.ethereum) return notify('MetaMask não encontrado!', 'error');
  try {
    // Forçar o popup do MetaMask para o usuário escolher/desbloquear a conta
    await window.ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    if (chainId !== RSK_TESTNET_CHAIN_ID) {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: RSK_TESTNET_CHAIN_ID }],
      });
    }

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    userAddress = accounts[0];
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    
    contracts.nft = new ethers.Contract(CONTRACT_ADDRESSES.NFT, ABIS.NFT, signer);
    contracts.governance = new ethers.Contract(CONTRACT_ADDRESSES.GOVERNANCE, ABIS.GOVERNANCE, signer);

    document.getElementById('btn-connect-wallet').style.display = 'none';
    const btnDisconnect = document.getElementById('btn-disconnect-wallet');
    btnDisconnect.style.display = 'block';
    btnDisconnect.textContent = '🔌 ' + userAddress.substring(0,6) + '... (Sair)';
    
    document.getElementById('user-address').textContent = userAddress;
    document.getElementById('my-nfts-section').style.display = 'block';

    notify('Conectado com sucesso!', 'success');
    await syncWeb3State();
  } catch (err) {
    console.error(err);
    if (err.code !== 4001) notify('Erro ao conectar', 'error');
  }
}

function disconnectWallet() {
  userAddress = null;
  signer = null;
  state.isAdmin = false;
  state.myNFTs = [];
  
  document.getElementById('btn-connect-wallet').style.display = 'block';
  document.getElementById('btn-disconnect-wallet').style.display = 'none';
  document.getElementById('user-address').textContent = 'Carteira não conectada.';
  document.getElementById('my-nfts-section').style.display = 'none';
  document.getElementById('admin-panel').style.display = 'none';
  
  state.ideas = [];
  state.proposals = [];
  
  renderMyNFTs();
  renderIdeaList();
  renderProposalList();
  
  notify('Desconectado do painel.', 'info');
}

async function syncWeb3State() {
  if (!contracts.governance || !contracts.nft) return;
  try {
    // 1. Check Admin
    const owner = await contracts.governance.owner();
    state.isAdmin = (owner.toLowerCase() === userAddress.toLowerCase());
    document.getElementById('admin-panel').style.display = state.isAdmin ? 'block' : 'none';

    // 2. Fetch User NFTs (contrato NÃO tem ERC721Enumerable, então iteramos todos)
    const totalSupply = Number(await contracts.nft.totalSupply());
    state.myNFTs = [];
    for(let tokenId = 1; tokenId <= totalSupply; tokenId++) {
      try {
        const owner = await contracts.nft.ownerOf(tokenId);
        if (owner.toLowerCase() === userAddress.toLowerCase()) {
          const credits = await contracts.governance.getRemainingCredits(tokenId);
          state.myNFTs.push({ id: tokenId, credits: Number(credits) });
        }
      } catch(e) { /* token pode não existir */ }
    }
    renderMyNFTs();

    // 3. Fetch Proposals FIRST so we can filter promoted ideas
    const propCount = Number(await contracts.governance.proposalCount());
    state.proposals = [];
    for(let i=1; i<=propCount; i++) {
      const p = await contracts.governance.proposals(i);
      state.proposals.push({ 
        id: Number(p.id), 
        title: p.title, 
        description: p.description,
        votesFor: Number(p.votesFor),
        votesAgainst: Number(p.votesAgainst),
        votesAbstain: Number(p.votesAbstain),
        endTime: Number(p.endTime),
        exists: p.exists, 
        executed: p.executed 
      });
    }

    // 4. Fetch Ideas and filter out those that are already proposals
    const ideaCount = Number(await contracts.governance.ideaCount());
    state.ideas = [];
    for(let i=1; i<=ideaCount; i++) {
      const idea = await contracts.governance.ideas(i);
      
      // Check if it's promoted
      if (!idea.isPromoted) {
        state.ideas.push({ 
          id: Number(idea.id), 
          title: idea.title, 
          description: idea.description,
          qvVotes: Number(idea.qvVotes),
          timestamp: Number(idea.timestamp)
        });
      }
    }

    renderIdeaList();
    renderProposalList();
    if (state.isAdmin) renderAdminIdeaList();
    
  } catch (err) { 
    console.error("Sync Error:", err); 
    notify('Erro ao sincronizar dados da rede', 'error');
  }
}

// ═══════════════════════════════════════════════════════════════
//  ACTION HANDLERS
// ═══════════════════════════════════════════════════════════════

window.app = {
  voteIdea: async (ideaId) => {
    if (!signer) return notify('Conecte a carteira!', 'warning');
    const nftId = document.getElementById(`vote-idea-nft-${ideaId}`).value;
    if (!nftId) return notify('Você precisa de um NFT para votar!', 'error');
    const votes = parseInt(document.getElementById(`qv-idea-${ideaId}`).value);
    
    try {
      notify('Enviando transação...', 'info');
      const tx = await contracts.governance.voteOnIdea(ideaId, nftId, votes, { gasLimit: 500000 });
      await tx.wait();
      notify('Voto computado com sucesso!', 'success');
      await syncWeb3State();
    } catch (e) { 
      console.error(e);
      notify(`Falha ao votar: ${e.reason || e.message.substring(0, 40)}`, 'error'); 
    }
  },

  voteProposal: async (propId, choice) => {
    if (!signer) return notify('Conecte a carteira!', 'warning');
    const nftId = document.getElementById(`vote-prop-nft-${propId}`).value;
    if (!nftId) return notify('Você precisa de um NFT para votar!', 'error');
    const votes = parseInt(document.getElementById(`qv-prop-${propId}`).value);
    
    try {
      notify('Enviando transação...', 'info');
      const tx = await contracts.governance.castProposalVote(propId, nftId, choice, votes, { gasLimit: 500000 });
      await tx.wait();
      notify('Voto registrado!', 'success');
      await syncWeb3State();
    } catch (e) { 
      console.error(e);
      notify(`Falha ao votar: ${e.reason || e.message.substring(0, 40)}`, 'error'); 
    }
  },

  promoteIdea: (id) => {
    const idea = state.ideas.find(i => i.id === id);
    document.getElementById('admin-prop-title').value = idea.title;
    document.getElementById('admin-prop-desc').value = idea.description;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    notify('Ideia copiada para o formulário de Proposta Oficial', 'info');
  },

  executeProposal: async (propId) => {
    if (!state.isAdmin) return notify('Apenas admin!', 'error');
    try {
      notify('Executando...', 'info');
      const tx = await contracts.governance.executeProposal(propId);
      await tx.wait();
      notify('Proposta encerrada!', 'success');
      await syncWeb3State();
    } catch(e) { console.error(e); notify('Falha ao executar', 'error'); }
  }
};

// ═══════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════

function init() {
  document.getElementById('btn-connect-wallet').onclick = connectWallet;
  document.getElementById('btn-disconnect-wallet').onclick = disconnectWallet;
  
  document.querySelectorAll('.tab').forEach(t => t.onclick = () => switchTab(t.dataset.tab));

  document.getElementById('btn-submit-idea').onclick = async () => {
    if (!signer) return notify('Conecte a carteira!', 'warning');
    const nftId = document.getElementById('idea-nft-select').value;
    if (!nftId) return notify('Você precisa selecionar um de seus NFTs para propor!', 'warning');
    
    const title = document.getElementById('idea-title').value;
    const desc = document.getElementById('idea-desc').value;
    if (!title || !desc) return notify('Preencha título e descrição.', 'warning');

    try {
      notify('Enviando transação...', 'info');
      const tx = await contracts.governance.submitIdea(nftId, title, desc, { gasLimit: 300000 });
      await tx.wait();
      notify('Ideia enviada para o cesto!', 'success');
      document.getElementById('idea-title').value = '';
      document.getElementById('idea-desc').value = '';
      await syncWeb3State();
    } catch(e) { 
      console.error(e);
      notify(`Falha ao enviar ideia: ${e.reason || 'Erro'}`, 'error'); 
    }
  };

  document.getElementById('btn-admin-mint').onclick = async () => {
    if (!state.isAdmin) return notify('Apenas admin!', 'error');
    const address = document.getElementById('admin-mint-address').value;
    if (!ethers.isAddress(address)) return notify('Endereço inválido', 'error');
    
    try {
      notify('Mintando NFT...', 'info');
      const tx = await contracts.nft.safeMint(address, { gasLimit: 300000 });
      await tx.wait();
      notify('NFT emitido com sucesso para ' + address, 'success');
      document.getElementById('admin-mint-address').value = '';
      await syncWeb3State(); // Atualiza se mintou pra si mesmo
    } catch(e) { console.error(e); notify(`Falha ao emitir NFT: ${e.reason || 'Erro'}`, 'error'); }
  };

  document.getElementById('btn-admin-create-prop').onclick = async () => {
    if (!state.isAdmin) return notify('Apenas admin!', 'error');
    const title = document.getElementById('admin-prop-title').value;
    const desc = document.getElementById('admin-prop-desc').value;
    const dur = parseInt(document.getElementById('admin-prop-duration').value) || 5;
    
    if (!title) return notify('Preencha o título', 'error');

    try {
      notify('Criando Proposta Oficial...', 'info');
      const tx = await contracts.governance.createProposal(title, desc, dur, { gasLimit: 500000 });
      await tx.wait();
      notify('Proposta Criada!', 'success');
      
      document.getElementById('admin-prop-title').value = '';
      document.getElementById('admin-prop-desc').value = '';
      await syncWeb3State();
      switchTab('voting');
    } catch(e) { console.error(e); notify(`Falha ao criar proposta: ${e.reason || 'Erro'}`, 'error'); }
  };

  if (window.ethereum) {
    window.ethereum.on('accountsChanged', async (accounts) => {
      if (accounts.length > 0) {
        if (userAddress && accounts[0].toLowerCase() !== userAddress.toLowerCase()) {
          userAddress = accounts[0];
          notify('Conta alterada na MetaMask!', 'info');
          provider = new ethers.BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
          contracts.nft = new ethers.Contract(CONTRACT_ADDRESSES.NFT, ABIS.NFT, signer);
          contracts.governance = new ethers.Contract(CONTRACT_ADDRESSES.GOVERNANCE, ABIS.GOVERNANCE, signer);
          await syncWeb3State();
        }
      } else {
        disconnectWallet();
      }
    });
  }

  // BOT AUTOMÁTICO DO ADMIN (Rodar a cada 10 segundos)
  setInterval(async () => {
    if (!state.isAdmin || !signer) return;
    
    const now = Math.floor(Date.now() / 1000);
    // Procurar ideias com mais de 2 minutos (120 segundos)
    for (const idea of state.ideas) {
      if ((now - idea.timestamp) >= 120) {
        try {
          notify(`Autopromovendo ideia "${idea.title}"...`, 'info');
          // Promove para proposta com duração de 2 minutos
          const tx = await contracts.governance.promoteIdea(idea.id, 2, { gasLimit: 500000 });
          await tx.wait();
          notify(`Ideia promovida com sucesso!`, 'success');
          await syncWeb3State();
        } catch (e) {
          console.error("Erro na autopromoção:", e);
        }
      }
    }
  }, 10000);
}

// Start app
init();
