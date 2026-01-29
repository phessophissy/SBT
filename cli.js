#!/usr/bin/env node

/**
 * SBT CLI - Command Line Interface
 * Manage SBT minting platform operations
 * 
 * Usage:
 *   node cli.js deploy
 *   node cli.js generate-wallets [count]
 *   node cli.js fund-wallets [amount]
 *   node cli.js mint
 *   node cli.js status
 *   node cli.js config
 */

import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const program = new Command();

// Colors & logging
const log = {
    success: (msg) => console.log(chalk.green(`✓ ${msg}`)),
    error: (msg) => console.error(chalk.red(`✗ ${msg}`)),
    info: (msg) => console.log(chalk.blue(`ℹ ${msg}`)),
    warn: (msg) => console.log(chalk.yellow(`⚠ ${msg}`)),
    table: (data) => console.table(data)
};

// ============================================
// Command: Deploy
// ============================================

program
    .command('deploy')
    .description('Deploy SoulBoundToken contract')
    .action(async () => {
        try {
            log.info('Starting contract deployment...');
            
            const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
            const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
            
            log.info(`Deploying from: ${wallet.address}`);
            
            // Get contract bytecode
            const contractPath = path.join('.', 'contracts', 'SoulBoundToken.sol');
            log.warn('Note: Manual compilation required. Run: npm run compile');
            log.info('Check artifacts/contracts/SoulBoundToken.sol/SoulBoundToken.json');
            
        } catch (error) {
            log.error(`Deployment failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================
// Command: Generate Wallets
// ============================================

program
    .command('generate-wallets')
    .description('Generate wallets for batch minting')
    .option('-c, --count <number>', 'Number of wallets', '500')
    .action(async (options) => {
        try {
            const count = parseInt(options.count);
            log.info(`Generating ${count} wallets...`);
            
            const wallets = [];
            for (let i = 0; i < count; i++) {
                const wallet = ethers.Wallet.createRandom();
                wallets.push({
                    index: i,
                    address: wallet.address,
                    privateKey: wallet.privateKey
                });
                
                if ((i + 1) % 100 === 0) {
                    log.info(`Generated ${i + 1}/${count}`);
                }
            }
            
            // Save with private keys (KEEP SECURE!)
            await fs.writeFile(
                'wallets.json',
                JSON.stringify(wallets, null, 2)
            );
            
            // Save only addresses
            const addresses = wallets.map(w => ({ index: w.index, address: w.address }));
            await fs.writeFile(
                'wallet_addresses.json',
                JSON.stringify(addresses, null, 2)
            );
            
            // Save as simple list
            const addressList = wallets.map(w => w.address).join('\n');
            await fs.writeFile('address_list.txt', addressList);
            
            log.success(`Generated ${count} wallets`);
            log.warn('wallets.json contains private keys - KEEP SECURE!');
            log.info(`Created: wallets.json, wallet_addresses.json, address_list.txt`);
            
        } catch (error) {
            log.error(`Generation failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================
// Command: Fund Wallets
// ============================================

program
    .command('fund-wallets')
    .description('Fund wallets for minting')
    .option('-a, --amount <ether>', 'Amount per wallet in ETH', '0.000051')
    .option('-b, --batch-size <number>', 'Batch size for transactions', '10')
    .option('-d, --delay <ms>', 'Delay between batches', '2000')
    .action(async (options) => {
        try {
            const { amount, batchSize, delay } = options;
            
            // Load wallets
            const walletsJson = await fs.readFile('wallets.json', 'utf-8');
            const wallets = JSON.parse(walletsJson);
            
            const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
            const fundingWallet = new ethers.Wallet(
                process.env.FUNDING_WALLET_PRIVATE_KEY,
                provider
            );
            
            log.info(`Funding wallet: ${fundingWallet.address}`);
            log.info(`Amount per wallet: ${amount} ETH`);
            log.info(`Total wallets: ${wallets.length}`);
            
            const results = [];
            const batchSizeNum = parseInt(batchSize);
            
            for (let i = 0; i < wallets.length; i += batchSizeNum) {
                const batch = wallets.slice(i, i + batchSizeNum);
                
                for (const wallet of batch) {
                    try {
                        const tx = await fundingWallet.sendTransaction({
                            to: wallet.address,
                            value: ethers.parseEther(amount)
                        });
                        
                        results.push({
                            index: wallet.index,
                            address: wallet.address,
                            status: 'sent',
                            txHash: tx.hash
                        });
                        
                        log.info(`Sent to ${wallet.address.slice(0, 6)}...`);
                    } catch (error) {
                        results.push({
                            index: wallet.index,
                            address: wallet.address,
                            status: 'failed',
                            error: error.message
                        });
                        log.warn(`Failed: ${error.message}`);
                    }
                }
                
                if (i + batchSizeNum < wallets.length) {
                    log.info(`Waiting ${delay}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, parseInt(delay)));
                }
            }
            
            await fs.writeFile(
                'funding_results.json',
                JSON.stringify(results, null, 2)
            );
            
            log.success('Funding complete!');
            log.info(`Results saved to funding_results.json`);
            
        } catch (error) {
            log.error(`Funding failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================
// Command: Mint
// ============================================

program
    .command('mint')
    .description('Mint SBTs from wallets')
    .option('-b, --batch-size <number>', 'Batch size for mints', '10')
    .option('-d, --delay <ms>', 'Delay between batches', '3000')
    .option('-r, --retries <number>', 'Max retries per wallet', '3')
    .action(async (options) => {
        try {
            const { batchSize, delay, retries } = options;
            
            // Load wallets
            const walletsJson = await fs.readFile('wallets.json', 'utf-8');
            const wallets = JSON.parse(walletsJson);
            
            const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
            const contractAddress = process.env.SBT_CONTRACT_ADDRESS;
            
            if (!contractAddress) {
                log.error('SBT_CONTRACT_ADDRESS not set in .env');
                process.exit(1);
            }
            
            const CONTRACT_ABI = [
                'function mint() external payable',
                'function hasMinted(address) external view returns (bool)'
            ];
            
            log.info(`Minting from ${wallets.length} wallets`);
            log.info(`Batch size: ${batchSize}`);
            
            const results = [];
            const batchSizeNum = parseInt(batchSize);
            const maxRetries = parseInt(retries);
            
            for (let i = 0; i < wallets.length; i += batchSizeNum) {
                const batch = wallets.slice(i, i + batchSizeNum);
                
                for (const wallet of batch) {
                    let success = false;
                    
                    for (let attempt = 1; attempt <= maxRetries; attempt++) {
                        try {
                            const signerWallet = new ethers.Wallet(
                                wallet.privateKey,
                                provider
                            );
                            
                            const contract = new ethers.Contract(
                                contractAddress,
                                CONTRACT_ABI,
                                signerWallet
                            );
                            
                            // Check if already minted
                            const hasMinted = await contract.hasMinted(wallet.address);
                            if (hasMinted) {
                                results.push({
                                    index: wallet.index,
                                    address: wallet.address,
                                    status: 'skipped',
                                    reason: 'already_minted'
                                });
                                success = true;
                                break;
                            }
                            
                            const tx = await contract.mint({
                                value: ethers.parseEther('0.000001')
                            });
                            
                            const receipt = await tx.wait();
                            
                            if (receipt.status === 1) {
                                results.push({
                                    index: wallet.index,
                                    address: wallet.address,
                                    status: 'success',
                                    txHash: tx.hash
                                });
                                success = true;
                                log.info(`✓ Minted for ${wallet.address.slice(0, 6)}...`);
                                break;
                            }
                            
                        } catch (error) {
                            if (attempt === maxRetries) {
                                results.push({
                                    index: wallet.index,
                                    address: wallet.address,
                                    status: 'failed',
                                    error: error.message
                                });
                                log.warn(`Failed after ${maxRetries} retries: ${error.message}`);
                            } else {
                                log.warn(`Attempt ${attempt}/${maxRetries} failed, retrying...`);
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        }
                    }
                }
                
                if (i + batchSizeNum < wallets.length) {
                    log.info(`Waiting ${delay}ms before next batch...`);
                    await new Promise(resolve => setTimeout(resolve, parseInt(delay)));
                }
            }
            
            await fs.writeFile(
                'minting_results.json',
                JSON.stringify(results, null, 2)
            );
            
            const successful = results.filter(r => r.status === 'success').length;
            const skipped = results.filter(r => r.status === 'skipped').length;
            const failed = results.filter(r => r.status === 'failed').length;
            
            log.success(`Minting complete!`);
            log.table({ Successful: successful, Skipped: skipped, Failed: failed });
            log.info(`Results saved to minting_results.json`);
            
        } catch (error) {
            log.error(`Minting failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================
// Command: Status
// ============================================

program
    .command('status')
    .description('Show platform status')
    .action(async () => {
        try {
            const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
            
            // Get network
            const network = await provider.getNetwork();
            
            // Get gas price
            const gasPrice = await provider.getGasPrice();
            
            // Check contract
            const code = await provider.getCode(process.env.SBT_CONTRACT_ADDRESS);
            const deployed = code !== '0x';
            
            log.info('Platform Status:');
            console.log({
                'Network': `${network.name} (${network.chainId})`,
                'RPC': process.env.BASE_RPC_URL,
                'Gas Price': `${ethers.formatUnits(gasPrice, 'gwei')} Gwei`,
                'Contract': process.env.SBT_CONTRACT_ADDRESS,
                'Deployed': deployed ? '✓ Yes' : '✗ No'
            });
            
        } catch (error) {
            log.error(`Status check failed: ${error.message}`);
            process.exit(1);
        }
    });

// ============================================
// Command: Config
// ============================================

program
    .command('config')
    .description('Show configuration')
    .action(() => {
        log.info('Configuration:');
        console.log({
            'Network': 'Base Chain',
            'Chain ID': '8453',
            'RPC URL': process.env.BASE_RPC_URL,
            'Contract': process.env.SBT_CONTRACT_ADDRESS || 'Not set',
            'Mint Fee': '0.000001 ETH',
            'Funding Amount': '0.000051 ETH'
        });
    });

// ============================================
// Parse and Execute
// ============================================

program
    .version('2.0.0')
    .description('SBT Minting Platform CLI');

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
