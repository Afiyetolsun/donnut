require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load environment variables

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    // Example: deploying FusionEscrowSource to Sepolia (or any source chain)
    sourceChain: {
      url: process.env.SOURCE_CHAIN_RPC_URL || "http://127.0.0.1:8545", // Default to localhost if not set
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    // Example: deploying FusionEscrowDestination to Polygon Mumbai (or any destination chain)
    destinationChain: {
      url: process.env.DESTINATION_CHAIN_RPC_URL || "http://127.0.0.1:8545", // Default to localhost if not set
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    // Default Hardhat local network
    hardhat: {
      // specific configurations for the local Hardhat Network
      // For testing, you might want to increase the gas limit or set a specific block number
    },
    // For running a local node like `npx hardhat node`
    localhost: {
        url: "http://127.0.0.1:8545/",
        // accounts are typically provided by the node itself when it starts
    }
  },
  // Optional: Etherscan verification configuration
  etherscan: {
    apiKey: {
      // Add API keys for block explorers of your chosen networks
      // mainnet: process.env.ETHERSCAN_API_KEY,
      // sepolia: process.env.ETHERSCAN_API_KEY,
      // polygon: process.env.POLYGONSCAN_API_KEY,
      // polygonMumbai: process.env.POLYGONSCAN_API_KEY
      // Add other networks as needed, e.g. avalanche, bsc, etc.
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 40000 // Timeout for tests, can be increased if tests are long-running
  }
};
