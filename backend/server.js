require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { db, stmts, CREDITS_PER_YEAR, getCurrentYear, getRemainingCredits, spendCredits, refundCredits } = require('./database');
const { seedAll } = require('./mock-data');

// Seed mock data on startup
seedAll();

const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'veritas-mvp-secret-2024';
const RPC_URL = process.env.RPC_URL || 'https://public-node.testnet.rsk.co';
const NFT_ADDRESS = process.env.NFT_ADDRESS || '0xa1851Eb7B8aC7a684ef22EC3b3766A7583d62A80';

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

const path = require('path');
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ═══ MIDDLEWARE ═══
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Token não fornecido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
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

// Optional auth - doesn't fail if no token
function optionalAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch(e) {}
  }
  next();
}

// ═══ AUTH ROUTES ═══
app.post('/api/auth', async (req, res) => {
  try {
    const { address, signature, message } = req.body;
    const recovered = ethers.verifyMessage(message, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
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
      } catch (e) {}
    }
    const isAdmin = address.toLowerCase() === adminAddress.toLowerCase();
    const token = jwt.sign({ address: address.toLowerCase(), nftIds, isAdmin }, JWT_SECRET, { expiresIn: '24h' });
    const ideaVotes = stmts.getAllUserIdeaVotes.all(address.toLowerCase());
    const proposalVotes = stmts.getAllUserProposalVotes.all(address.toLowerCase());
    res.json({ token, address: address.toLowerCase(), nftIds, credits, isAdmin, ideaVotes, proposalVotes });
  } catch (e) {
    console.error('Auth error:', e);
    res.status(500).json({ error: 'Erro na autenticação' });
  }
});

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
      } catch (e) {}
    }
    const isAdmin = address.toLowerCase() === adminAddress.toLowerCase();
    const ideaVotes = stmts.getAllUserIdeaVotes.all(address.toLowerCase());
    const proposalVotes = stmts.getAllUserProposalVotes.all(address.toLowerCase());
    res.json({ address, nftIds, credits, isAdmin, ideaVotes, proposalVotes });
  } catch (e) {
    console.error('Refresh error:', e);
    res.status(500).json({ error: 'Erro ao atualizar dados' });
  }
});

// ═══ IDEAS ROUTES ═══
app.get('/api/ideas', (req, res) => {
  const ideas = stmts.getAllIdeas.all();
  const list = ideas.map(idea => ({ ...idea, comments: stmts.getCommentsByIdea.all(idea.id) }));
  list.sort((a, b) => b.qv_votes - a.qv_votes);
  res.json({ ideas: list, nextBatchTime });
});

app.post('/api/ideas', authMiddleware, (req, res) => {
  const { nftId, title, description } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
  if (!req.user.nftIds.includes(nftId)) return res.status(403).json({ error: 'Você não é dono deste NFT' });
  const timestamp = Math.floor(Date.now() / 1000);
  const result = stmts.insertIdea.run(req.user.address, nftId, title, description, timestamp);
  res.json({ id: result.lastInsertRowid, message: 'Ideia criada com sucesso!' });
});

