const hre = require("hardhat");

async function main() {
  const deployer = "0x1F241f578192f21E93388D67a35420E6DC7adF51";
  console.log("Fetching recent transactions for deployer:", deployer);
  
  const provider = hre.ethers.provider;
  const blockNumber = await provider.getBlockNumber();
  
  // We'll look back 100 blocks
  const startBlock = blockNumber - 100;
  console.log(`Searching from block ${startBlock} to ${blockNumber}...`);

  // Note: Standard JSON-RPC doesn't have a direct "get transactions for address" 
  // without an indexer. But we can try to get the transaction count and work backwards
  // if we know the nonces.
  
  const txCount = await provider.getTransactionCount(deployer);
  console.log(`Total transactions for deployer: ${txCount}`);

  // The last 3 transactions should be our deployments (nonces txCount-1, txCount-2, txCount-3)
  // But wait, it's easier to just print the explorer links if we can't fetch them easily.
  // Actually, Hardhat keeps track of them if we used a deployment plugin, but we didn't.
  
  console.log("\nRecent deployment transactions (estimated based on last 3 txs):");
  // We can't easily fetch tx by nonce via standard provider without iterating or using an explorer API.
}

main().catch(console.error);
