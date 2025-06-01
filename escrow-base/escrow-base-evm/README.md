# Cross-Chain Atomic Swap Contracts (Fusion-Inspired)

This project contains two Solidity contracts, `FusionEscrowSource.sol` and `FusionEscrowDestination.sol`, which implement a basic cross-chain atomic swap system inspired by Hashed Timelock Contracts (HTLCs).

## Features

- **HTLC Logic**: Utilizes a secret hash and timelocks to ensure atomicity.
- **Escrow Deposits**: Both maker and resolver lock funds and safety deposits.
- **Secret-Based Withdrawal**: Funds are released upon revealing the correct secret.
- **Timeout Cancellation**: Orders can be cancelled after a timeout period, allowing fund recovery.
- **Event Emission**: Contracts emit events for off-chain relayer coordination.
- **ERC20 Support**: Compatible with any ERC20 token.

## Contracts

1.  **`FusionEscrowSource.sol`**:

    - Deployed on the source chain.
    - Maker initiates an order by locking tokens and a safety deposit.
    - Resolver withdraws funds by providing the secret.
    - Anyone can cancel after timeout if not withdrawn.

2.  **`FusionEscrowDestination.sol`**:
    - Deployed on the destination chain.
    - Resolver fills an order by locking equivalent tokens and a safety deposit.
    - Maker withdraws funds by providing the secret.
    - Resolver can cancel after timeout if not withdrawn by the maker.

## Hardhat Setup and Deployment Instructions

These instructions guide you through setting up a Hardhat environment, compiling, and deploying the contracts.

### 1. Prerequisites

