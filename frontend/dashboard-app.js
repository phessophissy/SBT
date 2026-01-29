// ============================================
// Enhanced Dashboard Application
// Soul Bound Token Minting Platform
// ============================================

// Configuration
const CONFIG = {
    CONTRACT_ADDRESS: "0xB8EeEd4EC90D0C9B2e35345b0f938F1168065329",
    CHAIN_ID: "0x2105", // Base Chain
    CHAIN_ID_NUM: 8453,
    RPC_URL: "https://mainnet.base.org",
    EXPLORER_URL: "https://basescan.org",
    MINT_FEE: "0.000001"
};

const CONTRACT_ABI = [
    "function mint() external payable",
    "function hasMinted(address) external view returns (bool)",
    "function totalSupply() external view returns (uint256)",
    "function MINT_FEE() external view returns (uint256)"
];

// State Management
const state = {
    provider: null,
    signer: null,
    contract: null,
    userAddress: null,
    chainId: null,
    transactionHistory: [],
    isConnected: false
};

// ============================================
// Initialization
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    initializeEventListeners();
    updateAllStats();
    loadTransactionHistory();
    
    if (window.ethereum && window.ethereum.selectedAddress) {
        connectWallet();
    }
});

// ============================================
// Event Listeners
// ============================================

function initializeEventListeners() {
    // Tab Navigation
    document.querySelectorAll(".nav-tab").forEach(tab => {
        tab.addEventListener("click", switchTab);
    });

    // Wallet Connection
    document.getElementById("connectBtn").addEventListener("click", handleWalletConnection);

    // Copy Address
    const copyBtn = document.getElementById("copyAddr");
    if (copyBtn) copyBtn.addEventListener("click", copyAddressToClipboard);

    // Filter Buttons
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", filterHistory);
    });

    // Wallet Events
    if (window.ethereum) {
        window.ethereum.on("accountsChanged", onAccountsChanged);
        window.ethereum.on("chainChanged", onChainChanged);
    }
}

// ============================================
// Tab Switching
// ============================================

function switchTab(event) {
    const tabName = event.target.dataset.tab;
    
    // Update nav tabs
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    event.target.classList.add("active");

    // Update content
    document.querySelectorAll(".tab-section").forEach(section => {
        section.classList.remove("active");
    });
    
    document.getElementById(`${tabName}-tab`).classList.add("active");

    // Refresh stats if viewing stats/history
    if (tabName === "stats") {
        updateAllStats();
    } else if (tabName === "history") {
        loadTransactionHistory();
    }
}

// ============================================
// Wallet Connection
// ============================================

async function handleWalletConnection() {
    if (state.isConnected) {
        disconnectWallet();
    } else {
        connectWallet();
    }
}

async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        showAlert("Please install MetaMask!", "error");
        return;
    }

    try {
        // Request accounts
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts"
        });
        
        state.userAddress = accounts[0];

        // Get Chain ID
        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        state.chainId = chainId;

        // Check if on Base Chain, if not switch
        if (chainId !== CONFIG.CHAIN_ID) {
            await switchToBaseChain();
        }

        // Initialize providers and contract
        state.provider = new ethers.BrowserProvider(window.ethereum);
        state.signer = await state.provider.getSigner();
        state.contract = new ethers.Contract(
            CONFIG.CONTRACT_ADDRESS,
            CONTRACT_ABI,
            state.signer
        );

        state.isConnected = true;
        updateUIAfterConnection();
        updateWalletInfo();
        updateMintStatus();
        
    } catch (error) {
        console.error("Connection error:", error);
        showAlert(`Connection failed: ${error.message}`, "error");
    }
}

function disconnectWallet() {
    state.provider = null;
    state.signer = null;
    state.contract = null;
    state.userAddress = null;
    state.isConnected = false;

    updateUIAfterDisconnection();
}

async function switchToBaseChain() {
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: CONFIG.CHAIN_ID }]
        });
    } catch (switchError) {
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: CONFIG.CHAIN_ID,
                        chainName: "Base",
                        nativeCurrency: {
                            name: "ETH",
                            symbol: "ETH",
                            decimals: 18
                        },
                        rpcUrls: [CONFIG.RPC_URL],
                        blockExplorerUrls: [CONFIG.EXPLORER_URL]
                    }]
                });
            } catch (addError) {
                throw new Error("Failed to add Base Chain");
            }
        } else {
            throw switchError;
        }
    }
}

