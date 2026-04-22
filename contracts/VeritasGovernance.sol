// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./VeritasMemberNFT.sol";
import "./VeritasTreasury.sol";

/**
 * @title VeritasGovernance
 * @dev On-chain governance for Veritas Village HOA.
 * Proposals are created by the Council. Only NFT holders can vote.
 * The system cross-references with Treasury to flag delinquent voters.
 *
 * Delegation: NFT owners can delegate their voting power to any address.
 * The delegate can vote on their behalf. After the voting period ends,
 * a review period begins during which the owner can see what the delegate
 * voted and override the vote if desired. The owner can also revoke the
 * delegation entirely (permanent) or just override a single vote.
 */
contract VeritasGovernance is Ownable {
    VeritasMemberNFT public memberNft;
    VeritasTreasury public treasury;

    uint256 public proposalCount;

    /// @dev Review period after voting ends (default 24 hours)
    uint256 public reviewPeriod = 86400;

    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 startTime;
        uint256 endTime;
        uint256 reviewEndTime;
        bool executed;
        bool exists;
    }

    struct Vote {
        bool hasVoted;
        uint8 choice; // 1 = A Favor, 2 = Contra, 3 = Abstenção
        uint256 nftId;
        uint256 timestamp;
        bool isDelegated;     // true if cast by delegate
        address castBy;       // who actually submitted the tx
        bool wasOverridden;   // true if owner overrode delegate vote
    }

    // ─── Core Mappings ──────────────────────────────────────────────

    // proposalId => Proposal
    mapping(uint256 => Proposal) public proposals;

    // proposalId => voter address => Vote
    mapping(uint256 => mapping(address => Vote)) public votes;

    // proposalId => list of voter addresses (for enumeration)
    mapping(uint256 => address[]) public proposalVoters;

    // proposalId => nftId => has this NFT been used to vote
    mapping(uint256 => mapping(uint256 => bool)) public nftUsedForVote;

    // ─── Delegation Mappings ────────────────────────────────────────

    // nftId => delegate address (persistent across proposals)
    mapping(uint256 => address) public delegations;

    // proposalId => nftId => the choice the delegate made (for review)
    mapping(uint256 => mapping(uint256 => uint8)) public delegatedVoteChoice;

    // ─── Events ─────────────────────────────────────────────────────

    event ProposalCreated(uint256 indexed id, string title, uint256 startTime, uint256 endTime, uint256 reviewEndTime);
    event VoteCast(uint256 indexed proposalId, address indexed voter, uint256 nftId, uint8 choice, bool isDelegated);
    event VoteOverridden(uint256 indexed proposalId, address indexed owner, uint256 nftId, uint8 oldChoice, uint8 newChoice);
    event DelegationSet(uint256 indexed nftId, address indexed owner, address indexed delegate);
    event DelegationRevoked(uint256 indexed nftId, address indexed owner);
    event ProposalExecuted(uint256 indexed id, bool approved);
    event ReviewPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);

    constructor(
        address initialOwner,
        address _memberNft,
        address _treasury
    ) Ownable(initialOwner) {
        memberNft = VeritasMemberNFT(_memberNft);
        treasury = VeritasTreasury(_treasury);
    }

    // ═══════════════════════════════════════════════════════════════
    //  DELEGATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Delegates voting power for an NFT to another address.
     * The delegate can vote on behalf of the NFT owner in any proposal.
     * A delegate can represent unlimited NFTs (no cap).
     * @param _nftId The NFT whose vote to delegate.
     * @param _delegate The address to delegate to.
     */
    function delegateVote(uint256 _nftId, address _delegate) external {
        require(memberNft.ownerOf(_nftId) == msg.sender, "Governance: Not the NFT owner");
        require(_delegate != address(0), "Governance: Cannot delegate to zero address");
        require(_delegate != msg.sender, "Governance: Cannot delegate to yourself");

        delegations[_nftId] = _delegate;

        emit DelegationSet(_nftId, msg.sender, _delegate);
    }

    /**
     * @dev Permanently revokes delegation for an NFT.
     * @param _nftId The NFT to revoke delegation for.
     */
    function revokeDelegation(uint256 _nftId) external {
        require(memberNft.ownerOf(_nftId) == msg.sender, "Governance: Not the NFT owner");
        require(delegations[_nftId] != address(0), "Governance: No delegation to revoke");

        delete delegations[_nftId];

        emit DelegationRevoked(_nftId, msg.sender);
    }

    /**
     * @dev Returns the delegate for a given NFT (address(0) if none).
     */
    function getDelegation(uint256 _nftId) external view returns (address) {
        return delegations[_nftId];
    }

    // ═══════════════════════════════════════════════════════════════
    //  PROPOSALS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Creates a new proposal. Only the Council (owner) can create proposals.
     * @param _title Title of the proposal.
     * @param _description Description of the proposal.
     * @param _durationMinutes Duration in minutes for the voting period.
     */
    function createProposal(
        string calldata _title,
        string calldata _description,
        uint256 _durationMinutes
    ) external onlyOwner returns (uint256) {
        proposalCount++;
        uint256 id = proposalCount;

        uint256 end = block.timestamp + (_durationMinutes * 1 minutes);

        proposals[id] = Proposal({
            id: id,
            title: _title,
            description: _description,
            votesFor: 0,
            votesAgainst: 0,
            votesAbstain: 0,
            startTime: block.timestamp,
            endTime: end,
            reviewEndTime: end + reviewPeriod,
            executed: false,
            exists: true
        });

        emit ProposalCreated(id, _title, block.timestamp, end, end + reviewPeriod);
        return id;
    }

    /**
     * @dev Sets the review period for future proposals. Only callable by Council.
     * @param _seconds Duration in seconds.
     */
    function setReviewPeriod(uint256 _seconds) external onlyOwner {
        uint256 old = reviewPeriod;
        reviewPeriod = _seconds;
        emit ReviewPeriodUpdated(old, _seconds);
    }

    // ═══════════════════════════════════════════════════════════════
    //  VOTING
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Cast a direct vote on a proposal using an NFT you own.
     * Direct votes take priority — a delegate cannot overwrite a direct vote.
     * @param _proposalId ID of the proposal.
     * @param _nftId ID of the NFT backing this vote.
     * @param _choice 1 = A Favor, 2 = Contra, 3 = Abstenção.
     */
    function castVote(uint256 _proposalId, uint256 _nftId, uint8 _choice) external {
        Proposal storage prop = proposals[_proposalId];
        require(prop.exists, "Governance: Proposal does not exist");
        require(block.timestamp >= prop.startTime, "Governance: Voting not started");
        require(block.timestamp <= prop.endTime, "Governance: Voting ended");
        require(_choice >= 1 && _choice <= 3, "Governance: Invalid choice (1-3)");

        // Verify NFT ownership
        address nftOwner = memberNft.ownerOf(_nftId);
        require(nftOwner == msg.sender, "Governance: You don't own this NFT");

        // Prevent double voting with the same NFT
        require(!nftUsedForVote[_proposalId][_nftId], "Governance: NFT already used to vote");

        // Record vote
        nftUsedForVote[_proposalId][_nftId] = true;

        // If voter hasn't voted before with any NFT, add to voter list
        if (!votes[_proposalId][msg.sender].hasVoted) {
            proposalVoters[_proposalId].push(msg.sender);
        }

        votes[_proposalId][msg.sender] = Vote({
            hasVoted: true,
            choice: _choice,
            nftId: _nftId,
            timestamp: block.timestamp,
            isDelegated: false,
            castBy: msg.sender,
            wasOverridden: false
        });

        // Tally
        _tallyAdd(prop, _choice);

        emit VoteCast(_proposalId, msg.sender, _nftId, _choice, false);
    }

    /**
     * @dev Cast a delegated vote on behalf of an NFT owner.
     * The caller must be the registered delegate for the NFT.
     * The NFT owner must NOT have already voted directly.
     * @param _proposalId ID of the proposal.
     * @param _nftId ID of the NFT whose vote is being cast.
     * @param _choice 1 = A Favor, 2 = Contra, 3 = Abstenção.
     */
    function castDelegatedVote(uint256 _proposalId, uint256 _nftId, uint8 _choice) external {
        Proposal storage prop = proposals[_proposalId];
        require(prop.exists, "Governance: Proposal does not exist");
        require(block.timestamp >= prop.startTime, "Governance: Voting not started");
        require(block.timestamp <= prop.endTime, "Governance: Voting ended");
        require(_choice >= 1 && _choice <= 3, "Governance: Invalid choice (1-3)");

        // Verify delegation
        require(delegations[_nftId] == msg.sender, "Governance: You are not the delegate for this NFT");

        // Prevent double voting with the same NFT
        require(!nftUsedForVote[_proposalId][_nftId], "Governance: NFT already used to vote");

        address nftOwner = memberNft.ownerOf(_nftId);

        // Record vote under the NFT owner's address
        nftUsedForVote[_proposalId][_nftId] = true;

        if (!votes[_proposalId][nftOwner].hasVoted) {
            proposalVoters[_proposalId].push(nftOwner);
        }

        votes[_proposalId][nftOwner] = Vote({
            hasVoted: true,
            choice: _choice,
            nftId: _nftId,
            timestamp: block.timestamp,
            isDelegated: true,
            castBy: msg.sender,
            wasOverridden: false
        });

        // Store the delegated choice separately for review
        delegatedVoteChoice[_proposalId][_nftId] = _choice;

        // Tally
        _tallyAdd(prop, _choice);

        emit VoteCast(_proposalId, nftOwner, _nftId, _choice, true);
    }

    /**
     * @dev Override a delegated vote during the review period.
     * Only the NFT owner can call this, and only if:
     *   - The voting period has ended
     *   - We are still within the review period
     *   - The current vote was cast by a delegate (isDelegated == true)
     *   - The vote has not already been overridden
     * @param _proposalId ID of the proposal.
     * @param _nftId ID of the NFT whose vote to override.
     * @param _newChoice The new vote choice (1-3).
     */
    function overrideDelegatedVote(uint256 _proposalId, uint256 _nftId, uint8 _newChoice) external {
        Proposal storage prop = proposals[_proposalId];
        require(prop.exists, "Governance: Proposal does not exist");
        require(block.timestamp > prop.endTime, "Governance: Voting still active, vote directly instead");
        require(block.timestamp <= prop.reviewEndTime, "Governance: Review period ended");
        require(_newChoice >= 1 && _newChoice <= 3, "Governance: Invalid choice (1-3)");

        // Verify NFT ownership
        address nftOwner = memberNft.ownerOf(_nftId);
        require(nftOwner == msg.sender, "Governance: Not the NFT owner");

        // Verify the vote was delegated and not already overridden
        Vote storage v = votes[_proposalId][msg.sender];
        require(v.hasVoted, "Governance: No vote to override");
        require(v.isDelegated, "Governance: Can only override delegated votes");
        require(!v.wasOverridden, "Governance: Already overridden");

        uint8 oldChoice = v.choice;

        // Subtract old tally, add new
        _tallySub(prop, oldChoice);
        _tallyAdd(prop, _newChoice);

        // Update vote
        v.choice = _newChoice;
        v.isDelegated = false;
        v.castBy = msg.sender;
        v.wasOverridden = true;
        v.timestamp = block.timestamp;

        emit VoteOverridden(_proposalId, msg.sender, _nftId, oldChoice, _newChoice);
    }

    // ═══════════════════════════════════════════════════════════════
    //  QUERIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Returns the number of voters for a given proposal.
     */
    function getVoterCount(uint256 _proposalId) external view returns (uint256) {
        return proposalVoters[_proposalId].length;
    }

    /**
     * @dev Returns a voter address by index for a given proposal.
     */
    function getVoter(uint256 _proposalId, uint256 _index) external view returns (address) {
        return proposalVoters[_proposalId][_index];
    }

    /**
     * @dev Check if a voter is delinquent (via Treasury).
     */
    function isVoterDelinquent(uint256 _nftId, uint256 _daysThreshold) external view returns (bool) {
        return treasury.isDelinquent(_nftId, _daysThreshold);
    }

    /**
     * @dev Returns true if the proposal is currently in its review period.
     */
    function isInReviewPeriod(uint256 _proposalId) external view returns (bool) {
        Proposal storage prop = proposals[_proposalId];
        return prop.exists && block.timestamp > prop.endTime && block.timestamp <= prop.reviewEndTime;
    }

    /**
     * @dev Returns the choice that the delegate made for a given NFT in a proposal.
     * Returns 0 if no delegated vote was cast.
     */
    function getDelegatedVoteChoice(uint256 _proposalId, uint256 _nftId) external view returns (uint8) {
        return delegatedVoteChoice[_proposalId][_nftId];
    }

    /**
     * @dev Execute a proposal after BOTH voting and review periods have ended.
     */
    function executeProposal(uint256 _proposalId) external onlyOwner {
        Proposal storage prop = proposals[_proposalId];
        require(prop.exists, "Governance: Proposal does not exist");
        require(block.timestamp > prop.reviewEndTime, "Governance: Review period still active");
        require(!prop.executed, "Governance: Already executed");

        prop.executed = true;
        bool approved = prop.votesFor > prop.votesAgainst;

        emit ProposalExecuted(_proposalId, approved);
    }

    // ═══════════════════════════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════

    function _tallyAdd(Proposal storage prop, uint8 choice) internal {
        if (choice == 1) prop.votesFor++;
        else if (choice == 2) prop.votesAgainst++;
        else prop.votesAbstain++;
    }

    function _tallySub(Proposal storage prop, uint8 choice) internal {
        if (choice == 1 && prop.votesFor > 0) prop.votesFor--;
        else if (choice == 2 && prop.votesAgainst > 0) prop.votesAgainst--;
        else if (choice == 3 && prop.votesAbstain > 0) prop.votesAbstain--;
    }
}
