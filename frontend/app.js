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
        showStatus("Connection failed: " + error.message, true);
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
        showStatus("Mint failed: " + (error.reason || error.message), true);
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
