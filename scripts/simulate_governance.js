const hre = require("hardhat");

/**
 * Veritas Village HOA — Simulação Completa de Governança com Delegação
 * 
 * Este script demonstra o ciclo completo:
 *   1. Estado atual do condomínio
 *   2. Deploy do contrato de Governança (com delegação)
 *   3. Configuração de delegação (Lote #3 delega para o Conselho)
 *   4. Criação de proposta
 *   5. Votação: direta + delegada
 *   6. Override do voto delegado durante período de revisão
 *   7. Malha Fina (cruzamento votos × inadimplência)
 *   8. Resumo final com TODOS os hashes de transação
 * 
 * Uso:
 *   npx hardhat run scripts/simulate_governance.js --network rskTestnet
 */

function divider(char = "─", len = 60) {
  return char.repeat(len);
}

function header(text) {
  console.log("\n" + "═".repeat(60));
  console.log("  " + text);
  console.log("═".repeat(60));
}

function section(text) {
  console.log("\n" + divider("─", 60));
  console.log("  " + text);
  console.log(divider("─", 60));
}

// Collect all transaction hashes for final summary
const txLog = [];

function logTx(label, hash) {
  txLog.push({ label, hash });
  console.log(`  🔗 TX: ${hash}`);
}

async function main() {
  const [council] = await hre.ethers.getSigners();

  const nftAddress = process.env.NFT_ADDRESS;
  const treasuryAddress = process.env.TREASURY_ADDRESS;

  if (!nftAddress || !treasuryAddress) {
    console.log("❌ Configure NFT_ADDRESS e TREASURY_ADDRESS no .env primeiro!");
    process.exit(1);
  }

  header("🏘️  Veritas Village HOA — Simulação com Delegação de Voto");

  console.log(`  Conselho: ${council.address}`);
  console.log(`  NFT:      ${nftAddress}`);
  console.log(`  Treasury: ${treasuryAddress}`);

  const nft = await hre.ethers.getContractAt("VeritasMemberNFT", nftAddress);
  const treasury = await hre.ethers.getContractAt("VeritasTreasury", treasuryAddress);

  // ─── Passo 1: Estado Atual ────────────────────────────────────
  section("📋 Passo 1: Estado Atual do Condomínio");

  const totalSupply = Number(await nft.totalSupply());
  console.log(`  Total de lotes (NFTs): ${totalSupply}`);

  const memberData = [];
  for (let id = 1; id <= totalSupply; id++) {
    const owner = await nft.ownerOf(id);
    const lastPaid = Number(await treasury.lastPaidTimestamp(id));
    const isDelinquent = await treasury.isDelinquent(id, 0);
    memberData.push({ id, owner, lastPaid, isDelinquent });

    const status = lastPaid === 0 ? "❌ NUNCA PAGOU" : (isDelinquent ? "⚠️  ATRASADO" : "✅ EM DIA");
    const dateStr = lastPaid > 0 ? new Date(lastPaid * 1000).toLocaleString("pt-BR") : "---";
    console.log(`  Lote #${id} | ${owner.slice(0, 6)}...${owner.slice(-4)} | Pgto: ${dateStr} | ${status}`);
  }

  const adimplentes = memberData.filter(m => !m.isDelinquent).length;
  const inadimplentes = memberData.filter(m => m.isDelinquent).length;
  console.log(`\n  Resumo: ${adimplentes} em dia | ${inadimplentes} inadimplentes`);

  // ─── Passo 2: Deploy ──────────────────────────────────────────
  section("⚙️  Passo 2: Deploy do Contrato de Governança (v2 — com Delegação)");

  const VeritasGovernance = await hre.ethers.getContractFactory("VeritasGovernance");
  const governance = await VeritasGovernance.deploy(council.address, nftAddress, treasuryAddress);
  await governance.waitForDeployment();
  const govAddress = await governance.getAddress();

  console.log(`  ✅ VeritasGovernance v2 deployed: ${govAddress}`);
  const reviewPeriod = Number(await governance.reviewPeriod());
  console.log(`  ⏰ Período de revisão: ${reviewPeriod / 3600} horas`);

  // ─── Passo 3: Delegação ───────────────────────────────────────
  section("🤝 Passo 3: Configuração de Delegação");

  // Lote #3 delega voto para um segundo morador (mockDelegate)
  const mockDelegate = hre.ethers.Wallet.createRandom().connect(hre.ethers.provider);
  // Send 0.0001 RBTC to the delegate so it can pay for gas
  await council.sendTransaction({ to: mockDelegate.address, value: hre.ethers.parseEther("0.0001") });

  console.log(`  Lote #3 delega poder de voto para o Morador B...`);
  const txDelegate = await governance.connect(council).delegateVote(3, mockDelegate.address);
  await txDelegate.wait();
  console.log(`  ✅ Lote #3 delegou para ${mockDelegate.address.slice(0, 6)}...${mockDelegate.address.slice(-4)}`);
  logTx("Delegação Lote #3", txDelegate.hash);

  // Verificar delegação
  const delegateAddr = await governance.getDelegation(3);
  console.log(`  📌 Delegado do Lote #3: ${delegateAddr.slice(0, 6)}...${delegateAddr.slice(-4)}`);

  // ─── Passo 4: Proposta ────────────────────────────────────────
  section("📝 Passo 4: Criando Proposta de Assembleia");

  const proposalTitle = "Construção de Piscina Comunitária";
  const proposalDesc = "Proposta para aprovar orçamento de 5 RBTC para construção de piscina na área comum.";
  const durationMinutes = 60;

  const txCreate = await governance.connect(council).createProposal(
    proposalTitle,
    proposalDesc,
    durationMinutes
  );
  await txCreate.wait();
  logTx("Criar Proposta", txCreate.hash);

  const proposalId = Number(await governance.proposalCount());
  console.log(`  ✅ Proposta #${proposalId} criada!`);
  console.log(`  📌 Título: "${proposalTitle}"`);
  console.log(`  ⏱️  Duração votação: ${durationMinutes} min + ${reviewPeriod / 3600}h de revisão`);

  // ─── Passo 5: Votação ─────────────────────────────────────────
  section("🗳️  Passo 5: Votação (Direta + Delegada)");

  const choiceLabels = { 1: "A FAVOR ✅", 2: "CONTRA ❌", 3: "ABSTENÇÃO ⏸️" };

  // Lote #1 → Voto direto: A Favor
  console.log(`\n  ── Lote #1: Voto DIRETO ──`);
  const tx1 = await governance.connect(council).castVote(proposalId, 1, 1);
  await tx1.wait();
  console.log(`  🗳️  Lote #1 votou diretamente: ${choiceLabels[1]}`);
  logTx("Voto Direto Lote #1", tx1.hash);

  // Lote #2 → Voto direto: A Favor
  console.log(`\n  ── Lote #2: Voto DIRETO ──`);
  const tx2 = await governance.connect(council).castVote(proposalId, 2, 1);
  await tx2.wait();
  console.log(`  🗳️  Lote #2 votou diretamente: ${choiceLabels[1]}`);
  logTx("Voto Direto Lote #2", tx2.hash);

  // Lote #3 → Voto DELEGADO pelo Conselho: Contra
  console.log(`\n  ── Lote #3: Voto DELEGADO (pelo Morador B) ──`);
  const tx3 = await governance.connect(mockDelegate).castDelegatedVote(proposalId, 3, 2);
  await tx3.wait();
  console.log(`  🤝 Delegado votou pelo Lote #3: ${choiceLabels[2]}`);
  console.log(`  ⚠️  Este voto pode ser revogado pelo dono durante o período de revisão!`);
  logTx("Voto Delegado Lote #3", tx3.hash);

  // ─── Resultado Parcial ────────────────────────────────────────
  section("📊 Passo 6: Resultado da Votação (antes do override)");

  let prop = await governance.proposals(proposalId);
  let votesFor = Number(prop.votesFor);
  let votesAgainst = Number(prop.votesAgainst);
  let votesAbstain = Number(prop.votesAbstain);
  const totalVotes = votesFor + votesAgainst + votesAbstain;

  console.log(`  Proposta: "${prop.title}"`);
  console.log(`  ────────────────────────────────────`);
  console.log(`  ✅ A Favor:    ${votesFor} voto(s)`);
  console.log(`  ❌ Contra:     ${votesAgainst} voto(s)`);
  console.log(`  ⏸️  Abstenção:  ${votesAbstain} voto(s)`);
  console.log(`  ────────────────────────────────────`);
  console.log(`  Total:         ${totalVotes} voto(s)`);

  if (votesFor > votesAgainst) console.log(`  📢 Resultado parcial: APROVADA ✅`);
  else if (votesAgainst > votesFor) console.log(`  📢 Resultado parcial: REJEITADA ❌`);
  else console.log(`  📢 Resultado parcial: EMPATE ⚖️`);

  // ─── Override ─────────────────────────────────────────────────
  section("⚡ Passo 7: Override do Voto Delegado (Período de Revisão)");

  // Check what the delegate voted
  const delegatedChoice = Number(await governance.getDelegatedVoteChoice(proposalId, 3));
  console.log(`  👀 Dono do Lote #3 verifica: delegado votou "${choiceLabels[delegatedChoice]}"`);
  console.log(`  ❌ Dono discorda! Quer mudar para "A FAVOR"`);

  // NOTE: In real life, override only works AFTER voting ends (review period).
  // For demo purposes with hardhat local, we override via direct contract manipulation.
  // On testnet, we'd need to wait for the voting period to actually end.
  // Instead, we'll demonstrate the call signature and show what it would produce.

  console.log(`\n  ⚠️  NOTA: Na testnet real, o override só funciona após o fim da votação.`);
  console.log(`  Para demonstrar, mostramos o fluxo conceitual:`);
  console.log(`  → overrideDelegatedVote(propId=${proposalId}, nftId=3, newChoice=1)`);
  console.log(`  → Resultado: subtrai 1 voto "Contra", adiciona 1 voto "A Favor"`);
  console.log(`  → Placar ajustado: 3 A Favor × 0 Contra → APROVADA ✅`);

  // ─── MALHA FINA ───────────────────────────────────────────────
  section("🚨 Passo 8: MALHA FINA — Integridade dos Votos");

  const voterCount = Number(await governance.getVoterCount(proposalId));
  let flaggedVotes = 0;
  let cleanVotes = 0;

  console.log(`  Analisando ${voterCount} votante(s)...\n`);

  for (let i = 0; i < voterCount; i++) {
    const voterAddr = await governance.getVoter(proposalId, i);

    for (let nftId = 1; nftId <= totalSupply; nftId++) {
      const usedForVote = await governance.nftUsedForVote(proposalId, nftId);
      if (!usedForVote) continue;

      const nftOwner = await nft.ownerOf(nftId);
      if (nftOwner.toLowerCase() !== voterAddr.toLowerCase()) continue;

      const delinquent = await governance.isVoterDelinquent(nftId, 0);
      const vote = await governance.votes(proposalId, voterAddr);
      const choiceStr = choiceLabels[Number(vote.choice)] || "?";
      const delegated = vote.isDelegated ? " [DELEGADO]" : " [DIRETO]";

      if (delinquent) {
        flaggedVotes++;
        console.log(`  🚨 ALERTA: Lote #${nftId} (${voterAddr.slice(0, 6)}...${voterAddr.slice(-4)})${delegated}`);
        console.log(`     → Votou "${choiceStr}" mas está INADIMPLENTE!`);
        console.log(`     → Este voto pode ser INVALIDADO pelo regulamento.\n`);
      } else {
        cleanVotes++;
        console.log(`  ✅ Lote #${nftId} (${voterAddr.slice(0, 6)}...${voterAddr.slice(-4)})${delegated}`);
        console.log(`     → Votou "${choiceStr}" — em dia com o condomínio.\n`);
      }
    }
  }

  // ─── Resumo Final ─────────────────────────────────────────────
  header("📋 RESUMO FINAL DA ASSEMBLEIA");

  // Refresh proposal state
  prop = await governance.proposals(proposalId);
  votesFor = Number(prop.votesFor);
  votesAgainst = Number(prop.votesAgainst);
  votesAbstain = Number(prop.votesAbstain);

  console.log(`  Proposta: "${proposalTitle}"`);
  console.log(`  Contrato: ${govAddress}`);
  console.log(`\n  Votos Totais:     ${votesFor + votesAgainst + votesAbstain}`);
  console.log(`  Votos Válidos:    ${cleanVotes} (em dia)`);
  console.log(`  Votos Flagrados:  ${flaggedVotes} (inadimplentes)`);

  if (flaggedVotes > 0) {
    console.log(`\n  ⚠️  ATENÇÃO: ${flaggedVotes} voto(s) de moradores inadimplentes detectado(s)!`);
  }

  // ─── Hashes de Transação ──────────────────────────────────────
  header("🔗 HASHES DE TODAS AS TRANSAÇÕES");

  console.log(`  Explorer: https://explorer.testnet.rsk.co/tx/\n`);
  txLog.forEach((tx, i) => {
    console.log(`  ${i + 1}. ${tx.label}`);
    console.log(`     ${tx.hash}`);
    console.log(`     🔗 https://explorer.testnet.rsk.co/tx/${tx.hash}\n`);
  });

  console.log("═".repeat(60));
  console.log("  Simulação completa!");
  console.log("═".repeat(60));

  console.log(`\n  💾 Salve no .env:`);
  console.log(`     GOVERNANCE_ADDRESS=${govAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
