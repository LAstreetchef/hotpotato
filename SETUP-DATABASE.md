# Hot Potato PostgreSQL Setup

## Prerequisites Installation

If PostgreSQL is not installed on your WSL system:

```bash
# Update package lists
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo service postgresql start

# Verify installation
psql --version
```

## Database Creation

```bash
# Start PostgreSQL (if not running)
sudo service postgresql start

# Create the hotpotato database
sudo -u postgres createdb hotpotato

# Run the schema
sudo -u postgres psql -d hotpotato -f ~/clawd/hotpotato/backend/db/schema.sql

# Verify tables were created
sudo -u postgres psql -d hotpotato -c "\dt"
```

You should see:
```
              List of relations
 Schema |         Name          | Type  |  Owner
--------+-----------------------+-------+----------
 public | creator_restrictions  | table | postgres
 public | disputes              | table | postgres
 public | markets               | table | postgres
 public | resolution_log        | table | postgres
 public | trades                | table | postgres
 public | users                 | table | postgres
```

## Connection Configuration

The `.env` file is already configured with:
```
DATABASE_URL=postgresql://localhost:5432/hotpotato
```

For production, update with your actual database credentials:
```
DATABASE_URL=postgresql://username:password@host:5432/hotpotato
```

## Starting the Server

```bash
cd ~/clawd/hotpotato/backend
node server.js
```

You should see:
```
🥔 Hot Potato MVP running on port 3030
   Test Interface: http://localhost:3030/test.html
   Health: http://localhost:3030/api/health
   Admin: http://localhost:3030/api/admin/dashboard
```

## Testing Database Connection

```bash
curl http://localhost:3030/api/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0-fancast",
  "database": "postgresql",
  "users": 0,
  "markets": 0
}
```

If you see an error, check:
1. PostgreSQL is running: `sudo service postgresql status`
2. Database exists: `sudo -u postgres psql -l | grep hotpotato`
3. Schema loaded: `sudo -u postgres psql -d hotpotato -c "SELECT COUNT(*) FROM users"`

## Troubleshooting

### "psql: command not found"
```bash
sudo apt install postgresql-client
```

### "connection refused" errors
```bash
# Check if PostgreSQL is running
sudo service postgresql status

# If not running, start it
sudo service postgresql start

# Check if listening on port 5432
sudo netstat -plnt | grep 5432
```

### "database does not exist"
```bash
sudo -u postgres createdb hotpotato
sudo -u postgres psql -d hotpotato -f backend/db/schema.sql
```

### Permission errors
Update the DATABASE_URL in `.env` to use postgres user:
```
DATABASE_URL=postgresql://postgres@localhost:5432/hotpotato
```

## Resetting the Database (DANGER)

If you need to start fresh:
```bash
sudo -u postgres dropdb hotpotato
sudo -u postgres createdb hotpotato
sudo -u postgres psql -d hotpotato -f backend/db/schema.sql
```

## Next Steps

Once the database is running:
1. Create a test user via the test interface: http://localhost:3030/test.html
2. Create a market
3. Execute trades
4. Test resolution system

See `CLAWDBOT-BRIEFING.md` for API endpoint documentation.
