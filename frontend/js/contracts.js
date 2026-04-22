export const CONTRACT_ADDRESSES = {
  NFT: "0xa1851Eb7B8aC7a684ef22EC3b3766A7583d62A80",
  TREASURY: "0xB3460d1f56b12d313A9A46AAc35862828Bdd4C0b",
  GOVERNANCE: "0xc3F65Bf1483E76Ef519e7016AD5C35De67654738" // V2 com delegação
};

export const ALIASES = {
  // Para demo, identificamos os moradores do lote preestabelecidos
  LOTE_1: "0x1F241f578192f21E93388D67a35420E6DC7adF51"
};

export const ABIS = {
  NFT: [
    "function ownerOf(uint256 tokenId) view returns (address)",
    "function totalSupply() view returns (uint256)"
  ],
  TREASURY: [
    "function isDelinquent(uint256 nftId, uint256 thresholdDays) view returns (bool)",
    "function payDues(uint256 nftId) payable",
    "function getBalance() view returns (uint256)",
    "function minDuesAmount() view returns (uint256)",
    "function lastPaidTimestamp(uint256 nftId) view returns (uint256)"
  ],
  GOVERNANCE: [
    "function delegateVote(uint256 _nftId, address _delegate)",
    "function revokeDelegation(uint256 _nftId)",
    "function getDelegation(uint256 _nftId) view returns (address)",
    "function castVote(uint256 _proposalId, uint256 _nftId, uint8 _choice)",
    "function castDelegatedVote(uint256 _proposalId, uint256 _nftId, uint8 _choice)",
    "function overrideDelegatedVote(uint256 _proposalId, uint256 _nftId, uint8 _newChoice)",
    "function proposals(uint256) view returns (uint256 id, string title, string description, uint256 votesFor, uint256 votesAgainst, uint256 votesAbstain, uint256 startTime, uint256 endTime, uint256 reviewEndTime, bool executed, bool exists)",
    "function proposalCount() view returns (uint256)",
    "function reviewPeriod() view returns (uint256)",
    "function votes(uint256, address) view returns (bool hasVoted, uint8 choice, uint256 nftId, uint256 timestamp, bool isDelegated, address castBy, bool wasOverridden)"
  ]
};
