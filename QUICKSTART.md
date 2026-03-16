# Hot Potato — Quick Start

## Project Location

```bash
cd ~/clawd/hotpotato
```

## Repository

- **GitHub:** https://github.com/LAstreetchef/hotpotato
- **Local:** `~/clawd/hotpotato/`

## Structure

```
hotpotato/
├── extension/          # Chrome extension v1.0.0
│   ├── manifest.json
│   ├── popup.html
│   ├── src/
│   └── icons/
├── backend/            # API server (empty, next phase)
├── landing/            # Landing page (empty, next phase)
├── docs/               # Documentation
│   ├── COMPLETION-REPORT.md
│   ├── FIXES-APPLIED.md
│   └── SUBMIT-TO-CHROME-STORE.md
├── releases/           # Packaged builds
│   └── hotpotato-extension-v1.0.0.zip
├── PROJECT.md          # Full project overview
├── ROADMAP.md          # Development roadmap
└── README.md           # Repo readme
```

## Key Files

- **Extension source:** `extension/`
- **Packaged extension:** `releases/hotpotato-extension-v1.0.0.zip`
- **Submission guide:** `docs/SUBMIT-TO-CHROME-STORE.md`
- **Privacy policy:** https://daufinder.com/hotpotato/privacy

## Current Status

### ✅ Done
- Extension built and packaged
- Privacy policy live
- GitHub repo created
- Project structure set up

### 🚧 Next
- Chrome Web Store submission (manual)
- TikTok OAuth backend
- Instagram OAuth backend
- OnlyFans verification backend

## Common Commands

### Extension Development
```bash
# View extension files
cd ~/clawd/hotpotato/extension && ls -la

# Re-package extension (if changes made)
cd ~/clawd/hotpotato/extension && \
  python3 << 'PYEOF'
import zipfile
from pathlib import Path

source = Path('.')
output = Path('../releases/hotpotato-extension-v1.0.0.zip')

with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zipf:
    for file in source.rglob('*'):
        if file.is_file() and '.DS_Store' not in str(file):
            zipf.write(file, file.relative_to(source))
PYEOF
```

### Git
```bash
cd ~/clawd/hotpotato

# Status
git status

# Commit changes
git add -A
git commit -m "Your message"
git push

# View history
git log --oneline
```

### Backend Setup (Coming)
```bash
cd ~/clawd/hotpotato/backend

# Create structure
mkdir -p routes controllers models config

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors dotenv pg drizzle-orm
```

## Chrome Web Store Submission

1. Copy package to Windows:
   ```bash
   cp ~/clawd/hotpotato/releases/hotpotato-extension-v1.0.0.zip /mnt/c/Users/YOUR_USERNAME/Downloads/
   ```

2. Follow guide: `docs/SUBMIT-TO-CHROME-STORE.md`

3. Upload at: https://chrome.google.com/webstore/devconsole

## Environment Variables (Backend - Coming)

Create `backend/.env`:
```
DATABASE_URL=postgresql://...
TIKTOK_CLIENT_ID=...
TIKTOK_CLIENT_SECRET=...
INSTAGRAM_CLIENT_ID=...
INSTAGRAM_CLIENT_SECRET=...
POLYGON_RPC_URL=https://polygon-rpc.com
USDC_CONTRACT_ADDRESS=0x...
ADMIN_PRIVATE_KEY=...
JWT_SECRET=...
```

## Links

- **GitHub:** https://github.com/LAstreetchef/hotpotato
- **Privacy Policy:** https://daufinder.com/hotpotato/privacy
- **Chrome Web Store:** (pending submission)

## Contact

**Project Lead:** Street Chef 🔪  
**GitHub:** @LAstreetchef

---

**Last Updated:** March 16, 2026
