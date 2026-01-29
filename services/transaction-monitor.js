/**
 * Transaction Monitoring Service
 * Real-time monitoring of minting transactions with retry logic
 */

import { ethers } from 'ethers';
import fs from 'fs/promises';

const RETRY_CONFIG = {
    maxRetries: 3,
    initialDelay: 1000, // ms
    maxDelay: 10000, // ms
    backoffMultiplier: 2
};

class TransactionMonitor {
    constructor(rpcUrl, contractAddress, contractAbi) {
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.contractAddress = contractAddress;
        this.contractAbi = contractAbi;
        this.pendingTxs = new Map();
        this.completedTxs = [];
        this.failedTxs = [];
    }

    /**
     * Execute transaction with retry logic
     */
    async executeWithRetry(txFn, context = {}) {
        let lastError;
        let delay = RETRY_CONFIG.initialDelay;

        for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
            try {
                console.log(`[Attempt ${attempt}/${RETRY_CONFIG.maxRetries}] Executing transaction...`);
                const result = await txFn();
                return result;
            } catch (error) {
                lastError = error;
                console.error(`Attempt ${attempt} failed:`, error.message);

                if (attempt < RETRY_CONFIG.maxRetries) {
                    console.log(`Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay = Math.min(
                        delay * RETRY_CONFIG.backoffMultiplier,
                        RETRY_CONFIG.maxDelay
                    );
                }
            }
        }

        throw new Error(`Transaction failed after ${RETRY_CONFIG.maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Monitor transaction status
     */
    async monitorTransaction(txHash, timeout = 5 * 60 * 1000) {
        const startTime = Date.now();

        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    const receipt = await this.provider.getTransactionReceipt(txHash);

                    if (receipt) {
                        if (receipt.status === 1) {
                            this.completedTxs.push({
                                hash: txHash,
                                status: 'success',
                                blockNumber: receipt.blockNumber,
                                gasUsed: receipt.gasUsed.toString()
                            });
                            resolve({ status: 'success', receipt });
                        } else {
                            this.failedTxs.push({
                                hash: txHash,
                                status: 'failed',
                                blockNumber: receipt.blockNumber
                            });
                            reject(new Error('Transaction failed: reverted'));
                        }
                    } else if (Date.now() - startTime > timeout) {
                        this.failedTxs.push({
                            hash: txHash,
                            status: 'timeout'
                        });
                        reject(new Error('Transaction timeout'));
                    } else {
                        // Check again in 5 seconds
                        setTimeout(checkStatus, 5000);
                    }
                } catch (error) {
                    reject(error);
                }
            };

            checkStatus();
        });
    }

    /**
     * Handle network errors gracefully
     */
    async handleNetworkError(error) {
        if (error.code === 'NETWORK_ERROR') {
            console.error('Network error detected, retrying with fallback RPC...');
            return true;
        }
        if (error.code === 'TIMEOUT') {
            console.error('Request timeout, retrying...');
            return true;
        }
        if (error.code === 'SERVER_ERROR') {
            console.error('RPC server error, retrying...');
            return true;
        }
        return false;
    }

    /**
     * Get transaction history
     */
    async getTransactionHistory() {
        return {
            completed: this.completedTxs,
            failed: this.failedTxs,
            total: this.completedTxs.length + this.failedTxs.length,
            successRate: this.completedTxs.length / (this.completedTxs.length + this.failedTxs.length || 1)
        };
    }

    /**
     * Save transaction logs
     */
    async saveLogs(filename = 'transaction_logs.json') {
        const logs = {
            timestamp: new Date().toISOString(),
            completed: this.completedTxs,
            failed: this.failedTxs,
            stats: await this.getTransactionHistory()
        };

        await fs.writeFile(filename, JSON.stringify(logs, null, 2));
        console.log(`Logs saved to ${filename}`);
    }
}

export default TransactionMonitor;
