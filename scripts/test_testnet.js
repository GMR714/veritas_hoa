const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  const [council] = await ethers.getSigners();

  const nftAddress = "0x2B2164161f1609678E773A8AeC9d57aF284F73ce";
  const treasuryAddress = "0xaB3941904500e3d9a52ABF2312bc76fe40cB5123";
  const governanceAddress = "0x6de58a448719da66f967A98a77EF5CCeDb4CcBE4";

  console.log("=".repeat(60));
  console.log("  Testando na Testnet: Votação Quadrática com VÁRIOS MORADORES");
  console.log("=".repeat(60));
  console.log(`  Admin (Conselho): ${council.address}`);
  console.log(`  Contrato Governance: ${governanceAddress}`);

  const nft = await ethers.getContractAt("VeritasMemberNFT", nftAddress);
  const governance = await ethers.getContractAt("VeritasGovernance", governanceAddress);

  // 1. Criar Carteiras Temporárias (Membros Simulados)
  console.log("\n[1] Criando carteiras de moradores temporárias para o teste...");
  const member1 = ethers.Wallet.createRandom().connect(ethers.provider);
  const member2 = ethers.Wallet.createRandom().connect(ethers.provider);

  console.log(`  👤 Morador 1 (Aleatório): ${member1.address}`);
  console.log(`  👤 Morador 2 (Aleatório): ${member2.address}`);

  // 2. Financiar os moradores com um pouco de RBTC para pagarem o gas
  console.log("\n[2] Financiando os moradores para pagarem as taxas de gas...");
  const fundAmount = ethers.parseEther("0.001"); // Aumentado para 0.001 RBTC cada para sobrar gas!
  
  let txFund1 = await council.sendTransaction({ to: member1.address, value: fundAmount });
  await txFund1.wait();
  console.log(`  ✅ Morador 1 financiado com sucesso!`);
  
  let txFund2 = await council.sendTransaction({ to: member2.address, value: fundAmount });
  await txFund2.wait();
  console.log(`  ✅ Morador 2 financiado com sucesso!`);

  // 3. Mintar NFTs para os novos moradores
  console.log("\n[3] Mintando NFTs para identificar os moradores...");
  let txMint1 = await nft.connect(council).safeMint(member1.address);
  await txMint1.wait();
  const nftId1 = await nft.totalSupply();
  console.log(`  ✅ NFT #${nftId1} mintado para Morador 1`);

  let txMint2 = await nft.connect(council).safeMint(member2.address);
  await txMint2.wait();
  const nftId2 = await nft.totalSupply();
  console.log(`  ✅ NFT #${nftId2} mintado para Morador 2`);

  // 4. Submeter ideias
  console.log("\n[4] Moradores submetem ideias na Fase de Filtro...");
  const ideaTitle1 = "Ideia do Morador 1 - " + Math.floor(Math.random() * 1000);
  let txIdea1 = await governance.connect(member1).submitIdea(nftId1, ideaTitle1, "Construir uma quadra");
  await txIdea1.wait();
  console.log(`  ✅ Ideia submetida pelo Morador 1`);

  const ideaTitle2 = "Ideia do Morador 2 - " + Math.floor(Math.random() * 1000);
  let txIdea2 = await governance.connect(member2).submitIdea(nftId2, ideaTitle2, "Reformar o salão de festas");
  await txIdea2.wait();
  console.log(`  ✅ Ideia submetida pelo Morador 2`);

  const totalIdeas = await governance.ideaCount();

  // 5. Votação Quadrática nas Ideias
  console.log("\n[5] Moradores usam seus créditos para votar (Quadrático)...");
  
  // Morador 1 dá 4 votos na própria ideia (Custo = 16 créditos. Restam 84)
  console.log(`  👤 Morador 1 investe 4 votos na sua ideia (Custo: 16 créditos)...`);
  let txVoteM1 = await governance.connect(member1).voteOnIdea(totalIdeas - 1n, nftId1, 4);
  await txVoteM1.wait();

  // Morador 2 dá 6 votos na própria ideia (Custo = 36 créditos. Restam 64)
  console.log(`  👤 Morador 2 investe 6 votos na sua ideia (Custo: 36 créditos)...`);
  let txVoteM2 = await governance.connect(member2).voteOnIdea(totalIdeas, nftId2, 6);
  await txVoteM2.wait();

  // 6. Conselho cria a Proposta Oficial (Fase Real)
  console.log("\n[6] Conselho transforma a ideia vencedora em Proposta Oficial (5 min)...");
  let txProp = await governance.connect(council).createProposal("Oficial: " + ideaTitle2, "Aprovando a ideia mais votada", 5);
  await txProp.wait();
  const propCount = await governance.proposalCount();
  console.log(`  ✅ Proposta #${propCount} criada com sucesso!`);

  // 7. Votação na Proposta Oficial
  console.log("\n[7] Votação Real na Proposta...");
  
  // Morador 1 vota CONTRA (Choice 2) com 5 votos (Custo = 25 créditos. Tinha 84, sobram 59)
  console.log(`  👤 Morador 1 vota CONTRA com 5 votos (Custo: 25 créditos)...`);
  let txPropVote1 = await governance.connect(member1).castProposalVote(propCount, nftId1, 2, 5);
  await txPropVote1.wait();

  // Morador 2 vota A FAVOR (Choice 1) com 7 votos (Custo = 49 créditos. Tinha 64, sobram 15)
  console.log(`  👤 Morador 2 vota A FAVOR com 7 votos (Custo: 49 créditos)...`);
  let txPropVote2 = await governance.connect(member2).castProposalVote(propCount, nftId2, 1, 7);
  await txPropVote2.wait();

  // 8. Resultados
  const prop = await governance.proposals(propCount);
  console.log("\n" + "=".repeat(60));
  console.log(`  RESULTADO DA VOTAÇÃO - Proposta #${propCount}`);
  console.log("=".repeat(60));
  console.log(`  A Favor : ${prop.votesFor} votos`);
  console.log(`  Contra  : ${prop.votesAgainst} votos`);
  console.log(`  Status  : ${prop.votesFor > prop.votesAgainst ? 'APROVADA ✅' : 'REJEITADA ❌'}`);

  const cred1 = await governance.getRemainingCredits(nftId1);
  const cred2 = await governance.getRemainingCredits(nftId2);
  console.log(`\n  💳 Créditos Restantes (Membro 1 - NFT #${nftId1}): ${cred1}`);
  console.log(`  💳 Créditos Restantes (Membro 2 - NFT #${nftId2}): ${cred2}`);
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});