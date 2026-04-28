const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'veritas.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ═══════════════════════════════════════════════════════════════
//  SCHEMA
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposer TEXT NOT NULL,
    nft_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    qv_votes INTEGER DEFAULT 0,
    timestamp INTEGER NOT NULL,
    is_promoted INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS idea_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER NOT NULL,
    nft_id INTEGER NOT NULL,
    voter TEXT NOT NULL,
    votes_allocated INTEGER DEFAULT 0,
    credits_spent INTEGER DEFAULT 0,
    UNIQUE(idea_id, nft_id),
    FOREIGN KEY (idea_id) REFERENCES ideas(id)
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    votes_abstain INTEGER DEFAULT 0,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    from_idea_id INTEGER,
    FOREIGN KEY (from_idea_id) REFERENCES ideas(id)
  );

  CREATE TABLE IF NOT EXISTS proposal_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    nft_id INTEGER NOT NULL,
    voter TEXT NOT NULL,
    choice INTEGER NOT NULL,
    votes_allocated INTEGER DEFAULT 0,
    credits_spent INTEGER DEFAULT 0,
    UNIQUE(proposal_id, nft_id),
    FOREIGN KEY (proposal_id) REFERENCES proposals(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idea_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (idea_id) REFERENCES ideas(id)
  );

  CREATE TABLE IF NOT EXISTS credits_ledger (
    nft_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_spent INTEGER DEFAULT 0,
    PRIMARY KEY (nft_id, year)
  );
`);

// ═══════════════════════════════════════════════════════════════
//  PREPARED STATEMENTS
// ═══════════════════════════════════════════════════════════════

const CREDITS_PER_YEAR = 100;

const stmts = {
  // Ideas
  insertIdea: db.prepare(`INSERT INTO ideas (proposer, nft_id, title, description, qv_votes, timestamp, is_promoted) VALUES (?, ?, ?, ?, 0, ?, 0)`),
  getAllIdeas: db.prepare(`SELECT * FROM ideas WHERE is_promoted = 0 ORDER BY qv_votes DESC`),
  getIdeaById: db.prepare(`SELECT * FROM ideas WHERE id = ?`),
  promoteIdea: db.prepare(`UPDATE ideas SET is_promoted = 1 WHERE id = ?`),

  // Idea Votes
  getIdeaVote: db.prepare(`SELECT * FROM idea_votes WHERE idea_id = ? AND nft_id = ?`),
  upsertIdeaVote: db.prepare(`
    INSERT INTO idea_votes (idea_id, nft_id, voter, votes_allocated, credits_spent) 
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(idea_id, nft_id) DO UPDATE SET votes_allocated = ?, credits_spent = ?
  `),
  addIdeaQvVotes: db.prepare(`UPDATE ideas SET qv_votes = qv_votes + ? WHERE id = ?`),

  // Proposals
  insertProposal: db.prepare(`INSERT INTO proposals (title, description, votes_for, votes_against, votes_abstain, start_time, end_time, from_idea_id) VALUES (?, ?, ?, ?, 0, ?, ?, ?)`),
  getAllProposals: db.prepare(`SELECT * FROM proposals ORDER BY id DESC`),
  getProposalById: db.prepare(`SELECT * FROM proposals WHERE id = ?`),
  addProposalVotesFor: db.prepare(`UPDATE proposals SET votes_for = votes_for + ? WHERE id = ?`),
  addProposalVotesAgainst: db.prepare(`UPDATE proposals SET votes_against = votes_against + ? WHERE id = ?`),
  addProposalVotesAbstain: db.prepare(`UPDATE proposals SET votes_abstain = votes_abstain + ? WHERE id = ?`),

  // Proposal Votes
  getProposalVote: db.prepare(`SELECT * FROM proposal_votes WHERE proposal_id = ? AND nft_id = ?`),
  upsertProposalVote: db.prepare(`
    INSERT INTO proposal_votes (proposal_id, nft_id, voter, choice, votes_allocated, credits_spent)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(proposal_id, nft_id) DO UPDATE SET votes_allocated = ?, credits_spent = ?
  `),

  // Comments
  insertComment: db.prepare(`INSERT INTO comments (idea_id, author, text, timestamp) VALUES (?, ?, ?, ?)`),
  getCommentsByIdea: db.prepare(`SELECT * FROM comments WHERE idea_id = ? ORDER BY timestamp ASC`),

  // Credits
  getCreditsSpent: db.prepare(`SELECT total_spent FROM credits_ledger WHERE nft_id = ? AND year = ?`),
  upsertCredits: db.prepare(`
    INSERT INTO credits_ledger (nft_id, year, total_spent) VALUES (?, ?, ?)
    ON CONFLICT(nft_id, year) DO UPDATE SET total_spent = ?
  `),
};

// ═══════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getCurrentYear() {
  // Simple year calculation (governance starts at deploy time, but for MVP we use calendar year)
  return new Date().getFullYear();
}

function getRemainingCredits(nftId) {
  const year = getCurrentYear();
  const row = stmts.getCreditsSpent.get(nftId, year);
  return CREDITS_PER_YEAR - (row ? row.total_spent : 0);
}

function spendCredits(nftId, amount) {
  const year = getCurrentYear();
  const row = stmts.getCreditsSpent.get(nftId, year);
  const current = row ? row.total_spent : 0;
  const newTotal = current + amount;
  if (newTotal > CREDITS_PER_YEAR) throw new Error('Créditos insuficientes');
  stmts.upsertCredits.run(nftId, year, newTotal, newTotal);
}

module.exports = { db, stmts, CREDITS_PER_YEAR, getCurrentYear, getRemainingCredits, spendCredits };
