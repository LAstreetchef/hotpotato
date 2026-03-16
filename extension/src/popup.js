// ── STATE ──
let bal = 1247, pts = 4820, side = 'yes', odds = 74;
let hpSecs = 257, hpPr = 4.80, hpHeld = false;
let isConnected = false;
let cidx = 0;

const pool = [
  {n:'Nova Reyes',  h:'@novareyes · 4.2M', q:'Hits 5M by August?',     o:74, bg:'#2A1020', img:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=520&fit=crop&crop=focalpoint&fp-y=0.3&auto=format&q=80'},
  {n:'Zara Moon',   h:'@zaramoon · 2.1M',  q:'Sony collab this year?', o:52, bg:'#2C1A10', img:'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=520&fit=crop&crop=focalpoint&fp-y=0.2&auto=format&q=80'},
  {n:'Jake Vega',   h:'@jakevega · 890K',  q:'Brand deal over $500K?', o:61, bg:'#1A2030', img:'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=520&fit=crop&crop=focalpoint&fp-y=0.25&auto=format&q=80'},
  {n:'Mia Chen',    h:'@miachen · 3.1M',   q:'Goes platinum by June?', o:67, bg:'#2A1828', img:'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=520&fit=crop&crop=focalpoint&fp-y=0.2&auto=format&q=80'},
  {n:'Leo Salva',   h:'@leosalva · 1.4M',  q:'EP drop this month?',    o:29, bg:'#1C2818', img:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=520&fit=crop&crop=focalpoint&fp-y=0.25&auto=format&q=80'},
];

const posData = {
  nova: {name:'Nova Reyes',  q:'Hits 5M by August? · YES @ 68¢', invested:'$50.00', current:'74¢', pnl:'+$42.10', resolves:'Aug 31, 2025'},
  zara: {name:'Zara Moon',   q:'Sony collab? · NO @ 54¢',        invested:'$40.00', current:'48¢', pnl:'−$12.50', resolves:'Dec 31, 2025'},
  jake: {name:'Jake Vega',   q:'Brand deal? · YES @ 58¢',        invested:'$50.00', current:'61¢', pnl:'+$18.80', resolves:'Sep 30, 2025'},
};

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['connected', 'user', 'balance', 'pts'], (data) => {
    if (data.connected) {
      showApp(data.user || {name:'Kam L.', handle:'@teamflywheel', initial:'K'});
    }
    // Check if we're on a creator page
    checkCreatorContext();
  });
  startHPTimer();
});

function checkCreatorContext() {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (!tabs[0]) return;
    const url = tabs[0].url || '';
    let platform = null;
    if (url.includes('onlyfans.com')) platform = 'onlyfans';
    else if (url.includes('tiktok.com')) platform = 'tiktok';
    else if (url.includes('instagram.com')) platform = 'instagram';
    else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'twitter';

    if (platform && isConnected) {
      const banner = document.getElementById('ctx-banner');
      banner.style.display = 'flex';
      // Try to get creator info from content script
      chrome.tabs.sendMessage(tabs[0].id, {type: 'GET_CREATOR_INFO'}, (resp) => {
        if (resp && resp.name) {
          document.getElementById('ctx-name').textContent = resp.name;
          if (resp.avatar) document.getElementById('ctx-av-img').src = resp.avatar;
          banner.onclick = () => openTrade(`Will ${resp.name} post today?`, '60');
        }
      });
    }
  });
}

function showApp(user) {
  isConnected = true;
  document.getElementById('s-wallet-gate').classList.remove('on');
  document.getElementById('main-nav').style.display = 'flex';
  document.getElementById('s-discover').classList.add('on');
  document.getElementById('tb-av').textContent = (user.initial || user.name[0]).toUpperCase();
  document.getElementById('me-name').textContent = user.name || 'Creator';
  document.getElementById('me-handle').textContent = user.handle || '@handle';
  document.getElementById('me-av').textContent = (user.initial || user.name[0]).toUpperCase();
}

