const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  // Hardcoded addresses from frontend
  const nftAddress = "0xaA3628ee6D291BDc2654799Faa1Ca06926133692";
  const treasuryAddress = "0x632acd882Eb272398Cc6c4e4D391E4Cd97779d65";

  const nft = await hre.ethers.getContractAt("VeritasMemberNFT", nftAddress);
  const treasury = await hre.ethers.getContractAt("VeritasTreasury", treasuryAddress);

  const addresses = [
    "0x1F241f578192f21E93388D67a35420E6DC7adF51", // Admin (Conselho)
    "0x2f2A9fF7079B0BdaFFEb385f17629c4793276CB3", // Lote 2
    "0x399f446D4cd4fC97F4056B07749F9FbE362adbf4"  // Lote 3
  ];

  console.log("Conectado como deployer:", deployer.address);
  console.log("Configurando taxa mínima...");
  const minDues = hre.ethers.parseEther("0.0001");
  await (await treasury.connect(deployer).setMinDues(minDues)).wait();
  
  for (let i = 0; i < 3; i++) {
    const targetAddress = addresses[i];
    const targetId = i + 1;
    
    let currentOwner = null;
    try {
      currentOwner = await nft.ownerOf(targetId);
    } catch(e) {
      // Não mintado ainda
    }

    if (currentOwner) {
      if (currentOwner.toLowerCase() !== targetAddress.toLowerCase()) {
        console.log(`Transferindo NFT #${targetId} de ${currentOwner} para ${targetAddress}...`);
        try {
          const tx = await nft.connect(deployer).transferFrom(currentOwner, targetAddress, targetId);
          await tx.wait();
          console.log(`✅ Transferido para ${targetAddress}`);
        } catch(e) {
          console.log(`❌ Erro ao transferir:`, e.message);
        }
      } else {
        console.log(`✅ NFT #${targetId} já pertence a ${targetAddress}`);
      }
    } else {
      console.log(`Mintando NFT #${targetId} para ${targetAddress}...`);
      try {
        const tx = await nft.connect(deployer).safeMint(targetAddress);
        await tx.wait();
        console.log(`✅ Mintado!`);
      } catch(e) {
        console.log(`❌ Erro ao mintar:`, e.message);
      }
    }
  }

  console.log("Configuração concluída para os contratos mais recentes!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
