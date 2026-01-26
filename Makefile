# SBT Minting Platform - Development Makefile

.PHONY: help compile deploy test clean install setup dev frontend serve-contracts generate-wallets fund-wallets mint docker-build docker-run

# Default target
help: ## Show this help message
	@echo "SBT Minting Platform - Development Commands"
	@echo ""
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

# Smart Contract Commands
compile: ## Compile smart contracts
	@echo "⚡ Compiling smart contracts..."
	npm run compile

deploy: ## Deploy smart contracts
	@echo "🚀 Deploying smart contracts..."
	npm run deploy

generate-wallets: ## Generate test wallets
	@echo "🔑 Generating test wallets..."
	npm run generate-wallets

fund-wallets: ## Fund generated wallets
	@echo "💰 Funding test wallets..."
	npm run fund-wallets

mint: ## Mint SBT tokens
	@echo "🪙 Minting SBT tokens..."
	npm run mint

# Testing
test: ## Run tests
	@echo "🧪 Running tests..."
	npm run test

test-coverage: ## Run tests with coverage
	@echo "📊 Running tests with coverage..."
	npx hardhat coverage

# Development
install: ## Install dependencies
	@echo "📦 Installing dependencies..."
	npm install

setup: ## Setup development environment
	@echo "🚀 Setting up development environment..."
	./setup.sh

dev: ## Start development mode (compile and watch)
	@echo "👀 Starting development mode..."
	npx hardhat compile --watch

# Frontend
frontend: ## Start frontend development server
	@echo "🌐 Starting frontend server..."
	cd frontend && python3 -m http.server 8000

serve-frontend: ## Serve frontend on port 8000
	@echo "🌐 Serving frontend on http://localhost:8000..."
	cd frontend && python3 -m http.server 8000

# Docker
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	docker build -t sbt-platform .

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	docker run -p 8000:8000 sbt-platform

docker-compose-up: ## Start services with docker-compose
	@echo "🐳 Starting services with docker-compose..."
	docker-compose up -d

docker-compose-down: ## Stop services with docker-compose
	@echo "🛑 Stopping services with docker-compose..."
	docker-compose down

# Hardhat Network
local-node: ## Start local Hardhat network
	@echo "🏃 Starting local Hardhat network..."
	npx hardhat node

# Verification
verify-contract: ## Verify contract on Etherscan
	@echo "🔍 Verifying contract on Etherscan..."
	npx hardhat verify --network base $(shell cat .env | grep CONTRACT_ADDRESS | cut -d '=' -f2)

# Environment
env-check: ## Check environment setup
	@echo "🔍 Checking environment..."
	@node --version
	@npm --version
	@npx hardhat --version
	@echo "✅ Environment check complete"

# Cleanup
clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	rm -rf artifacts
	rm -rf cache
	rm -rf typechain-types
	rm -rf coverage

clean-all: ## Clean everything including node_modules
	@echo "🧹 Cleaning everything..."
	rm -rf artifacts
	rm -rf cache
	rm -rf typechain-types
	rm -rf coverage
	rm -rf node_modules

# Deployment helpers
deploy-local: ## Deploy to local network
	@echo "🏠 Deploying to local network..."
	npx hardhat run scripts/deploy.js --network localhost

deploy-testnet: ## Deploy to Base testnet
	@echo "🧪 Deploying to Base testnet..."
	npx hardhat run scripts/deploy.js --network baseGoerli

deploy-mainnet: ## Deploy to Base mainnet
	@echo "🌐 Deploying to Base mainnet..."
	npx hardhat run scripts/deploy.js --network base

# Utility
flatten-contract: ## Flatten contract for verification
	@echo "📄 Flattening contract..."
	npx hardhat flatten contracts/SoulBoundToken.sol > contracts/SoulBoundToken_Flattened.sol

gas-report: ## Generate gas usage report
	@echo "⛽ Generating gas usage report..."
	npx hardhat test --gas