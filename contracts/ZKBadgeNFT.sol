// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./Verifier.sol";

contract ZKBadgeNFT is ERC721URIStorage {
    Groth16Verifier public verifier;
    mapping(bytes32 => bool) public usedProofs;
    mapping(uint256 => string) public badgeMonth; // tokenId -> "March 2025"
    uint256 public tokenCounter;

    constructor(address _verifier) ERC721("SpotifyZKBadge", "SPZK") {
        verifier = Groth16Verifier(_verifier);
        tokenCounter = 0;
    }

    function mintBadge(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[3] memory publicSignals,
        string memory artist1,
        string memory artist2,
        string memory artist3,
        string memory ipfsURI,
        string memory monthYear
    ) public {
        // Require proof hasn't been used (prevent double-claims)
        bytes32 proofHash = keccak256(abi.encodePacked(publicSignals));
        require(!usedProofs[proofHash], "Proof already used");

        // Verify ZK proof
        require(verifier.verifyProof(a, b, c, publicSignals), "Invalid proof");

        usedProofs[proofHash] = true;

        // Mint NFT
        _mint(msg.sender, tokenCounter);
        _setTokenURI(tokenCounter, ipfsURI);
        badgeMonth[tokenCounter] = monthYear;

        tokenCounter++;
    }

    function getBadgeDate(
        uint256 tokenId
    ) external view returns (string memory) {
        return badgeMonth[tokenId];
    }
}