// ============================================
// UI Updates
// ============================================

function updateUIAfterConnection() {
    const connectBtn = document.getElementById("connectBtn");
    connectBtn.textContent = `${state.userAddress.slice(0, 6)}...${state.userAddress.slice(-4)}`;
    connectBtn.classList.add("connected");

    const mintBtn = document.getElementById("mintButtonMain");
    if (mintBtn) {
        mintBtn.textContent = "Mint Your SBT";
        mintBtn.disabled = false;
    }
}

function updateUIAfterDisconnection() {
    const connectBtn = document.getElementById("connectBtn");
    connectBtn.textContent = "Connect Wallet";
    connectBtn.classList.remove("connected");

    document.getElementById("walletAddr").textContent = "Not connected";
    document.getElementById("walletBalance").textContent = "-- ETH";
    document.getElementById("mintStatus").textContent = "Not checked";
    document.getElementById("mintStatus").classList.add("pending");

    const mintBtn = document.getElementById("mintButtonMain");
    if (mintBtn) {
        mintBtn.textContent = "Connect Wallet to Mint";
        mintBtn.disabled = true;
    }
}

async function updateWalletInfo() {
    if (!state.isConnected) return;

    // Update address
    document.getElementById("walletAddr").textContent = state.userAddress;

    // Update balance
    const balance = await state.provider.getBalance(state.userAddress);
    const balanceEth = ethers.formatEther(balance);
    document.getElementById("walletBalance").textContent = parseFloat(balanceEth).toFixed(6) + " ETH";
}

async function updateMintStatus() {
    if (!state.isConnected || !state.contract) return;

    try {
        const hasMinted = await state.contract.hasMinted(state.userAddress);
        const statusEl = document.getElementById("mintStatus");
        
        if (hasMinted) {
            statusEl.textContent = "Already Minted";
            statusEl.classList.remove("pending");
            statusEl.classList.add("success");
            
            const mintBtn = document.getElementById("mintButtonMain");
            if (mintBtn) {
                mintBtn.disabled = true;
                mintBtn.textContent = "Already Minted ✓";
            }
        } else {
            statusEl.textContent = "Ready to Mint";
            statusEl.classList.remove("pending");
            statusEl.classList.add("success");
        }
    } catch (error) {
        console.error("Error checking mint status:", error);
    }
}

// ============================================
// Minting Function
// ============================================

async function handleMint() {
    if (!state.isConnected) {
        connectWallet();
        return;
    }

    if (!state.contract) {
        showAlert("Please connect wallet first", "error");
        return;
    }

    const mintBtn = document.getElementById("mintButtonMain");
    const txMonitor = document.getElementById("txMonitor");

    try {
        mintBtn.disabled = true;
        mintBtn.textContent = "Processing...";
        
        txMonitor.style.display = "block";
        updateTxMonitor("Sending transaction...", null);

        const tx = await state.contract.mint({
            value: ethers.parseEther(CONFIG.MINT_FEE)
        });

        updateTxMonitor("Waiting for confirmation...", tx.hash);

        const receipt = await tx.wait();

        if (receipt.status === 1) {
            showAlert("✓ Successfully minted your SBT!", "success");
            addTransactionToHistory(tx.hash, "mint", "success");
            updateMintStatus();
            updateAllStats();

            mintBtn.textContent = "Minted ✓";
        } else {
            throw new Error("Transaction failed");
        }
    } catch (error) {
        console.error("Mint error:", error);
        showAlert(`Mint failed: ${parseErrorMessage(error.message)}`, "error");
        addTransactionToHistory(null, "mint", "failed");
    } finally {
        setTimeout(() => {
            txMonitor.style.display = "none";
            mintBtn.disabled = false;
            mintBtn.textContent = "Mint Your SBT";
        }, 2000);
    }
}

function updateTxMonitor(status, txHash) {
    document.getElementById("txStatusText").textContent = status;
    
    if (txHash) {
        const explorerLink = `${CONFIG.EXPLORER_URL}/tx/${txHash}`;
        const txLink = document.getElementById("txLink");
        txLink.href = explorerLink;
        txLink.textContent = `View on BaseScan →`;
    }
}

// ============================================
// Statistics & Data
// ============================================

