import { API_URL } from '../config.js';

let chatState = { channels: [], messages: [], activeChannel: 1 };

async function fetchChannels() {
  try {
    const res = await fetch(`${API_URL}/chat/channels`);
    chatState.channels = await res.json();
  } catch (e) { console.error('Chat channels error:', e); }
}

async function fetchMessages(channelId) {
  try {
    const res = await fetch(`${API_URL}/chat/messages/${channelId}`);
    chatState.messages = await res.json();
  } catch (e) { console.error('Chat messages error:', e); }
}

async function sendMessage(channelId, text, authorName) {
  try {
    await fetch(`${API_URL}/chat/messages/${channelId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, author_name: authorName })
    });
    await fetchMessages(channelId);
    renderChat();
    scrollChatToBottom();
  } catch (e) { console.error('Send error:', e); }
}

function scrollChatToBottom() {
  const feed = document.getElementById('chat-feed');
  if (feed) setTimeout(() => feed.scrollTop = feed.scrollHeight, 50);
}

function formatTime(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  const d = new Date(ts * 1000);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

function renderChat() {
  const container = document.getElementById('chat-content');
  if (!container) return;

  const channelList = chatState.channels.map(ch => `
    <button class="chat-channel ${ch.id === chatState.activeChannel ? 'active' : ''}" onclick="window.chatModule.switchChannel(${ch.id})">
      <span class="ch-icon">${ch.icon}</span>
      <div class="ch-info">
        <span class="ch-name">#${ch.name}</span>
        <span class="ch-desc">${ch.description}</span>
      </div>
    </button>
  `).join('');

  // Group messages by date
  let lastDate = '';
  const msgHtml = chatState.messages.map(m => {
    const msgDate = formatDate(m.timestamp);
    let dateSep = '';
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      dateSep = `<div class="chat-date-sep"><span>${msgDate}</span></div>`;
    }
    const initials = (m.author_name || '?').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
    const colors = ['#1B6B7D', '#2D5A3D', '#7D9B3A', '#F59E0B', '#EF4444', '#8B5CF6'];
    const color = colors[m.author.charCodeAt(0) % colors.length];
    return `${dateSep}
    <div class="chat-msg">
      <div class="chat-avatar" style="background:${color}">${initials}</div>
      <div class="chat-bubble">
        <div class="chat-meta">
          <strong>${m.author_name || m.author.substring(0, 8)}</strong>
          <span class="chat-time">${formatTime(m.timestamp)}</span>
        </div>
        <p>${m.text}</p>
      </div>
    </div>`;
  }).join('');

  const activeCh = chatState.channels.find(c => c.id === chatState.activeChannel);

  container.innerHTML = `
    <div class="chat-layout">
      <div class="chat-sidebar">
        <div class="chat-sidebar-head"><h3>💬 Channels</h3></div>
        <div class="chat-channel-list">${channelList}</div>
      </div>
      <div class="chat-main">
        <div class="chat-main-head">
          <h3>${activeCh ? activeCh.icon : '💬'} #${activeCh ? activeCh.name : 'general'}</h3>
          <span class="chat-main-desc">${activeCh ? activeCh.description : ''}</span>
        </div>
        <div class="chat-feed" id="chat-feed">${msgHtml || '<p class="empty-state">No messages yet</p>'}</div>
        <div class="chat-input-bar">
          <input type="text" id="chat-input" placeholder="Type a message..." onkeydown="if(event.key==='Enter')window.chatModule.send()">
          <button class="btn-primary" onclick="window.chatModule.send()">Send</button>
        </div>
      </div>
    </div>
  `;
  scrollChatToBottom();
}

async function initChat() {
  await fetchChannels();
  await fetchMessages(chatState.activeChannel);
  renderChat();
}

window.chatModule = {
  switchChannel: async (id) => {
    chatState.activeChannel = id;
    await fetchMessages(id);
    renderChat();
  },
  send: () => {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    sendMessage(chatState.activeChannel, input.value.trim(), 'You');
  }
};

export { initChat, renderChat };
