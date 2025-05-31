// scripts/deployDestination.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(
    `Deploying FusionEscrowDestination to network "${hre.network.name}" with account: ${deployer.address}`
  );
  console.log(`Account balance: ${(await deployer.getBalance()).toString()} ETH`);

  const FusionEscrowDestination = await hre.ethers.getContractFactory("FusionEscrowDestination");
  const fusionEscrowDestination = await FusionEscrowDestination.deploy();

  await fusionEscrowDestination.deployed();

  console.log("FusionEscrowDestination deployed to:", fusionEscrowDestination.address);
  console.log(`Transaction hash: ${fusionEscrowDestination.deployTransaction.hash}`);
  console.log("Remember to save this address for your .env file or application configuration.");
}

main().catch((error) => {
  console.error("Error deploying FusionEscrowDestination:", error);
  process.exitCode = 1;
});
