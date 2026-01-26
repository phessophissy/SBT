// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SoulBoundToken
 * @dev Soul Bound Token (SBT) that cannot be transferred once minted
 * Anyone can mint for a fee of 0.000001 ETH
 */
contract SoulBoundToken is ERC721, Ownable {
    uint256 private _tokenIdCounter;
    
    // Minting fee: 0.000001 ETH
    uint256 public constant MINT_FEE = 0.000001 ether;
    
    // Track tokens minted by each address
    mapping(address => uint256[]) public tokensOfOwner;

    // Track whether an address has already minted (one per address)
    mapping(address => bool) public hasMinted;
    
    // Events
    event SBTMinted(address indexed to, uint256 indexed tokenId);
    event FundsWithdrawn(address indexed to, uint256 amount);
    
    constructor() ERC721("SoulBoundToken", "SBT") Ownable(msg.sender) {
        // Start token IDs from 1
        _tokenIdCounter = 1;
    }
    
    /**
     * @dev Mint a Soul Bound Token
     * Requires exactly MINT_FEE to be sent
     * Each address can mint only once
     */
    function mint() external payable {
        require(!hasMinted[msg.sender], "SBT: address has already minted");
        require(msg.value == MINT_FEE, "Incorrect fee: must send exactly 0.000001 ETH");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        hasMinted[msg.sender] = true;
        tokensOfOwner[msg.sender].push(tokenId);
        
        _safeMint(msg.sender, tokenId);
        
        emit SBTMinted(msg.sender, tokenId);
    }
    
    /**
     * @dev Get all token IDs owned by an address
     */
    function getTokensOfOwner(address owner) external view returns (uint256[] memory) {
        return tokensOfOwner[owner];
    }
    
    /**
     * @dev Get the total number of tokens minted
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }
    
    /**
     * @dev Override transfer functions to make tokens non-transferable (soul-bound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == address(0)) but prevent transfers
        if (from != address(0)) {
            revert("SBT: Soul Bound Tokens cannot be transferred");
        }
        
        return super._update(to, tokenId, auth);
    }
    
    /**
     * @dev Disable approvals since tokens cannot be transferred
     */
    function approve(address, uint256) public virtual override {
        revert("SBT: Soul Bound Tokens cannot be approved");
    }
    
    /**
     * @dev Disable setApprovalForAll since tokens cannot be transferred
     */
    function setApprovalForAll(address, bool) public virtual override {
        revert("SBT: Soul Bound Tokens cannot be approved");
    }
    
    /**
     * @dev Owner can withdraw collected fees
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(owner(), balance);
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
