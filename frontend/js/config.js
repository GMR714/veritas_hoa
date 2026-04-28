export const API_URL = "http://localhost:3001/api";

export const CONTRACT_ADDRESSES = {
  NFT: "0xa1851Eb7B8aC7a684ef22EC3b3766A7583d62A80",
  GOVERNANCE: "0x0dD18e9cc000245C3442c181206de42762f6A537"
};

export const ABIS = {
  NFT: [
    "function owner() view returns (address)",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function safeMint(address to) returns (uint256)"
  ],
  GOVERNANCE: [
    "function owner() view returns (address)",
    "function getCurrentYear() view returns (uint256)",
    "function getRemainingCredits(uint256 _nftId) view returns (uint256)",
    "function submitIdea(uint256 _nftId, string calldata _title, string calldata _description)",
    "function voteOnIdea(uint256 _ideaId, uint256 _nftId, uint256 _additionalVotes)",
    "function createProposal(string calldata _title, string calldata _description, uint256 _durationMinutes)",
    "function castProposalVote(uint256 _proposalId, uint256 _nftId, uint8 _choice, uint256 _additionalVotes)",
    "function executeProposal(uint256 _proposalId)",
    "function promoteIdea(uint256 _ideaId, uint256 _durationMinutes)",
    "function ideaCount() view returns (uint256)",
    "function ideas(uint256) view returns (uint256 id, address proposer, string title, string description, uint256 qvVotes, uint256 timestamp, bool isPromoted)",
    "function proposalCount() view returns (uint256)",
    "function proposals(uint256) view returns (uint256 id, string title, string description, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstain, uint256 startTime, uint256 endTime, bool executed, bool exists)"
  ]
};
