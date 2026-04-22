const hre = require("hardhat");

async function main() {
  const [council] = await hre.ethers.getSigners();
  const nftAddress = process.env.NFT_ADDRESS;
  const treasuryAddress = process.env.TREASURY_ADDRESS;

  if (!nftAddress || !treasuryAddress) {
    throw new Error("Endereços do .env não encontrados");
  }

  console.log("Populando contratos na testnet usando endereço:", council.address);

  const nft = await hre.ethers.getContractAt("VeritasMemberNFT", nftAddress);
  const treasury = await hre.ethers.getContractAt("VeritasTreasury", treasuryAddress);

  console.log("Configurando taxa mínima...");
  const minDues = hre.ethers.parseEther("0.0001");
  await (await treasury.connect(council).setMinDues(minDues)).wait();
  console.log("✅ Taxa mínima configurada para 0.0001 RBTC.");

  console.log("Mintando 3 NFTs...");
  for (let i = 1; i <= 3; i++) {
    const tx = await nft.connect(council).safeMint(council.address);
    await tx.wait();
    const supply = await nft.totalSupply();
    console.log(`✅ NFT #${supply} mintado para ${council.address}`);
  }

  console.log("Pagando taxas...");
  const paymentAmount = hre.ethers.parseEther("0.0005");
  
  // Como o supply aumentou em 3, vamos garantir que pagamos pros IDs mais recentes
  const supply = Number(await nft.totalSupply());

  try {
      let tx = await treasury.connect(council).payDues(supply - 2, { value: paymentAmount });
      await tx.wait();
      console.log(`✅ Pagamento realizado para NFT #${supply - 2}`);
  } catch (e) {
      console.log("❌ Erro no pagamento 1:", e.message);
  }

  try {
      tx = await treasury.connect(council).payDues(supply - 1, { value: paymentAmount });
      await tx.wait();
      console.log(`✅ Pagamento realizado para NFT #${supply - 1}`);
  } catch (e) {
      console.log("❌ Erro no pagamento 2:", e.message);
  }

  console.log(`⏭️  NFT #${supply} deixado como inadimplente propositalmente.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
