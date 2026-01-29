/**
 * Network Configuration
 * Multi-network support for SBT deployment
 */

export const networks = {
    'base-mainnet': {
        chainId: 8453,
        name: 'Base Mainnet',
        rpcUrl: 'https://mainnet.base.org',
        explorer: 'https://basescan.org',
        confirmations: 1,
        description: 'Production network'
    },
    'base-sepolia': {
        chainId: 84532,
        name: 'Base Sepolia',
        rpcUrl: 'https://sepolia.base.org',
        explorer: 'https://sepolia.basescan.org',
        confirmations: 1,
        description: 'Testnet for staging'
    },
    'ethereum-mainnet': {
        chainId: 1,
        name: 'Ethereum Mainnet',
        rpcUrl: 'https://eth.rpc.bloxroute.com/public',
        explorer: 'https://etherscan.io',
        confirmations: 12,
        description: 'Production network'
    },
    'ethereum-sepolia': {
        chainId: 11155111,
        name: 'Ethereum Sepolia',
        rpcUrl: 'https://sepolia.infura.io/v3/',
        explorer: 'https://sepolia.etherscan.io',
        confirmations: 1,
        description: 'Testnet for staging'
    },
    'localhost': {
        chainId: 31337,
        name: 'Localhost',
        rpcUrl: 'http://127.0.0.1:8545',
        explorer: null,
        confirmations: 1,
        description: 'Local Hardhat node'
    }
};

/**
 * Get network configuration by name
 */
export function getNetworkConfig(networkName) {
    const network = networks[networkName];
    if (!network) {
        throw new Error(`Unknown network: ${networkName}`);
    }
    return network;
}

/**
 * Get all available networks
 */
export function getAvailableNetworks() {
    return Object.entries(networks).map(([key, config]) => ({
        id: key,
        ...config
    }));
}

/**
 * Validate network configuration
 */
export async function validateNetwork(networkName, rpcUrl) {
    const { ethers } = await import('ethers');
    
    try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const network = await provider.getNetwork();
        
        const config = networks[networkName];
        if (network.chainId !== config.chainId) {
            throw new Error(
                `Chain ID mismatch: expected ${config.chainId}, got ${network.chainId}`
            );
        }
        
        return { valid: true, network };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

export default networks;
