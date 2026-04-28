require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { db, stmts, CREDITS_PER_YEAR, getCurrentYear, getRemainingCredits, spendCredits } = require('./database');

// ═══════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════

const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'veritas-mvp-secret-2024';
const RPC_URL = process.env.RPC_URL || 'https://public-node.testnet.rsk.co';
const NFT_ADDRESS = process.env.NFT_ADDRESS || '0xa1851Eb7B8aC7a684ef22EC3b3766A7583d62A80';
const GOVERNANCE_OWNER = process.env.GOVERNANCE_OWNER || ''; // Will be fetched on startup

const NFT_ABI = [
  "function owner() view returns (address)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)"
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const nftContract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, provider);

let adminAddress = '';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ═══════════════════════════════════════════════════════════════
//  MIDDLEWARE: JWT Auth
// ═══════════════════════════════════════════════════════════════

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { address, nftIds }
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.address.toLowerCase() !== adminAddress.toLowerCase()) {
    return res.status(403).json({ error: 'Apenas o administrador pode fazer isso' });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════
//  ROUTES: Auth
// ═══════════════════════════════════════════════════════════════

app.post('/api/auth', async (req, res) => {
  try {
    const { address, signature, message } = req.body;

    // 1. Verify signature
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    // 2. Check NFT ownership on-chain (read-only, free)
    const totalSupply = Number(await nftContract.totalSupply());
    const nftIds = [];
    const credits = {};

    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
      try {
        const owner = await nftContract.ownerOf(tokenId);
        if (owner.toLowerCase() === address.toLowerCase()) {
          nftIds.push(tokenId);
          credits[tokenId] = getRemainingCredits(tokenId);
        }
      } catch (e) { /* token may not exist */ }
    }

    const isAdmin = address.toLowerCase() === adminAddress.toLowerCase();

    // 3. Issue JWT (valid for 24 hours)
    const token = jwt.sign(
      { address: address.toLowerCase(), nftIds, isAdmin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      address: address.toLowerCase(),
      nftIds,
      credits,
      isAdmin
    });

  } catch (e) {
    console.error('Auth error:', e);
    res.status(500).json({ error: 'Erro na autenticação' });
  }
});

