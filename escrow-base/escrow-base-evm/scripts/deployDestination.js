const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(
    `Deploying FusionEscrowDestination to network "${hre.network.name}" with account: ${deployer.address}`
  );

  const balanceBN = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Account balance: ${hre.ethers.formatEther(balanceBN)} ETH`);

  const FusionEscrowDestination = await hre.ethers.getContractFactory("FusionEscrowDestination");
  const deployment = await FusionEscrowDestination.deploy();
  
  // Wait for the deployment transaction to be mined
  const deployTx = await deployment.deploymentTransaction();
  const receipt = await deployTx.wait();

  // Get the contract address from the receipt
  const contractAddress = receipt.contractAddress;

  console.log("FusionEscrowDestination deployed to:", contractAddress);
  console.log(`Transaction hash: ${deployTx.hash}`);
  console.log("Remember to save this address for your .env file or application configuration.");
}

main().catch((error) => {
  console.error("Error deploying FusionEscrowDestination:", error);
  process.exitCode = 1;
});