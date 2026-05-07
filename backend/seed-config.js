// ═══════════════════════════════════════════════════════════════════════
//  VERITAS VILLAGE — SAMPLE DATA CONFIGURATION
//
//  Edit this file to customize what residents see in the demo/preview.
//  After editing, delete backend/veritas.db and restart the app —
//  the platform will reload all data automatically on the next start.
//
//  HOW TO RESET THE DATA:
//    1. Edit anything below
//    2. Delete the file:  backend/veritas.db
//    3. Restart the app   (npm start)
// ═══════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────
//  RESIDENTS
//  name  : full name shown throughout the platform
//  lot   : lot/unit code (used in finance, water, solar tables)
// ─────────────────────────────────────────────────────────────────────
const RESIDENTS = [
  { name: 'Carlos Silva',     lot: 'A-01' },
  { name: 'Ana Oliveira',     lot: 'A-02' },
  { name: 'Roberto Santos',   lot: 'A-03' },
  { name: 'Maria Costa',      lot: 'B-01' },
  { name: 'João Pereira',     lot: 'B-02' },
  { name: 'Fernanda Lima',    lot: 'B-03' },
  { name: 'Pedro Almeida',    lot: 'C-01' },
  { name: 'Luciana Souza',    lot: 'C-02' },
  { name: 'Marcos Ribeiro',   lot: 'C-03' },
  { name: 'Juliana Martins',  lot: 'D-01' },
  { name: 'Ricardo Ferreira', lot: 'D-02' },
  { name: 'Patricia Gomes',   lot: 'D-03' },
  { name: 'Gustavo Rocha',    lot: 'E-01' },
  { name: 'Camila Araújo',    lot: 'E-02' },
  { name: 'Daniel Barbosa',   lot: 'E-03' },
];


// ─────────────────────────────────────────────────────────────────────
//  FINANCES
//  monthlyFee        : HOA dues amount per resident, per month (USD)
//  expenseCategories : [category name, monthly base amount in USD]
//  paidCount         : how many residents show as "paid" this month
//  pendingCount      : how many show as "pending" (rest = overdue)
// ─────────────────────────────────────────────────────────────────────
const FINANCES = {
  monthlyFee: 850,
  expenseCategories: [
    ['Security',            4500],
    ['Gardening',           2200],
    ['Pool Maintenance',    1800],
    ['Electricity (Common)', 3100],
    ['Water (Common)',      1500],
    ['Administration',      2000],
    ['Insurance',           1200],
    ['Repairs',              800],
  ],
  paidCount:    10,  // first N residents are "paid"
  pendingCount:  3,  // next N are "pending" (rest = overdue)
};


// ─────────────────────────────────────────────────────────────────────
//  COMMUNITY RULES
//  Each entry: [Title, Category, Full text]
//  Categories shown in the Rules filter (free text, pick anything)
// ─────────────────────────────────────────────────────────────────────
const RULES = [
  ['Pool Hours',            'Pool',           'Pool is open from 7:00 AM to 10:00 PM daily. Children under 12 must be accompanied by an adult. No glass containers in the pool area.'],
  ['Quiet Hours',           'Noise',          'Quiet hours are from 10:00 PM to 7:00 AM on weekdays, and 11:00 PM to 8:00 AM on weekends. Construction work allowed only Mon-Fri 8 AM - 5 PM.'],
  ['Pet Policy',            'Pets',           'Dogs must be on leash in common areas. Owners must clean up after their pets. Maximum 3 pets per household. Aggressive breeds require muzzle.'],
  ['Parking Rules',         'Common Areas',   'Each lot has 2 designated parking spots. Visitor parking available in the guest lot. No overnight parking without prior notice.'],
  ['Waste Management',      'Common Areas',   'Recycling bins available at each block entrance. Organic waste goes to community compost. Bulk waste pickup every Friday.'],
  ['Garden Use',            'Food & Nature',  'Community garden plots assigned quarterly. Residents must maintain their plot or it will be reassigned. Organic methods only.'],
  ['Guest Access',          'Security',       'All guests must be registered 24h in advance. Maximum 10 guests per event. Guest passes valid for 24 hours unless extended.'],
  ['Common Area Booking',   'Common Areas',   'Amphitheater and padel courts can be booked up to 7 days in advance. Maximum 2 hours per booking. Cancel 4h before.'],
  ['Solar Panel Maintenance','Infrastructure','Annual inspection required for all solar installations. Community handles shared inverter maintenance. Individual panel cleaning monthly.'],
  ['Water Conservation',    'Infrastructure', 'Please report leaks immediately. Garden watering is encouraged in the early morning or evening to reduce evaporation. Community well usage is tracked monthly.'],
  ['Music Studio',          'Common Areas',   'Music studio available 9 AM - 9 PM. Sessions limited to 2 hours. Sound insulation must remain intact. No outside equipment without approval.'],
  ['Shuttle Bus',           'Transport',      'Community shuttle runs Mon-Sat. Morning departure 7:30 AM, return 6:00 PM. Book seats 24h in advance via app.'],
];