- **Node.js and npm/yarn**: Ensure you have Node.js (v16+) and npm (or yarn) installed.
  - [Download Node.js](https://nodejs.org/)
- **Git**: Optional, but recommended for version control.

### 2. Initialize Hardhat Project

If you don't have an existing Hardhat project:

```bash
mkdir my-fusion-escrow
cd my-fusion-escrow
npm init -y
npm install --save-dev hardhat
npm install --save-dev @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
npx hardhat
```

- When prompted by `npx hardhat`, choose "Create a JavaScript project" (or TypeScript if you prefer).
- Accept the default project root and say yes to adding a `.gitignore`.

### 3. Install Dependencies (depricated)

```bash
npm install --save-dev @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
# or if using yarn
# yarn add --dev @nomicfoundation/hardhat-toolbox @openzeppelin/contracts
```

`@nomicfoundation/hardhat-toolbox` bundles common plugins like ethers.js, Waffle, etc.
`@openzeppelin/contracts` is required for `IERC20.sol` and `ReentrancyGuard.sol`.

### 4. Add Contracts to Project

- Create a `contracts` directory in your Hardhat project root if it doesn't exist.
- Copy `FusionEscrowSource.sol` and `FusionEscrowDestination.sol` into the `contracts/` directory.

Your `contracts` directory structure should look like this:

```
contracts/
├── FusionEscrowSource.sol
├── FusionEscrowDestination.sol
└── test/
    └── MockERC20.sol  // Mock ERC20 for testing
```

- The `MockERC20.sol` contract is a simple ERC20 token implementation used by the test scripts to simulate token transfers.

### 5. Configure Hardhat (`hardhat.config.js`)

You'll need to configure network details (RPC URLs, private keys) for deployment. **Never commit private keys directly to your repository.** Use environment variables (e.g., via a `.env` file and the `dotenv` package).

Install `dotenv`:

```bash
npm install dotenv
# or
# yarn add dotenv
```

Create a `.env` file in your project root (and add `.env` to your `.gitignore`):

```
# .env
SOURCE_CHAIN_RPC_URL="YOUR_SOURCE_CHAIN_RPC_URL" # e.g., Infura, Alchemy URL for Sepolia, Goerli, or Mainnet
DESTINATION_CHAIN_RPC_URL="YOUR_DESTINATION_CHAIN_RPC_URL" # e.g., Polygon Mumbai, Polygon Mainnet
PRIVATE_KEY="YOUR_DEPLOYER_PRIVATE_KEY" # Ensure this account has funds on both networks
```

Modify your `hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Load environment variables

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    sourceChain: {
      // Example: deploying FusionEscrowSource to Sepolia
      url: process.env.SOURCE_CHAIN_RPC_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    destinationChain: {
      // Example: deploying FusionEscrowDestination to Polygon Mumbai
      url: process.env.DESTINATION_CHAIN_RPC_URL || "",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    // You can add more networks like localhost for testing
    hardhat: {
      // Default local network
      // specific configurations for the local Hardhat Network
    },
    localhost: {
      // For running a local node like `npx hardhat node`
      url: "http://127.0.0.1:8545/",
      // accounts are typically provided by the node itself
    },
  },
  // Optional: Etherscan verification configuration
  etherscan: {
    apiKey: {
      // Add API keys for block explorers of your chosen networks
      // e.g., mainnet: process.env.ETHERSCAN_API_KEY,
      // polygon: process.env.POLYGONSCAN_API_KEY,
      // sepolia: process.env.ETHERSCAN_API_KEY,
      // polygonMumbai: process.env.POLYGONSCAN_API_KEY
      // Add other networks as needed, e.g. avalanche, bsc, etc.
    },
  },
  paths: {
    // Recommended paths configuration
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    // Recommended Mocha timeout for tests
    timeout: 40000,
  },
};
```

### 6. Compile Contracts

Run the compile command:

```bash
npx hardhat compile
```

This will generate artifacts in the `artifacts/` directory.

### 7. Create Deployment Scripts

Create a deployment script in the `scripts/` directory. For example, `scripts/deploy.js`:

```javascript
// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy FusionEscrowSource
  // Ensure you are targeting the correct network for this contract (e.g., --network sourceChain)
  console.log("\nDeploying FusionEscrowSource...");
  const FusionEscrowSource = await hre.ethers.getContractFactory(
    "FusionEscrowSource"
  );
  const fusionEscrowSource = await FusionEscrowSource.deploy();
  await fusionEscrowSource.deployed();
  console.log("FusionEscrowSource deployed to:", fusionEscrowSource.address);
  console.log(`Transaction hash: ${fusionEscrowSource.deployTransaction.hash}`);

  // Deploy FusionEscrowDestination
  // Ensure you are targeting the correct network for this contract (e.g., --network destinationChain)
  // This would typically be a separate deployment run targeting the destination network.
  // For demonstration, we show it here, but you'd run the script twice with different --network flags.
  console.log("\nDeploying FusionEscrowDestination...");
  const FusionEscrowDestination = await hre.ethers.getContractFactory(
    "FusionEscrowDestination"
  );
  const fusionEscrowDestination = await FusionEscrowDestination.deploy();
  await fusionEscrowDestination.deployed();
  console.log(
    "FusionEscrowDestination deployed to:",
    fusionEscrowDestination.address
  );
  console.log(
    `Transaction hash: ${fusionEscrowDestination.deployTransaction.hash}`
  );

  console.log("\n--- Deployment Summary ---");
  console.log(`FusionEscrowSource deployed on network: ${hre.network.name}`);
  console.log(`  Address: ${fusionEscrowSource.address}`);
  console.log(
    `FusionEscrowDestination deployed on network: ${hre.network.name}`
  );
  console.log(`  Address: ${fusionEscrowDestination.address}`);
  console.log("--------------------------");
  console.log(
    "IMPORTANT: If deploying to different chains, run this script twice,"
  );
  console.log(
    "once for each contract with the appropriate '--network <chainName>' flag."
  );
  console.log("For example:");
  console.log(
    "  npx hardhat run scripts/deploy.js --network sourceChain  (Deploys FusionEscrowSource)"
  );
  console.log(
    "  npx hardhat run scripts/deploy.js --network destinationChain (Deploys FusionEscrowDestination)"
  );
  console.log(
    "You might want to split this into two separate scripts for clarity."
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

**Note on Deployment Script:** The provided script deploys both contracts. In a real cross-chain scenario, you would:

1.  Modify the script to deploy only `FusionEscrowSource` and run it with `--network sourceChain`.
2.  Modify the script (or create a new one) to deploy only `FusionEscrowDestination` and run it with `--network destinationChain`.

**Example: `scripts/deploySource.js`**

```javascript
// scripts/deploySource.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(
    "Deploying FusionEscrowSource with the account:",
    deployer.address
  );

  const FusionEscrowSource = await hre.ethers.getContractFactory(
    "FusionEscrowSource"
  );
  const fusionEscrowSource = await FusionEscrowSource.deploy();
  await fusionEscrowSource.deployed();

  console.log("FusionEscrowSource deployed to:", fusionEscrowSource.address);
  console.log(`Network: ${hre.network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

**Example: `scripts/deployDestination.js`**

```javascript
// scripts/deployDestination.js
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(
    "Deploying FusionEscrowDestination with the account:",
    deployer.address
  );

  const FusionEscrowDestination = await hre.ethers.getContractFactory(
    "FusionEscrowDestination"
  );
  const fusionEscrowDestination = await FusionEscrowDestination.deploy();
  await fusionEscrowDestination.deployed();

  console.log(
    "FusionEscrowDestination deployed to:",
    fusionEscrowDestination.address
  );
  console.log(`Network: ${hre.network.name}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### 8. Run Deployment

**Deploy `FusionEscrowSource.sol` to the source chain:**

```bash
npx hardhat run scripts/deploySource.js --network sourceChain
```

(Replace `sourceChain` with the network name you defined in `hardhat.config.js`, e.g., `sepolia`)

**Deploy `FusionEscrowDestination.sol` to the destination chain:**

```bash
npx hardhat run scripts/deployDestination.js --network destinationChain
```

(Replace `destinationChain` with the network name, e.g., `polygonMumbai`)

After successful deployment, Hardhat will print the contract addresses. Save these addresses, as they are needed for interaction.

### 9. Interacting with Contracts (Example)

You can write Hardhat tasks or scripts to interact with your deployed contracts. For example, to create an order:

```javascript
// scripts/createOrder.js
const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const sourceContractAddress = "YOUR_FUSIONESCROWSOURCE_ADDRESS"; // From deployment
  const tokenAddressOnSource = "YOUR_ERC20_TOKEN_ON_SOURCE_CHAIN"; // e.g., WETH, DAI
  const resolverAddress = "RESOLVER_ETHEREUM_ADDRESS";
  const orderId = ethers.utils.formatBytes32String("myOrder123");
  const secret = ethers.utils.formatBytes32String("mySuperSecret"); // Keep this safe!
  const hashSecret = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["bytes32"], [secret])
  );
  const amount = ethers.utils.parseUnits("100", 18); // 100 tokens with 18 decimals
  const safetyDepositETH = ethers.utils.parseEther("0.01"); // 0.01 ETH
  const timeoutDuration = 24 * 60 * 60; // 24 hours in seconds

  const fusionEscrowSource = await ethers.getContractAt(
    "FusionEscrowSource",
    sourceContractAddress
  );
  const tokenContract = await ethers.getContractAt(
    "IERC20",
    tokenAddressOnSource
  );

  // 1. Approve token transfer
  console.log(
    `Approving ${amount.toString()} tokens for FusionEscrowSource...`
  );
  const approveTx = await tokenContract.approve(sourceContractAddress, amount);
  await approveTx.wait();
  console.log("Approval successful.");

  // 2. Create order
  console.log("Creating order...");
  const createOrderTx = await fusionEscrowSource.createOrder(
    orderId,
    resolverAddress,
    tokenAddressOnSource,
    amount,
    hashSecret,
    timeoutDuration,
    { value: safetyDepositETH }
  );
  await createOrderTx.wait();
  console.log("Order created successfully! Tx hash:", createOrderTx.hash);
  console.log("Secret (keep private):", secret);
  console.log("HashSecret (public):", hashSecret);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