async function updateAllStats() {
    if (!state.provider) {
        state.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    }

    try {
        // Total supply
        const readContract = new ethers.Contract(
            CONFIG.CONTRACT_ADDRESS,
            CONTRACT_ABI,
            state.provider
        );
        
        const totalSupply = await readContract.totalSupply();
        document.getElementById("totalMints").textContent = totalSupply.toString();
        document.getElementById("stat-totalMints").textContent = totalSupply.toString();

        // Gas price
        const gasPrice = await state.provider.getGasPrice();
        const gasPriceGwei = ethers.formatUnits(gasPrice, "gwei");
        document.getElementById("gasGwei").textContent = parseFloat(gasPriceGwei).toFixed(2) + " Gwei";
        document.getElementById("stat-gas").textContent = parseFloat(gasPriceGwei).toFixed(2) + " Gwei";

        // Revenue
        const revenue = ethers.formatEther(totalSupply * ethers.parseEther(CONFIG.MINT_FEE));
        document.getElementById("stat-revenue").textContent = parseFloat(revenue).toFixed(6) + " ETH";

    } catch (error) {
        console.error("Error updating stats:", error);
    }
}

function loadTransactionHistory() {
    const stored = localStorage.getItem("sbt_tx_history");
    state.transactionHistory = stored ? JSON.parse(stored) : [];
    renderTransactionHistory();
}

function addTransactionToHistory(txHash, type, status) {
    const txItem = {
        hash: txHash,
        type,
        status,
        timestamp: new Date().toISOString()
    };

    state.transactionHistory.unshift(txItem);
    localStorage.setItem("sbt_tx_history", JSON.stringify(state.transactionHistory.slice(0, 50)));
    renderTransactionHistory();
}

function renderTransactionHistory(filter = "all") {
    const container = document.getElementById("historyContent");
    
    if (state.transactionHistory.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>📋 No transactions yet</p>
                <small>Start by minting your SBT</small>
            </div>
        `;
        return;
    }

    const filtered = state.transactionHistory.filter(tx => {
        if (filter === "all") return true;
        return tx.status === filter;
    });

    container.innerHTML = filtered.map(tx => {
        const date = new Date(tx.timestamp);
        const timeStr = date.toLocaleString();
        const icon = tx.status === "success" ? "✓" : "✗";

        return `
            <div class="history-item ${tx.status}">
                <span class="icon">${icon}</span>
                <div class="details">
                    <div>${tx.type === "mint" ? "Token Mint" : tx.type}</div>
                    ${tx.hash ? `<div class="hash">${tx.hash.slice(0, 10)}...${tx.hash.slice(-8)}</div>` : ""}
                    <div>${timeStr}</div>
                </div>
                <span class="badge ${tx.status}">${tx.status}</span>
                ${tx.hash ? `<a href="${CONFIG.EXPLORER_URL}/tx/${tx.hash}" target="_blank" class="link">View</a>` : ""}
            </div>
        `;
    }).join("");
}

function filterHistory(event) {
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");
    
    const filter = event.target.dataset.filter;
    renderTransactionHistory(filter);
}

// ============================================
// Utility Functions
// ============================================

function showAlert(message, type) {
    const alertEl = document.getElementById("mintAlert");
    if (alertEl) {
        alertEl.textContent = message;
        alertEl.className = `alert ${type}`;
        alertEl.style.display = "block";
        
        setTimeout(() => {
            alertEl.style.display = "none";
        }, 3000);
    }
}

function copyAddressToClipboard() {
    if (!state.userAddress) return;
    
    navigator.clipboard.writeText(state.userAddress).then(() => {
        showAlert("Address copied!", "success");
    });
}

function parseErrorMessage(error) {
    if (error.includes("user rejected")) return "Transaction cancelled";
    if (error.includes("insufficient")) return "Insufficient ETH balance";
    if (error.includes("already")) return "Already minted";
    return error.substring(0, 50);
}

// ============================================
// Wallet Event Handlers
// ============================================

function onAccountsChanged(accounts) {
    if (accounts.length === 0) {
        disconnectWallet();
    } else {
        state.userAddress = accounts[0];
        updateWalletInfo();
        updateMintStatus();
    }
}

function onChainChanged(chainId) {
    state.chainId = chainId;
    
    if (chainId !== CONFIG.CHAIN_ID) {
        showAlert("Please switch to Base Chain", "error");
    } else {
        showAlert("Switched to Base Chain", "success");
    }
}
