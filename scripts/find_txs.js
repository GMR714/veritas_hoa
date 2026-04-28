const hre = require("hardhat");

async function main() {
  const deployer = "0x1F241f578192f21E93388D67a35420E6DC7adF51".toLowerCase();
  const provider = hre.ethers.provider;
  
  const currentBlock = await provider.getBlockNumber();
  const searchRange = 50; // Search last 50 blocks
  
  console.log(`Buscando transações do deployer ${deployer} nos últimos ${searchRange} blocos...`);

  for (let i = currentBlock; i > currentBlock - searchRange; i--) {
    const block = await provider.getBlock(i, true);
    if (!block) continue;
    
    for (const txHash of block.transactions) {
      const tx = typeof txHash === 'string' ? await provider.getTransaction(txHash) : txHash;
      if (tx && tx.from && tx.from.toLowerCase() === deployer) {
        console.log(`- Bloco ${i}: Hash ${tx.hash}`);
        if (tx.to === null || tx.to === undefined) {
          // Contract creation
          const receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt) {
            console.log(`  📦 Contrato criado em: ${receipt.contractAddress}`);
          }
        }
      }
    }
  }
}

main().catch(console.error);
