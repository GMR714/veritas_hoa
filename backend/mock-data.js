// ═══════════════════════════════════════════════════════════════
//  MOCK DATA SEEDER — Veritas Village Community Platform
//
//  All sample content lives in: backend/seed-config.js
//  Edit that file, delete backend/veritas.db, and restart.
// ═══════════════════════════════════════════════════════════════

const { db, stmts } = require('./database');
const { RESIDENTS, FINANCES, RULES, ANNOUNCEMENTS, EVENTS, WATER_ALERTS, CHAT_MESSAGES, MARKETPLACE, GUESTS } = require('./seed-config');

const now   = Math.floor(Date.now() / 1000);
const day   = 86400;
const hour  = 3600;

function daysAgo(d)  { return now - (d * day);  }
function hoursAgo(h) { return now - (h * hour); }

function seedAll() {
  console.log('🌱 Seeding mock data...');

  // ═══ CHAT ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM chat_channels`).get().c === 0) {
    const channels = [
      ['general',      'General community discussion',      '💬'],
      ['maintenance',  'Maintenance requests and updates',  '🔧'],
      ['events',       'Event planning and coordination',   '🎉'],
      ['emergencies',  'Urgent alerts and emergencies',     '🚨'],
    ];
    channels.forEach(([name, desc, icon]) => stmts.insertChannel.run(name, desc, icon, daysAgo(90)));

    const insertMsg = db.prepare(`INSERT INTO chat_messages (channel_id, author, author_name, text, timestamp) VALUES (?, ?, ?, ?, ?)`);
    CHAT_MESSAGES.forEach(m => insertMsg.run(m.channelId, m.handle, m.name, m.text, hoursAgo(m.hoursAgo)));
    console.log('  ✅ Chat channels & messages');
  }

  // ═══ RULES ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM community_rules`).get().c === 0) {
    RULES.forEach(([title, cat, content]) => stmts.insertRule.run(title, cat, content, daysAgo(180)));

    const suggestions = [
      [1,    'Extend Pool Hours on Weekends',   "Allow pool use until midnight on Fri/Sat",                            'ana.eth',     'Ana Oliveira',     8, 2],
      [2,    'Allow Acoustic Music Until 11 PM','Acoustic instruments and soft music should be allowed until 11 PM',   'ricardo.eth', 'Ricardo Ferreira', 12, 3],
      [3,    'Cat-Only Leash Exemption',         "Indoor cats that go outside occasionally shouldn't need leashes",    'juliana.eth', 'Juliana Martins',  5, 7],
      [null, 'Create Bike Parking Area',         'We need covered bike parking near the main entrance',                'pedro.eth',   'Pedro Almeida',    14, 1],
    ];
    const insertSug = db.prepare(`INSERT INTO rule_suggestions (rule_id, title, description, suggested_by, suggested_by_name, votes_for, votes_against, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`);
    suggestions.forEach(([ruleId, title, desc, by, name, vf, va]) => insertSug.run(ruleId, title, desc, by, name, vf, va, daysAgo(15)));
    console.log('  ✅ Community rules & suggestions');
  }

  // ═══ FINANCES ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM finances_transactions`).get().c === 0) {
    const months = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
    months.forEach((m, mi) => {
      RESIDENTS.forEach(r => {
        stmts.insertTransaction.run('income', 'Monthly Fee', `Monthly fee - ${r.name} (${r.lot})`, FINANCES.monthlyFee, `${m}-10`, daysAgo(150 - mi * 30));
      });
      FINANCES.expenseCategories.forEach(([cat, base]) => {
        const amount = base + Math.round((Math.random() - 0.5) * base * 0.2);
        stmts.insertTransaction.run('expense', cat, `${cat} - ${m}`, amount, `${m}-15`, daysAgo(150 - mi * 30));
      });
    });

    const currentMonth = '2026-05';
    RESIDENTS.forEach((r, i) => {
      const status = i < FINANCES.paidCount ? 'paid' : (i < FINANCES.paidCount + FINANCES.pendingCount ? 'pending' : 'overdue');
      const paidDate = status === 'paid' ? `${currentMonth}-0${Math.min(9, i + 1)}` : null;
      stmts.insertPayment.run(r.name, '', r.lot, FINANCES.monthlyFee, `${currentMonth}-10`, status, paidDate, currentMonth);
    });
    console.log('  ✅ Finances');
  }

  // ═══ FOOD & NATURE ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM food_gardens`).get().c === 0) {
    const gardens = [
      ['North Community Garden', 'garden',     'Main vegetable garden with 20 individual plots',                  'active', 'North area near playground',  '🥬'],
      ['Fruit Orchard',          'orchard',    'Mango, avocado, banana, papaya, guava trees',                    'active', 'East hillside',               '🥭'],
      ['Herb Garden',            'herb_garden','Shared herb garden: basil, rosemary, mint, cilantro',            'active', 'Behind community kitchen',    '🌿'],
      ['Tilapia Pond',           'pond',       'Community tilapia pond with ~200 fish. Fishing schedule coordinated.', 'active', 'South lake area',       '🐟'],
    ];
    gardens.forEach(g => stmts.insertGarden.run(...g));

    const harvests = [
      [1, 'Tomatoes',  '5 kg',         'Carlos Silva',     '2026-05-01'],
      [1, 'Lettuce',   '3 heads',      'Ana Oliveira',     '2026-05-02'],
      [1, 'Peppers',   '2 kg',         'Maria Costa',      '2026-04-28'],
      [2, 'Mangoes',   '15 kg',        'João Pereira',     '2026-04-25'],
      [2, 'Avocados',  '8 kg',         'Fernanda Lima',    '2026-04-20'],
      [2, 'Bananas',   '10 bunches',   'Pedro Almeida',    '2026-05-03'],
      [3, 'Basil',     '500g',         'Luciana Souza',    '2026-05-04'],
      [3, 'Rosemary',  '300g',         'Juliana Martins',  '2026-04-30'],
      [4, 'Tilapia',   '6 fish (~3kg)','Roberto Santos',   '2026-04-27'],
      [4, 'Tilapia',   '4 fish (~2kg)','Gustavo Rocha',    '2026-05-01'],
    ];
    harvests.forEach(h => stmts.insertHarvest.run(...h));

    const schedules = [
      [1, 'Carlos Silva',   '2026-05-07', '07:00-09:00', 'picking'],
      [1, 'Ana Oliveira',   '2026-05-07', '09:00-11:00', 'watering'],
      [2, 'João Pereira',   '2026-05-08', '08:00-10:00', 'picking'],
      [4, 'Roberto Santos', '2026-05-09', '06:00-08:00', 'fishing'],
      [4, 'Marcos Ribeiro', '2026-05-10', '06:00-08:00', 'fishing'],
      [4, 'Daniel Barbosa', '2026-05-11', '06:00-08:00', 'fishing'],
    ];
    schedules.forEach(s => stmts.insertSchedule.run(...s));
    console.log('  ✅ Food & Nature');
  }

  // ═══ SOLAR ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM solar_systems`).get().c === 0) {
    const solarData = [
      ['A-01', 'Carlos Silva',     8.0,  20, 'Fronius Primo 8.2',  '2024-03-15', 'active',      '2026-03-15'],
      ['A-02', 'Ana Oliveira',     5.5,  14, 'Growatt MIN 5000',   '2024-06-20', 'active',      '2026-01-10'],
      ['A-03', 'Roberto Santos',  10.0,  25, 'Huawei SUN2000',     '2023-11-01', 'active',      '2026-02-28'],
      ['B-01', 'Maria Costa',      6.0,  15, 'ABB UNO-DM-6.0',    '2024-09-10', 'active',      '2025-09-10'],
      ['B-02', 'João Pereira',     4.0,  10, 'Solis Mini 4G',      '2025-01-15', 'active',      null        ],
      ['C-01', 'Pedro Almeida',   12.0,  30, 'SMA Sunny Boy 12',   '2023-08-22', 'maintenance', '2026-04-15'],
      ['C-02', 'Luciana Souza',    7.5,  19, 'Fronius Primo 8.2',  '2024-04-05', 'active',      '2026-04-05'],
      ['D-01', 'Juliana Martins',  5.0,  12, 'Growatt MIN 5000',   '2025-03-01', 'active',      null        ],
      ['D-02', 'Ricardo Ferreira', 9.0,  22, 'Huawei SUN2000',     '2024-01-18', 'active',      '2026-01-18'],
      ['E-01', 'Gustavo Rocha',    6.5,  16, 'ABB UNO-DM-6.0',    '2024-07-30', 'active',      '2025-07-30'],
    ];
    solarData.forEach(s => stmts.insertSolarSystem.run(...s));

    const maint = [
      [1, 'inspection', 'Annual inspection — all panels OK',                    '2026-03-15',  350, 'SolarTech'],
      [3, 'repair',     'Inverter firmware update + fan replacement',            '2026-02-28',  800, 'Huawei Service'],
      [6, 'repair',     'Panel micro-crack detected — panel #12 replaced',       '2026-04-15', 1500, 'SolarTech'],
      [7, 'cleaning',   'Full panel cleaning — dust accumulation',               '2026-04-05',  200, 'CleanSolar'],
      [9, 'inspection', 'Annual inspection — minor corrosion on mounting',       '2026-01-18',  400, 'SolarTech'],
    ];
    maint.forEach(m => stmts.insertMaintenance.run(...m));
    console.log('  ✅ Solar systems');
  }

  // ═══ WATER ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM water_usage`).get().c === 0) {
    const waterMonths = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
    RESIDENTS.forEach(r => {
      const baseUsage = 8000 + Math.random() * 7000;
      waterMonths.forEach(m => {
        const usage = Math.round(baseUsage * (0.85 + Math.random() * 0.3));
        const cost  = Math.round(usage * 0.008 * 100) / 100;
        stmts.insertWaterUsage.run(r.lot, r.name, m, usage, cost);
      });
    });

    WATER_ALERTS.forEach(([type, msg, severity]) => stmts.insertWaterAlert.run(type, msg, severity, daysAgo(3)));
    console.log('  ✅ Water usage');
  }

  // ═══ GUESTS ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM guests`).get().c === 0) {
    GUESTS.forEach(g => {
      stmts.insertGuest.run(g.name, g.host, g.lot, g.plate, g.purpose, '', now - hour, now + g.validInHours * hour, now - hour);
      if (g.checkedIn) {
        const id = db.prepare(`SELECT last_insert_rowid() as id`).get().id;
        stmts.checkInGuest.run(now - hour * 2, id);
      }
    });
    console.log('  ✅ Guests');
  }

  // ═══ ANNOUNCEMENTS & EVENTS ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM announcements`).get().c === 0) {
    ANNOUNCEMENTS.forEach(([title, body, type, priority, author], i) => {
      stmts.insertAnnouncement.run(title, body, type, priority, author, daysAgo(i * 2));
    });
    EVENTS.forEach(e => stmts.insertEvent.run(...e, now));

    const bookings = [
      ['Padel Court 1', 'João Pereira',    '2026-05-07', '08:00-10:00'],
      ['Padel Court 1', 'Marcos Ribeiro',  '2026-05-07', '10:00-12:00'],
      ['Padel Court 2', 'Gustavo Rocha',   '2026-05-07', '09:00-11:00'],
      ['Amphitheater',  'Juliana Martins', '2026-05-10', '12:00-16:00'],
      ['Music Studio',  'Ricardo Ferreira','2026-05-08', '18:00-20:00'],
      ['Music Studio',  'Daniel Barbosa',  '2026-05-09', '14:00-16:00'],
      ['Shuttle Bus',   'Ana Oliveira',    '2026-05-07', '07:30 Departure'],
      ['Shuttle Bus',   'Maria Costa',     '2026-05-07', '07:30 Departure'],
    ];
    bookings.forEach(b => stmts.insertBooking.run(...b, now));
    console.log('  ✅ Announcements, events & bookings');
  }

  // ═══ MARKETPLACE ═══
  if (db.prepare(`SELECT COUNT(*) as c FROM marketplace_listings`).get().c === 0) {
    MARKETPLACE.forEach((l, i) => {
      stmts.insertListing.run(l.title, l.description, l.type, l.price, 'USD', l.seller, l.lot, l.emoji, daysAgo(i * 3));
    });
    console.log('  ✅ Marketplace listings');
  }

  console.log('✅ All mock data seeded successfully!');
}

if (require.main === module) {
  seedAll();
} else {
  module.exports = { seedAll };
}
