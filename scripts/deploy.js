const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();

  if (signers.length === 0) {
    console.error("❌ Nenhuma conta configurada!");
    process.exit(1);
  }

  const deployer = signers[0];

  console.log("=".repeat(60));
  console.log("  Veritas Village HOA — Deploy (Scoped Down)");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Network:", hre.network.name);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "RBTC");
  console.log("-".repeat(60));

  // 1. Deploy VeritasMemberNFT
  console.log("\n[1/2] Deploying VeritasMemberNFT...");
  const VeritasMemberNFT = await hre.ethers.getContractFactory("VeritasMemberNFT");
  const nft = await VeritasMemberNFT.deploy(deployer.address);
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("  ✅ VeritasMemberNFT deployed to:", nftAddress);

  // 2. Deploy VeritasGovernance
  console.log("\n[2/2] Deploying VeritasGovernance...");
  const VeritasGovernance = await hre.ethers.getContractFactory("VeritasGovernance");
  const governance = await VeritasGovernance.deploy(deployer.address, nftAddress);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("  ✅ VeritasGovernance deployed to:", governanceAddress);

  // 3. Mint NFTs to User Wallets
  console.log("\n[3] Minting NFTs para carteiras de teste...");
  const testWallets = [
    "0x1F241f578192f21E93388D67a35420E6DC7adF51",
    "0x2f2A9fF7079B0BdaFFEb385f17629c4793276CB3",
    "0x399f446D4cd4fC97F4056B07749F9FbE362adbf4"
  ];

  for (const wallet of testWallets) {
    console.log(`  Minting para ${wallet}...`);
    const tx = await nft.safeMint(wallet);
    await tx.wait();
    console.log(`  ✅ Minted!`);
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  Deploy Completo!");
  console.log("=".repeat(60));
  console.log(`  NFT_ADDRESS=${nftAddress}`);
  console.log(`  GOVERNANCE_ADDRESS=${governanceAddress}`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
