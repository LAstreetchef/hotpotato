// Hot Potato — Background Service Worker
// Handles: notifications, alarms, price polling, auth callbacks

const HP_API = 'https://hotpotato.markets/api';

// ── INSTALL ──
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Set up recurring alarms
    chrome.alarms.create('price-poll',    { periodInMinutes: 2 });
    chrome.alarms.create('hp-round-check',{ periodInMinutes: 1 });
    chrome.alarms.create('position-check',{ periodInMinutes: 5 });
    // Onboarding removed — domain not live yet
  }
});

// ── ALARMS ──
chrome.alarms.onAlarm.addListener(async (alarm) => {
  const { connected } = await chrome.storage.local.get('connected');
  if (!connected) return;

  if (alarm.name === 'price-poll') {
    await checkPositions();
  }
  if (alarm.name === 'hp-round-check') {
    await checkHPRound();
  }
  if (alarm.name === 'position-check') {
    await checkMarketResolutions();
  }
});

// ── POSITION PRICE ALERTS ──
async function checkPositions() {
  const { positions = [] } = await chrome.storage.local.get('positions');
  // In production: fetch from HP API
  // Simulated: trigger notification if big move
  const mockMove = Math.random();
  if (mockMove > 0.85) {
    showNotification(
      'position-move',
      '📈 Nova Reyes YES up +12%',
      'Your position on "Hits 5M by August?" is now +$18.40',
      { type: 'trade', market: 'nova-5m' }
    );
  }
}

// ── HOT POTATO ROUND ALERTS ──
async function checkHPRound() {
  // In production: check live round countdown from HP API
  // Notify when < 5 minutes remaining
  const mockSecsLeft = Math.floor(Math.random() * 600);
  if (mockSecsLeft < 300 && mockSecsLeft > 250) {
    showNotification(
      'hp-round',
      '🥔 Round ending in 4 minutes!',
      '"Nova posts before midnight" — Pot: $182. Last holder wins.',
      { type: 'round' }
    );
  }
}

// ── MARKET RESOLUTION ALERTS ──
async function checkMarketResolutions() {
  // In production: check if any held positions have resolved
  // Simulated example
  const mockResolved = Math.random() > 0.95;
  if (mockResolved) {
    showNotification(
      'market-resolved',
      '✅ Market resolved — you won!',
      '"Nova Reyes hits 5M followers" resolved YES. +$23.53 added to your balance.',
      { type: 'resolved', market: 'nova-5m' }
    );
  }
}

// ── NOTIFICATIONS ──
function showNotification(id, title, message, data = {}) {
  chrome.notifications.create(id, {
    type: 'basic',
    iconUrl: 'icons/potato-48.png',
    title,
    message,
    priority: 2,
    buttons: data.type === 'trade' ? [{ title: 'Trade now' }] : [],
  });
  // Store click data
  chrome.storage.session.set({ [`notif_${id}`]: data });
}

chrome.notifications.onClicked.addListener((notifId) => {
  chrome.storage.session.get([`notif_${notifId}`], (data) => {
    const info = data[`notif_${notifId}`] || {};
    if (info.type === 'round' || info.type === 'trade') {
      chrome.action.openPopup?.();
    }
    if (info.type === 'resolved') {
      chrome.tabs.create({ url: 'https://hotpotato.markets/positions' });
    }
  });
  chrome.notifications.clear(notifId);
});

chrome.notifications.onButtonClicked.addListener((notifId) => {
  chrome.action.openPopup?.();
  chrome.notifications.clear(notifId);
});

// ── MESSAGES FROM POPUP / CONTENT SCRIPT ──
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'TRADE_CONFIRMED') {
    showNotification(
      'trade-' + Date.now(),
      `Trade placed — ${msg.side.toUpperCase()} $${msg.amount}`,
      'HP Points earned: +' + Math.floor(msg.amount * 2),
    );
    sendResponse({ ok: true });
  }

  if (msg.type === 'CREATOR_DETECTED') {
    // Content script found a creator profile
    chrome.storage.session.set({ detectedCreator: msg.creator });
    // Badge the extension icon
    chrome.action.setBadgeText({ text: '1', tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#CC1A1A', tabId: sender.tab.id });
    sendResponse({ ok: true });
  }

  if (msg.type === 'AUTH_CALLBACK') {
    // Platform OAuth returned
    chrome.storage.local.set({
      connected: true,
      user: msg.user,
    });
    chrome.tabs.remove(sender.tab.id);
    chrome.action.openPopup?.();
    sendResponse({ ok: true });
  }

  return true; // Keep channel open for async
});

// ── TAB TRACKING — clear badge when leaving creator page ──
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.action.setBadgeText({ text: '', tabId });
});
