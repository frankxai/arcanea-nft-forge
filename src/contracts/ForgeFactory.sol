// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ForgeFactory
 * @notice Deploys ERC721AForge collections as EIP-1167 minimal proxies.
 *         Each creator gets their own contract for ~$5-15 instead of ~$50-200.
 *
 * Architecture:
 * - One audited implementation contract (ERC721AForge)
 * - Factory creates lightweight clones that delegate to implementation
 * - Each clone is a fully independent contract owned by the creator
 * - Platform fee: small per-mint fee sent to platform treasury
 *
 * Multi-chain: Deploy this factory on each target chain.
 * Supported: Ethereum, Base, Optimism, Arbitrum, Zora Network.
 */
contract ForgeFactory is Ownable {
    // ─── State ──────────────────────────────────────────

    address public implementation;
    address public platformTreasury;
    uint256 public platformFeeBps; // Basis points (100 = 1%)

    // Registry of all deployed collections
    address[] public collections;
    mapping(address => address[]) public creatorCollections;
    mapping(address => bool) public isForgeCollection;

    // ─── Events ─────────────────────────────────────────

    event CollectionCreated(
        address indexed collection,
        address indexed creator,
        string name,
        string symbol,
        uint256 maxSupply
    );

    event ImplementationUpdated(address newImplementation);
    event PlatformFeeUpdated(uint256 newFeeBps);

    // ─── Errors ─────────────────────────────────────────

    error InvalidImplementation();
    error FeeTooHigh();

    // ─── Constructor ────────────────────────────────────

    constructor(
        address implementation_,
        address treasury_,
        uint256 feeBps_
    ) Ownable(msg.sender) {
        if (implementation_ == address(0)) revert InvalidImplementation();
        if (feeBps_ > 1000) revert FeeTooHigh(); // Max 10%

        implementation = implementation_;
        platformTreasury = treasury_;
        platformFeeBps = feeBps_;
    }

    // ─── Create Collection ──────────────────────────────

    /**
     * @notice Deploy a new NFT collection as a minimal proxy
     * @param name_ Collection name
     * @param symbol_ Collection symbol
     * @param maxSupply_ Maximum token supply
     * @param mintPrice_ Price per mint in wei
     * @param maxPerWallet_ Maximum mints per wallet
     * @param placeholderURI_ Pre-reveal metadata URI
     * @param royaltyBps_ Creator royalty in basis points (500 = 5%)
     */
    function createCollection(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_,
        string memory placeholderURI_,
        uint96 royaltyBps_
    ) external returns (address) {
        // Deploy minimal proxy (EIP-1167 clone)
        address clone = Clones.clone(implementation);

        // Initialize the clone
        // Note: Using a low-level call to avoid interface dependency issues
        (bool success, ) = clone.call(
            abi.encodeWithSignature(
                "initialize(string,string,address,uint256,uint256,uint256,string,address,uint96)",
                name_,
                symbol_,
                msg.sender,      // Creator owns the contract
                maxSupply_,
                mintPrice_,
                maxPerWallet_,
                placeholderURI_,
                msg.sender,      // Creator receives royalties
                royaltyBps_
            )
        );
        require(success, "Initialization failed");

        // Register
        collections.push(clone);
        creatorCollections[msg.sender].push(clone);
        isForgeCollection[clone] = true;

        emit CollectionCreated(clone, msg.sender, name_, symbol_, maxSupply_);

        return clone;
    }

    /**
     * @notice Deploy with deterministic address (CREATE2)
     *         Same inputs = same address on every chain
     */
    function createCollectionDeterministic(
        string memory name_,
        string memory symbol_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_,
        string memory placeholderURI_,
        uint96 royaltyBps_,
        bytes32 salt_
    ) external returns (address) {
        address clone = Clones.cloneDeterministic(implementation, salt_);

        (bool success, ) = clone.call(
            abi.encodeWithSignature(
                "initialize(string,string,address,uint256,uint256,uint256,string,address,uint96)",
                name_,
                symbol_,
                msg.sender,
                maxSupply_,
                mintPrice_,
                maxPerWallet_,
                placeholderURI_,
                msg.sender,
                royaltyBps_
            )
        );
        require(success, "Initialization failed");

        collections.push(clone);
        creatorCollections[msg.sender].push(clone);
        isForgeCollection[clone] = true;

        emit CollectionCreated(clone, msg.sender, name_, symbol_, maxSupply_);

        return clone;
    }

    /**
     * @notice Predict deterministic clone address
     */
    function predictAddress(bytes32 salt_) external view returns (address) {
        return Clones.predictDeterministicAddress(implementation, salt_);
    }

    // ─── Registry Queries ───────────────────────────────

    function totalCollections() external view returns (uint256) {
        return collections.length;
    }

    function getCreatorCollections(address creator) external view returns (address[] memory) {
        return creatorCollections[creator];
    }

    // ─── Admin ──────────────────────────────────────────

    function setImplementation(address impl_) external onlyOwner {
        if (impl_ == address(0)) revert InvalidImplementation();
        implementation = impl_;
        emit ImplementationUpdated(impl_);
    }

    function setPlatformFee(uint256 feeBps_) external onlyOwner {
        if (feeBps_ > 1000) revert FeeTooHigh();
        platformFeeBps = feeBps_;
        emit PlatformFeeUpdated(feeBps_);
    }

    function setPlatformTreasury(address treasury_) external onlyOwner {
        platformTreasury = treasury_;
    }
}
