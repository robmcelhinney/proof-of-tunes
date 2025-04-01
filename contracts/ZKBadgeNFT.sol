// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./Verifier.sol";

contract ZKBadgeNFT is ERC721URIStorage {
    Groth16Verifier public verifier;
    mapping(bytes32 => bool) public usedProofs;
    mapping(uint256 => string) public badgeMonth; // tokenId -> "March 2025"
    uint256 public tokenCounter;

    constructor(address _verifier) ERC721("ProofofTunes", "PoT") {
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
        string memory svg, // provide raw SVG string
        string memory monthYear
    ) public {
        // Prevent double claims.
        bytes32 proofHash = keccak256(abi.encodePacked(publicSignals));
        require(!usedProofs[proofHash], "Proof already used");

        // Verify the ZK proof.
        require(verifier.verifyProof(a, b, c, publicSignals), "Invalid proof");
        usedProofs[proofHash] = true;

        // Convert SVG to a data URI.
        string memory svgBase64 = Base64.encode(bytes(svg));
        string memory imageURI = string(
            abi.encodePacked("data:image/svg+xml;base64,", svgBase64)
        );

        // Build on-chain JSON metadata.
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "ProofofTunes Badge #',
                        Strings.toString(tokenCounter),
                        '", "description": "Top Artists", "attributes": [',
                        '{"trait_type": "Artist 1", "value": "',
                        artist1,
                        '"},',
                        '{"trait_type": "Artist 2", "value": "',
                        artist2,
                        '"},',
                        '{"trait_type": "Artist 3", "value": "',
                        artist3,
                        '"}',
                        '], "image": "',
                        imageURI,
                        '"}'
                    )
                )
            )
        );
        string memory finalTokenURI = string(
            abi.encodePacked("data:application/json;base64,", json)
        );

        // Mint NFT with the generated metadata.
        _mint(msg.sender, tokenCounter);
        _setTokenURI(tokenCounter, finalTokenURI);
        badgeMonth[tokenCounter] = monthYear;

        tokenCounter++;
    }

    function getBadgeDate(
        uint256 tokenId
    ) external view returns (string memory) {
        return badgeMonth[tokenId];
    }
}