// ── PLATFORM CONNECT ──
function connectPlatform(platform) {
  const urls = {
    onlyfans:  'https://hotpotato.markets/connect/onlyfans',
    tiktok:    'https://hotpotato.markets/connect/tiktok',
    instagram: 'https://hotpotato.markets/connect/instagram',
  };
  chrome.tabs.create({url: urls[platform] || 'https://hotpotato.markets/connect'});
  // Listen for auth callback via storage
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.connected && changes.connected.newValue) {
      chrome.storage.local.get(['user'], (data) => showApp(data.user || {}));
    }
  });
}

function connectWallet() {
  // Fallback: open wallet connect page (injection not needed for MVP)
  toast('Opening wallet connect…');
  setTimeout(() => {
    chrome.tabs.create({url: 'https://hotpotato.markets/connect/wallet'});
  }, 1000);
}

// ── TAB SWITCHING ──
function switchTab(t, el) {
  document.querySelectorAll('.nt').forEach(n => n.classList.remove('on'));
  if (el) el.classList.add('on');
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
  document.getElementById('s-'+t)?.classList.add('on');
}

// ── MODALS ──
function openModal(id, data) {
  if (id === 'm-position' && data) {
    const d = posData[data];
    if (d) {
      document.getElementById('mp-name').textContent = d.name;
      document.getElementById('mp-q').textContent = d.q;
      document.getElementById('mp-invested').textContent = d.invested;
      document.getElementById('mp-current').textContent = d.current;
      document.getElementById('mp-pnl').textContent = d.pnl;
      document.getElementById('mp-resolves').textContent = d.resolves;
    }
  }
  document.getElementById(id)?.classList.add('open');
}
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function bgClose(e, id) { if (e.target === document.getElementById(id)) closeModal(id); }

// ── TRADING ──
function openTrade(q, o) {
  odds = parseInt(o);
  document.getElementById('mt-q').textContent = q;
  document.getElementById('yes-odds').textContent = odds + '¢';
  document.getElementById('no-odds').textContent = (100-odds) + '¢';
  side = 'yes';
  document.getElementById('yes-btn').classList.add('sel');
  document.getElementById('no-btn').classList.remove('sel');
  document.getElementById('t-amt').value = 25;
  calcWin();
  openModal('m-trade');
}

function pickSide(s) {
  side = s;
  document.getElementById('yes-btn').classList.toggle('sel', s==='yes');
  document.getElementById('no-btn').classList.toggle('sel', s==='no');
  calcWin();
}

function setAmt(v) { document.getElementById('t-amt').value = v; calcWin(); }

function calcWin() {
  const a = parseFloat(document.getElementById('t-amt').value) || 0;
  const p = side === 'yes' ? odds/100 : (100-odds)/100;
  document.getElementById('t-win').textContent = '+$' + ((a/p)-a).toFixed(2);
}

function confirmTrade() {
  const a = parseFloat(document.getElementById('t-amt').value) || 0;
  bal -= a; pts += Math.floor(a * 2);
  updateBal();
  closeModal('m-trade');
  toast(side.toUpperCase() + ' $' + a + ' placed · +' + Math.floor(a*2) + ' pts');
  // Persist to storage
  chrome.storage.local.set({balance: bal, pts});
  // Trigger notification
  chrome.runtime.sendMessage({type: 'TRADE_CONFIRMED', amount: a, side});
}

// ── HOT POTATO ──
function grabPotato() {
  if (hpHeld) { toast('You have it — pass it!'); return; }
  bal -= hpPr; pts += 50; hpHeld = true;
  hpPr = parseFloat((hpPr * 1.2).toFixed(2));
  document.getElementById('r-price').textContent = '$' + hpPr.toFixed(2);
  document.getElementById('r-price-btn').textContent = hpPr.toFixed(2);
  updateBal();
  toast('🥔 You have it — pass before you burn!');
  setTimeout(() => { hpHeld = false; }, 9000);
}

