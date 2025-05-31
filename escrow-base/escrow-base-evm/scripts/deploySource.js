// scripts/deploySource.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(
    `Deploying FusionEscrowSource to network "${hre.network.name}" with account: ${deployer.address}`
  );
  console.log(`Account balance: ${(await deployer.getBalance()).toString()} ETH`);

  const FusionEscrowSource = await hre.ethers.getContractFactory("FusionEscrowSource");
  const fusionEscrowSource = await FusionEscrowSource.deploy();
  
  await fusionEscrowSource.deployed();

  console.log("FusionEscrowSource deployed to:", fusionEscrowSource.address);
  console.log(`Transaction hash: ${fusionEscrowSource.deployTransaction.hash}`);
  console.log("Remember to save this address for your .env file or application configuration.");
}

main().catch((error) => {
  console.error("Error deploying FusionEscrowSource:", error);
  process.exitCode = 1;
});
