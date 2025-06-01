require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    sourceChain: {
      url: process.env.SOURCE_CHAIN_RPC_URL || "https://rpc.sepolia.org", // Sepolia
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111, // Sepolia chain ID
    },
    destinationChain: {
      url: process.env.DESTINATION_CHAIN_RPC_URL || "https://rpc.sepolia.org", // Sepolia
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 11155111, // Sepolia chain ID
    },
    hardhat: {
      gasPrice: 10_000_000_000
      // Local Hardhat network (default)
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      // Accounts provided by `npx hardhat node`
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
    },
    // For Polygon Mumbai (and other non-Etherscan networks)
    customChains: [
      {
        network: "polygonMumbai",
        chainId: 80001,
        urls: {
          apiURL: "https://api-testnet.polygonscan.com/api",
          browserURL: "https://mumbai.polygonscan.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};