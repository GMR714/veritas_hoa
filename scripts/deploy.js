const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();

  if (signers.length === 0) {
    console.error("❌ Nenhuma conta configurada!");
    console.error("   Verifique se PRIVATE_KEY no .env tem o prefixo 0x e 66 caracteres totais.");
    console.error("   Exemplo: PRIVATE_KEY=0xabc123...def456");
    process.exit(1);
  }

  const deployer = signers[0];

  console.log("=".repeat(60));
  console.log("  Veritas Village HOA — Deploy");
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

  // 2. Deploy VeritasTreasury
  console.log("\n[2/2] Deploying VeritasTreasury...");
  const VeritasTreasury = await hre.ethers.getContractFactory("VeritasTreasury");
  const treasury = await VeritasTreasury.deploy(deployer.address, nftAddress);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("  ✅ VeritasTreasury deployed to:", treasuryAddress);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("  Deploy Completo!");
  console.log("=".repeat(60));
  console.log(`  NFT_ADDRESS=${nftAddress}`);
  console.log(`  TREASURY_ADDRESS=${treasuryAddress}`);
  console.log("\n  Atualize seu .env com os endereços acima.");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
