const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VeritasMemberNFT", function () {
  let nft;
  let council, member1, member2, outsider;

  beforeEach(async function () {
    [council, member1, member2, outsider] = await ethers.getSigners();
    const VeritasMemberNFT = await ethers.getContractFactory("VeritasMemberNFT");
    nft = await VeritasMemberNFT.deploy(council.address);
    await nft.waitForDeployment();
  });

  describe("Deploy", function () {
    it("deve definir o owner como o conselho", async function () {
      expect(await nft.owner()).to.equal(council.address);
    });

    it("deve ter nome e símbolo corretos", async function () {
      expect(await nft.name()).to.equal("Veritas Member NFT");
      expect(await nft.symbol()).to.equal("VNFT");
    });

    it("deve ter totalSupply 0 após deploy", async function () {
      expect(await nft.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("deve permitir ao conselho mintar um NFT", async function () {
      await nft.connect(council).safeMint(member1.address);
      expect(await nft.ownerOf(1)).to.equal(member1.address);
      expect(await nft.totalSupply()).to.equal(1);
    });

    it("deve incrementar IDs sequencialmente", async function () {
      await nft.connect(council).safeMint(member1.address);
      await nft.connect(council).safeMint(member2.address);
      expect(await nft.ownerOf(1)).to.equal(member1.address);
      expect(await nft.ownerOf(2)).to.equal(member2.address);
      expect(await nft.totalSupply()).to.equal(2);
    });

    it("deve emitir evento Transfer ao mintar", async function () {
      await expect(nft.connect(council).safeMint(member1.address))
        .to.emit(nft, "Transfer")
        .withArgs(ethers.ZeroAddress, member1.address, 1);
    });

    it("NÃO deve permitir non-owner mintar", async function () {
      await expect(
        nft.connect(outsider).safeMint(member1.address)
      ).to.be.revertedWithCustomError(nft, "OwnableUnauthorizedAccount");
    });

    it("deve permitir mintar múltiplos NFTs para o mesmo endereço", async function () {
      await nft.connect(council).safeMint(member1.address);
      await nft.connect(council).safeMint(member1.address);
      expect(await nft.balanceOf(member1.address)).to.equal(2);
    });
  });

  describe("Transferência", function () {
    it("deve permitir ao dono transferir o NFT", async function () {
      await nft.connect(council).safeMint(member1.address);
      await nft.connect(member1).transferFrom(member1.address, member2.address, 1);
      expect(await nft.ownerOf(1)).to.equal(member2.address);
    });
  });
});