// Refresh NFT data without re-signing
app.get('/api/auth/refresh', authMiddleware, async (req, res) => {
  try {
    const address = req.user.address;
    const totalSupply = Number(await nftContract.totalSupply());
    const nftIds = [];
    const credits = {};

    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
      try {
        const owner = await nftContract.ownerOf(tokenId);
        if (owner.toLowerCase() === address.toLowerCase()) {
          nftIds.push(tokenId);
          credits[tokenId] = getRemainingCredits(tokenId);
        }
      } catch (e) { /* skip */ }
    }

    const isAdmin = address.toLowerCase() === adminAddress.toLowerCase();

    res.json({ address, nftIds, credits, isAdmin });
  } catch (e) {
    console.error('Refresh error:', e);
    res.status(500).json({ error: 'Erro ao atualizar dados' });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTES: Ideas
// ═══════════════════════════════════════════════════════════════

app.get('/api/ideas', (req, res) => {
  const ideas = stmts.getAllIdeas.all();

  // Attach comments to each idea
  const result = ideas.map(idea => ({
    ...idea,
    comments: stmts.getCommentsByIdea.all(idea.id)
  }));

  res.json(result);
});

app.post('/api/ideas', authMiddleware, (req, res) => {
  const { nftId, title, description } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
  }

  if (!req.user.nftIds.includes(nftId)) {
    return res.status(403).json({ error: 'Você não é dono deste NFT' });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const result = stmts.insertIdea.run(req.user.address, nftId, title, description, timestamp);

  res.json({ id: result.lastInsertRowid, message: 'Ideia criada com sucesso!' });
});

app.post('/api/ideas/:id/vote', authMiddleware, (req, res) => {
  const ideaId = parseInt(req.params.id);
  const { nftId, additionalVotes } = req.body;

  if (!req.user.nftIds.includes(nftId)) {
    return res.status(403).json({ error: 'Você não é dono deste NFT' });
  }

  if (!additionalVotes || additionalVotes < 1) {
    return res.status(400).json({ error: 'Deve votar pelo menos 1' });
  }

  const idea = stmts.getIdeaById.get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Ideia não encontrada' });
  if (idea.is_promoted) return res.status(400).json({ error: 'Ideia já foi promovida' });

  // Quadratic Voting cost calculation
  const existingVote = stmts.getIdeaVote.get(ideaId, nftId);
  const currentVotes = existingVote ? existingVote.votes_allocated : 0;
  const newTotalVotes = currentVotes + additionalVotes;

  const currentCost = currentVotes * currentVotes;
  const newTotalCost = newTotalVotes * newTotalVotes;
  const marginalCost = newTotalCost - currentCost;

  // Check credits
  const remaining = getRemainingCredits(nftId);
  if (marginalCost > remaining) {
    return res.status(400).json({
      error: `Créditos insuficientes. Custo: ${marginalCost}, Disponível: ${remaining}`
    });
  }

  // Execute in transaction
  const vote = db.transaction(() => {
    spendCredits(nftId, marginalCost);
    const totalCreditsSpent = (existingVote ? existingVote.credits_spent : 0) + marginalCost;
    stmts.upsertIdeaVote.run(ideaId, nftId, req.user.address, newTotalVotes, totalCreditsSpent, newTotalVotes, totalCreditsSpent);
    stmts.addIdeaQvVotes.run(additionalVotes, ideaId);
  });

  try {
    vote();
    res.json({ message: 'Voto registrado!', marginalCost, remainingCredits: getRemainingCredits(nftId) });
  } catch (e) {
    console.error('Vote error:', e);
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/ideas/:id/comment', authMiddleware, (req, res) => {
  const ideaId = parseInt(req.params.id);
  const { text } = req.body;

  if (!text) return res.status(400).json({ error: 'Comentário vazio' });

  const idea = stmts.getIdeaById.get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Ideia não encontrada' });

  const timestamp = Math.floor(Date.now() / 1000);
  stmts.insertComment.run(ideaId, req.user.address, text, timestamp);

  res.json({ message: 'Comentário adicionado!' });
});

// ═══════════════════════════════════════════════════════════════
//  ROUTES: Proposals
// ═══════════════════════════════════════════════════════════════

app.get('/api/proposals', (req, res) => {
  const proposals = stmts.getAllProposals.all();
  res.json(proposals);
});

app.post('/api/proposals/:id/vote', authMiddleware, (req, res) => {
  const proposalId = parseInt(req.params.id);
  const { nftId, choice, additionalVotes } = req.body;

  if (!req.user.nftIds.includes(nftId)) {
    return res.status(403).json({ error: 'Você não é dono deste NFT' });
  }

  if (choice < 1 || choice > 3) {
    return res.status(400).json({ error: 'Escolha inválida (1=Favor, 2=Contra, 3=Abstenção)' });
  }

  const proposal = stmts.getProposalById.get(proposalId);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });

  const now = Math.floor(Date.now() / 1000);
  if (now > proposal.end_time) {
    return res.status(400).json({ error: 'Votação encerrada' });
  }

  // Check if already voted with different choice
  const existingVote = stmts.getProposalVote.get(proposalId, nftId);
  if (existingVote && existingVote.choice !== choice) {
    return res.status(400).json({ error: 'Não pode mudar o voto. Já votou com outra escolha.' });
  }

  // QV cost
  const currentVotes = existingVote ? existingVote.votes_allocated : 0;
  const newTotalVotes = currentVotes + additionalVotes;
  const currentCost = currentVotes * currentVotes;
  const newTotalCost = newTotalVotes * newTotalVotes;
  const marginalCost = newTotalCost - currentCost;

  const remaining = getRemainingCredits(nftId);
  if (marginalCost > remaining) {
    return res.status(400).json({
      error: `Créditos insuficientes. Custo: ${marginalCost}, Disponível: ${remaining}`
    });
  }

  const vote = db.transaction(() => {
    spendCredits(nftId, marginalCost);
    const totalCreditsSpent = (existingVote ? existingVote.credits_spent : 0) + marginalCost;
    stmts.upsertProposalVote.run(proposalId, nftId, req.user.address, choice, newTotalVotes, totalCreditsSpent, newTotalVotes, totalCreditsSpent);

    if (choice === 1) stmts.addProposalVotesFor.run(additionalVotes, proposalId);
    else if (choice === 2) stmts.addProposalVotesAgainst.run(additionalVotes, proposalId);
    else stmts.addProposalVotesAbstain.run(additionalVotes, proposalId);
  });

  try {
    vote();
    res.json({ message: 'Voto registrado!', marginalCost, remainingCredits: getRemainingCredits(nftId) });
  } catch (e) {
    console.error('Proposal vote error:', e);
    res.status(400).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
//  ROUTES: Admin
// ═══════════════════════════════════════════════════════════════

app.post('/api/admin/promote/:ideaId', authMiddleware, adminMiddleware, (req, res) => {
  const ideaId = parseInt(req.params.ideaId);
  const { durationMinutes } = req.body;
  const dur = durationMinutes || 2;

  const idea = stmts.getIdeaById.get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Ideia não encontrada' });
  if (idea.is_promoted) return res.status(400).json({ error: 'Ideia já promovida' });

  const now = Math.floor(Date.now() / 1000);
  const endTime = now + (dur * 60);

  const promote = db.transaction(() => {
    stmts.promoteIdea.run(ideaId);
    stmts.insertProposal.run(
      idea.title,
      idea.description,
      idea.qv_votes, // Carry over traction votes as "For"
      0,              // votes_against
      now,            // start_time
      endTime,        // end_time
      ideaId          // from_idea_id
    );
  });

  try {
    promote();
    res.json({ message: `Ideia "${idea.title}" promovida com ${idea.qv_votes} votos herdados!` });
  } catch (e) {
    console.error('Promote error:', e);
    res.status(500).json({ error: 'Erro ao promover ideia' });
  }
});

app.post('/api/admin/create-proposal', authMiddleware, adminMiddleware, (req, res) => {
  const { title, description, durationMinutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });

  const dur = durationMinutes || 5;
  const now = Math.floor(Date.now() / 1000);
  const endTime = now + (dur * 60);

  const result = stmts.insertProposal.run(title, description || '', 0, 0, now, endTime, null);

  res.json({ id: result.lastInsertRowid, message: 'Proposta criada!' });
});

// ═══════════════════════════════════════════════════════════════
//  STARTUP
// ═══════════════════════════════════════════════════════════════

async function startServer() {
  try {
    // Fetch admin address from NFT contract owner
    adminAddress = (await nftContract.owner()).toLowerCase();
    console.log(`✅ Admin address: ${adminAddress}`);
    console.log(`✅ NFT Contract: ${NFT_ADDRESS}`);
    console.log(`✅ RPC: ${RPC_URL}`);
  } catch (e) {
    console.warn('⚠️  Não foi possível buscar o admin on-chain. Usando .env');
    adminAddress = (process.env.ADMIN_ADDRESS || '').toLowerCase();
  }

  app.listen(PORT, () => {
    console.log(`\n🚀 Veritas Backend rodando em http://localhost:${PORT}`);
    console.log(`📡 Endpoints disponíveis:`);
    console.log(`   POST /api/auth          → Autenticação via assinatura`);
    console.log(`   GET  /api/auth/refresh   → Atualizar dados do usuário`);
    console.log(`   GET  /api/ideas          → Listar ideias`);
    console.log(`   POST /api/ideas          → Criar ideia`);
    console.log(`   POST /api/ideas/:id/vote → Votar na ideia`);
    console.log(`   POST /api/ideas/:id/comment → Comentar`);
    console.log(`   GET  /api/proposals      → Listar propostas`);
    console.log(`   POST /api/proposals/:id/vote → Votar na proposta`);
    console.log(`   POST /api/admin/promote/:id  → Promover ideia`);
    console.log(`   POST /api/admin/create-proposal → Criar proposta direta\n`);
  });
}

startServer();