// ─────────────────────────────────────────────────────────────────────
//  ANNOUNCEMENTS
//  Each entry: [Title, Body text, type, priority, Author]
//  type     : 'event' | 'maintenance' | 'general' | 'emergency'
//  priority : 'normal' | 'high' | 'urgent'
// ─────────────────────────────────────────────────────────────────────
const ANNOUNCEMENTS = [
  [
    'Community BBQ This Saturday!',
    'Join us for the monthly community BBQ at the amphitheater. Bring a side dish to share. Starts at noon!',
    'event', 'normal', 'Admin'
  ],
  [
    'Scheduled Power Maintenance',
    'Power will be off on May 8th from 2-4 PM for transformer maintenance. Please prepare accordingly.',
    'maintenance', 'high', 'Admin'
  ],
  [
    'New Padel Court Hours',
    'Starting this month, padel courts are open from 6 AM to 10 PM (extended from 9 PM).',
    'general', 'normal', 'Admin'
  ],
  [
    'Community Garden Expansion',
    'We are adding 6 new garden plots near the amphitheater. Sign up in the app to reserve your spot — first come, first served!',
    'general', 'normal', 'Admin'
  ],
  [
    'Music Studio Renovated!',
    'The community music studio has been renovated with new acoustic panels and a drum set. Book your sessions!',
    'general', 'normal', 'Ricardo Ferreira'
  ],
  [
    'Shuttle Bus Schedule Change',
    'The shuttle will not run on May 15th (holiday). Regular service resumes May 16th.',
    'general', 'normal', 'Admin'
  ],
];


// ─────────────────────────────────────────────────────────────────────
//  EVENTS (community calendar)
//  Each entry: [Title, Description, Date (YYYY-MM-DD), Time, Location, Category, Organizer]
//  category : 'social' | 'wellness' | 'education' | 'sports' | 'cultural'
// ─────────────────────────────────────────────────────────────────────
const EVENTS = [
  ['Community BBQ',       'Monthly BBQ gathering. Bring food to share!',          '2026-05-10', '12:00', 'Amphitheater',    'social',    'Admin'],
  ['Yoga in the Park',    'Morning yoga session for all levels',                   '2026-05-12', '07:00', 'Central Garden',  'wellness',  'Fernanda Lima'],
  ['Kids Movie Night',    'Outdoor movie screening for families',                  '2026-05-15', '19:00', 'Amphitheater',    'social',    'Patricia Gomes'],
  ['Gardening Workshop',  'Learn organic composting techniques',                   '2026-05-18', '09:00', 'Community Garden','education', 'Carlos Silva'],
  ['Padel Tournament',    'Doubles tournament — sign up by May 20!',              '2026-05-22', '08:00', 'Padel Courts',    'sports',    'Marcos Ribeiro'],
  ['Music Jam Session',   'Open mic and jam session',                              '2026-05-25', '18:00', 'Music Studio',    'social',    'Ricardo Ferreira'],
];


