#!/bin/bash
# Hot Potato × Fancast Integration Setup
# Run from: ~/clawd/hotpotato/
# Usage: bash fancast-setup.sh

set -e

echo "🥔 Hot Potato × Fancast Integration Setup"
echo "========================================="

# Check we're in the right directory
if [ ! -f "backend/server.js" ]; then
  echo "❌ Error: Run this from ~/clawd/hotpotato/ (backend/server.js not found)"
  exit 1
fi

# Step 1: Install dependencies
echo ""
echo "📦 Step 1: Installing PostgreSQL dependencies..."
cd backend
npm install pg dotenv
cd ..

# Step 2: Create directory structure
echo ""
echo "📁 Step 2: Creating new directories..."
mkdir -p backend/db
mkdir -p backend/services
mkdir -p backend/middleware

# Step 3: Copy new files (these should already be in place from the briefing)
echo ""
echo "📄 Step 3: Checking new files exist..."

FILES=(
  "backend/db/pool.js"
  "backend/db/schema.sql"
  "backend/services/amm.js"
  "backend/services/resolution.js"
  "backend/middleware/creatorRestrictions.js"
  "backend/routes/resolution.js"
  "backend/routes/portfolio.js"
  "backend/.env"
)

MISSING=0
for f in "${FILES[@]}"; do
  if [ ! -f "$f" ]; then
    echo "  ❌ Missing: $f"
    MISSING=$((MISSING + 1))
  else
    echo "  ✅ Found: $f"
  fi
done

if [ $MISSING -gt 0 ]; then
  echo ""
  echo "⚠️  $MISSING files missing. Clawdbot needs to create these from the briefing doc."
  echo "   Re-read CLAWDBOT-BRIEFING.md and create the missing files."
  exit 1
fi

# Step 4: Set up PostgreSQL
echo ""
echo "🐘 Step 4: Setting up PostgreSQL..."

# Start postgres if not running
sudo service postgresql start 2>/dev/null || true

# Create database (ignore error if exists)
createdb hotpotato 2>/dev/null || echo "  Database 'hotpotato' already exists"

# Run schema
echo "  Running schema..."
psql -d hotpotato -f backend/db/schema.sql

echo ""
echo "✅ Schema applied successfully"

# Step 5: Add .env to .gitignore
echo ""
echo "🔒 Step 5: Securing .env..."
if [ -f ".gitignore" ]; then
  if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
    echo "backend/.env" >> .gitignore
    echo "  Added .env to .gitignore"
  fi
else
  echo ".env" > .gitignore
  echo "backend/.env" >> .gitignore
  echo "node_modules/" >> .gitignore
  echo "  Created .gitignore"
fi

# Step 6: Verify
echo ""
echo "🧪 Step 6: Verification..."
echo ""

# Test database connection
psql -d hotpotato -c "SELECT COUNT(*) as tables FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null
echo ""

# Check if tables were created
psql -d hotpotato -c "\dt" 2>/dev/null
echo ""

echo "========================================="
echo "🥔 Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clawdbot: Merge new routes into server.js"
echo "  2. Clawdbot: Refactor markets.js to use PostgreSQL"
echo "  3. Test: cd backend && node server.js"
echo "  4. Test: Run the curl commands from the briefing"
echo ""
echo "Start the backend:"
echo "  cd backend && node server.js"
