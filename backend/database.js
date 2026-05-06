const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'veritas.db'));

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — GOVERNANCE (existing)
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
//  SCHEMA — CHAT
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '💬',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    channel_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    author_name TEXT DEFAULT '',
    text TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (channel_id) REFERENCES chat_channels(id)
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — COMMUNITY RULES
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS community_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS rule_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    suggested_by TEXT NOT NULL,
    suggested_by_name TEXT DEFAULT '',
    votes_for INTEGER DEFAULT 0,
    votes_against INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (rule_id) REFERENCES community_rules(id)
  );

  CREATE TABLE IF NOT EXISTS rule_suggestion_votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suggestion_id INTEGER NOT NULL,
    voter TEXT NOT NULL,
    vote INTEGER NOT NULL,
    UNIQUE(suggestion_id, voter),
    FOREIGN KEY (suggestion_id) REFERENCES rule_suggestions(id)
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — FINANCES
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS finances_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS finances_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resident_name TEXT NOT NULL,
    resident_address TEXT DEFAULT '',
    lot_number TEXT NOT NULL,
    amount REAL NOT NULL,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_date TEXT,
    month TEXT NOT NULL
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — FOOD & NATURE
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS food_gardens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    location TEXT DEFAULT '',
    image_emoji TEXT DEFAULT '🌱'
  );

  CREATE TABLE IF NOT EXISTS food_harvests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    garden_id INTEGER NOT NULL,
    item TEXT NOT NULL,
    quantity TEXT NOT NULL,
    harvested_by TEXT DEFAULT '',
    date TEXT NOT NULL,
    FOREIGN KEY (garden_id) REFERENCES food_gardens(id)
  );

  CREATE TABLE IF NOT EXISTS food_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    garden_id INTEGER NOT NULL,
    resident_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    activity TEXT DEFAULT 'picking',
    FOREIGN KEY (garden_id) REFERENCES food_gardens(id)
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — SOLAR
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS solar_systems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_number TEXT NOT NULL,
    resident_name TEXT NOT NULL,
    capacity_kw REAL NOT NULL,
    panel_count INTEGER NOT NULL,
    inverter_model TEXT DEFAULT '',
    install_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    last_maintenance TEXT
  );

  CREATE TABLE IF NOT EXISTS solar_maintenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    solar_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    cost REAL DEFAULT 0,
    technician TEXT DEFAULT '',
    FOREIGN KEY (solar_id) REFERENCES solar_systems(id)
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — WATER
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS water_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lot_number TEXT NOT NULL,
    resident_name TEXT NOT NULL,
    month TEXT NOT NULL,
    usage_liters REAL NOT NULL,
    cost REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS water_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — GUESTS & SECURITY
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guest_name TEXT NOT NULL,
    host_resident TEXT NOT NULL,
    host_lot TEXT DEFAULT '',
    vehicle_plate TEXT DEFAULT '',
    purpose TEXT DEFAULT '',
    qr_code TEXT DEFAULT '',
    valid_from INTEGER NOT NULL,
    valid_until INTEGER NOT NULL,
    checked_in INTEGER DEFAULT 0,
    checked_in_at INTEGER,
    created_at INTEGER NOT NULL
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — ANNOUNCEMENTS, EVENTS, BOOKINGS
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    priority TEXT DEFAULT 'normal',
    author TEXT DEFAULT 'Admin',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    date TEXT NOT NULL,
    time TEXT DEFAULT '',
    location TEXT DEFAULT '',
    type TEXT DEFAULT 'social',
    organizer TEXT DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS amenity_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amenity TEXT NOT NULL,
    booked_by TEXT NOT NULL,
    date TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at INTEGER NOT NULL
  );
`);

// ═══════════════════════════════════════════════════════════════
//  SCHEMA — MARKETPLACE
// ═══════════════════════════════════════════════════════════════

db.exec(`
  CREATE TABLE IF NOT EXISTS marketplace_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL DEFAULT 0,
    currency TEXT DEFAULT 'BRL',
    seller_name TEXT NOT NULL,
    seller_lot TEXT DEFAULT '',
    image_emoji TEXT DEFAULT '📦',
    status TEXT DEFAULT 'active',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS marketplace_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    listing_id INTEGER NOT NULL,
    sender TEXT NOT NULL,
    sender_name TEXT DEFAULT '',
    message TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (listing_id) REFERENCES marketplace_listings(id)
  );
