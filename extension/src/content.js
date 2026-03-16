// Hot Potato — Content Script
// Runs on: onlyfans.com, tiktok.com, instagram.com, twitter.com, x.com
// Injects: floating "Trade this creator" button on creator profiles

(function() {
  'use strict';

  const HP_ORIGIN = 'https://hotpotato.markets';
  let injected = false;
  let currentCreator = null;

  // ── PLATFORM DETECTORS ──
  const platforms = {
    onlyfans: {
      match: () => location.hostname.includes('onlyfans.com'),
      getCreator: () => {
        // OF profile: /username path, header has display name
        const nameEl = document.querySelector('.b-username__name, [class*="userName"], h1');
        const avatarEl = document.querySelector('.b-avatar img, .l-header__logo img, [class*="avatar"] img');
        const handleEl = document.querySelector('[class*="alias"], .b-username__alias');
        if (!nameEl) return null;
        return {
          name: nameEl.textContent.trim(),
          handle: handleEl?.textContent.trim() || location.pathname.slice(1),
          avatar: avatarEl?.src || '',
          platform: 'onlyfans',
          url: location.href,
        };
      }
    },
    tiktok: {
      match: () => location.hostname.includes('tiktok.com'),
      getCreator: () => {
        // TikTok profile: /@username
        if (!location.pathname.startsWith('/@')) return null;
        const nameEl = document.querySelector('[data-e2e="user-title"], h1[class*="title"]');
        const avatarEl = document.querySelector('[data-e2e="user-avatar"] img, [class*="avatar"] img');
        const handle = location.pathname.slice(2); // remove /@
        if (!nameEl && !handle) return null;
        return {
          name: nameEl?.textContent.trim() || handle,
          handle: '@' + handle,
          avatar: avatarEl?.src || '',
          platform: 'tiktok',
          url: location.href,
        };
      }
    },
    instagram: {
      match: () => location.hostname.includes('instagram.com'),
      getCreator: () => {
        // IG profile: /username/ (not /p/, /reels/, etc.)
        const parts = location.pathname.split('/').filter(Boolean);
        if (!parts.length || ['p','reel','reels','explore','stories'].includes(parts[0])) return null;
        const nameEl = document.querySelector('header h1, header h2, [class*="fullName"]');
        const avatarEl = document.querySelector('header img[alt*="profile"], header img[alt]');
        return {
          name: nameEl?.textContent.trim() || parts[0],
          handle: '@' + parts[0],
          avatar: avatarEl?.src || '',
          platform: 'instagram',
          url: location.href,
        };
      }
    },
    twitter: {
      match: () => location.hostname.includes('twitter.com') || location.hostname.includes('x.com'),
      getCreator: () => {
        // Twitter/X profile: /username (not /home, /notifications, etc.)
        const skip = ['home','notifications','messages','explore','settings','i'];
        const parts = location.pathname.split('/').filter(Boolean);
        if (!parts.length || skip.includes(parts[0])) return null;
        const nameEl = document.querySelector('[data-testid="UserName"] span:first-child');
        const avatarEl = document.querySelector('[data-testid="UserAvatar"] img, [data-testid="primaryColumn"] img[src*="profile_images"]');
        return {
          name: nameEl?.textContent.trim() || parts[0],
          handle: '@' + parts[0],
          avatar: avatarEl?.src || '',
          platform: 'twitter',
          url: location.href,
        };
      }
    }
  };

  // ── DETECT CURRENT PLATFORM ──
  function getPlatform() {
    return Object.values(platforms).find(p => p.match());
  }

  // ── INJECT TRADE BUTTON ──
  function injectButton(creator) {
    if (injected) {
      updateButton(creator);
      return;
    }

    const btn = document.createElement('div');
    btn.id = 'hp-trade-button';
    btn.innerHTML = `
      <div id="hp-btn-inner">
        <svg width="16" height="19" viewBox="0 0 18 22" style="flex-shrink:0"><ellipse cx="9" cy="15" rx="7" ry="5.5" fill="#C8914A"/><path d="M8.5 7 Q8 4 7.5 1.5" fill="none" stroke="#4A9A2A" stroke-width="1.5" stroke-linecap="round"/><path d="M7.5 4 Q5 2 3.5 0 Q5.5 1 7.5 3Z" fill="#4A9A2A"/><rect x="4.5" y="11" width="5" height="3.5" rx="2" fill="#111"/><rect x="10" y="11" width="5" height="3.5" rx="2" fill="#111"/><rect x="8.5" y="12.5" width="2.5" height="1" rx="0.5" fill="white" opacity="0.8"/><ellipse cx="9" cy="18" rx="3.5" ry="1.5" fill="#CC1A1A"/></svg>
        <div id="hp-btn-text">
          <span id="hp-btn-name">${creator.name}</span>
          <span id="hp-btn-sub">Trade on Hot Potato →</span>
        </div>
      </div>
    `;

    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'CREATOR_DETECTED',
        creator: currentCreator,
      });
      // Open popup or HP tab
      window.open(`${HP_ORIGIN}/creator/${encodeURIComponent(creator.handle)}`, '_blank');
    });

    document.body.appendChild(btn);
    injected = true;

    // Animate in
    setTimeout(() => btn.classList.add('hp-visible'), 100);
  }

  function updateButton(creator) {
    const nameEl = document.getElementById('hp-btn-name');
    if (nameEl) nameEl.textContent = creator.name;
  }

  function removeButton() {
    const btn = document.getElementById('hp-trade-button');
    if (btn) {
      btn.classList.remove('hp-visible');
      setTimeout(() => { btn.remove(); injected = false; }, 300);
    }
  }

  // ── OBSERVE PAGE CHANGES (SPA navigation) ──
  function checkPage() {
    const platform = getPlatform();
    if (!platform) return;

    const creator = platform.getCreator();
    if (creator && creator.name) {
      currentCreator = creator;
      injectButton(creator);
      // Tell popup about detected creator
      chrome.runtime.sendMessage({
        type: 'CREATOR_DETECTED',
        creator,
      });
    } else {
      removeButton();
      currentCreator = null;
    }
  }

  // Initial check
  checkPage();

  // Watch for URL changes (SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      setTimeout(checkPage, 800); // wait for SPA render
    }
  }).observe(document.body, { subtree: true, childList: true });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'GET_CREATOR_INFO') {
      sendResponse(currentCreator || null);
    }
    return true;
  });

})();
