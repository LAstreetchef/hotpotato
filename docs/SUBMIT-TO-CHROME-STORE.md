# Hot Potato — Chrome Web Store Submission Guide

## 🔧 Fixes Applied

✅ **Critical:** Removed `chrome.tabs.create` call that opened non-existent domain  
✅ **MV3:** Fixed deprecated `chrome.tabs.executeScript` API  
✅ **Package:** Created `hotpotato-extension-store.zip` (20KB)  

## 📦 Package Location

**File:** `/home/lastreetchef/hotpotato-extension-store.zip`

Copy to Windows for upload:
```bash
cp ~/hotpotato-extension-store.zip /mnt/c/Users/YOUR_USERNAME/Downloads/
```

## 🌐 Chrome Web Store Submission Steps

### 1. Go to Developer Dashboard
URL: https://chrome.google.com/webstore/devconsole

Login with account that has Publisher ID: `f761973b-45c3-4ba2-9250-c7351ef09a36`

### 2. Click "New Item"

### 3. Upload Package
- Click "Choose file"
- Select `hotpotato-extension-store.zip`
- Click "Upload"

### 4. Fill in Store Listing

**Product Details:**
- **Name:** Hot Potato
- **Summary:** Trade prediction markets on your favorite creators
- **Description:**
```
Hot Potato turns creators into prediction markets. Connect your OnlyFans, TikTok, or Instagram account and create markets about yourself — "Will I hit 5M followers by August?" — and earn 1% of every trade, forever.

HOW IT WORKS:
• Swipe through creator cards like Tinder
• Trade YES or NO on creator predictions (USDC on Polygon)
• Play Hot Potato rounds — last holder wins the pot
• Earn $POTATO points (converts to token at TGE Q4 2025)

FEATURES:
• Discover: Tinder-style swipe feed of creator markets
• Positions: Track your trades + P&L in real-time
• Hot Potato Round: Timed price escalation game
• Create: Post a prediction market in one tap
• Me: Wallet, points, earnings dashboard

PLATFORM SUPPORT:
• OnlyFans creators
• TikTok influencers
• Instagram accounts
• Twitter/X (coming soon)

$POTATO is the native token on Polygon. Currently in points phase (Phase 1), converting to token at TGE in Q4 2025.

You are the market now. 🥔
```

**Category:** Social & Communication  
**Language:** English (United States)

### 5. Upload Store Assets

**Required Images:**

**Icon (128x128):**
Upload: `/home/lastreetchef/hotpotato-extension/hotpotato-extension/icons/potato-128.png`

**Small Promo Tile (440x280):**
Create a black background with:
- Potato icon (centered top)
- "Hot Potato" in large white italic text
- "Creator Markets · $POTATO · Polygon" in small gray text below

**Screenshots (1280x800) — at least 1 required:**
Create a black background with:
- Potato icon large (centered)
- "Hot Potato" headline
- "You are the market now." tagline
- OR take an actual screenshot of the extension popup

**Temporary Workaround:**
You can use the potato-128.png icon as a placeholder for all assets initially, then update with proper designs after approval.

### 6. Privacy & Permissions

**Single Purpose Description:**
"Hot Potato enables users to create and trade prediction markets on creator milestones and achievements."

**Permission Justifications:**

- **storage:** Store user authentication state and trading data locally
- **notifications:** Alert users to price movements, round endings, and market resolutions
- **alarms:** Schedule periodic checks for position updates and hot potato rounds
- **activeTab:** Detect creator profiles on OnlyFans, TikTok, Instagram

**Host Permissions:**
All host permissions (onlyfans.com, tiktok.com, instagram.com, twitter.com) are used to detect creator profiles and inject the "Trade this creator" button overlay.

### 7. Pricing & Distribution

- **Visibility:** Public
- **Pricing:** Free
- **Countries:** All countries

### 8. Submit for Review

Click **"Submit for Review"**

## ⏱️ Expected Timeline

- **Review time:** 1-7 days (typically 2-3 days)
- **Status:** Check dashboard for updates
- **Email:** Google will email submission@hotpotato.markets (or your registered email)

## 🔑 After Approval

1. **Get Extension ID** from the dashboard (format: `abcdefghijklmnopqrstuvwxyzabcd`)
2. **Update backend** to handle OAuth callbacks
3. **Backend endpoints needed:**
   - https://hotpotato.markets/connect/onlyfans
   - https://hotpotato.markets/connect/tiktok
   - https://hotpotato.markets/connect/instagram
   - https://hotpotato.markets/connect/wallet

## 🚨 If Rejected

Common rejection reasons:
1. **Broken external links** — We already fixed this (removed welcome page link)
2. **Missing privacy policy** — Add at https://hotpotato.markets/privacy
3. **Unclear permission use** — We have justifications above
4. **Missing single purpose** — We have description above

## 📊 Post-Launch

1. Monitor install count
2. Track user feedback/reviews
3. Update store assets with professional design
4. Add more screenshots showing actual UI
5. A/B test store description for conversions

## 🎯 Current Status

**Package:** ✅ Ready  
**Fixes:** ✅ Applied  
**Submission:** ⏸️ Manual (browser not available in WSL2)  

**Action Required:** Upload via Windows browser using steps above.
