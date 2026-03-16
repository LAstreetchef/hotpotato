# Hot Potato — Project Overview

**Status:** 🚧 Active Development  
**Lead:** Street Chef 🔪  
**Started:** March 16, 2026

## Vision

Hot Potato is a prediction market platform where **creators are the markets**. Think Polymarket meets OnlyFans meets Tinder.

**Tagline:** *You are the market now.*

## How It Works

1. **Creators connect** their OnlyFans, TikTok, or Instagram account
2. **Create markets** about themselves: "Will I hit 5M followers by August?"
3. **Fans trade** YES or NO in USDC on Polygon
4. **Creators earn** 1% of every trade, forever

## Special Features

### Hot Potato Rounds
Timed game where price escalates 20% each trade. Last holder when clock hits zero wins the pot.

### $POTATO Token
Native token on Polygon. Currently Phase 1 (points), converting to token at TGE Q4 2025.

## Platform Screens

1. **Discover** — Tinder-style swipe through creator cards with live markets
2. **Positions** — Track your trades + P&L
3. **Hot Potato Round** — Live countdown game
4. **Create** — Post a market in one tap
5. **Me** — Wallet, points, earnings dashboard

## Tech Stack

### Extension (v1.0.0)
- **Manifest:** V3
- **Popup:** 380x580px, vanilla JS
- **Platforms:** OnlyFans, TikTok, Instagram, Twitter/X
- **Storage:** chrome.storage.local
- **Network:** Polygon (USDC settlement)

### Backend (Coming)
- **OAuth:** TikTok, Instagram, OnlyFans bio-code verification
- **API:** Market creation, trading, resolution
- **Database:** User accounts, positions, markets
- **Blockchain:** Polygon contract integration

### Landing Page (Coming)
- **Design:** B&W editorial (like daufinder.com/influencers)
- **Mascot:** Potato with lipstick, pearl earrings, sunglasses
- **Expressions:** Smug, Shocked, Winking, On Fire

## Current Status

### ✅ Completed
- Chrome extension codebase
- Extension packaged for Chrome Web Store
- Privacy policy live at daufinder.com/hotpotato/privacy
- Critical bugs fixed (MV3 compliance)
- Project repository initialized

### 🚧 In Progress
- Chrome Web Store submission (manual upload pending)

### 📋 Next Up
1. **Backend OAuth endpoints:**
   - `/connect/tiktok`
   - `/connect/instagram`
   - `/connect/onlyfans`
2. **Landing page** — Marketing site
3. **API server** — Markets, trading, positions
4. **Smart contract** — Polygon USDC settlement

## Mascot Design

**Potato Character:**
- Lipstick (red)
- Pearl earrings
- Sunglasses (dark)
- Editorial B&W aesthetic

**Expressions:**
1. **Smug** — Default state
2. **Shocked** — Price alerts
3. **Winking** — Wins
4. **On Fire** — Hot Potato rounds (literally on fire 🔥)

## Monetization

### Creator Revenue
- 1% of every trade on their markets
- Forever (as long as market exists)
- Paid in USDC

### Platform Revenue
- Trading fees (TBD %)
- Hot Potato round rake
- $POTATO token appreciation

## Target Users

### Creators
- OnlyFans models
- TikTok influencers
- Instagram personalities
- Twitter personalities (future)

### Traders
- Creator fans
- Crypto traders
- Prediction market users
- Degenerates who love Hot Potato rounds

## Competitive Edge

1. **Creator-first** — Markets created BY creators, not about them
2. **Hot Potato mechanic** — Unique game mode
3. **Multi-platform** — Not just one creator platform
4. **Low barrier** — One-tap market creation
5. **Tinder UX** — Swipe to discover, familiar interface

## Links

- **Privacy Policy:** https://daufinder.com/hotpotato/privacy
- **Extension Repo:** ~/clawd/hotpotato/extension/
- **Docs:** ~/clawd/hotpotato/docs/
- **GitHub:** (to be created)

## Team

**Street Chef** — Lead developer, project owner

## Timeline

- **Q1 2026:** Extension + backend MVP
- **Q2 2026:** Launch beta with creator cohort
- **Q3 2026:** Public launch
- **Q4 2026:** $POTATO TGE

## Notes

- Chrome Web Store Publisher ID: `f761973b-45c3-4ba2-9250-c7351ef09a36`
- Polygon network for low fees
- USDC for stable settlement
- Points system (Phase 1) converts to $POTATO at TGE

---

**Last Updated:** March 16, 2026  
**Project Lead:** Street Chef 🔪
