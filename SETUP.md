# SBT Minting Platform - Setup Guide

## Quick Start

### Option 1: Docker (Recommended)
```bash
# Install dependencies in container
docker-compose build

# Start all services
docker-compose up

# Access frontend at http://localhost:3000
```

### Option 2: Local Development
```bash
# Install dependencies
npm install

# Start Hardhat node
npx hardhat node

# In another terminal, compile contracts
npm run compile

# Deploy to local network
npm run deploy

# Start frontend
cd frontend && npx http-server
```

## Environment Setup

### 1. Create `.env` file
```bash
cp .env.example .env
```

### 2. Configure Environment Variables
```env
# Deployer wallet
DEPLOYER_PRIVATE_KEY=your_private_key_here

# Funding wallet
FUNDING_WALLET_PRIVATE_KEY=your_funding_private_key

# Base Chain RPC
BASE_RPC_URL=https://mainnet.base.org

# Contract address (after deployment)
SBT_CONTRACT_ADDRESS=0x...
```

### 3. Validate Configuration
```bash
npm run validate-config
```

## Available Scripts

```bash
# Compilation & Deployment
npm run compile          # Compile contracts
npm run deploy          # Deploy to Base Chain

# Wallet Management
npm run generate-wallets # Generate 500 wallets
npm run fund-wallets    # Fund wallets for minting
npm run mint            # Mint SBTs from wallets

# CLI Tool
node cli.js status      # Show platform status
node cli.js config      # Show configuration
node cli.js mint --help # Get mint command options

# Testing & Validation
npm run validate-config # Validate environment
npm run test           # Run tests
npm run lint           # Lint code
```

## Deployment Networks

Supported networks:
- **base-mainnet** - Production (Chain ID: 8453)
- **base-sepolia** - Testnet (Chain ID: 84532)
- **ethereum-mainnet** - Mainnet (Chain ID: 1)
- **ethereum-sepolia** - Testnet (Chain ID: 11155111)

### Deploy to Testnet
```bash
NETWORK=base-sepolia npm run deploy
```

## Monitoring

### Transaction Monitoring
```bash
npm run monitor
```

### View Transaction Logs
```bash
cat transaction_logs.json
```

### Check Minting Status
```bash
node cli.js status
```

## Troubleshooting

### "Insufficient balance" error
```bash
# Check wallet balance
ethers wallet 0x...

# Fund wallet
npm run fund-wallets -- --amount 0.01
```

### "Network error" error
```bash
# Check RPC connection
npm run validate-config

# Switch RPC endpoint in .env
BASE_RPC_URL=https://base-rpc.publicnode.com
```

### Transaction timeout
```bash
# Retry with longer timeout
node cli.js mint --timeout 600000
```

## Security Notes

⚠️ **IMPORTANT**:
- Never commit `.env` to git
- Keep `wallets.json` secure (contains private keys)
- Use testnet for initial testing
- Verify contract address before deployment
- Enable 2FA on wallet provider accounts

## Support

- GitHub Issues: https://github.com/phessophissy/SBT/issues
- Documentation: ./README.md
- Contract: 0xB8EeEd4EC90D0C9B2e35345b0f938F1168065329
