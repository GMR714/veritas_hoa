const hre = require("hardhat");

async function main() {
  const nftAddress = "0x7e372c4b5F12F9203186fAeD4179697773660322";
  const govAddress = "0x58a907780E252b45a5bC92e9199c4005e8e2A26d";

  const nft = await hre.ethers.getContractAt("VeritasMemberNFT", nftAddress);
  const gov = await hre.ethers.getContractAt("VeritasGovernance", govAddress);

  // We will impersonate or use the deployer (which is the admin, Lot 2)
  const [deployer] = await hre.ethers.getSigners();
  const userAddress = deployer.address; // 0x1F241f578192f21E93388D67a35420E6DC7adF51

  console.log(`Testando com a conta: ${userAddress}`);

  // Find which NFT belongs to this user
  const supply = Number(await nft.totalSupply());
  let userNftId = null;

  for (let i = 1; i <= supply; i++) {
    const owner = await nft.ownerOf(i);
    if (owner.toLowerCase() === userAddress.toLowerCase()) {
      userNftId = i;
      break;
    }
  }

  if (!userNftId) {
    throw new Error(`A conta ${userAddress} não possui nenhum NFT!`);
  }

  console.log(`✅ A conta é dona do Lote #${userNftId}`);

  // Check credits
  const credits = await gov.getRemainingCredits(userNftId);
  console.log(`✅ Créditos disponíveis: ${credits}`);

  if (credits == 0) {
    throw new Error("A conta tem 0 créditos.");
  }

  // Attempt to submit an idea
  console.log("Submetendo uma ideia de teste...");
  const tx = await gov.connect(deployer).submitIdea(userNftId, "Ideia de Teste Automatizado", "Esta ideia foi gerada por um script para validar o funcionamento do contrato.");
  await tx.wait();
  
  console.log("✅ Ideia submetida com sucesso!");

  // Verify idea was added
  const ideaCount = await gov.ideaCount();
  const idea = await gov.ideas(ideaCount);
  console.log(`Verificação: A ideia #${ideaCount} é "${idea.title}" enviada por ${idea.proposer}`);
}

main().catch(console.error);