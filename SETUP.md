# 🚀 WagerVS Setup Guide

Complete setup instructions for getting the WagerVS platform running locally.

## Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 18+** and npm installed
- ✅ **MySQL 8.0+** installed and running
- ✅ **Git** installed
- ✅ Basic command line knowledge

## Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Create Environment File

```bash
cd backend
cp .env.example .env
```

Edit `.env` and update these values:
- `DATABASE_URL` - Your MySQL connection string
- `JWT_SECRET` - A secure random string
- `TREASURY_WALLET_PRIVATE_KEY` - Your Solana wallet private key (leave empty for now if testing)

### Step 3: Set Up Database

**Option A: Automated (if you have MySQL root access)**

```bash
mysql -u root -p < backend/database/schema.sql
```

**Option B: Manual Setup**

```bash
# 1. Connect to MySQL
mysql -u root -p

# 2. Copy and paste the contents of backend/database/schema.sql
# This will:
#   - Create the predictionsdb database
#   - Create all tables
#   - Create the preduser user
#   - Seed initial data (categories, test users, test admins)
```

### Step 4: Generate Prisma Client

```bash
cd backend
npm run prisma:generate
```

### Step 5: Start Development Server

```bash
npm run dev
```

Server starts at **http://localhost:3001**

### Step 6: Verify Installation

Open your browser or use curl:

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-11-07T...",
  "environment": "development"
}
```

🎉 **Success!** Your backend is running.

---

## Detailed Setup

### MySQL Database Setup

#### Create Database Manually

If the automated script doesn't work, create the database manually:

```sql
CREATE DATABASE IF NOT EXISTS predictionsdb 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE predictionsdb;

-- Create the UUID helper function
DELIMITER $$
CREATE FUNCTION IF NOT EXISTS uuid_to_bin(uuid CHAR(36)) 
RETURNS BINARY(16)
DETERMINISTIC
BEGIN
  RETURN UNHEX(REPLACE(uuid, '-', ''));
END$$
DELIMITER ;

-- Then run the rest of the schema from backend/database/schema.sql
```

#### Verify Database Setup

```bash
mysql -u preduser -pH2lloW0rld predictionsdb

# Then run:
SHOW TABLES;

# You should see all tables listed
```

### Prisma Setup

#### Test Prisma Connection

```bash
cd backend
npm run prisma:studio
```

This opens Prisma Studio at **http://localhost:5555** where you can view and edit database records visually.

#### Common Prisma Commands

```bash
# Generate Prisma client after schema changes
npm run prisma:generate

# Push schema changes to database (use with caution)
npm run prisma:push

# Create a new migration
npm run prisma:migrate

# View database in browser
npm run prisma:studio
```

### Environment Variables Explained

Create `backend/.env` with these values:

```env
# Database Connection
DATABASE_URL="mysql://preduser:H2lloW0rld@localhost:3306/predictionsdb"
# Format: mysql://USERNAME:PASSWORD@HOST:PORT/DATABASE

# Server Configuration
PORT=3001                    # Port for Express server
NODE_ENV=development         # development | production

# JWT Authentication
JWT_SECRET=your-secret-here  # Change to a random 32+ character string
JWT_EXPIRES_IN=7d           # Token expiration (7 days)

# Solana Blockchain
SOLANA_NETWORK=devnet                                    # devnet | mainnet-beta
SOLANA_RPC_URL=https://api.devnet.solana.com           # Solana RPC endpoint
TREASURY_WALLET_ADDRESS=FEcLmvr7CSNjA3yUvELkF41cMWaDiYBwfeCgkSWvxLzg
TREASURY_WALLET_PRIVATE_KEY=                            # Leave empty for now

# Pyth Price Oracle (SOL/USD)
PYTH_PRICE_FEED_SOL_USD=J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix

# CORS (Frontend URLs)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100      # Max requests per window

# Logging
LOG_LEVEL=debug                  # debug | info | warn | error
```

---

## Testing the Setup

### 1. Health Check

```bash
curl http://localhost:3001/health
```

### 2. View Database

```bash
npm run prisma:studio
```

Navigate to:
- **categories** - Should see NFL, NBA, World Events, Culture
- **admin_users** - Should see superadmin and moderator
- **users** - Should see testuser and creator1

### 3. Check Logs

Logs are stored in `backend/logs/`:
- `combined.log` - All logs
- `error.log` - Errors only
- `exceptions.log` - Unhandled exceptions

```bash
tail -f backend/logs/combined.log
```

---

## Troubleshooting

### "Cannot connect to MySQL"

**Problem:** Database connection fails

**Solutions:**
1. Check if MySQL is running:
   ```bash
   # macOS
   brew services list
   
   # Ubuntu
   sudo systemctl status mysql
   ```

2. Verify credentials:
   ```bash
   mysql -u preduser -pH2lloW0rld predictionsdb
   ```

3. Check DATABASE_URL in `.env` matches your MySQL setup

### "Table doesn't exist"

**Problem:** Tables not created

**Solutions:**
1. Run the schema script:
   ```bash
   mysql -u root -p < backend/database/schema.sql
   ```

2. Check if database exists:
   ```bash
   mysql -u root -p -e "SHOW DATABASES;"
   ```

### "Prisma client not generated"

**Problem:** TypeScript errors about @prisma/client

**Solutions:**
```bash
cd backend
rm -rf node_modules/.prisma
npm run prisma:generate
```

### "Port 3001 already in use"

**Problem:** Another process is using port 3001

**Solutions:**
1. Find and kill the process:
   ```bash
   lsof -i :3001
   kill -9 <PID>
   ```

2. Or change the port in `.env`:
   ```env
   PORT=3002
   ```

### "Module not found"

**Problem:** Missing dependencies

**Solutions:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## Development Workflow

### Starting the Server

```bash
cd backend
npm run dev
```

The server auto-reloads when you change files.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Linting Code

```bash
npm run lint
```

### Building for Production

```bash
npm run build
npm start
```

---

## Next Steps

Now that Phase 1 is complete, you're ready to move to **Phase 2: Authentication & User Management**.

This will include:
- User registration endpoints
- Login with username/password
- Solana wallet authentication
- JWT middleware
- User profile management

---

## Useful Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [MySQL 8.0 Reference](https://dev.mysql.com/doc/refman/8.0/en/)

---

## Support

If you encounter issues not covered here, check:
1. `backend/logs/error.log` for error details
2. `backend/README.md` for additional commands
3. Contact the development team

---

**Phase 1 Complete! ✅**

Your backend foundation is ready for authentication and feature development.

