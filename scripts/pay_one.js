const hre = require("hardhat");

async function main() {
  const [council] = await hre.ethers.getSigners();
  const nftAddress = process.env.NFT_ADDRESS;
  const treasuryAddress = process.env.TREASURY_ADDRESS;

  const treasury = await hre.ethers.getContractAt("VeritasTreasury", treasuryAddress);
  
  // O mínimo configurado foi 0.0001
  const paymentAmount = hre.ethers.parseEther("0.0001");
  
  console.log("Pagando taxa de 0.0001 RBTC para o NFT #1...");
  const tx = await treasury.connect(council).payDues(1, { value: paymentAmount });
  await tx.wait();
  
  console.log("✅ Pagamento realizado com sucesso para o NFT #1!");
}

main().catch(console.error);