// ─────────────────────────────────────────────────────────────────────
//  WATER ALERTS
//  Each entry: [type (free text), message shown to residents, severity]
//  severity : 'info' | 'warning' | 'critical'
// ─────────────────────────────────────────────────────────────────────
const WATER_ALERTS = [
  ['conservation', '💧 Water-saving tips: water gardens in the early morning, fix dripping taps promptly, and use the community car wash station to save at home.', 'info'],
  ['high_usage',   '🔴 Lot C-03 usage 40% above community average. Please review for leaks.',                                                                       'critical'],
  ['conservation', '💧 Community saved 12% water compared to last month. Great job!',                                                                               'info'],
];


// ─────────────────────────────────────────────────────────────────────
//  CHAT MESSAGES
//  channelId 1 = general · 2 = maintenance · 3 = events · 4 = emergencies
//  hoursAgo  : how many hours ago the message was sent
// ─────────────────────────────────────────────────────────────────────
const CHAT_MESSAGES = [
  // general
  { channelId: 1, handle: 'carlos.eth', name: 'Carlos Silva',    text: 'Good morning everyone! Has anyone seen the gardener today?',           hoursAgo: 5   },
  { channelId: 1, handle: 'ana.eth',    name: 'Ana Oliveira',    text: 'Yes, he was working in the playground area.',                          hoursAgo: 4   },
  { channelId: 1, handle: 'roberto.eth',name: 'Roberto Santos',  text: 'Remember to lock the gate when leaving at night!',                     hoursAgo: 3   },
  { channelId: 1, handle: 'maria.eth',  name: 'Maria Costa',     text: "Who's going to the organic market on Saturday? We could go together!", hoursAgo: 2   },
  { channelId: 1, handle: 'joao.eth',   name: 'João Pereira',    text: "I am! Put me on the list 🙋‍♂️",                                         hoursAgo: 1   },
  { channelId: 1, handle: 'fernanda.eth',name:'Fernanda Lima',   text: "I'm going too! I need tomatoes and basil.",                            hoursAgo: 0.5 },
  // maintenance
  { channelId: 2, handle: 'pedro.eth',  name: 'Pedro Almeida',   text: 'The street light in Block C burnt out again.',                         hoursAgo: 48  },
  { channelId: 2, handle: 'admin.eth',  name: 'Admin',           text: 'We already requested the replacement. Expected: tomorrow.',            hoursAgo: 46  },
  { channelId: 2, handle: 'luciana.eth',name: 'Luciana Souza',   text: 'The pool pump is making a weird noise.',                               hoursAgo: 24  },
  { channelId: 2, handle: 'marcos.eth', name: 'Marcos Ribeiro',  text: 'Technician scheduled for Wednesday.',                                  hoursAgo: 22  },
  // events
  { channelId: 3, handle: 'juliana.eth',name: 'Juliana Martins', text: "Let's organize a community BBQ on Saturday!",                          hoursAgo: 72  },
  { channelId: 3, handle: 'ricardo.eth',name: 'Ricardo Ferreira',text: 'Good idea! I can bring the extra grill.',                              hoursAgo: 70  },
  { channelId: 3, handle: 'patricia.eth',name:'Patricia Gomes',  text: "I'll make the salad and desserts 🍰",                                  hoursAgo: 68  },
  // emergencies
  { channelId: 4, handle: 'admin.eth',  name: 'Admin',           text: '⚠️ Power outage expected today from 2 PM to 4 PM - grid maintenance.', hoursAgo: 8   },
  { channelId: 4, handle: 'gustavo.eth',name: 'Gustavo Rocha',   text: "Thanks for the heads up! I'll turn off my equipment.",                 hoursAgo: 7   },
];


