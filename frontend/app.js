// Contract configuration
const CONTRACT_ADDRESS = "0xB8EeEd4EC90D0C9B2e35345b0f938F1168065329";
const MINT_FEE = "0.000001";
const BASE_CHAIN_ID = "0x2105";

const CONTRACT_ABI = [
    "function mint() external payable",
    "function MINT_FEE() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)"
];

// State
let provider = null;
let signer = null;
let contract = null;
let userAddress = null;

// DOM Elements
const mintBtn = document.getElementById("mintBtn");
const statusDiv = document.getElementById("status");
const totalSupplyEl = document.getElementById("totalSupply");

// Error messages
const ERROR_MESSAGES = {
    "user rejected": "Transaction cancelled by user",
    "insufficient funds": "Insufficient ETH balance",
    "already minted": "You have already minted",
    "network": "Network error - please try again"
};

// Parse error message
function parseError(error) {
    const msg = (error.reason || error.message || "").toLowerCase();
    for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
        if (msg.includes(key)) return value;
    }
    return error.reason || error.message || "Unknown error";
}

// Fetch total supply on load
async function fetchTotalSupply() {
    try {
        const rpcProvider = new ethers.JsonRpcProvider("https://mainnet.base.org");
        const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
        const supply = await readContract.totalSupply();
        if (totalSupplyEl) totalSupplyEl.textContent = supply.toString();
    } catch (e) {
        console.log("Could not fetch supply:", e);
    }
}

// Helper: Show status message
function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? "#ff6b6b" : "#51cf66";
}

// Connect wallet function
async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        showStatus("Please install MetaMask!", true);
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAddress = accounts[0];
        
        try {
            await window.ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: BASE_CHAIN_ID }]
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: BASE_CHAIN_ID,
                        chainName: "Base",
                        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                        rpcUrls: ["https://mainnet.base.org"],
                        blockExplorerUrls: ["https://basescan.org"]
                    }]
                });
            }
        }
        
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        mintBtn.textContent = "Mint SBT";
        showStatus("Connected: " + userAddress.slice(0,6) + "..." + userAddress.slice(-4));
    } catch (error) {
        showStatus("Connection failed: " + parseError(error), true);
    }
}

// Mint function
async function mintSBT() {
    if (!contract) {
        await connectWallet();
        return;
    }
    
    try {
        mintBtn.disabled = true;
        mintBtn.textContent = "Minting...";
        showStatus("Sending transaction...");
        
        const tx = await contract.mint({
            value: ethers.parseEther(MINT_FEE)
        });
        
        showStatus("Waiting for confirmation...");
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            showStatus("Successfully minted your SBT!");
            mintBtn.textContent = "Minted ✓";
            fetchTotalSupply();
        } else {
            throw new Error("Transaction failed");
        }
    } catch (error) {
        showStatus("Mint failed: " + parseError(error), true);
        mintBtn.disabled = false;
        mintBtn.textContent = "Mint SBT";
    }
}

// Event listener
mintBtn.addEventListener("click", mintSBT);

// Initialize
fetchTotalSupply();
if (window.ethereum && window.ethereum.selectedAddress) {
    connectWallet();
}

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
            userAddress = null;
            contract = null;
            mintBtn.textContent = "Connect Wallet";
            mintBtn.disabled = false;
            showStatus("Wallet disconnected");
        } else {
            userAddress = accounts[0];
            showStatus("Switched to: " + userAddress.slice(0,6) + "..." + userAddress.slice(-4));
        }
    });
}

// Listen for chain changes
if (window.ethereum) {
    window.ethereum.on("chainChanged", (chainId) => {
        if (chainId !== BASE_CHAIN_ID) {
            showStatus("Please switch to Base network", true);
        } else {
            showStatus("Connected to Base network");
        }
    });
}

// Check user balance
async function checkBalance() {
    if (!provider || !userAddress) return null;
    try {
        const balance = await provider.getBalance(userAddress);
        return ethers.formatEther(balance);
    } catch (e) {
        return null;
    }
}

// Display balance after connection
async function displayBalance() {
    const balance = await checkBalance();
    if (balance !== null) {
        const shortBalance = parseFloat(balance).toFixed(6);
        showStatus("Balance: " + shortBalance + " ETH");
    }
}
