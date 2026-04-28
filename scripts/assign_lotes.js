const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // NEW ADDRESSES
  const nftAddress = "0x7e372c4b5F12F9203186fAeD4179697773660322";
  const treasuryAddress = "0x898A40ab8CFA1d6DE98c708784A656c6fB940a90";

  const nft = await hre.ethers.getContractAt("VeritasMemberNFT", nftAddress);
  const treasury = await hre.ethers.getContractAt("VeritasTreasury", treasuryAddress);

  // A Nova Ordem Solicitada
  const userWallets = [
    "0x2f2A9fF7079B0BdaFFEb385f17629c4793276CB3", // Lote 1
    "0x1F241f578192f21E93388D67a35420E6DC7adF51", // Lote 2 (Admin)
    "0x399f446D4cd4fC97F4056B07749F9FbE362adbf4"  // Lote 3
  ];

  console.log(`Conectado como deployer: ${deployer.address}`);

  console.log("Configurando taxa mínima...");
  const minDues = hre.ethers.parseEther("0.0001");
  await (await treasury.connect(deployer).setMinDues(minDues)).wait();
  
  for (let i = 0; i < 3; i++) {
    const targetAddress = userWallets[i];
    const targetId = i + 1; // IDs: 1, 2, 3
    
    console.log(`Mintando novo Lote #${targetId} para ${targetAddress}...`);
    try {
      const tx = await nft.connect(deployer).safeMint(targetAddress);
      await tx.wait();
      console.log(`✅ Lote #${targetId} mintado para ${targetAddress}!`);
    } catch (e) {
      console.log(`❌ Erro ao mintar: ${e.shortMessage || e.message}`);
    }
  }

  console.log("-----------------------------------------");
  console.log("Verificação final:");
  const govAddress = "0x58a907780E252b45a5bC92e9199c4005e8e2A26d";
  const gov = await hre.ethers.getContractAt("VeritasGovernance", govAddress);
  
  for (let i = 1; i <= 3; i++) {
    try {
      const owner = await nft.ownerOf(i);
      const credits = await gov.getRemainingCredits(i);
      console.log(`Lote #${i} | Dono: ${owner} | Créditos Restantes: ${credits}`);
    } catch(e) {
      console.log(`Lote #${i} indisponível.`);
    }
  }
}

main().catch(console.error);