// ─────────────────────────────────────────────────────────────────────
//  MARKETPLACE LISTINGS
//  type   : 'for_sale' | 'services' | 'free' | 'wanted'
//  price  : 0 for free/wanted items
// ─────────────────────────────────────────────────────────────────────
const MARKETPLACE = [
  { title: 'Mountain Bike - Caloi Elite',   description: 'Caloi Elite 29, 27 speeds, excellent condition. Used for 6 months.',           type: 'for_sale', price: 2500, seller: 'Carlos Silva',     lot: 'A-01', emoji: '🚲' },
  { title: 'Fresh Organic Eggs',            description: 'Free-range eggs from my chickens. Dozen available weekly.',                    type: 'for_sale', price: 15,   seller: 'Ana Oliveira',     lot: 'A-02', emoji: '🥚' },
  { title: 'Guitar Lessons',               description: 'Offering acoustic guitar lessons for beginners. 1h sessions.',                  type: 'services', price: 80,   seller: 'Ricardo Ferreira', lot: 'D-02', emoji: '🎸' },
  { title: 'Surplus Tomato Seedlings',      description: 'Free tomato seedlings, cherry and Roma varieties. Pick up at lot B-01.',       type: 'free',     price: 0,    seller: 'Maria Costa',      lot: 'B-01', emoji: '🌱' },
  { title: 'Kids Bicycle (Age 5-8)',        description: 'Pink Nathor bicycle, great condition, training wheels included.',               type: 'for_sale', price: 350,  seller: 'Patricia Gomes',   lot: 'D-03', emoji: '🚴' },
  { title: 'Dog Walking Service',           description: 'Available Mon-Fri mornings. Experienced with all breeds.',                     type: 'services', price: 40,   seller: 'Camila Araújo',    lot: 'E-02', emoji: '🐕' },
  { title: 'Ceramic Planters (Set of 4)',   description: 'Handmade ceramic planters, various sizes. Moving sale!',                       type: 'for_sale', price: 120,  seller: 'Luciana Souza',    lot: 'C-02', emoji: '🪴' },
  { title: 'Looking for Piano Teacher',     description: 'Seeking piano lessons for 10-year-old. Weekday afternoons preferred.',         type: 'wanted',   price: 0,    seller: 'Fernanda Lima',    lot: 'B-03', emoji: '🎹' },
  { title: 'Pool Floats & Toys',            description: 'Assorted pool toys and 2 large floats. Free to good home!',                    type: 'free',     price: 0,    seller: 'Gustavo Rocha',    lot: 'E-01', emoji: '🏊' },
  { title: 'Homemade Cheese Bread',         description: 'Fresh cheese bread, frozen packs of 20. Made with real Minas cheese!',         type: 'for_sale', price: 25,   seller: 'Juliana Martins',  lot: 'D-01', emoji: '🧀' },
];


// ─────────────────────────────────────────────────────────────────────
//  GUEST PASSES (Security module)
//  validInHours : how many hours from now the pass is valid
//  checkedIn    : true = already arrived
// ─────────────────────────────────────────────────────────────────────
const GUESTS = [
  { name: 'Lucas Mendes',        host: 'Carlos Silva',   lot: 'A-01', plate: 'ABC-1234', purpose: 'Family visit',      validInHours: 24,  checkedIn: true  },
  { name: 'Adriana Freitas',     host: 'Ana Oliveira',   lot: 'A-02', plate: '',         purpose: 'Friend',            validInHours: 48,  checkedIn: false },
  { name: 'Dr. Paulo Henrique',  host: 'Roberto Santos', lot: 'A-03', plate: 'DEF-5678', purpose: 'Pool maintenance',  validInHours: 8,   checkedIn: false },
  { name: 'Amazon Delivery',     host: 'Maria Costa',    lot: 'B-01', plate: 'GHI-9012', purpose: 'Delivery',          validInHours: 4,   checkedIn: false },
  { name: 'Nakamura Family (4)', host: 'João Pereira',   lot: 'B-02', plate: 'JKL-3456', purpose: 'Weekend BBQ',       validInHours: 72,  checkedIn: false },
  { name: 'Tech Support - ISP',  host: 'Pedro Almeida',  lot: 'C-01', plate: 'MNO-7890', purpose: 'Internet repair',   validInHours: 6,   checkedIn: false },
];


module.exports = { RESIDENTS, FINANCES, RULES, ANNOUNCEMENTS, EVENTS, WATER_ALERTS, CHAT_MESSAGES, MARKETPLACE, GUESTS };
