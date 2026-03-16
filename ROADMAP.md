# Hot Potato — Roadmap

## Phase 1: Extension Launch ✅

- [x] Build Chrome extension
- [x] Fix MV3 compliance issues
- [x] Package for Chrome Web Store
- [x] Create privacy policy
- [x] Set up project repository
- [x] Push to GitHub
- [ ] Submit to Chrome Web Store (manual upload pending)
- [ ] Get extension ID from dashboard

## Phase 2: Backend MVP 🚧

### OAuth Endpoints
- [ ] TikTok OAuth (`/connect/tiktok`)
  - [ ] Register TikTok app
  - [ ] Implement OAuth flow
  - [ ] Store creator profile data
- [ ] Instagram OAuth (`/connect/instagram`)
  - [ ] Register Instagram app
  - [ ] Implement OAuth flow
  - [ ] Store creator profile data
- [ ] OnlyFans bio-code verification (`/connect/onlyfans`)
  - [ ] Generate verification codes
  - [ ] Scrape bio for code
  - [ ] Verify ownership

### Database Schema
- [ ] Users table (wallet, platform handles)
- [ ] Markets table (creator, question, odds, resolve date)
- [ ] Positions table (user, market, side, amount, entry price)
- [ ] Trades table (transaction history)
- [ ] HP Points ledger

### API Endpoints
- [ ] `POST /api/markets/create` — Create a prediction market
- [ ] `GET /api/markets/:id` — Get market details
- [ ] `POST /api/trade` — Place a trade
- [ ] `GET /api/positions` — Get user positions
- [ ] `GET /api/balance` — Get wallet balance + HP Points
- [ ] `POST /api/hotpotato/grab` — Grab the potato in a round
- [ ] `GET /api/hotpotato/status` — Current round status

### Polygon Integration
- [ ] USDC contract integration
- [ ] Trade settlement logic
- [ ] Gas optimization
- [ ] Wallet signature verification

## Phase 3: Landing Page 📝

### Design
- [ ] B&W editorial aesthetic (like daufinder.com/influencers)
- [ ] Potato mascot illustrations (4 expressions)
- [ ] Hero section
- [ ] How it works
- [ ] Creator examples
- [ ] Download extension CTA

### Pages
- [ ] Home (`/`)
- [ ] Privacy (`/privacy`) ✅
- [ ] Terms (`/terms`)
- [ ] About (`/about`)
- [ ] $POTATO token info (`/token`)

## Phase 4: Public Beta 🚀

- [ ] Recruit 10-20 creator beta testers
- [ ] Onboard first cohort
- [ ] Seed initial markets
- [ ] Test trading flow end-to-end
- [ ] Monitor for bugs
- [ ] Gather feedback

## Phase 5: Full Launch 🎉

- [ ] Public launch announcement
- [ ] Marketing campaign
- [ ] Creator outreach
- [ ] Community building (Discord/Telegram)
- [ ] Press coverage

## Phase 6: Token Launch 💎

- [ ] $POTATO tokenomics finalization
- [ ] Smart contract audit
- [ ] TGE (Token Generation Event)
- [ ] Points → $POTATO conversion
- [ ] DEX liquidity

## Technical Debt / Nice-to-Haves

- [ ] Regenerate extension icons from SVG (better quality)
- [ ] Create professional store assets (screenshots, promo tiles)
- [ ] Add more creator platforms (YouTube, Twitch, Patreon)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Referral program
- [ ] Leaderboards

## Metrics to Track

- Extension installs
- Active users
- Markets created
- Total trading volume
- Creator earnings
- HP Points distributed
- Hot Potato rounds played

## Current Priorities (Next 7 Days)

1. ✅ Set up project repo
2. 🚧 Chrome Web Store submission
3. 🚧 Start TikTok OAuth backend
4. 📝 Design landing page wireframes
5. 📝 Recruit beta creator cohort

---

**Last Updated:** March 16, 2026  
**Status:** Phase 1 → Phase 2 transition
