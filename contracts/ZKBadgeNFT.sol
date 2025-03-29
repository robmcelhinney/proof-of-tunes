// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "./Verifier.sol";

contract ZKBadgeNFT is ERC721URIStorage {
    Groth16Verifier public verifier;
    mapping(bytes32 => bool) public usedProofs;
    mapping(uint256 => string) public badgeMonth; // tokenId -> "March 2025"
    uint256 public tokenCounter;

    uint256 constant SNARK_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    constructor(address _verifier) ERC721("SpotifyZKBadge", "SPZK") {
        verifier = Groth16Verifier(_verifier);
        tokenCounter = 0;
    }

    function stringToHash(string memory s) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(s))) % SNARK_FIELD;
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
        uint256 computedHash1 = stringToHash(artist1);
        uint256 computedHash2 = stringToHash(artist2);
        uint256 computedHash3 = stringToHash(artist3);

        require(publicSignals[0] == computedHash1, "Artist1 mismatch");
        require(publicSignals[1] == computedHash2, "Artist2 mismatch");
        require(publicSignals[2] == computedHash3, "Artist3 mismatch");

        bytes32 proofHash = keccak256(abi.encodePacked(publicSignals));
        require(!usedProofs[proofHash], "Proof already used");
        require(verifier.verifyProof(a, b, c, publicSignals), "Invalid proof");

        usedProofs[proofHash] = true;
        _mint(msg.sender, tokenCounter);
        _setTokenURI(tokenCounter, ipfsURI);
        badgeMonth[tokenCounter] = monthYear;
        tokenCounter++;
    }

    // Optional: expose badge date via view
    function getBadgeDate(
        uint256 tokenId
    ) external view returns (string memory) {
        return badgeMonth[tokenId];
    }
}