`);

// ═══════════════════════════════════════════════════════════════
//  PREPARED STATEMENTS — GOVERNANCE (existing)
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
  removeIdeaQvVotes: db.prepare(`UPDATE ideas SET qv_votes = MAX(0, qv_votes - ?) WHERE id = ?`),
  deleteIdeaVote: db.prepare(`DELETE FROM idea_votes WHERE idea_id = ? AND nft_id = ?`),
  getAllUserIdeaVotes: db.prepare(`SELECT idea_id, nft_id, votes_allocated FROM idea_votes WHERE voter = ?`),

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
  removeProposalVotesFor: db.prepare(`UPDATE proposals SET votes_for = MAX(0, votes_for - ?) WHERE id = ?`),
  removeProposalVotesAgainst: db.prepare(`UPDATE proposals SET votes_against = MAX(0, votes_against - ?) WHERE id = ?`),
  removeProposalVotesAbstain: db.prepare(`UPDATE proposals SET votes_abstain = MAX(0, votes_abstain - ?) WHERE id = ?`),
  deleteProposalVote: db.prepare(`DELETE FROM proposal_votes WHERE proposal_id = ? AND nft_id = ?`),
  getAllUserProposalVotes: db.prepare(`SELECT proposal_id, nft_id, choice, votes_allocated FROM proposal_votes WHERE voter = ?`),

  // Comments
  insertComment: db.prepare(`INSERT INTO comments (idea_id, author, text, timestamp) VALUES (?, ?, ?, ?)`),
  getCommentsByIdea: db.prepare(`SELECT * FROM comments WHERE idea_id = ? ORDER BY timestamp ASC`),

  // Credits
  getCreditsSpent: db.prepare(`SELECT total_spent FROM credits_ledger WHERE nft_id = ? AND year = ?`),
  upsertCredits: db.prepare(`
    INSERT INTO credits_ledger (nft_id, year, total_spent) VALUES (?, ?, ?)
    ON CONFLICT(nft_id, year) DO UPDATE SET total_spent = ?
  `),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — CHAT
  // ═══════════════════════════════════════════════════════════════
  getAllChannels: db.prepare(`SELECT * FROM chat_channels ORDER BY id ASC`),
  getChannelById: db.prepare(`SELECT * FROM chat_channels WHERE id = ?`),
  insertChannel: db.prepare(`INSERT INTO chat_channels (name, description, icon, created_at) VALUES (?, ?, ?, ?)`),
  getMessagesByChannel: db.prepare(`SELECT * FROM chat_messages WHERE channel_id = ? ORDER BY timestamp ASC LIMIT 200`),
  insertMessage: db.prepare(`INSERT INTO chat_messages (channel_id, author, author_name, text, timestamp) VALUES (?, ?, ?, ?, ?)`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — RULES
  // ═══════════════════════════════════════════════════════════════
  getAllRules: db.prepare(`SELECT * FROM community_rules ORDER BY category, id`),
  getRuleById: db.prepare(`SELECT * FROM community_rules WHERE id = ?`),
  insertRule: db.prepare(`INSERT INTO community_rules (title, category, content, status, created_at) VALUES (?, ?, ?, 'active', ?)`),
  getAllSuggestions: db.prepare(`SELECT * FROM rule_suggestions ORDER BY created_at DESC`),
  getSuggestionsByRule: db.prepare(`SELECT * FROM rule_suggestions WHERE rule_id = ? ORDER BY votes_for DESC`),
  insertSuggestion: db.prepare(`INSERT INTO rule_suggestions (rule_id, title, description, suggested_by, suggested_by_name, created_at) VALUES (?, ?, ?, ?, ?, ?)`),
  getSuggestionVote: db.prepare(`SELECT * FROM rule_suggestion_votes WHERE suggestion_id = ? AND voter = ?`),
  insertSuggestionVote: db.prepare(`INSERT INTO rule_suggestion_votes (suggestion_id, voter, vote) VALUES (?, ?, ?)`),
  addSuggestionVoteFor: db.prepare(`UPDATE rule_suggestions SET votes_for = votes_for + 1 WHERE id = ?`),
  addSuggestionVoteAgainst: db.prepare(`UPDATE rule_suggestions SET votes_against = votes_against + 1 WHERE id = ?`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — FINANCES
  // ═══════════════════════════════════════════════════════════════
  getAllTransactions: db.prepare(`SELECT * FROM finances_transactions ORDER BY date DESC`),
  getTransactionsByType: db.prepare(`SELECT * FROM finances_transactions WHERE type = ? ORDER BY date DESC`),
  insertTransaction: db.prepare(`INSERT INTO finances_transactions (type, category, description, amount, date, created_at) VALUES (?, ?, ?, ?, ?, ?)`),
  getAllPayments: db.prepare(`SELECT * FROM finances_payments ORDER BY due_date DESC`),
  getPaymentsByMonth: db.prepare(`SELECT * FROM finances_payments WHERE month = ? ORDER BY lot_number`),
  insertPayment: db.prepare(`INSERT INTO finances_payments (resident_name, resident_address, lot_number, amount, due_date, status, paid_date, month) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — FOOD & NATURE
  // ═══════════════════════════════════════════════════════════════
  getAllGardens: db.prepare(`SELECT * FROM food_gardens ORDER BY id`),
  getGardenById: db.prepare(`SELECT * FROM food_gardens WHERE id = ?`),
  insertGarden: db.prepare(`INSERT INTO food_gardens (name, type, description, status, location, image_emoji) VALUES (?, ?, ?, ?, ?, ?)`),
  getHarvestsByGarden: db.prepare(`SELECT * FROM food_harvests WHERE garden_id = ? ORDER BY date DESC`),
  getAllHarvests: db.prepare(`SELECT * FROM food_harvests ORDER BY date DESC LIMIT 50`),
  insertHarvest: db.prepare(`INSERT INTO food_harvests (garden_id, item, quantity, harvested_by, date) VALUES (?, ?, ?, ?, ?)`),
  getSchedulesByGarden: db.prepare(`SELECT * FROM food_schedules WHERE garden_id = ? ORDER BY date, time_slot`),
  getAllSchedules: db.prepare(`SELECT * FROM food_schedules ORDER BY date, time_slot`),
  insertSchedule: db.prepare(`INSERT INTO food_schedules (garden_id, resident_name, date, time_slot, activity) VALUES (?, ?, ?, ?, ?)`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — SOLAR
  // ═══════════════════════════════════════════════════════════════
  getAllSolarSystems: db.prepare(`SELECT * FROM solar_systems ORDER BY lot_number`),
  getSolarById: db.prepare(`SELECT * FROM solar_systems WHERE id = ?`),
  insertSolarSystem: db.prepare(`INSERT INTO solar_systems (lot_number, resident_name, capacity_kw, panel_count, inverter_model, install_date, status, last_maintenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  getMaintenanceBySolar: db.prepare(`SELECT * FROM solar_maintenance WHERE solar_id = ? ORDER BY date DESC`),
  getAllMaintenance: db.prepare(`SELECT * FROM solar_maintenance ORDER BY date DESC`),
  insertMaintenance: db.prepare(`INSERT INTO solar_maintenance (solar_id, type, description, date, cost, technician) VALUES (?, ?, ?, ?, ?, ?)`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — WATER
  // ═══════════════════════════════════════════════════════════════
  getAllWaterUsage: db.prepare(`SELECT * FROM water_usage ORDER BY month DESC, lot_number`),
  getWaterByMonth: db.prepare(`SELECT * FROM water_usage WHERE month = ? ORDER BY lot_number`),
  getWaterByLot: db.prepare(`SELECT * FROM water_usage WHERE lot_number = ? ORDER BY month DESC`),
  insertWaterUsage: db.prepare(`INSERT INTO water_usage (lot_number, resident_name, month, usage_liters, cost) VALUES (?, ?, ?, ?, ?)`),
  getAllWaterAlerts: db.prepare(`SELECT * FROM water_alerts WHERE active = 1 ORDER BY created_at DESC`),
  insertWaterAlert: db.prepare(`INSERT INTO water_alerts (type, message, severity, active, created_at) VALUES (?, ?, ?, 1, ?)`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — GUESTS
  // ═══════════════════════════════════════════════════════════════
  getAllGuests: db.prepare(`SELECT * FROM guests ORDER BY created_at DESC`),
  getActiveGuests: db.prepare(`SELECT * FROM guests WHERE valid_until > ? AND checked_in = 0 ORDER BY valid_from ASC`),
  getGuestById: db.prepare(`SELECT * FROM guests WHERE id = ?`),
  insertGuest: db.prepare(`INSERT INTO guests (guest_name, host_resident, host_lot, vehicle_plate, purpose, qr_code, valid_from, valid_until, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`),
  updateGuestQR: db.prepare(`UPDATE guests SET qr_code = ? WHERE id = ?`),
  checkInGuest: db.prepare(`UPDATE guests SET checked_in = 1, checked_in_at = ? WHERE id = ?`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — ANNOUNCEMENTS, EVENTS, BOOKINGS
  // ═══════════════════════════════════════════════════════════════
  getAllAnnouncements: db.prepare(`SELECT * FROM announcements ORDER BY created_at DESC`),
  insertAnnouncement: db.prepare(`INSERT INTO announcements (title, body, type, priority, author, created_at) VALUES (?, ?, ?, ?, ?, ?)`),
  getAllEvents: db.prepare(`SELECT * FROM events ORDER BY date ASC`),
  getUpcomingEvents: db.prepare(`SELECT * FROM events WHERE date >= ? ORDER BY date ASC`),
  insertEvent: db.prepare(`INSERT INTO events (title, description, date, time, location, type, organizer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
  getAllBookings: db.prepare(`SELECT * FROM amenity_bookings ORDER BY date, time_slot`),
  getBookingsByAmenity: db.prepare(`SELECT * FROM amenity_bookings WHERE amenity = ? AND date = ? ORDER BY time_slot`),
  getBookingsByDate: db.prepare(`SELECT * FROM amenity_bookings WHERE date = ? ORDER BY amenity, time_slot`),
  insertBooking: db.prepare(`INSERT INTO amenity_bookings (amenity, booked_by, date, time_slot, status, created_at) VALUES (?, ?, ?, ?, 'confirmed', ?)`),

  // ═══════════════════════════════════════════════════════════════
  //  PREPARED STATEMENTS — MARKETPLACE
  // ═══════════════════════════════════════════════════════════════
  getAllListings: db.prepare(`SELECT * FROM marketplace_listings WHERE status = 'active' ORDER BY created_at DESC`),
  getListingById: db.prepare(`SELECT * FROM marketplace_listings WHERE id = ?`),
  insertListing: db.prepare(`INSERT INTO marketplace_listings (title, description, category, price, currency, seller_name, seller_lot, image_emoji, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`),
  getMessagesByListing: db.prepare(`SELECT * FROM marketplace_messages WHERE listing_id = ? ORDER BY timestamp ASC`),
  insertMarketplaceMessage: db.prepare(`INSERT INTO marketplace_messages (listing_id, sender, sender_name, message, timestamp) VALUES (?, ?, ?, ?, ?)`),
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

function refundCredits(nftId, amount) {
  const year = getCurrentYear();
  const row = stmts.getCreditsSpent.get(nftId, year);
  if (row) {
    const newTotal = Math.max(0, row.total_spent - amount);
    stmts.upsertCredits.run(nftId, year, newTotal, newTotal);
  }
}

module.exports = { db, stmts, CREDITS_PER_YEAR, getCurrentYear, getRemainingCredits, spendCredits, refundCredits };
