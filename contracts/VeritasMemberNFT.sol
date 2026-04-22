// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VeritasMemberNFT
 * @dev ERC721 Token for Veritas Village HOA Members.
 * Each NFT represents a lot/house. The Council (Owner) can mint.
 */
contract VeritasMemberNFT is ERC721, Ownable {
    uint256 private _nextTokenId = 1;

    /**
     * @dev Returns the total number of NFTs minted so far.
     */
    function totalSupply() public view returns (uint256) {
        return _nextTokenId - 1;
    }

    constructor(address initialOwner)
        ERC721("Veritas Member NFT", "VNFT")
        Ownable(initialOwner)
    {}

    /**
     * @dev Mints a new property NFT for a community member.
     * Only the Council (owner) can mint new NFTs.
     * @param to The address of the community member.
     * @return The ID of the newly minted NFT.
     */
    function safeMint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
}
