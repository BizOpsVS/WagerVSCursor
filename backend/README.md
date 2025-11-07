# WagerVS Backend API

Prediction and betting platform with Solana blockchain integration.

## 🚀 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MySQL 8.0+ with Prisma ORM
- **Blockchain**: Solana (Devnet for development)
- **Language**: TypeScript
- **Authentication**: JWT + Solana Wallet Connect
- **Validation**: Zod

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── controllers/      # Route controllers
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript types
│   └── server.ts         # Entry point
├── prisma/
│   └── schema.prisma     # Database schema
├── database/
│   └── schema.sql        # Raw SQL schema
├── logs/                 # Application logs
└── tests/                # Test files
```

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- Solana CLI (optional, for wallet generation)

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Database

**Option A: Using MySQL CLI**

```bash
mysql -u root -p < database/schema.sql
```

**Option B: Manual Setup**

```bash
mysql -u root -p
```

Then run the SQL commands from `database/schema.sql`.

### 3. Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cp .env.example .env
```

Update the values:

```env
DATABASE_URL="mysql://preduser:H2lloW0rld@localhost:3306/predictionsdb"
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
TREASURY_WALLET_ADDRESS=FEcLmvr7CSNjA3yUvELkF41cMWaDiYBwfeCgkSWvxLzg
TREASURY_WALLET_PRIVATE_KEY=your-private-key-here
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Test Database Connection

```bash
npm run prisma:studio
```

This opens Prisma Studio at http://localhost:5555 to view your database.

### 6. Start Development Server

```bash
npm run dev
```

Server runs at http://localhost:3001

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm test -- --coverage
```

## 📦 Build & Deploy

### Build for Production

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

### Run Production Server

```bash
npm start
```

### Deploy with PM2 (Ubuntu)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/server.js --name wagervs-backend

# View logs
pm2 logs wagervs-backend

# Restart application
pm2 restart wagervs-backend

# Stop application
pm2 stop wagervs-backend

# Auto-start on system reboot
pm2 startup
pm2 save
```

## 🔒 Security Notes

1. **Never commit `.env` files** - they contain sensitive credentials
2. **Change default JWT secret** in production
3. **Use strong database passwords**
4. **Secure treasury wallet private key** - consider using a hardware wallet or secure key management service
5. **Enable HTTPS** in production with SSL certificates
6. **Set up firewall rules** to restrict database access

## 📚 Key Concepts

### Chip Balance Types

Users have 4 balance types (calculated from ledger):
1. **Purchased Chips**: Bought with crypto, cannot cashout
2. **Won Chips**: From winning events, CAN cashout
3. **Free Chips**: Daily claims, cannot cashout
4. **Locked Chips**: Currently in active bets

### Rake Structure

- **Event Rake**: 1-5% (creator chooses) taken from each bet
  - Admin events: 100% to company
  - User events: 50/50 split between creator and company
- **Prize Pool Rake**: 2.5% from total event pool → global prize pool

### Event Flow

1. **Draft** → Created but not live
2. **Active** → Users can place bets
3. **Locked** → Betting closed (lock_time reached)
4. **Completed** → Winner selected by admin
5. **Paid Out** → Chips distributed to winners

## 🔗 Useful Commands

```bash
# Generate Prisma client after schema changes
npm run prisma:generate

# Create a new migration
npm run prisma:migrate

# Push schema changes without migration
npm run prisma:push

# Open Prisma Studio
npm run prisma:studio

# Lint code
npm run lint

# Run dev server with auto-reload
npm run dev
```

## 📝 API Documentation

API documentation will be available at `/api-docs` once Swagger is configured.

For now, refer to the route files in `src/routes/` for endpoint details.

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test MySQL connection
mysql -u preduser -pH2lloW0rld -h localhost predictionsdb

# Check if MySQL is running
sudo systemctl status mysql
```

### Prisma Generation Errors

```bash
# Clear Prisma cache
rm -rf node_modules/.prisma
npm run prisma:generate
```

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>
```

## 📞 Support

For issues or questions, contact the development team.

## 📄 License

MIT

