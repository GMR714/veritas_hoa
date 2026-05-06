// ═══════════════════════════════════════════════════════════════
//  MOCK DATA SEEDER — Veritas Village Community Platform
//  Run: node backend/mock-data.js
// ═══════════════════════════════════════════════════════════════

const { db, stmts } = require('./database');

const now = Math.floor(Date.now() / 1000);
const day = 86400;
const hour = 3600;

// Helper
function daysAgo(d) { return now - (d * day); }
function hoursAgo(h) { return now - (h * hour); }

// ═══ RESIDENTS ═══
const residents = [
  { name: 'Carlos Silva', lot: 'A-01' },
  { name: 'Ana Oliveira', lot: 'A-02' },
  { name: 'Roberto Santos', lot: 'A-03' },
  { name: 'Maria Costa', lot: 'B-01' },
  { name: 'João Pereira', lot: 'B-02' },
  { name: 'Fernanda Lima', lot: 'B-03' },
  { name: 'Pedro Almeida', lot: 'C-01' },
  { name: 'Luciana Souza', lot: 'C-02' },
  { name: 'Marcos Ribeiro', lot: 'C-03' },
  { name: 'Juliana Martins', lot: 'D-01' },
  { name: 'Ricardo Ferreira', lot: 'D-02' },
  { name: 'Patricia Gomes', lot: 'D-03' },
  { name: 'Gustavo Rocha', lot: 'E-01' },
  { name: 'Camila Araújo', lot: 'E-02' },
  { name: 'Daniel Barbosa', lot: 'E-03' },
];

