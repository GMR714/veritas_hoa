const hre = require("hardhat");

async function main() {
  const nftAddress = "0xaA3628ee6D291BDc2654799Faa1Ca06926133692";
  const govAddress = "0x70170cbAE7747D4574f23530DaF513AA257Be9b6";

  const nft = await hre.ethers.getContractAt("VeritasMemberNFT", nftAddress);
  const gov = await hre.ethers.getContractAt("VeritasGovernance", govAddress);

  const supply = Number(await nft.totalSupply());
  console.log(`Total de NFTs mintados: ${supply}`);

  for (let i = 1; i <= supply; i++) {
    try {
      const owner = await nft.ownerOf(i);
      const credits = await gov.getRemainingCredits(i);
      console.log(`NFT #${i} | Dono: ${owner} | Créditos: ${credits}`);
    } catch (e) {
      console.log(`NFT #${i} falhou:`, e.message);
    }
  }
}

main().catch(console.error);