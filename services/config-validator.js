/**
 * Configuration Validator
 * Validates environment variables and configuration
 */

import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

class ConfigValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    /**
     * Validate all configurations
     */
    async validate() {
        this.validateRequired();
        this.validatePrivateKeys();
        this.validateAddresses();
        await this.validateRPC();
        this.validateNetworkConfig();

        return {
            valid: this.errors.length === 0,
            errors: this.errors,
            warnings: this.warnings
        };
    }

    /**
     * Validate required environment variables
     */
    validateRequired() {
        const required = [
            'BASE_RPC_URL',
            'DEPLOYER_PRIVATE_KEY',
            'FUNDING_WALLET_PRIVATE_KEY',
            'SBT_CONTRACT_ADDRESS'
        ];

        for (const key of required) {
            if (!process.env[key]) {
                this.errors.push(`Missing required variable: ${key}`);
            }
        }
    }

    /**
     * Validate private keys
     */
    validatePrivateKeys() {
        const keys = [
            { name: 'DEPLOYER_PRIVATE_KEY', value: process.env.DEPLOYER_PRIVATE_KEY },
            { name: 'FUNDING_WALLET_PRIVATE_KEY', value: process.env.FUNDING_WALLET_PRIVATE_KEY }
        ];

        for (const key of keys) {
            if (key.value) {
                try {
                    new ethers.Wallet(key.value);
                } catch (error) {
                    this.errors.push(`Invalid private key format for ${key.name}`);
                }
            }
        }
    }

    /**
     * Validate addresses
     */
    validateAddresses() {
        if (process.env.SBT_CONTRACT_ADDRESS) {
            if (!ethers.isAddress(process.env.SBT_CONTRACT_ADDRESS)) {
                this.errors.push('Invalid SBT_CONTRACT_ADDRESS format');
            }
        }
    }

    /**
     * Validate RPC endpoint
     */
    async validateRPC() {
        try {
            const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
            const network = await provider.getNetwork();
            
            if (network.chainId !== 8453) {
                this.warnings.push(`Expected Chain ID 8453 (Base), got ${network.chainId}`);
            }
        } catch (error) {
            this.errors.push(`Cannot connect to RPC URL: ${error.message}`);
        }
    }

    /**
     * Validate network configuration
     */
    validateNetworkConfig() {
        if (!process.env.BASE_RPC_URL.includes('http')) {
            this.errors.push('BASE_RPC_URL must be a valid HTTP(S) URL');
        }
    }

    /**
     * Print validation report
     */
    printReport() {
        console.log('\n📋 Configuration Validation Report\n');

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('✓ All configurations valid!\n');
            return true;
        }

        if (this.errors.length > 0) {
            console.log('❌ Errors:');
            this.errors.forEach(err => console.log(`  - ${err}`));
            console.log();
        }

        if (this.warnings.length > 0) {
            console.log('⚠️  Warnings:');
            this.warnings.forEach(warn => console.log(`  - ${warn}`));
            console.log();
        }

        return this.errors.length === 0;
    }
}

export default ConfigValidator;