function seedAll() {
  console.log('🌱 Seeding mock data...');

  // ═══ CHAT CHANNELS ═══
  const channelCheck = db.prepare(`SELECT COUNT(*) as c FROM chat_channels`).get();
  if (channelCheck.c === 0) {
    const channels = [
      ['general', 'General community discussion', '💬'],
      ['maintenance', 'Maintenance requests and updates', '🔧'],
      ['events', 'Event planning and coordination', '🎉'],
      ['emergencies', 'Urgent alerts and emergencies', '🚨'],
    ];
    channels.forEach(([name, desc, icon]) => {
      stmts.insertChannel.run(name, desc, icon, daysAgo(90));
    });

    // Chat messages
    const msgs = [
      [1, 'carlos.eth', 'Carlos Silva', 'Good morning everyone! Has anyone seen the gardener today?', hoursAgo(5)],
      [1, 'ana.eth', 'Ana Oliveira', 'Yes, he was working in the playground area.', hoursAgo(4)],
      [1, 'roberto.eth', 'Roberto Santos', 'Remember to lock the gate when leaving at night!', hoursAgo(3)],
      [1, 'maria.eth', 'Maria Costa', 'Who\'s going to the organic market on Saturday? We could go together!', hoursAgo(2)],
      [1, 'joao.eth', 'João Pereira', 'I am! Put me on the list 🙋‍♂️', hoursAgo(1)],
      [1, 'fernanda.eth', 'Fernanda Lima', 'I\'m going too! I need tomatoes and basil.', hoursAgo(0.5)],
      [2, 'pedro.eth', 'Pedro Almeida', 'The street light in Block C burnt out again.', hoursAgo(48)],
      [2, 'admin.eth', 'Admin', 'We already requested the replacement. Expected: tomorrow.', hoursAgo(46)],
      [2, 'luciana.eth', 'Luciana Souza', 'The pool pump is making a weird noise.', hoursAgo(24)],
      [2, 'marcos.eth', 'Marcos Ribeiro', 'Technician scheduled for Wednesday.', hoursAgo(22)],
      [3, 'juliana.eth', 'Juliana Martins', 'Let\'s organize a community BBQ on Saturday!', hoursAgo(72)],
      [3, 'ricardo.eth', 'Ricardo Ferreira', 'Good idea! I can bring the extra grill.', hoursAgo(70)],
      [3, 'patricia.eth', 'Patricia Gomes', 'I\'ll make the salad and desserts 🍰', hoursAgo(68)],
      [4, 'admin.eth', 'Admin', '⚠️ Power outage expected today from 2 PM to 4 PM - grid maintenance.', hoursAgo(8)],
      [4, 'gustavo.eth', 'Gustavo Rocha', 'Thanks for the heads up! I\'ll turn off my equipment.', hoursAgo(7)],
    ];
    const insertMsg = db.prepare(`INSERT INTO chat_messages (channel_id, author, author_name, text, timestamp) VALUES (?, ?, ?, ?, ?)`);
    msgs.forEach(m => insertMsg.run(...m));
    console.log('  ✅ Chat channels & messages');
  }

  // ═══ COMMUNITY RULES ═══
  const rulesCheck = db.prepare(`SELECT COUNT(*) as c FROM community_rules`).get();
  if (rulesCheck.c === 0) {
    const rules = [
      ['Pool Hours', 'Pool', 'Pool is open from 7:00 AM to 10:00 PM daily. Children under 12 must be accompanied by an adult. No glass containers in the pool area.'],
      ['Quiet Hours', 'Noise', 'Quiet hours are from 10:00 PM to 7:00 AM on weekdays, and 11:00 PM to 8:00 AM on weekends. Construction work allowed only Mon-Fri 8 AM - 5 PM.'],
      ['Pet Policy', 'Pets', 'Dogs must be on leash in common areas. Owners must clean up after their pets. Maximum 3 pets per household. Aggressive breeds require muzzle.'],
      ['Parking Rules', 'Common Areas', 'Each lot has 2 designated parking spots. Visitor parking available in the guest lot. No overnight parking without prior notice.'],
      ['Waste Management', 'Common Areas', 'Recycling bins available at each block entrance. Organic waste goes to community compost. Bulk waste pickup every Friday.'],
      ['Garden Use', 'Food & Nature', 'Community garden plots assigned quarterly. Residents must maintain their plot or it will be reassigned. Organic methods only.'],
      ['Guest Access', 'Security', 'All guests must be registered 24h in advance. Maximum 10 guests per event. Guest passes valid for 24 hours unless extended.'],
      ['Common Area Booking', 'Common Areas', 'Amphitheater and padel courts can be booked up to 7 days in advance. Maximum 2 hours per booking. Cancel 4h before.'],
      ['Solar Panel Maintenance', 'Infrastructure', 'Annual inspection required for all solar installations. Community handles shared inverter maintenance. Individual panel cleaning monthly.'],
      ['Water Conservation', 'Infrastructure', 'During dry season (Jun-Sep), garden watering limited to even/odd days. Report leaks immediately. Community well usage tracked monthly.'],
      ['Music Studio', 'Common Areas', 'Music studio available 9 AM - 9 PM. Sessions limited to 2 hours. Sound insulation must remain intact. No outside equipment without approval.'],
      ['Shuttle Bus', 'Transport', 'Community shuttle runs Mon-Sat. Morning departure 7:30 AM, return 6:00 PM. Book seats 24h in advance via app.'],
    ];
    rules.forEach(([title, cat, content]) => {
      stmts.insertRule.run(title, cat, content, daysAgo(180));
    });

    // Rule suggestions
    const suggestions = [
      [1, 'Extend Pool Hours on Weekends', 'Allow pool use until midnight on Fri/Sat', 'ana.eth', 'Ana Oliveira', 8, 2],
      [2, 'Allow Acoustic Music Until 11 PM', 'Acoustic instruments and soft music should be allowed until 11 PM', 'ricardo.eth', 'Ricardo Ferreira', 12, 3],
      [3, 'Cat-Only Leash Exemption', 'Indoor cats that go outside occasionally shouldn\'t need leashes', 'juliana.eth', 'Juliana Martins', 5, 7],
      [null, 'Create Bike Parking Area', 'We need covered bike parking near the main entrance', 'pedro.eth', 'Pedro Almeida', 14, 1],
    ];
    const insertSug = db.prepare(`INSERT INTO rule_suggestions (rule_id, title, description, suggested_by, suggested_by_name, votes_for, votes_against, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`);
    suggestions.forEach(([ruleId, title, desc, by, name, vf, va]) => {
      insertSug.run(ruleId, title, desc, by, name, vf, va, daysAgo(15));
    });
    console.log('  ✅ Community rules & suggestions');
  }

  // ═══ FINANCES ═══
  const finCheck = db.prepare(`SELECT COUNT(*) as c FROM finances_transactions`).get();
  if (finCheck.c === 0) {
    const months = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
    const expenseCategories = [
      ['Security', 4500], ['Gardening', 2200], ['Pool Maintenance', 1800],
      ['Electricity (Common)', 3100], ['Water (Common)', 1500], ['Administration', 2000],
      ['Insurance', 1200], ['Repairs', 800],
    ];
    months.forEach((m, mi) => {
      // Income: monthly fees from 15 residents
      residents.forEach(r => {
        stmts.insertTransaction.run('income', 'Monthly Fee', `Monthly fee - ${r.name} (${r.lot})`, 850, `${m}-10`, daysAgo(150 - mi * 30));
      });
      // Expenses
      expenseCategories.forEach(([cat, base]) => {
        const amount = base + Math.round((Math.random() - 0.5) * base * 0.2);
        stmts.insertTransaction.run('expense', cat, `${cat} - ${m}`, amount, `${m}-15`, daysAgo(150 - mi * 30));
      });
    });

    // Payment tracking for current month
    const currentMonth = '2026-05';
    residents.forEach((r, i) => {
      const status = i < 10 ? 'paid' : (i < 13 ? 'pending' : 'overdue');
      const paidDate = status === 'paid' ? `${currentMonth}-0${Math.min(9, i + 1)}` : null;
      stmts.insertPayment.run(r.name, '', r.lot, 850, `${currentMonth}-10`, status, paidDate, currentMonth);
    });
    console.log('  ✅ Finances');
  }

  // ═══ FOOD & NATURE ═══
  const foodCheck = db.prepare(`SELECT COUNT(*) as c FROM food_gardens`).get();
  if (foodCheck.c === 0) {
    const gardens = [
      ['North Community Garden', 'garden', 'Main vegetable garden with 20 individual plots', 'active', 'North area near playground', '🥬'],
      ['Fruit Orchard', 'orchard', 'Mango, avocado, banana, papaya, guava trees', 'active', 'East hillside', '🥭'],
      ['Herb Garden', 'herb_garden', 'Shared herb garden: basil, rosemary, mint, cilantro', 'active', 'Behind community kitchen', '🌿'],
      ['Tilapia Pond', 'pond', 'Community tilapia pond with ~200 fish. Fishing schedule coordinated.', 'active', 'South lake area', '🐟'],
    ];
    gardens.forEach(g => stmts.insertGarden.run(...g));

    const harvests = [
      [1, 'Tomatoes', '5 kg', 'Carlos Silva', '2026-05-01'],
      [1, 'Lettuce', '3 heads', 'Ana Oliveira', '2026-05-02'],
      [1, 'Peppers', '2 kg', 'Maria Costa', '2026-04-28'],
      [2, 'Mangoes', '15 kg', 'João Pereira', '2026-04-25'],
      [2, 'Avocados', '8 kg', 'Fernanda Lima', '2026-04-20'],
      [2, 'Bananas', '10 bunches', 'Pedro Almeida', '2026-05-03'],
      [3, 'Basil', '500g', 'Luciana Souza', '2026-05-04'],
      [3, 'Rosemary', '300g', 'Juliana Martins', '2026-04-30'],
      [4, 'Tilapia', '6 fish (~3kg)', 'Roberto Santos', '2026-04-27'],
      [4, 'Tilapia', '4 fish (~2kg)', 'Gustavo Rocha', '2026-05-01'],
    ];
    harvests.forEach(h => stmts.insertHarvest.run(...h));

    const schedules = [
      [1, 'Carlos Silva', '2026-05-07', '07:00-09:00', 'picking'],
      [1, 'Ana Oliveira', '2026-05-07', '09:00-11:00', 'watering'],
      [2, 'João Pereira', '2026-05-08', '08:00-10:00', 'picking'],
      [4, 'Roberto Santos', '2026-05-09', '06:00-08:00', 'fishing'],
      [4, 'Marcos Ribeiro', '2026-05-10', '06:00-08:00', 'fishing'],
      [4, 'Daniel Barbosa', '2026-05-11', '06:00-08:00', 'fishing'],
    ];
    schedules.forEach(s => stmts.insertSchedule.run(...s));
    console.log('  ✅ Food & Nature');
  }

  // ═══ SOLAR ═══
  const solarCheck = db.prepare(`SELECT COUNT(*) as c FROM solar_systems`).get();
  if (solarCheck.c === 0) {
    const solarData = [
      ['A-01', 'Carlos Silva', 8.0, 20, 'Fronius Primo 8.2', '2024-03-15', 'active', '2026-03-15'],
      ['A-02', 'Ana Oliveira', 5.5, 14, 'Growatt MIN 5000', '2024-06-20', 'active', '2026-01-10'],
      ['A-03', 'Roberto Santos', 10.0, 25, 'Huawei SUN2000', '2023-11-01', 'active', '2026-02-28'],
      ['B-01', 'Maria Costa', 6.0, 15, 'ABB UNO-DM-6.0', '2024-09-10', 'active', '2025-09-10'],
      ['B-02', 'João Pereira', 4.0, 10, 'Solis Mini 4G', '2025-01-15', 'active', null],
      ['C-01', 'Pedro Almeida', 12.0, 30, 'SMA Sunny Boy 12', '2023-08-22', 'maintenance', '2026-04-15'],
      ['C-02', 'Luciana Souza', 7.5, 19, 'Fronius Primo 8.2', '2024-04-05', 'active', '2026-04-05'],
      ['D-01', 'Juliana Martins', 5.0, 12, 'Growatt MIN 5000', '2025-03-01', 'active', null],
      ['D-02', 'Ricardo Ferreira', 9.0, 22, 'Huawei SUN2000', '2024-01-18', 'active', '2026-01-18'],
      ['E-01', 'Gustavo Rocha', 6.5, 16, 'ABB UNO-DM-6.0', '2024-07-30', 'active', '2025-07-30'],
    ];
    solarData.forEach(s => stmts.insertSolarSystem.run(...s));

    const maint = [
      [1, 'inspection', 'Annual inspection — all panels OK', '2026-03-15', 350, 'SolarTech Brasil'],
      [3, 'repair', 'Inverter firmware update + fan replacement', '2026-02-28', 800, 'Huawei Service'],
      [6, 'repair', 'Panel micro-crack detected — panel #12 replaced', '2026-04-15', 1500, 'SolarTech Brasil'],
      [7, 'cleaning', 'Full panel cleaning — dust accumulation', '2026-04-05', 200, 'CleanSolar SP'],
      [9, 'inspection', 'Annual inspection — minor corrosion on mounting', '2026-01-18', 400, 'SolarTech Brasil'],
    ];
    maint.forEach(m => stmts.insertMaintenance.run(...m));
    console.log('  ✅ Solar systems');
  }

  // ═══ WATER ═══
  const waterCheck = db.prepare(`SELECT COUNT(*) as c FROM water_usage`).get();
  if (waterCheck.c === 0) {
    const waterMonths = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05'];
    residents.forEach(r => {
      const baseUsage = 8000 + Math.random() * 7000;
      waterMonths.forEach((m, mi) => {
        const seasonal = mi >= 3 ? 1.3 : 1.0; // dry season bump
        const usage = Math.round(baseUsage * seasonal * (0.85 + Math.random() * 0.3));
        const cost = Math.round(usage * 0.008 * 100) / 100;
        stmts.insertWaterUsage.run(r.lot, r.name, m, usage, cost);
      });
    });

    const alerts = [
      ['drought', '⚠️ Dry season started. Water rationing rules in effect: even lots water on even days, odd lots on odd days.', 'warning'],
      ['high_usage', '🔴 Lot C-03 usage 40% above community average. Please review for leaks.', 'critical'],
      ['conservation', '💧 Community saved 12% water compared to last month. Great job!', 'info'],
    ];
    alerts.forEach(([type, msg, severity]) => {
      stmts.insertWaterAlert.run(type, msg, severity, daysAgo(3));
    });
    console.log('  ✅ Water usage');
  }

  // ═══ GUESTS ═══
  const guestCheck = db.prepare(`SELECT COUNT(*) as c FROM guests`).get();
  if (guestCheck.c === 0) {
    const guests = [
      ['Lucas Mendes', 'Carlos Silva', 'A-01', 'ABC-1234', 'Family visit', now + day, 1],
      ['Adriana Freitas', 'Ana Oliveira', 'A-02', '', 'Friend', now + day * 2, 0],
      ['Dr. Paulo Henrique', 'Roberto Santos', 'A-03', 'DEF-5678', 'Pool maintenance', now + hour * 8, 0],
      ['Amazon Delivery', 'Maria Costa', 'B-01', 'GHI-9012', 'Delivery', now + hour * 4, 0],
      ['Nakamura Family (4)', 'João Pereira', 'B-02', 'JKL-3456', 'Weekend BBQ', now + day * 3, 0],
      ['Tech Support - ISP', 'Pedro Almeida', 'C-01', 'MNO-7890', 'Internet repair', now + hour * 6, 0],
    ];
    guests.forEach(([name, host, lot, plate, purpose, validUntil, checkedIn]) => {
      stmts.insertGuest.run(name, host, lot, plate, purpose, '', now - hour, validUntil, now - hour);
      if (checkedIn) {
        const id = db.prepare(`SELECT last_insert_rowid() as id`).get().id;
        stmts.checkInGuest.run(now - hour * 2, id);
      }
    });
    console.log('  ✅ Guests');
  }

  // ═══ ANNOUNCEMENTS ═══
  const annCheck = db.prepare(`SELECT COUNT(*) as c FROM announcements`).get();
  if (annCheck.c === 0) {
    const anns = [
      ['Community BBQ This Saturday!', 'Join us for the monthly community BBQ at the amphitheater. Bring a side dish to share. Starts at noon!', 'event', 'normal', 'Admin'],
      ['Scheduled Power Maintenance', 'Power will be off on May 8th from 2-4 PM for transformer maintenance. Please prepare accordingly.', 'maintenance', 'high', 'Admin'],
      ['New Padel Court Hours', 'Starting this month, padel courts are open from 6 AM to 10 PM (extended from 9 PM).', 'general', 'normal', 'Admin'],
      ['🚨 Water Main Repair', 'Emergency repair on the main water line. Water may be intermittent today between 10 AM and 2 PM.', 'emergency', 'urgent', 'Admin'],
      ['Music Studio Renovated!', 'The community music studio has been renovated with new acoustic panels and a drum set. Book your sessions!', 'general', 'normal', 'Ricardo Ferreira'],
      ['Shuttle Bus Schedule Change', 'The shuttle will not run on May 15th (holiday). Regular service resumes May 16th.', 'general', 'normal', 'Admin'],
    ];
    anns.forEach(([title, body, type, priority, author], i) => {
      stmts.insertAnnouncement.run(title, body, type, priority, author, daysAgo(i * 2));
    });

    const events = [
      ['Community BBQ', 'Monthly BBQ gathering. Bring food to share!', '2026-05-10', '12:00', 'Amphitheater', 'social', 'Admin'],
      ['Yoga in the Park', 'Morning yoga session for all levels', '2026-05-12', '07:00', 'Central Garden', 'wellness', 'Fernanda Lima'],
      ['Kids Movie Night', 'Outdoor movie screening for families', '2026-05-15', '19:00', 'Amphitheater', 'social', 'Patricia Gomes'],
      ['Gardening Workshop', 'Learn organic composting techniques', '2026-05-18', '09:00', 'Community Garden', 'education', 'Carlos Silva'],
      ['Padel Tournament', 'Doubles tournament — sign up by May 20!', '2026-05-22', '08:00', 'Padel Courts', 'sports', 'Marcos Ribeiro'],
      ['Music Jam Session', 'Open mic and jam session', '2026-05-25', '18:00', 'Music Studio', 'social', 'Ricardo Ferreira'],
    ];
    events.forEach(e => stmts.insertEvent.run(...e, now));

    const bookings = [
      ['Padel Court 1', 'João Pereira', '2026-05-07', '08:00-10:00'],
      ['Padel Court 1', 'Marcos Ribeiro', '2026-05-07', '10:00-12:00'],
      ['Padel Court 2', 'Gustavo Rocha', '2026-05-07', '09:00-11:00'],
      ['Amphitheater', 'Juliana Martins', '2026-05-10', '12:00-16:00'],
      ['Music Studio', 'Ricardo Ferreira', '2026-05-08', '18:00-20:00'],
      ['Music Studio', 'Daniel Barbosa', '2026-05-09', '14:00-16:00'],
      ['Shuttle Bus', 'Ana Oliveira', '2026-05-07', '07:30 Departure'],
      ['Shuttle Bus', 'Maria Costa', '2026-05-07', '07:30 Departure'],
    ];
    bookings.forEach(b => stmts.insertBooking.run(...b, now));
    console.log('  ✅ Announcements, events & bookings');
  }

  // ═══ MARKETPLACE ═══
  const mktCheck = db.prepare(`SELECT COUNT(*) as c FROM marketplace_listings`).get();
  if (mktCheck.c === 0) {
    const listings = [
      ['Mountain Bike - Caloi Elite', 'Caloi Elite 29, 27 speeds, excellent condition. Used for 6 months.', 'for_sale', 2500, 'BRL', 'Carlos Silva', 'A-01', '🚲'],
      ['Fresh Organic Eggs', 'Free-range eggs from my chickens. Dozen available weekly.', 'for_sale', 15, 'BRL', 'Ana Oliveira', 'A-02', '🥚'],
      ['Guitar Lessons', 'Offering acoustic guitar lessons for beginners. 1h sessions.', 'services', 80, 'BRL', 'Ricardo Ferreira', 'D-02', '🎸'],
      ['Surplus Tomato Seedlings', 'Free tomato seedlings, cherry and Roma varieties. Pick up at lot B-01.', 'free', 0, 'BRL', 'Maria Costa', 'B-01', '🌱'],
      ['Kids Bicycle (Age 5-8)', 'Pink Nathor bicycle, great condition, training wheels included.', 'for_sale', 350, 'BRL', 'Patricia Gomes', 'D-03', '🚴'],
      ['Dog Walking Service', 'Available Mon-Fri mornings. Experienced with all breeds.', 'services', 40, 'BRL', 'Camila Araújo', 'E-02', '🐕'],
      ['Ceramic Planters (Set of 4)', 'Handmade ceramic planters, various sizes. Moving sale!', 'for_sale', 120, 'BRL', 'Luciana Souza', 'C-02', '🪴'],
      ['Looking for Piano Teacher', 'Seeking piano lessons for 10-year-old. Weekday afternoons preferred.', 'wanted', 0, 'BRL', 'Fernanda Lima', 'B-03', '🎹'],
      ['Pool Floats & Toys', 'Assorted pool toys and 2 large floats. Free to good home!', 'free', 0, 'BRL', 'Gustavo Rocha', 'E-01', '🏊'],
      ['Homemade Cheese Bread', 'Fresh cheese bread, frozen packs of 20. Made with real Minas cheese!', 'for_sale', 25, 'BRL', 'Juliana Martins', 'D-01', '🧀'],
    ];
    listings.forEach((l, i) => {
      stmts.insertListing.run(...l, daysAgo(i * 3));
    });
    console.log('  ✅ Marketplace listings');
  }

  console.log('✅ All mock data seeded successfully!');
}

// Run if called directly
if (require.main === module) {
  seedAll();
} else {
  module.exports = { seedAll };
}