app.post('/api/ideas/:id/vote', authMiddleware, (req, res) => {
  const ideaId = parseInt(req.params.id);
  const { nftId, additionalVotes } = req.body;
  if (!req.user.nftIds.includes(nftId)) return res.status(403).json({ error: 'Você não é dono deste NFT' });
  if (!additionalVotes || additionalVotes < 1) return res.status(400).json({ error: 'Deve votar pelo menos 1' });
  const idea = stmts.getIdeaById.get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Ideia não encontrada' });
  if (idea.is_promoted) return res.status(400).json({ error: 'Ideia já foi promovida' });
  const existingVote = stmts.getIdeaVote.get(ideaId, nftId);
  const currentVotes = existingVote ? existingVote.votes_allocated : 0;
  const newTotalVotes = currentVotes + additionalVotes;
  const marginalCost = (newTotalVotes * newTotalVotes) - (currentVotes * currentVotes);
  const remaining = getRemainingCredits(nftId);
  if (marginalCost > remaining) return res.status(400).json({ error: `Créditos insuficientes. Custo: ${marginalCost}, Disponível: ${remaining}` });
  const vote = db.transaction(() => {
    spendCredits(nftId, marginalCost);
    const totalCreditsSpent = (existingVote ? existingVote.credits_spent : 0) + marginalCost;
    stmts.upsertIdeaVote.run(ideaId, nftId, req.user.address, newTotalVotes, totalCreditsSpent, newTotalVotes, totalCreditsSpent);
    stmts.addIdeaQvVotes.run(additionalVotes, ideaId);
  });
  try {
    vote();
    res.json({ message: 'Voto registrado!', marginalCost, remainingCredits: getRemainingCredits(nftId) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/ideas/:id/vote', authMiddleware, (req, res) => {
  const ideaId = parseInt(req.params.id);
  const { nftId } = req.body;
  if (!req.user.nftIds.includes(parseInt(nftId))) return res.status(403).json({ error: 'Você não é dono deste NFT' });
  const idea = stmts.getIdeaById.get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Ideia não encontrada' });
  if (idea.is_promoted) return res.status(400).json({ error: 'Ideia já foi promovida' });
  const existingVote = stmts.getIdeaVote.get(ideaId, nftId);
  if (!existingVote || existingVote.voter.toLowerCase() !== req.user.address) return res.status(400).json({ error: 'Voto não encontrado' });
  const revoke = db.transaction(() => {
    refundCredits(nftId, existingVote.credits_spent);
    stmts.removeIdeaQvVotes.run(existingVote.votes_allocated, ideaId);
    stmts.deleteIdeaVote.run(ideaId, nftId);
  });
  try {
    revoke();
    res.json({ message: 'Voto revogado!', refunded: existingVote.credits_spent, remainingCredits: getRemainingCredits(nftId) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/ideas/:id/comment', authMiddleware, (req, res) => {
  const ideaId = parseInt(req.params.id);
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Comentário vazio' });
  const idea = stmts.getIdeaById.get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Ideia não encontrada' });
  stmts.insertComment.run(ideaId, req.user.address, text, Math.floor(Date.now() / 1000));
  res.json({ message: 'Comentário adicionado!' });
});

// ═══ PROPOSALS ROUTES ═══
app.get('/api/proposals', (req, res) => res.json(stmts.getAllProposals.all()));

app.post('/api/proposals/:id/vote', authMiddleware, (req, res) => {
  const proposalId = parseInt(req.params.id);
  const { nftId, choice, additionalVotes } = req.body;
  if (!req.user.nftIds.includes(nftId)) return res.status(403).json({ error: 'Você não é dono deste NFT' });
  if (choice < 1 || choice > 3) return res.status(400).json({ error: 'Escolha inválida' });
  const proposal = stmts.getProposalById.get(proposalId);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  if (Math.floor(Date.now() / 1000) > proposal.end_time) return res.status(400).json({ error: 'Votação encerrada' });
  const existingVote = stmts.getProposalVote.get(proposalId, nftId);
  if (existingVote && existingVote.choice !== choice) return res.status(400).json({ error: 'Não pode mudar o voto' });
  const currentVotes = existingVote ? existingVote.votes_allocated : 0;
  const newTotalVotes = currentVotes + additionalVotes;
  const marginalCost = (newTotalVotes * newTotalVotes) - (currentVotes * currentVotes);
  const remaining = getRemainingCredits(nftId);
  if (marginalCost > remaining) return res.status(400).json({ error: `Créditos insuficientes` });
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
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/proposals/:id/vote', authMiddleware, (req, res) => {
  const proposalId = parseInt(req.params.id);
  const { nftId } = req.body;
  if (!req.user.nftIds.includes(parseInt(nftId))) return res.status(403).json({ error: 'Você não é dono deste NFT' });
  const proposal = stmts.getProposalById.get(proposalId);
  if (!proposal) return res.status(404).json({ error: 'Proposta não encontrada' });
  if (Math.floor(Date.now() / 1000) > proposal.end_time) return res.status(400).json({ error: 'Votação encerrada' });
  const existingVote = stmts.getProposalVote.get(proposalId, nftId);
  if (!existingVote || existingVote.voter.toLowerCase() !== req.user.address) return res.status(400).json({ error: 'Voto não encontrado' });
  const revoke = db.transaction(() => {
    refundCredits(nftId, existingVote.credits_spent);
    if (existingVote.choice === 1) stmts.removeProposalVotesFor.run(existingVote.votes_allocated, proposalId);
    else if (existingVote.choice === 2) stmts.removeProposalVotesAgainst.run(existingVote.votes_allocated, proposalId);
    else stmts.removeProposalVotesAbstain.run(existingVote.votes_allocated, proposalId);
    stmts.deleteProposalVote.run(proposalId, nftId);
  });
  try {
    revoke();
    res.json({ message: 'Voto revogado!', refunded: existingVote.credits_spent, remainingCredits: getRemainingCredits(nftId) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ═══ ADMIN ROUTES ═══
app.post('/api/admin/promote/:ideaId', authMiddleware, adminMiddleware, (req, res) => {
  const ideaId = parseInt(req.params.ideaId);
  const dur = req.body.durationMinutes || 2;
  const idea = stmts.getIdeaById.get(ideaId);
  if (!idea) return res.status(404).json({ error: 'Ideia não encontrada' });
  if (idea.is_promoted) return res.status(400).json({ error: 'Ideia já promovida' });
  const now = Math.floor(Date.now() / 1000);
  const promote = db.transaction(() => {
    stmts.promoteIdea.run(ideaId);
    stmts.insertProposal.run(idea.title, idea.description, idea.qv_votes, 0, now, now + dur * 60, ideaId);
  });
  try { promote(); res.json({ message: `Ideia promovida!` }); }
  catch (e) { res.status(500).json({ error: 'Erro ao promover' }); }
});

app.post('/api/admin/create-proposal', authMiddleware, adminMiddleware, (req, res) => {
  const { title, description, durationMinutes } = req.body;
  if (!title) return res.status(400).json({ error: 'Título obrigatório' });
  const now = Math.floor(Date.now() / 1000);
  const result = stmts.insertProposal.run(title, description || '', 0, 0, now, now + (durationMinutes || 5) * 60, null);
  res.json({ id: result.lastInsertRowid, message: 'Proposta criada!' });
});

app.post('/api/admin/mint', authMiddleware, adminMiddleware, async (req, res) => {
  const { toAddress } = req.body;
  if (!toAddress || !ethers.isAddress(toAddress)) return res.status(400).json({ error: 'Endereço inválido' });
  try {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const nftWithSigner = new ethers.Contract(NFT_ADDRESS, [...NFT_ABI, "function safeMint(address to) returns (uint256)"], wallet);
    const tx = await nftWithSigner.safeMint(toAddress, { gasLimit: 300000 });
    const receipt = await tx.wait();
    res.json({ message: 'NFT mintado!', txHash: receipt.hash });
  } catch (e) { res.status(500).json({ error: `Erro ao mintar: ${e.reason || e.message}` }); }
});

// ═══ BATCH PROMOTION ═══
const BATCH_CYCLE_MINUTES = 2;
let nextBatchTime = Math.floor(Date.now() / 1000) + (BATCH_CYCLE_MINUTES * 60);

function executeBatchPromotion() {
  const ideas = stmts.getAllIdeas.all();
  ideas.sort((a, b) => b.qv_votes - a.qv_votes);
  const top10 = ideas.slice(0, 10);
  const now = Math.floor(Date.now() / 1000);
  if (top10.length > 0) {
    const promote = db.transaction(() => {
      for (const idea of top10) {
        stmts.promoteIdea.run(idea.id);
        stmts.insertProposal.run(idea.title, idea.description, idea.qv_votes, 0, now, now + 300, idea.id);
      }
    });
    try { promote(); } catch (e) { console.error('[Batch] Error:', e); }
  }
  nextBatchTime = Math.floor(Date.now() / 1000) + (BATCH_CYCLE_MINUTES * 60);
}
setInterval(() => { if (Math.floor(Date.now() / 1000) >= nextBatchTime) executeBatchPromotion(); }, 1000);

// ═══════════════════════════════════════════════════════════════
//  NEW MODULE ROUTES
// ═══════════════════════════════════════════════════════════════

// ═══ CHAT ═══
app.get('/api/chat/channels', (req, res) => res.json(stmts.getAllChannels.all()));

app.get('/api/chat/messages/:channelId', (req, res) => {
  res.json(stmts.getMessagesByChannel.all(parseInt(req.params.channelId)));
});

app.post('/api/chat/messages/:channelId', optionalAuth, (req, res) => {
  const { text, author_name } = req.body;
  if (!text) return res.status(400).json({ error: 'Message empty' });
  const author = req.user?.address || 'anonymous';
  const name = author_name || 'Resident';
  const ts = Math.floor(Date.now() / 1000);
  stmts.insertMessage.run(parseInt(req.params.channelId), author, name, text, ts);
  res.json({ message: 'Sent!' });
});

// ═══ RULES ═══
app.get('/api/rules', (req, res) => {
  const rules = stmts.getAllRules.all();
  const suggestions = stmts.getAllSuggestions.all();
  res.json({ rules, suggestions });
});

app.post('/api/rules/suggestions', optionalAuth, (req, res) => {
  const { rule_id, title, description, suggested_by_name } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
  const by = req.user?.address || 'anonymous';
  stmts.insertSuggestion.run(rule_id || null, title, description, by, suggested_by_name || 'Resident', Math.floor(Date.now() / 1000));
  res.json({ message: 'Suggestion submitted!' });
});

app.post('/api/rules/suggestions/:id/vote', optionalAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const { vote } = req.body; // 1 = for, -1 = against
  const voter = req.user?.address || `anon-${Date.now()}`;
  const existing = stmts.getSuggestionVote.get(id, voter);
  if (existing) return res.status(400).json({ error: 'Already voted' });
  stmts.insertSuggestionVote.run(id, voter, vote);
  if (vote === 1) stmts.addSuggestionVoteFor.run(id);
  else stmts.addSuggestionVoteAgainst.run(id);
  res.json({ message: 'Vote recorded!' });
});

// ═══ FINANCES ═══
app.get('/api/finances/dashboard', (req, res) => {
  const transactions = stmts.getAllTransactions.all();
  const payments = stmts.getAllPayments.all();
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const overdueCount = payments.filter(p => p.status === 'overdue').length;
  res.json({ transactions, payments, summary: { totalIncome, totalExpense, balance, paidCount, pendingCount, overdueCount } });
});

// ═══ FOOD & NATURE ═══
app.get('/api/food', (req, res) => {
  const gardens = stmts.getAllGardens.all();
  const harvests = stmts.getAllHarvests.all();
  const schedules = stmts.getAllSchedules.all();
  res.json({ gardens, harvests, schedules });
});

// ═══ SOLAR ═══
app.get('/api/solar', (req, res) => {
  const systems = stmts.getAllSolarSystems.all();
  const maintenance = stmts.getAllMaintenance.all();
  const totalCapacity = systems.reduce((s, sys) => s + sys.capacity_kw, 0);
  const totalPanels = systems.reduce((s, sys) => s + sys.panel_count, 0);
  const activeCount = systems.filter(s => s.status === 'active').length;
  res.json({ systems, maintenance, summary: { totalCapacity, totalPanels, activeCount, totalSystems: systems.length } });
});

// ═══ WATER ═══
app.get('/api/water', (req, res) => {
  const usage = stmts.getAllWaterUsage.all();
  const alerts = stmts.getAllWaterAlerts.all();
  // Group by month for chart
  const byMonth = {};
  usage.forEach(u => {
    if (!byMonth[u.month]) byMonth[u.month] = { total: 0, count: 0 };
    byMonth[u.month].total += u.usage_liters;
    byMonth[u.month].count++;
  });
  res.json({ usage, alerts, byMonth });
});

// ═══ GUESTS ═══
app.get('/api/guests', (req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const all = stmts.getAllGuests.all();
  const active = all.filter(g => g.valid_until > now);
  res.json({ guests: all, active });
});

app.post('/api/guests', optionalAuth, (req, res) => {
  const { guest_name, host_resident, host_lot, vehicle_plate, purpose, valid_hours } = req.body;
  if (!guest_name || !host_resident) return res.status(400).json({ error: 'Name and host required' });
  const now = Math.floor(Date.now() / 1000);
  const validUntil = now + (valid_hours || 24) * 3600;
  const qrData = JSON.stringify({ guest: guest_name, host: host_resident, lot: host_lot, valid: validUntil, id: Date.now() });
  const qrCode = Buffer.from(qrData).toString('base64');
  stmts.insertGuest.run(guest_name, host_resident, host_lot || '', vehicle_plate || '', purpose || '', qrCode, now, validUntil, now);
  res.json({ message: 'Guest registered!', qrCode });
});

// ═══ ANNOUNCEMENTS, EVENTS, BOOKINGS ═══
app.get('/api/announcements', (req, res) => res.json(stmts.getAllAnnouncements.all()));

app.get('/api/events', (req, res) => res.json(stmts.getAllEvents.all()));

app.get('/api/bookings', (req, res) => res.json(stmts.getAllBookings.all()));

app.post('/api/bookings', optionalAuth, (req, res) => {
  const { amenity, booked_by, date, time_slot } = req.body;
  if (!amenity || !date || !time_slot) return res.status(400).json({ error: 'Missing fields' });
  stmts.insertBooking.run(amenity, booked_by || 'Resident', date, time_slot, Math.floor(Date.now() / 1000));
  res.json({ message: 'Booked!' });
});

// ═══ MARKETPLACE ═══
app.get('/api/marketplace', (req, res) => res.json(stmts.getAllListings.all()));

app.get('/api/marketplace/:id', (req, res) => {
  const listing = stmts.getListingById.get(parseInt(req.params.id));
  if (!listing) return res.status(404).json({ error: 'Not found' });
  const messages = stmts.getMessagesByListing.all(listing.id);
  res.json({ ...listing, messages });
});

app.post('/api/marketplace', optionalAuth, (req, res) => {
  const { title, description, category, price, seller_name, seller_lot, image_emoji } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
  stmts.insertListing.run(title, description, category || 'for_sale', price || 0, 'BRL', seller_name || 'Resident', seller_lot || '', image_emoji || '📦', Math.floor(Date.now() / 1000));
  res.json({ message: 'Listed!' });
});

// ═══ STARTUP ═══
async function startServer() {
  try {
    adminAddress = (await nftContract.owner()).toLowerCase();
    console.log(`✅ Admin: ${adminAddress}`);
  } catch (e) {
    console.warn('⚠️  Could not fetch admin on-chain');
    adminAddress = (process.env.ADMIN_ADDRESS || '').toLowerCase();
  }
  app.listen(PORT, () => {
    console.log(`\n🚀 Veritas Community Platform running on http://localhost:${PORT}`);
    console.log(`📡 Modules: Governance, Chat, Rules, Finances, Food, Solar, Water, Security, Announcements, Marketplace\n`);
  });
}
startServer();
