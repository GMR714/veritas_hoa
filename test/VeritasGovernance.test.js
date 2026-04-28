const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VeritasGovernance - Quadratic Voting and 2-Phase Process", function () {
  let nft, governance;
  let council, member1, member2, member3, outsider;

  beforeEach(async function () {
    [council, member1, member2, member3, outsider] = await ethers.getSigners();

    // Deploy NFT
    const VeritasMemberNFT = await ethers.getContractFactory("VeritasMemberNFT");
    nft = await VeritasMemberNFT.deploy(council.address);
    await nft.waitForDeployment();

    // Deploy Governance
    const VeritasGovernance = await ethers.getContractFactory("VeritasGovernance");
    governance = await VeritasGovernance.deploy(
      council.address,
      await nft.getAddress()
    );
    await governance.waitForDeployment();

    // Mint NFTs for members (Admin power)
    await nft.connect(council).safeMint(member1.address); // NFT #1
    await nft.connect(council).safeMint(member2.address); // NFT #2
    await nft.connect(council).safeMint(member3.address); // NFT #3
  });

  describe("Token-based Access & Quadratic Voting Costs", function () {
    it("deve permitir a submissão de ideias por donos de NFT", async function () {
      await expect(governance.connect(member1).submitIdea(1, "Idea 1", "Desc 1"))
        .to.emit(governance, "IdeaSubmitted")
        .withArgs(1, member1.address, "Idea 1");
    });

    it("NÃO deve permitir submissão por quem não é dono do NFT", async function () {
      await expect(
        governance.connect(outsider).submitIdea(1, "Idea 1", "Desc 1")
      ).to.be.revertedWith("Governance: Not the NFT owner");
    });

    it("deve aplicar custos quadráticos corretos (1 voto = 1, 2 = 4, 3 = 9, 10 = 100)", async function () {
      await governance.connect(member1).submitIdea(1, "Idea 1", "Desc 1");
      
      // 1 voto = custo 1
      await governance.connect(member1).voteOnIdea(1, 1, 1);
      expect(await governance.getRemainingCredits(1)).to.equal(99);

      // +2 votos (total 3) = custo 9. Já gastou 1, então custa +8
      await governance.connect(member1).voteOnIdea(1, 1, 2);
      expect(await governance.getRemainingCredits(1)).to.equal(91); // 100 - 9 = 91

      // 10 votos totais = custo 100. Já gastou 9, custa +91. Vai adicionar +7 votos
      await governance.connect(member1).voteOnIdea(1, 1, 7);
      expect(await governance.getRemainingCredits(1)).to.equal(0);
    });

    it("não deve permitir gastar mais que 100 créditos por ano", async function () {
      await governance.connect(member1).submitIdea(1, "Idea 1", "Desc 1");
      
      // Tentativa de 11 votos = custo 121 (reverte)
      await expect(
        governance.connect(member1).voteOnIdea(1, 1, 11)
      ).to.be.revertedWith("Governance: Insufficient yearly credits");
    });
  });

  describe("Fase 1: Filtro (Idea Basket) e Fase 2: Real (Proposals) com 5 minutos", function () {
    it("deve executar o fluxo completo de 2 fases simulando o mock das ideias", async function () {
      // 1. Mock das ideias (Fase de Filtro)
      await governance.connect(member1).submitIdea(1, "Construir Piscina", "Piscina comunitaria");
      await governance.connect(member2).submitIdea(2, "Pintar Muros", "Cor azul");
      await governance.connect(member3).submitIdea(3, "Nova Portaria", "Segurança 24h");

      // Votação na fase de filtro (Membros apoiam as ideias)
      // Member 1 gasta 25 creditos (5 votos) na piscina
      await governance.connect(member1).voteOnIdea(1, 1, 5);
      // Member 2 gasta 16 creditos (4 votos) na piscina e 9 creditos (3 votos) nos muros
      await governance.connect(member2).voteOnIdea(1, 2, 4);
      await governance.connect(member2).voteOnIdea(2, 2, 3);

      const ideaPiscina = await governance.ideas(1);
      expect(ideaPiscina.qvVotes).to.equal(9); // 5 + 4

      // 2. Fase Real (Council transforma a ideia com mais tração em Proposal)
      // Duração de 5 minutos
      await governance.connect(council).createProposal("Construir Piscina", "Piscina comunitaria oficial", 5);
      
      // Membros votam na Proposal (Fase Real)
      // Member 1 (NFT 1) vota A Favor (1) com +5 votos. (Ele tinha 75 créditos. 5 votos = 25 créditos)
      await governance.connect(member1).castProposalVote(1, 1, 1, 5);
      // Member 3 (NFT 3) vota Contra (2) com 6 votos. (Custo 36 créditos)
      await governance.connect(member3).castProposalVote(1, 3, 2, 6);

      let prop = await governance.proposals(1);
      expect(prop.votesFor).to.equal(5);
      expect(prop.votesAgainst).to.equal(6);

      // Avançar o tempo em 5 minutos para encerrar a votação
      await time.increase(5 * 60 + 1); // 5 minutos e 1 segundo

      // Tentar votar após 5 minutos deve falhar
      await expect(
        governance.connect(member2).castProposalVote(1, 2, 1, 1)
      ).to.be.revertedWith("Governance: Voting ended");

      // Conselho executa a proposal
      await expect(governance.connect(council).executeProposal(1))
        .to.emit(governance, "ProposalExecuted")
        .withArgs(1, false); // approved = false (5 for, 6 against)

      prop = await governance.proposals(1);
      expect(prop.executed).to.be.true;
    });
  });
});
osal
      await expect(governance.connect(council).executeProposal(1))
        .to.emit(governance, "ProposalExecuted")
        .withArgs(1, false); // approved = false (5 for, 6 against)

      prop = await governance.proposals(1);
      expect(prop.executed).to.be.true;
    });
  });
});