function startHPTimer() {
  setInterval(() => {
    if (hpSecs <= 0) hpSecs = 600;
    hpSecs--;
    const m = String(Math.floor(hpSecs/60)).padStart(2,'0');
    const s = String(hpSecs%60).padStart(2,'0');
    const el = document.getElementById('r-timer');
    if (el) el.textContent = m + ':' + s;
    const pct = Math.round((hpSecs/600)*100);
    const fill = document.getElementById('r-fill');
    if (fill) fill.style.width = pct + '%';
  }, 1000);
}

// ── MARKET CREATE ──
function publishMarket() {
  const q = document.getElementById('create-q')?.value.trim();
  if (!q) { toast('Add a question first'); return; }
  pts += 100;
  updateBal();
  document.getElementById('create-q').value = '';
  toast('Market live · +100 pts');
  chrome.storage.local.set({pts});
}

// ── UI HELPERS ──
function updateBal() {
  const f = '$' + Math.round(bal).toLocaleString();
  ['tb-bal','me-bal','bal-big'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = f;
  });
  ['me-pts','pts-big'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = pts.toLocaleString();
  });
}

function toast(msg) {
  const t = document.getElementById('toast-el');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

function openHPTab() {
  chrome.tabs.create({url: 'https://hotpotato.markets'});
}

// ── SWIPE ──
let sx = 0, drag = false;
function dn(cx, target) {
  const c = document.querySelector('.ccard.c1');
  if (c && c.contains(target)) { sx = cx; drag = true; }
}
function mv(cx) {
  if (!drag) return;
  const c = document.querySelector('.ccard.c1');
  if (!c) return;
  const dx = cx - sx;
  c.style.transition = 'none';
  c.style.transform = `rotate(${dx*0.04}deg) translateX(${dx*0.35}px)`;
}
function up(cx) {
  if (!drag) return;
  drag = false;
  const dx = cx - sx;
  const c = document.querySelector('.ccard.c1');
  if (!c) return;
  if (Math.abs(dx) > 70) doSwipe(dx > 0 ? 'trade' : 'pass');
  else { c.style.transition = 'transform 0.3s ease'; c.style.transform = 'rotate(-0.4deg)'; }
}

document.addEventListener('mousedown',  e => dn(e.clientX, e.target));
document.addEventListener('mousemove',  e => mv(e.clientX));
document.addEventListener('mouseup',    e => up(e.clientX));
document.addEventListener('touchstart', e => dn(e.touches[0].clientX, e.target), {passive:true});
document.addEventListener('touchmove',  e => mv(e.touches[0].clientX), {passive:true});
document.addEventListener('touchend',   e => up(e.changedTouches[0].clientX));

function doSwipe(dir) {
  const c = document.querySelector('.ccard.c1');
  if (!c) return;
  c.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
  c.style.transform = `rotate(${dir==='pass'?-18:18}deg) translateX(${dir==='pass'?-320:320}px)`;
  c.style.opacity = '0';
  setTimeout(() => {
    c.remove();
    cidx = (cidx + 1) % pool.length;
    const cr = pool[cidx];
    const stack = document.getElementById('cstack');
    const nc = document.createElement('div');
    nc.className = 'ccard c3';
    nc.innerHTML = `<div class="cph" style="background:${cr.bg}"><img class="cimg" src="${cr.img}" referrerpolicy="no-referrer" alt=""></div><div class="cgrad"></div><div class="cinfo"><div class="ctag"><span class="cdot"></span>Trending</div><div class="cname">${cr.n}</div><div class="chandle">${cr.h}</div><div class="card-mkt" onclick="openTrade('${cr.q}','${cr.o}')"><span class="card-mkt-q">${cr.q}</span><span class="card-mkt-pct">${cr.o}%</span></div></div>`;
    stack.insertBefore(nc, stack.firstChild);
    const cards = stack.querySelectorAll('.ccard');
    ['c3','c2','c1'].forEach((cls, i) => { if (cards[i]) cards[i].className = 'ccard ' + cls; });
  }, 340);
  if (dir === 'trade') {
    const cr = pool[cidx];
    setTimeout(() => openTrade(cr.q, String(cr.o)), 380);
  }
}
