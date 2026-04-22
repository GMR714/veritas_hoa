const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("VeritasTreasury", function () {
  let nft, treasury;
  let council, member1, member2, member3, outsider;

  const DUES_AMOUNT = ethers.parseEther("0.005");
  const MIN_DUES = ethers.parseEther("0.001");

  beforeEach(async function () {
    [council, member1, member2, member3, outsider] = await ethers.getSigners();

    // Deploy NFT
    const VeritasMemberNFT = await ethers.getContractFactory("VeritasMemberNFT");
    nft = await VeritasMemberNFT.deploy(council.address);
    await nft.waitForDeployment();

    // Deploy Treasury
    const VeritasTreasury = await ethers.getContractFactory("VeritasTreasury");
    treasury = await VeritasTreasury.deploy(council.address, await nft.getAddress());
    await treasury.waitForDeployment();

    // Mint NFTs
    await nft.connect(council).safeMint(member1.address); // NFT #1
    await nft.connect(council).safeMint(member2.address); // NFT #2
    await nft.connect(council).safeMint(member3.address); // NFT #3

    // Set minimum dues
    await treasury.connect(council).setMinDues(MIN_DUES);
  });

  describe("Deploy", function () {
    it("deve definir o owner correto", async function () {
      expect(await treasury.owner()).to.equal(council.address);
    });

    it("deve apontar para o contrato NFT correto", async function () {
      expect(await treasury.memberNft()).to.equal(await nft.getAddress());
    });

    it("deve ter saldo 0 inicialmente", async function () {
      expect(await treasury.getBalance()).to.equal(0);
    });
  });

  describe("setMinDues", function () {
    it("deve permitir ao conselho alterar a taxa mínima", async function () {
      const newMin = ethers.parseEther("0.01");
      await expect(treasury.connect(council).setMinDues(newMin))
        .to.emit(treasury, "MinDuesUpdated")
        .withArgs(MIN_DUES, newMin);
      expect(await treasury.minDuesAmount()).to.equal(newMin);
    });

    it("NÃO deve permitir non-owner alterar a taxa", async function () {
      await expect(
        treasury.connect(outsider).setMinDues(ethers.parseEther("0.01"))
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("payDues", function () {
    it("deve aceitar pagamento do dono do NFT", async function () {
      await expect(
        treasury.connect(member1).payDues(1, { value: DUES_AMOUNT })
      ).to.emit(treasury, "DuesPaid");

      expect(await treasury.lastPaidTimestamp(1)).to.be.gt(0);
      expect(await treasury.getBalance()).to.equal(DUES_AMOUNT);
    });

    it("NÃO deve aceitar pagamento de quem não é dono do NFT", async function () {
      await expect(
        treasury.connect(outsider).payDues(1, { value: DUES_AMOUNT })
      ).to.be.revertedWith("Treasury: Only NFT owner can pay dues");
    });

    it("NÃO deve aceitar pagamento com valor 0", async function () {
      await expect(
        treasury.connect(member1).payDues(1, { value: 0 })
      ).to.be.revertedWith("Treasury: Payment must be greater than 0");
    });

    it("NÃO deve aceitar pagamento abaixo do mínimo", async function () {
      const belowMin = ethers.parseEther("0.0001");
      await expect(
        treasury.connect(member1).payDues(1, { value: belowMin })
      ).to.be.revertedWith("Treasury: Payment below minimum dues");
    });

    it("deve atualizar o timestamp após pagamento", async function () {
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });
      const ts1 = await treasury.lastPaidTimestamp(1);

      // Avançar tempo
      await time.increase(3600); // 1 hora

      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });
      const ts2 = await treasury.lastPaidTimestamp(1);

      expect(ts2).to.be.gt(ts1);
    });

    it("NÃO deve aceitar pagamento para NFT inexistente", async function () {
      await expect(
        treasury.connect(member1).payDues(999, { value: DUES_AMOUNT })
      ).to.be.reverted;
    });
  });

  describe("isDelinquent", function () {
    it("deve retornar true se nunca pagou", async function () {
      expect(await treasury.isDelinquent(1, 30)).to.be.true;
    });

    it("deve retornar false logo após pagamento", async function () {
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });
      expect(await treasury.isDelinquent(1, 30)).to.be.false;
    });

    it("deve retornar true após passar o threshold", async function () {
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });

      // Avançar 31 dias
      await time.increase(31 * 24 * 3600);

      expect(await treasury.isDelinquent(1, 30)).to.be.true;
    });

    it("deve respeitar diferentes thresholds", async function () {
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });

      // Avançar 15 dias
      await time.increase(15 * 24 * 3600);

      expect(await treasury.isDelinquent(1, 30)).to.be.false; // 15 < 30
      expect(await treasury.isDelinquent(1, 10)).to.be.true;  // 15 > 10
    });
  });

  describe("withdraw", function () {
    it("deve permitir ao conselho sacar fundos", async function () {
      // Dois membros pagam
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });
      await treasury.connect(member2).payDues(2, { value: DUES_AMOUNT });

      const expectedBalance = DUES_AMOUNT * 2n;
      expect(await treasury.getBalance()).to.equal(expectedBalance);

      await expect(treasury.connect(council).withdraw())
        .to.emit(treasury, "FundsWithdrawn")
        .withArgs(council.address, expectedBalance);

      expect(await treasury.getBalance()).to.equal(0);
    });

    it("NÃO deve permitir saque com saldo 0", async function () {
      await expect(
        treasury.connect(council).withdraw()
      ).to.be.revertedWith("Treasury: No funds to withdraw");
    });

    it("NÃO deve permitir non-owner sacar", async function () {
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });
      await expect(
        treasury.connect(outsider).withdraw()
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Cenário completo", function () {
    it("deve suportar ciclo completo: mint → pay → check → withdraw", async function () {
      // Pagamento dos membros 1 e 2 (membro 3 não paga)
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });
      await treasury.connect(member2).payDues(2, { value: DUES_AMOUNT });

      // Verificar inadimplência
      expect(await treasury.isDelinquent(1, 30)).to.be.false;
      expect(await treasury.isDelinquent(2, 30)).to.be.false;
      expect(await treasury.isDelinquent(3, 30)).to.be.true; // Nunca pagou

      // Avançar 31 dias
      await time.increase(31 * 24 * 3600);

      // Agora todos inadimplentes (membros 1 e 2 passaram de 30 dias)
      expect(await treasury.isDelinquent(1, 30)).to.be.true;
      expect(await treasury.isDelinquent(2, 30)).to.be.true;
      expect(await treasury.isDelinquent(3, 30)).to.be.true;

      // Membro 1 paga de novo
      await treasury.connect(member1).payDues(1, { value: DUES_AMOUNT });
      expect(await treasury.isDelinquent(1, 30)).to.be.false;

      // Conselho saca
      const balanceBefore = await treasury.getBalance();
      expect(balanceBefore).to.equal(DUES_AMOUNT * 3n); // 2 pagamentos iniciais + 1 renovação
      await treasury.connect(council).withdraw();
      expect(await treasury.getBalance()).to.equal(0);
    });
  });
});
