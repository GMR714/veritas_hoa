const hre = require("hardhat");

/**
 * Veritas Village HOA — Interaction Script
 * 
 * Usage:
 *   npx hardhat run scripts/interact.js --network localhost
 *   npx hardhat run scripts/interact.js --network rskTestnet
 * 
 * This script demonstrates the full lifecycle:
 *   1. Mint NFTs for members
 *   2. Pay dues
 *   3. Check delinquency
 *   4. Withdraw funds (council)
 */

async function main() {
  const [council, member1, member2, member3] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("  Veritas Village HOA — Interaction Demo");
  console.log("=".repeat(60));

  // --- Get deployed contract addresses from env or deploy fresh ---
  let nftAddress = process.env.NFT_ADDRESS;
  let treasuryAddress = process.env.TREASURY_ADDRESS;

  let nft, treasury;

  if (!nftAddress || nftAddress === "" || nftAddress === "0x...") {
    console.log("\n⚙️  Nenhum contrato encontrado no .env. Fazendo deploy local...\n");

    const VeritasMemberNFT = await hre.ethers.getContractFactory("VeritasMemberNFT");
    nft = await VeritasMemberNFT.deploy(council.address);
    await nft.waitForDeployment();
    nftAddress = await nft.getAddress();

    const VeritasTreasury = await hre.ethers.getContractFactory("VeritasTreasury");
    treasury = await VeritasTreasury.deploy(council.address, nftAddress);
    await treasury.waitForDeployment();
    treasuryAddress = await treasury.getAddress();

    console.log("  NFT:", nftAddress);
    console.log("  Treasury:", treasuryAddress);
  } else {
    nft = await hre.ethers.getContractAt("VeritasMemberNFT", nftAddress);
    treasury = await hre.ethers.getContractAt("VeritasTreasury", treasuryAddress);
    console.log("\n📋 Usando contratos do .env:");
    console.log("  NFT:", nftAddress);
    console.log("  Treasury:", treasuryAddress);
  }

  // --- Step 1: Mint NFTs ---
  console.log("\n" + "-".repeat(60));
  console.log("  Passo 1: Mintando NFTs para membros");
  console.log("-".repeat(60));

  const signers = [member1, member2, member3].filter(Boolean);
  const memberNames = ["Membro 1", "Membro 2", "Membro 3"];

  for (let i = 0; i < signers.length; i++) {
    try {
      const tx = await nft.connect(council).safeMint(signers[i].address);
      const receipt = await tx.wait();
      console.log(`  ✅ ${memberNames[i]} (${signers[i].address}) → NFT #${i + 1}`);
    } catch (e) {
      console.log(`  ⚠️  ${memberNames[i]}: ${e.message.substring(0, 80)}`);
    }
  }

  const totalSupply = await nft.totalSupply();
  console.log(`\n  Total NFTs mintados: ${totalSupply}`);

  // --- Step 2: Set minimum dues ---
  console.log("\n" + "-".repeat(60));
  console.log("  Passo 2: Configurando taxa mínima");
  console.log("-".repeat(60));

  const minDues = hre.ethers.parseEther("0.001"); // 0.001 RBTC
  await (await treasury.connect(council).setMinDues(minDues)).wait();
  console.log(`  ✅ Taxa mínima: ${hre.ethers.formatEther(minDues)} RBTC`);

  // --- Step 3: Pay dues ---
  console.log("\n" + "-".repeat(60));
  console.log("  Passo 3: Pagando taxas condominiais");
  console.log("-".repeat(60));

  const paymentAmount = hre.ethers.parseEther("0.005"); // 0.005 RBTC

  // Member 1 pays for NFT #1
  if (signers[0]) {
    try {
      const tx = await treasury.connect(signers[0]).payDues(1, { value: paymentAmount });
      await tx.wait();
      console.log(`  ✅ Membro 1 pagou ${hre.ethers.formatEther(paymentAmount)} RBTC para NFT #1`);
    } catch (e) {
      console.log(`  ❌ Membro 1: ${e.message.substring(0, 80)}`);
    }
  }

  // Member 2 pays for NFT #2
  if (signers[1]) {
    try {
      const tx = await treasury.connect(signers[1]).payDues(2, { value: paymentAmount });
      await tx.wait();
      console.log(`  ✅ Membro 2 pagou ${hre.ethers.formatEther(paymentAmount)} RBTC para NFT #2`);
    } catch (e) {
      console.log(`  ❌ Membro 2: ${e.message.substring(0, 80)}`);
    }
  }

  // Member 3 does NOT pay — will be delinquent
  console.log(`  ⏭️  Membro 3 NÃO pagou (simulando inadimplência)`);

  // --- Step 4: Check delinquency ---
  console.log("\n" + "-".repeat(60));
  console.log("  Passo 4: Verificando inadimplência (threshold: 0 dias para demo)");
  console.log("-".repeat(60));

  for (let id = 1; id <= Number(totalSupply); id++) {
    const isDelinquent = await treasury.isDelinquent(id, 0);
    const lastPaid = await treasury.lastPaidTimestamp(id);
    const owner = await nft.ownerOf(id);
    const status = isDelinquent ? "❌ INADIMPLENTE" : "✅ EM DIA";
    console.log(`  NFT #${id} | ${owner} | Último pgto: ${lastPaid > 0 ? new Date(Number(lastPaid) * 1000).toISOString() : "NUNCA"} | ${status}`);
  }

  // --- Step 5: Treasury balance & withdraw ---
  console.log("\n" + "-".repeat(60));
  console.log("  Passo 5: Saldo e saque do Conselho");
  console.log("-".repeat(60));

  const balance = await treasury.getBalance();
  console.log(`  💰 Saldo do Treasury: ${hre.ethers.formatEther(balance)} RBTC`);

  if (balance > 0n) {
    const councilBalBefore = await hre.ethers.provider.getBalance(council.address);
    const tx = await treasury.connect(council).withdraw();
    await tx.wait();
    const councilBalAfter = await hre.ethers.provider.getBalance(council.address);
    console.log(`  ✅ Saque realizado!`);
    console.log(`  Saldo Conselho: ${hre.ethers.formatEther(councilBalBefore)} → ${hre.ethers.formatEther(councilBalAfter)} RBTC`);
  }

  const balanceAfter = await treasury.getBalance();
  console.log(`  💰 Saldo Treasury após saque: ${hre.ethers.formatEther(balanceAfter)} RBTC`);

  console.log("\n" + "=".repeat(60));
  console.log("  Demo completa!");
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
