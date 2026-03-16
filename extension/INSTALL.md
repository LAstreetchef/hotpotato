# Hot Potato Chrome Extension

## Install in Chrome (Developer Mode)

1. Open Chrome and go to `chrome://extensions`
2. Toggle **Developer mode** ON (top right)
3. Click **Load unpacked**
4. Select this folder: `hotpotato-extension/`
5. The 🥔 potato icon appears in your Chrome toolbar

## What it does

**Toolbar popup** — click the potato icon anywhere:
- Discover & swipe creator markets
- View your open positions + P&L
- Live Hot Potato countdown round
- Create a market in one tap
- Wallet + $POTATO balance

**On creator pages (OF / TikTok / IG / Twitter):**
- A "Trade on Hot Potato →" button appears bottom-right
- Click to open that creator's markets directly
- Extension icon badges red when a creator is detected

**Background notifications:**
- Price alerts when your positions move
- Hot Potato round ending warnings
- Market resolution confirmations

## File structure

```
hotpotato-extension/
├── manifest.json         ← Extension config
├── popup.html            ← Main UI (380×580px)
├── src/
│   ├── popup.js          ← App logic
│   ├── background.js     ← Service worker (notifications, alarms)
│   ├── content.js        ← Injected on OF/TT/IG/Twitter
│   └── content.css       ← Styles for injected button
└── icons/
    ├── potato.svg        ← Source SVG
    ├── potato-16.png
    ├── potato-32.png
    ├── potato-48.png
    └── potato-128.png
```

## Production notes (for Clawdbot / dev handoff)

- `HP_API` in background.js → replace with real API endpoint
- Platform OAuth flows → implement real redirect URIs at `hotpotato.markets/connect/{platform}`
- `chrome.action.openPopup()` → MV3 only works when triggered by user gesture; use `chrome.tabs.create` as fallback
- Content script selectors → will need updating as OF/TT/IG update their DOM
- Icons → replace placeholder PNGs with rendered SVG (use `cairosvg` or `sharp` in build pipeline)

## Chrome Web Store submission

1. Zip this folder: `zip -r hotpotato-extension.zip hotpotato-extension/`
2. Go to https://chrome.google.com/webstore/devconsole
3. Pay $5 one-time developer fee
4. Upload zip → fill in store listing → submit for review (~3-7 days)
