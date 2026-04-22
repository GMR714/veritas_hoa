// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./VeritasMemberNFT.sol";

/**
 * @title VeritasTreasury
 * @dev Treasury contract for Veritas Village HOA.
 * Handles collection of dues and tracks payment timestamps.
 */
contract VeritasTreasury is Ownable {
    VeritasMemberNFT public memberNft;

    /// @dev Minimum dues amount in wei (configurable by council)
    uint256 public minDuesAmount;

    // NFT ID => Timestamp of the last successful payment
    mapping(uint256 => uint256) public lastPaidTimestamp;

    event DuesPaid(uint256 indexed nftId, address indexed payer, uint256 amount, uint256 timestamp);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event MinDuesUpdated(uint256 oldAmount, uint256 newAmount);

    constructor(address initialOwner, address _memberNft) Ownable(initialOwner) {
        memberNft = VeritasMemberNFT(_memberNft);
    }

    /**
     * @dev Sets the minimum dues amount. Only callable by council.
     * @param _amount New minimum amount in wei.
     */
    function setMinDues(uint256 _amount) external onlyOwner {
        uint256 oldAmount = minDuesAmount;
        minDuesAmount = _amount;
        emit MinDuesUpdated(oldAmount, _amount);
    }

    /**
     * @dev Pays HOA dues for a specific property (NFT).
     * Only the NFT owner can pay dues for their property.
     * @param nftId The ID of the NFT representing the property.
     */
    function payDues(uint256 nftId) external payable {
        require(msg.value > 0, "Treasury: Payment must be greater than 0");
        require(msg.value >= minDuesAmount, "Treasury: Payment below minimum dues");
        // Verify NFT exists and caller is the owner
        address nftOwner = memberNft.ownerOf(nftId);
        require(nftOwner == msg.sender, "Treasury: Only NFT owner can pay dues");

        lastPaidTimestamp[nftId] = block.timestamp;

        emit DuesPaid(nftId, msg.sender, msg.value, block.timestamp);
    }

    /**
     * @dev Checks if a given NFT is delinquent (hasn't paid in the last `daysThreshold` days).
     * @param nftId The NFT ID to check.
     * @param daysThreshold Number of days after which a member is considered delinquent.
     * @return True if delinquent.
     */
    function isDelinquent(uint256 nftId, uint256 daysThreshold) external view returns (bool) {
        uint256 lastPaid = lastPaidTimestamp[nftId];
        if (lastPaid == 0) return true; // Never paid
        return (block.timestamp - lastPaid) > (daysThreshold * 1 days);
    }

    /**
     * @dev Withdraws accumulated funds to the council.
     * Only the owner (council) can perform this.
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Treasury: No funds to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Treasury: Withdrawal failed");

        emit FundsWithdrawn(owner(), balance);
    }

    /**
     * @dev Returns the contract's current balance.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