Run this script with: `npx hardhat run scripts/createOrder.js --network sourceChain`

### 10. (Optional) Verify Contracts on Etherscan

If you deployed to a public testnet or mainnet and configured `etherscan` in `hardhat.config.js`:

```bash
 YOUR_FUSIONESCROWSOURCE_ADDRESS
npx hardhat verify --network destinationChain YOUR_FUSIONESCROWDESTINATION_ADDRESS
```

### 11. Testing Contracts

This project includes unit tests for the core functionality of both escrow contracts. The tests use Hardhat Network, ethers.js, Chai, and the `MockERC20.sol` contract.

**Test File:**

- `test/FusionEscrow.test.js`: Contains test suites for `FusionEscrowSource` and `FusionEscrowDestination`.

**Running Tests:**

To execute the tests, run the following command in your project root:

```bash
npx hardhat test
```

The tests cover:

- Successful order creation by the maker (`FusionEscrowSource`).
- Successful order filling by the resolver (`FusionEscrowDestination`).
- Correct token and ETH transfers for deposits and withdrawals.
- Successful withdrawal by the resolver/maker with the correct secret and before timeout.
- Rejection of withdrawals with incorrect secrets or after timeout.
- Successful cancellation of orders after timeout.
- Rejection of cancellations before timeout.
- Emission of relevant events.

The tests utilize `@nomicfoundation/hardhat-network-helpers` for time manipulation (e.g., `time.increase()`) to simulate timeout scenarios.

## Swap Lifecycle Walkthrough

(Refer to the detailed walkthrough provided previously for the sequence of operations: Maker creates order -> Resolver fills order -> Maker withdraws -> Resolver claims, including timeout scenarios.)

This README provides a comprehensive guide for setting up and deploying the contracts using Hardhat.
