import { API_URL } from '../config.js';
let annState = { announcements: [], events: [], bookings: [] };

async function fetchAnnouncements() {
  try {
    const [ann, ev, bk] = await Promise.all([
      fetch(`${API_URL}/announcements`).then(r => r.json()),
      fetch(`${API_URL}/events`).then(r => r.json()),
      fetch(`${API_URL}/bookings`).then(r => r.json()),
    ]);
    annState = { announcements: ann, events: ev, bookings: bk };
  } catch (e) { console.error('Announcements error:', e); }
}

function timeAgo(ts) {
  const diff = Date.now() / 1000 - ts;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function renderAnnouncements() {
  const container = document.getElementById('announcements-content');
  if (!container) return;
  const prioIcons = { urgent: '🚨', high: '⚡', normal: '📢' };
  const typeColors = { emergency: '#EF4444', maintenance: '#F59E0B', event: '#22C55E', general: '#1B6B7D' };
  const eventIcons = { social: '🎉', wellness: '🧘', education: '📚', sports: '🏸' };
  const amenityIcons = { 'Padel Court 1': '🏸', 'Padel Court 2': '🏸', 'Amphitheater': '🎭', 'Music Studio': '🎵', 'Shuttle Bus': '🚌' };

  const annHtml = annState.announcements.map(a => `
    <div class="ann-card glass-card" style="border-left: 3px solid ${typeColors[a.type] || '#1B6B7D'}">
      <div class="ann-head"><span class="ann-priority">${prioIcons[a.priority] || '📢'}</span><h4>${a.title}</h4><span class="ann-time">${timeAgo(a.created_at)}</span></div>
      <p>${a.body}</p>
      <span class="ann-author">— ${a.author}</span>
    </div>`).join('');

  const evHtml = annState.events.map(e => `
    <div class="event-card glass-card">
      <div class="event-date-badge"><span class="ev-day">${e.date.split('-')[2]}</span><span class="ev-month">${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(e.date.split('-')[1])]}</span></div>
      <div class="event-info"><h4>${eventIcons[e.type] || '📅'} ${e.title}</h4><p>${e.description}</p><div class="event-meta"><span>⏰ ${e.time}</span><span>📍 ${e.location}</span><span>👤 ${e.organizer}</span></div></div>
    </div>`).join('');

  // Group bookings by amenity
  const amenities = [...new Set(annState.bookings.map(b => b.amenity))];
  const bkHtml = amenities.map(am => {
    const bks = annState.bookings.filter(b => b.amenity === am);
    return `
    <div class="amenity-section">
      <h4>${amenityIcons[am] || '🏢'} ${am}</h4>
      <div class="amenity-slots">${bks.map(b => `<div class="booking-slot glass-card"><span class="bk-date">${b.date}</span><span class="bk-time">${b.time_slot}</span><span class="bk-by">${b.booked_by}</span></div>`).join('')}</div>
    </div>`;
  }).join('');

  container.innerHTML = `
    <div class="module-header"><h2>📢 Community Hub</h2><p>Announcements, events, and amenity bookings</p></div>
    <div class="ann-grid">
      <div class="ann-feed"><h3>📣 Announcements</h3>${annHtml}</div>
      <div class="ann-sidebar">
        <div class="events-section"><h3>📅 Upcoming Events</h3>${evHtml}</div>
        <div class="bookings-section"><h3>🏢 Amenity Bookings</h3>${bkHtml}</div>
      </div>
    </div>`;
}

async function initAnnouncements() { await fetchAnnouncements(); renderAnnouncements(); }
export { initAnnouncements, renderAnnouncements };
