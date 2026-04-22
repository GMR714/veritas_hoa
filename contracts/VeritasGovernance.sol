// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./VeritasMemberNFT.sol";
import "./VeritasTreasury.sol";

/**
 * @title VeritasGovernance
 * @dev On-chain governance for Veritas Village HOA using Quadratic Voting.
 * 
 * Flow:
 * 1. Idea Basket: Members submit ideas.
 * 2. Idea Voting: Members use their yearly credits to vote on ideas (Quadratic).
 * 3. Proposals: Top ideas are transformed into official proposals by the Council.
 * 4. Proposal Voting: Members use their remaining yearly credits to vote (Quadratic).
 *
 * Each NFT (property) grants 100 Voting Credits per year.
 * The cost of N votes on a single idea/proposal is N^2 credits.
 */
contract VeritasGovernance is Ownable {
    VeritasMemberNFT public memberNft;
    VeritasTreasury public treasury;

    uint256 public constant CREDITS_PER_YEAR = 100;
    uint256 public governanceStartTime;

    // ─── IDEA BASKET ────────────────────────────────────────────────

    struct Idea {
        uint256 id;
        address proposer;
        string title;
        string description;
        uint256 qvVotes; // Total quadratic votes received
        uint256 timestamp;
    }
    uint256 public ideaCount;
    mapping(uint256 => Idea) public ideas;
    
    // ideaId => nftId => total votes allocated by this NFT
    mapping(uint256 => mapping(uint256 => uint256)) public ideaVotesAllocated;

    // ─── PROPOSALS ──────────────────────────────────────────────────

    struct Proposal {
        uint256 id;
        string title;
        string description;
        uint256 votesFor;     // QV votes
        uint256 votesAgainst; // QV votes
        uint256 votesAbstain; // QV votes
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool exists;
    }
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;

    // proposalId => nftId => total votes allocated
    mapping(uint256 => mapping(uint256 => uint256)) public proposalVotesAllocated;
    // proposalId => nftId => choice (1=For, 2=Against, 3=Abstain)
    mapping(uint256 => mapping(uint256 => uint8)) public proposalVoteChoice;

    // ─── CREDITS TRACKING ───────────────────────────────────────────

    // year => nftId => credits spent
    mapping(uint256 => mapping(uint256 => uint256)) public creditsSpent;

    // ─── EVENTS ─────────────────────────────────────────────────────

    event IdeaSubmitted(uint256 indexed id, address indexed proposer, string title);
    event IdeaVoted(uint256 indexed id, uint256 indexed nftId, uint256 votesCast, uint256 creditsCost);
    event ProposalCreated(uint256 indexed id, string title, uint256 startTime, uint256 endTime);
    event ProposalVoted(uint256 indexed id, uint256 indexed nftId, uint8 choice, uint256 votesCast, uint256 creditsCost);
    event ProposalExecuted(uint256 indexed id, bool approved);

    constructor(
        address initialOwner,
        address _memberNft,
        address _treasury
    ) Ownable(initialOwner) {
        memberNft = VeritasMemberNFT(_memberNft);
        treasury = VeritasTreasury(_treasury);
        governanceStartTime = block.timestamp;
    }

    /**
     * @dev Returns the current governance year (0-indexed).
     */
    function getCurrentYear() public view returns (uint256) {
        return (block.timestamp - governanceStartTime) / 365 days;
    }

    /**
     * @dev Returns the remaining voting credits for an NFT in the current year.
     */
    function getRemainingCredits(uint256 _nftId) public view returns (uint256) {
        uint256 year = getCurrentYear();
        return CREDITS_PER_YEAR - creditsSpent[year][_nftId];
    }

    // ═══════════════════════════════════════════════════════════════
    //  IDEA BASKET
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Submit an idea to the basket. Requires owning an NFT.
     */
    function submitIdea(uint256 _nftId, string calldata _title, string calldata _description) external {
        require(memberNft.ownerOf(_nftId) == msg.sender, "Governance: Not the NFT owner");
        
        ideaCount++;
        ideas[ideaCount] = Idea({
            id: ideaCount,
            proposer: msg.sender,
            title: _title,
            description: _description,
            qvVotes: 0,
            timestamp: block.timestamp
        });

        emit IdeaSubmitted(ideaCount, msg.sender, _title);
    }

    /**
     * @dev Vote on an idea using Quadratic Voting.
     * Members can add more votes later; the marginal cost is calculated dynamically.
     */
    function voteOnIdea(uint256 _ideaId, uint256 _nftId, uint256 _additionalVotes) external {
        require(memberNft.ownerOf(_nftId) == msg.sender, "Governance: Not the NFT owner");
        require(_additionalVotes > 0, "Governance: Must cast at least 1 vote");
        require(_ideaId > 0 && _ideaId <= ideaCount, "Governance: Idea does not exist");

        uint256 currentVotes = ideaVotesAllocated[_ideaId][_nftId];
        uint256 newTotalVotes = currentVotes + _additionalVotes;
        
        uint256 currentCost = currentVotes * currentVotes;
        uint256 newTotalCost = newTotalVotes * newTotalVotes;
        uint256 marginalCost = newTotalCost - currentCost;

        uint256 year = getCurrentYear();
        require(creditsSpent[year][_nftId] + marginalCost <= CREDITS_PER_YEAR, "Governance: Insufficient yearly credits");

        creditsSpent[year][_nftId] += marginalCost;
        ideaVotesAllocated[_ideaId][_nftId] = newTotalVotes;
        
        ideas[_ideaId].qvVotes += _additionalVotes;

        emit IdeaVoted(_ideaId, _nftId, _additionalVotes, marginalCost);
    }

    // ═══════════════════════════════════════════════════════════════
    //  PROPOSALS
    // ═══════════════════════════════════════════════════════════════

    /**
     * @dev Create an official proposal (usually from top ideas). Only Council.
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
            executed: false,
            exists: true
        });

        emit ProposalCreated(id, _title, block.timestamp, end);
        return id;
    }

    /**
     * @dev Vote on a proposal using Quadratic Voting.
     * Can add weight to an existing vote, but cannot change the choice (For/Against/Abstain).
     */
    function castProposalVote(uint256 _proposalId, uint256 _nftId, uint8 _choice, uint256 _additionalVotes) external {
        Proposal storage prop = proposals[_proposalId];
        require(prop.exists, "Governance: Proposal does not exist");
        require(block.timestamp >= prop.startTime, "Governance: Voting not started");
        require(block.timestamp <= prop.endTime, "Governance: Voting ended");
        require(_choice >= 1 && _choice <= 3, "Governance: Invalid choice (1-3)");
        require(_additionalVotes > 0, "Governance: Must cast at least 1 vote");

        require(memberNft.ownerOf(_nftId) == msg.sender, "Governance: Not the NFT owner");

        uint8 existingChoice = proposalVoteChoice[_proposalId][_nftId];
        if (existingChoice != 0) {
            require(existingChoice == _choice, "Governance: Cannot change vote choice, only add weight");
        } else {
            proposalVoteChoice[_proposalId][_nftId] = _choice;
        }

        uint256 currentVotes = proposalVotesAllocated[_proposalId][_nftId];
        uint256 newTotalVotes = currentVotes + _additionalVotes;
        
        uint256 currentCost = currentVotes * currentVotes;
        uint256 newTotalCost = newTotalVotes * newTotalVotes;
        uint256 marginalCost = newTotalCost - currentCost;

        uint256 year = getCurrentYear();
        require(creditsSpent[year][_nftId] + marginalCost <= CREDITS_PER_YEAR, "Governance: Insufficient yearly credits");

        creditsSpent[year][_nftId] += marginalCost;
        proposalVotesAllocated[_proposalId][_nftId] = newTotalVotes;

        if (_choice == 1) prop.votesFor += _additionalVotes;
        else if (_choice == 2) prop.votesAgainst += _additionalVotes;
        else prop.votesAbstain += _additionalVotes;

        emit ProposalVoted(_proposalId, _nftId, _choice, _additionalVotes, marginalCost);
    }

    /**
     * @dev Execute a proposal. Only Council.
     */
    function executeProposal(uint256 _proposalId) external onlyOwner {
        Proposal storage prop = proposals[_proposalId];
        require(prop.exists, "Governance: Proposal does not exist");
        require(block.timestamp > prop.endTime, "Governance: Voting period still active");
        require(!prop.executed, "Governance: Already executed");

        prop.executed = true;
        bool approved = prop.votesFor > prop.votesAgainst;

        emit ProposalExecuted(_proposalId, approved);
    }
}
