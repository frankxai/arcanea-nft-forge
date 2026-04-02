// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

/**
 * @title ERC721AForge
 * @notice Gas-optimized NFT collection contract for Arcanea NFT Forge.
 *         Deployed via ForgeFactory as EIP-1167 minimal proxies (~$5-15 deploy cost).
 *
 * Features:
 * - ERC721A batch minting (mint 5 for the cost of 1)
 * - ERC2981 royalties (marketplace-enforced)
 * - Merkle proof allowlist verification
 * - Reveal mechanism (placeholder → real metadata)
 * - Per-wallet mint limits
 * - Owner-controlled minting phases
 */
contract ERC721AForge is ERC721A, ERC2981, Ownable {
    // ─── State ──────────────────────────────────────────

    uint256 public maxSupply;
    uint256 public mintPrice;
    uint256 public maxPerWallet;

    string private _baseTokenURI;
    string private _placeholderURI;
    bool public revealed;

    bytes32 public merkleRoot;

    enum Phase { CLOSED, ALLOWLIST, PUBLIC }
    Phase public currentPhase;

    bool private _initialized;

    // ─── Events ─────────────────────────────────────────

    event PhaseChanged(Phase newPhase);
    event Revealed(string baseURI);
    event MerkleRootUpdated(bytes32 newRoot);

    // ─── Errors ─────────────────────────────────────────

    error MaxSupplyExceeded();
    error MaxPerWalletExceeded();
    error InsufficientPayment();
    error MintingClosed();
    error NotAllowlisted();
    error AlreadyInitialized();
    error WithdrawFailed();

    // ─── Constructor (for implementation only) ──────────

    constructor() ERC721A("", "") Ownable(msg.sender) {}

    // ─── Initializer (for clones) ───────────────────────

    function initialize(
        string memory name_,
        string memory symbol_,
        address owner_,
        uint256 maxSupply_,
        uint256 mintPrice_,
        uint256 maxPerWallet_,
        string memory placeholderURI_,
        address royaltyReceiver_,
        uint96 royaltyBps_
    ) external {
        if (_initialized) revert AlreadyInitialized();
        _initialized = true;

        // ERC721A doesn't have a proper initializer, so we use internal state
        // In production, use ERC721A-Upgradeable or a custom init pattern
        maxSupply = maxSupply_;
        mintPrice = mintPrice_;
        maxPerWallet = maxPerWallet_;
        _placeholderURI = placeholderURI_;
        currentPhase = Phase.CLOSED;

        _setDefaultRoyalty(royaltyReceiver_, royaltyBps_);
        _transferOwnership(owner_);
    }

    // ─── Minting ────────────────────────────────────────

    /**
     * @notice Public mint (Phase.PUBLIC required)
     */
    function mint(uint256 quantity) external payable {
        if (currentPhase != Phase.PUBLIC) revert MintingClosed();
        _mintChecks(quantity);
        _mint(msg.sender, quantity);
    }

    /**
     * @notice Allowlist mint with Merkle proof (Phase.ALLOWLIST required)
     */
    function allowlistMint(uint256 quantity, bytes32[] calldata proof) external payable {
        if (currentPhase != Phase.ALLOWLIST) revert MintingClosed();

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert NotAllowlisted();

        _mintChecks(quantity);
        _mint(msg.sender, quantity);
    }

    /**
     * @notice Owner mint (reserve tokens, airdrops)
     */
    function ownerMint(address to, uint256 quantity) external onlyOwner {
        if (_totalMinted() + quantity > maxSupply) revert MaxSupplyExceeded();
        _mint(to, quantity);
    }

    function _mintChecks(uint256 quantity) private view {
        if (_totalMinted() + quantity > maxSupply) revert MaxSupplyExceeded();
        if (_numberMinted(msg.sender) + quantity > maxPerWallet) revert MaxPerWalletExceeded();
        if (msg.value < mintPrice * quantity) revert InsufficientPayment();
    }

    // ─── Reveal ─────────────────────────────────────────

    /**
     * @notice Reveal collection (swap placeholder for real metadata)
     */
    function reveal(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
        revealed = true;
        emit Revealed(baseURI_);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

        if (!revealed) {
            return _placeholderURI;
        }

        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId), ".json"));
    }

    // ─── Admin ──────────────────────────────────────────

    function setPhase(Phase phase_) external onlyOwner {
        currentPhase = phase_;
        emit PhaseChanged(phase_);
    }

    function setMerkleRoot(bytes32 root_) external onlyOwner {
        merkleRoot = root_;
        emit MerkleRootUpdated(root_);
    }

    function setMintPrice(uint256 price_) external onlyOwner {
        mintPrice = price_;
    }

    function setMaxPerWallet(uint256 max_) external onlyOwner {
        maxPerWallet = max_;
    }

    function setRoyalty(address receiver, uint96 bps) external onlyOwner {
        _setDefaultRoyalty(receiver, bps);
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        if (!success) revert WithdrawFailed();
    }

    // ─── Overrides ──────────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721A, ERC2981)
        returns (bool)
    {
        return ERC721A.supportsInterface(interfaceId) || ERC2981.supportsInterface(interfaceId);
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 0;
    }
}
