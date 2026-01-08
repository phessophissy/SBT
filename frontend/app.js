// Contract configuration
const CONTRACT_ADDRESS = "0xB8EeEd4EC90D0C9B2e35345b0f938F1168065329";
const MINT_FEE = "0.000001";
const BASE_CHAIN_ID = "0x2105"; // 8453 in hex

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

// Helper: Show status message
function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.style.color = isError ? "#ff6b6b" : "#51cf66";
}
