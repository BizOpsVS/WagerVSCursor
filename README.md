# WagerVS - Prediction & Betting Platform

A web-based prediction and betting platform with integrated Solana blockchain for deposits/withdrawals and AI-powered insights.

## 🎯 Project Overview

**WagerVS** allows users to participate in prediction events by placing bets using "Chips" (1 Chip = $1 USD). Users can create their own events, earn rewards, and compete on a global leaderboard for prize pool distributions.

### Key Features

- **Multi-Option Events**: Events with up to 8 possible outcomes
- **Chip-Based Betting**: Internal currency with multiple balance types
- **Solana Integration**: Deposit USDC/SOL, cashout winnings
- **User-Generated Events**: Create events and earn 50% of rake revenue
- **Prize Pool System**: Global leaderboard with tiered payouts
- **Points & Gamification**: Earn XP, level up, compete for prizes
- **Admin Portal**: Comprehensive management interface

## 🏗️ Architecture

### Tech Stack

**Backend:**
- Node.js + Express
- MySQL 8.0 + Prisma ORM
- Solana Web3.js + Pyth Oracle
- JWT Authentication

**Frontend:**
- Next.js 14 (App Router)
- TailwindCSS + Design Tokens
- React Query + Context
- Framer Motion
- Solana Wallet Adapter

## 📂 Project Structure

```
WagerVSCursor/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── controllers/  # Business logic
│   │   ├── services/     # Core services
│   │   ├── middleware/   # Auth, validation, errors
│   │   ├── utils/        # Helpers & utilities
│   │   └── server.ts     # Entry point
│   ├── prisma/           # Database schema
│   └── database/         # SQL scripts
│
└── frontend/             # Next.js app (coming soon)
    ├── app/              # App router pages
    ├── components/       # React components
    ├── lib/              # Client utilities
    └── styles/           # Design tokens & CSS
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8.0+
- npm or yarn

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd WagerVSCursor
```

2. **Set up the backend**

```bash
cd backend
npm install
```

3. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Set up database**

```bash
mysql -u root -p < database/schema.sql
```

5. **Generate Prisma client**

```bash
npm run prisma:generate
```

6. **Start development server**

```bash
npm run dev
```

Backend runs at http://localhost:3001

### Testing the API

```bash
# Health check
curl http://localhost:3001/health
```

## 💰 Business Model

### Chip Economics

- **1 Chip = $1 USD** (fixed rate)
- Users have 4 balance types:
  - **Purchased**: From deposits (cannot cashout)
  - **Won**: From event winnings (CAN cashout)
  - **Free**: Daily $1 claim (cannot cashout)
  - **Locked**: Active bets

### Rake Structure

**Per Event:**
1. **Event Rake** (1-5%, creator chooses):
   - Admin events: 100% to company
   - User events: 50% creator / 50% company

2. **Prize Pool Rake**: 2.5% → global prize pool

**Example:**
- User bets 100 chips on an event with 3% event rake
- Event rake: 3 chips (1.5 to company, 1.5 to creator if user-created)
- Remaining 97 chips go to event pool
- When settled: 2.5% of pool → global prize pool
- Rest → distributed to winners proportionally

### Prize Pool Distribution

Top 100 users compete for prize pool each cycle:

| Rank | Share | Example ($10k) |
|------|-------|----------------|
| 1st | 35% | $3,500 |
| 2nd | 15% | $1,500 |
| 3rd | 10% | $1,000 |
| 4th | 5% | $500 |
| 5th | 4% | $400 |
| 6-10 (Platinum) | 12% split | $240 each |
| 11-25 (Gold) | 10% split | $66.67 each |
| 26-50 (Silver) | 7% split | $28 each |
| 51-100 (Bronze) | 2% split | $4 each |

## 🎮 How It Works

### For Users

1. **Sign Up**: Username/password or Solana wallet
2. **Get Chips**: Deposit USDC/SOL or claim $1 free daily
3. **Browse Events**: NFL, NBA, World Events, Culture
4. **Place Bets**: Min 1 chip, Max 2000 chips per bet
5. **Earn Points**: Betting, early bets, event creation
6. **Win & Cashout**: Winners split losing pool, cashout won chips

### For Event Creators

1. **Pay $20 Fee**: Create event submission
2. **Set Details**: Title, description, up to 8 options, lock time, rake (1-5%)
3. **Wait for Approval**: Admin reviews in portal
4. **Earn Revenue**: Get 50% of event rake from all bets

### For Admins

1. **Review Submissions**: Approve/reject user events
2. **Create Events**: Admin events with full control
3. **Manage Events**: Lock, resolve, distribute payouts
4. **Distribute Prizes**: Manually run prize pool payouts
5. **Analytics**: Revenue, user activity, event performance

## 🔐 Security & Compliance

- JWT authentication for all protected endpoints
- Wallet signature verification for Solana auth
- Input validation with Zod
- SQL injection prevention via Prisma
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers

## 📊 Development Roadmap

### Phase 1: Foundation ✅ (Current)
- Backend infrastructure
- Database setup
- Prisma ORM
- Express server

### Phase 2: Authentication 🔄
- User registration/login
- Solana wallet auth
- JWT middleware

### Phase 3: Solana Integration
- Deposit USDC/SOL
- Pyth price oracle
- Withdrawal system

### Phase 4: Events & Betting
- Admin event creation
- Public event browsing
- Betting system

### Phase 5: Payouts & Resolution
- Admin resolution
- Payout calculation
- Distribution

### Phase 6: User Events
- Event submissions
- Admin approval workflow

### Phase 7: Points & Leaderboard
- Points tracking
- Leaderboard API

### Phase 8: Prize Pool
- Prize cycles
- Distribution logic

### Phase 9: Admin Portal
- Admin dashboard
- Event management
- User management
- Analytics

### Phase 10: Public Frontend
- Homepage & event feed
- User dashboard
- Event details & betting
- Wallet integration

### Phase 11: Testing & Launch
- Comprehensive testing
- Security audit
- Ubuntu deployment
- Production launch

## 🤝 Contributing

This is a private project. For questions or contributions, contact the team.

## 📝 License

MIT License - see LICENSE file for details

## 📞 Support

For technical support or questions, contact the development team.

---

**Built with ❤️ for the WagerVS community**

