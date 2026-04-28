const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];

  console.log("Minting with deployer:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "RBTC");

  const NFT_ADDRESS = "0x9174310cd9c6A5362E74536788d93b1a6079594a";
  const nft = await hre.ethers.getContractAt("VeritasMemberNFT", NFT_ADDRESS);

  const testWallets = [
    "0x2f2A9fF7079B0BdaFFEb385f17629c4793276CB3",
    "0x399f446D4cd4fC97F4056B07749F9FbE362adbf4"
  ];

  for (const wallet of testWallets) {
    console.log(`Minting para ${wallet}...`);
    try {
      const tx = await nft.safeMint(wallet);
      console.log(`  Tx enviada: ${tx.hash}`);
      await tx.wait();
      console.log(`  ✅ Minted!`);
    } catch (e) {
      console.error(`  ❌ Erro ao mintar para ${wallet}:`, e.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
