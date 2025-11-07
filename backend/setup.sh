#!/bin/bash

echo "🚀 WagerVS Backend Setup Script"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL CLI not found. Make sure MySQL is installed and running."
else
    echo "✅ MySQL is available"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created. Please update it with your credentials."
else
    echo "⚠️  .env file already exists, skipping..."
fi

echo ""
echo "🗄️  Setting up database..."
echo "Please run the following command to set up your MySQL database:"
echo ""
echo "  mysql -u root -p < database/schema.sql"
echo ""

read -p "Have you already set up the database? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Database assumed to be set up"
    
    echo ""
    echo "🔧 Generating Prisma client..."
    npm run prisma:generate
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to generate Prisma client"
        exit 1
    fi
    
    echo "✅ Prisma client generated"
else
    echo "⚠️  Please set up the database first, then run:"
    echo "  npm run prisma:generate"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your database credentials and Solana wallet"
echo "2. Run the database schema: mysql -u root -p < database/schema.sql"
echo "3. Generate Prisma client: npm run prisma:generate"
echo "4. Start the dev server: npm run dev"
echo ""
echo "The server will run at http://localhost:3001"
echo ""

