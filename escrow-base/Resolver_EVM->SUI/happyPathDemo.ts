import { SuiClient } from '@mysten/sui/client'; // Updated import
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'; // Updated import
import { Contract, ContractFactory, TransactionResponse, Wallet, ethers, getBytes, toUtf8Bytes } from 'ethers';
// RawSigner is no longer used directly with client.signAndExecuteTransaction in new SDK
import { Transaction } from '@mysten/sui/transactions'; // Renamed TransactionBlock to Transaction
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// --- Configuration ---
// TODO: Populate these from .env or define directly for local testing
const EVM_RPC_URL = process.env.EVM_RPC_URL || 'http://127.0.0.1:8545'; // Local Hardhat node
const MAKER_PRIVATE_KEY_EVM = process.env.MAKER_PRIVATE_KEY_EVM || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat account 0
const RESOLVER_PRIVATE_KEY_EVM = process.env.RESOLVER_PRIVATE_KEY_EVM || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Default Hardhat account 1

const SUI_RPC_URL = process.env.SUI_RPC_URL || 'http://127.0.0.1:9000'; // Local SUI node
const MAKER_SEED_PHRASE_SUI = process.env.MAKER_SEED_PHRASE_SUI; // Requires a funded SUI account seed phrase
const RESOLVER_SEED_PHRASE_SUI = process.env.RESOLVER_SEED_PHRASE_SUI; // Requires a funded SUI account seed phrase

// Contract paths (relative to this script's execution from escrow-base/Resolver)
const MOCK_ERC20_ARTIFACT_PATH = '../escrow-base-evm/artifacts/contracts/test/MockERC20.sol/MockERC20.json';
const ESCROW_SOURCE_ARTIFACT_PATH = '../escrow-base-evm/artifacts/contracts/FusionEscrowSource.sol/FusionEscrowSource.json';
const ESCROW_DESTINATION_ARTIFACT_PATH = '../escrow-base-evm/artifacts/contracts/FusionEscrowDestination.sol/FusionEscrowDestination.json';

const SUI_ESCROW_PACKAGE_PATH = '../escrow-base-sui/fusion_escrow'; // Path to the SUI package

// Demo parameters
const TOKEN_AMOUNT_EVM = ethers.parseUnits('100', 18); // 100 tokens
const SAFETY_DEPOSIT_EVM = ethers.parseEther('0.1'); // 0.1 ETH
const TIMEOUT_DURATION_SECONDS = 3600; // 1 hour
const SUI_CLOCK_OBJECT_ID = '0x6'; // Standard SUI clock object ID
const TIMEOUT_DURATION_MS = TIMEOUT_DURATION_SECONDS * 1000;

// --- Helper Functions ---

function loadContractArtifact(artifactPath: string): { abi: any, bytecode: string } {
    const fullPath = path.resolve(__dirname, artifactPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Artifact not found at ${fullPath}. Make sure EVM contracts are compiled.`);
    }
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return { abi: artifact.abi, bytecode: artifact.bytecode };
}

async function generateSecretAndHash(): Promise<{ secret: string, hash: string }> {
    const secretBytes = ethers.randomBytes(32);
    const hash = ethers.keccak256(secretBytes);
    return { secret: ethers.hexlify(secretBytes), hash };
}

// Placeholder for SUI module publishing - typically done via CLI
// For SDK based publishing, it's more complex and involves compiling to bytecode first.
// The 'signer' parameter might not be needed here if we are just checking for a published package ID.
async function ensureSuiModulesPublished(suiClient: SuiClient): Promise<{ sourceModuleId: string, destinationModuleId: string, packageId: string }> {
    console.log(`Make sure the SUI modules from ${SUI_ESCROW_PACKAGE_PATH} are published.`);
    console.log(`Run: sui client publish --gas-budget 100000000 ${SUI_ESCROW_PACKAGE_PATH} (from project root or escrow-base/escrow-base-sui/fusion_escrow)`);
    // This is a placeholder. In a real script, you'd either:
    // 1. Expect packageId as input (from .env or CLI arg)
    // 2. Implement SDK-based publishing (more complex, requires compiled modules)
    // For this demo, we'll assume it's published and IDs are known/configured.
    const packageId = process.env.SUI_PACKAGE_ID;
    if (!packageId) {
        throw new Error("SUI_PACKAGE_ID not set in .env. Please publish the SUI package and set its ID.");
    }
    // Module names are usually lowercase of the file name
    return {
        packageId,
        sourceModuleId: `${packageId}::fusion_escrow_source`,
        destinationModuleId: `${packageId}::fusion_escrow_destination`,
    };
}


// --- Main Demo Logic ---
async function main() {
    console.log("Starting Happy Path Demo for EVM-SUI Escrow...");

    // Initialize EVM providers and signers
    const evmProvider = new ethers.JsonRpcProvider(EVM_RPC_URL);
    const makerEVM = new Wallet(MAKER_PRIVATE_KEY_EVM!, evmProvider);
    const resolverEVM = new Wallet(RESOLVER_PRIVATE_KEY_EVM!, evmProvider);
    console.log(`Maker EVM Address: ${await makerEVM.getAddress()}`);
    console.log(`Resolver EVM Address: ${await resolverEVM.getAddress()}`);

    // Initialize SUI client and signers (Keypairs)
    const suiClient = new SuiClient({ url: SUI_RPC_URL }); // Or use getFullnodeUrl('localnet')
    if (!MAKER_SEED_PHRASE_SUI || !RESOLVER_SEED_PHRASE_SUI) {
        console.error("Please provide SUI private keys (hex format) in .env for MAKER_SEED_PHRASE_SUI and RESOLVER_SEED_PHRASE_SUI");
        return;
    }
    // Assuming MAKER_SEED_PHRASE_SUI and RESOLVER_SEED_PHRASE_SUI are hex-encoded private keys
    // For mnemonic seed phrases, use Ed25519Keypair.deriveKeypair(mnemonic)
    const makerSUIKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(MAKER_SEED_PHRASE_SUI.startsWith('0x') ? MAKER_SEED_PHRASE_SUI.substring(2) : MAKER_SEED_PHRASE_SUI, 'hex'));
    const resolverSUIKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(RESOLVER_SEED_PHRASE_SUI.startsWith('0x') ? RESOLVER_SEED_PHRASE_SUI.substring(2) : RESOLVER_SEED_PHRASE_SUI, 'hex'));

    console.log(`Maker SUI Address: ${makerSUIKeypair.getPublicKey().toSuiAddress()}`);
    console.log(`Resolver SUI Address: ${resolverSUIKeypair.getPublicKey().toSuiAddress()}`);


    // --- Phase 0: Generate Secret ---
    const { secret, hash: hashSecret } = await generateSecretAndHash();
    // Generate a unique order ID (bytes32 string for EVM, can be converted to vector<u8> for SUI)
    const orderIdGlobal = ethers.keccak256(toUtf8Bytes(`ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`));
    console.log(`Generated Order ID (bytes32): ${orderIdGlobal}`);
    console.log(`Generated Secret (hex): ${secret}`);
    console.log(`Generated Hash Secret: ${hashSecret}`);


    // --- Phase 1: Deploy EVM Contracts (if needed) & Maker Creates Order on EVM ---
    console.log("\n--- Phase 1: EVM Order Creation ---");

    // Load ABIs and bytecode
    const mockERC20Artifact = loadContractArtifact(MOCK_ERC20_ARTIFACT_PATH);
    const escrowSourceArtifact = loadContractArtifact(ESCROW_SOURCE_ARTIFACT_PATH);
    // const escrowDestArtifact = loadContractArtifact(ESCROW_DESTINATION_ARTIFACT_PATH); // Not deployed by this script directly

// Define simple contract interfaces for typing
// These interfaces describe the methods we expect on our contract instances.
// They help TypeScript understand the shape of the contract objects.
// Note: These do not extend ethers.Contract to avoid conflicting with its index signature.
// We rely on the fact that the deployed contract instances will have these methods.
interface IMockERC20 {
    mint: (to: string, amount: bigint) => Promise<TransactionResponse>;
    approve: (spender: string, amount: bigint) => Promise<TransactionResponse>;
    balanceOf: (owner: string) => Promise<bigint>;
    getAddress(): Promise<string>; // Standard contract method
    connect(runner: ethers.ContractRunner | null): IMockERC20; // To maintain type after connect
}

interface IFusionEscrowSource {
    createOrder: (
        orderId: string,
        resolver: string,
        token: string,
        amount: bigint,
        hashSecret: string,
        timeoutDuration: bigint,
        options: { value: bigint }
    ) => Promise<TransactionResponse>;
    withdraw: (orderId: string, secret: string) => Promise<TransactionResponse>;
    orders: (orderId: string) => Promise<any>; // For checking order details
    getAddress(): Promise<string>; // Standard contract method
    connect(runner: ethers.ContractRunner | null): IFusionEscrowSource; // To maintain type after connect
}

    // Deploy MockERC20
    const MockERC20Factory = new ContractFactory(mockERC20Artifact.abi, mockERC20Artifact.bytecode, makerEVM);
    // Cast the deployed contract to our specific interface
    const mockERC20 = await MockERC20Factory.deploy("MockToken", "MTK", ethers.parseUnits('1000000', 18)) as unknown as IMockERC20;
    await (mockERC20 as unknown as Contract).waitForDeployment(); // waitForDeployment is on Contract
    const mockERC20Address = await mockERC20.getAddress();
    console.log(`MockERC20 deployed to: ${mockERC20Address}`);

    // Deploy FusionEscrowSource
    const EscrowSourceFactory = new ContractFactory(escrowSourceArtifact.abi, escrowSourceArtifact.bytecode, makerEVM);
    // Cast the deployed contract to our specific interface
    const escrowSource = await EscrowSourceFactory.deploy() as unknown as IFusionEscrowSource;
    await (escrowSource as unknown as Contract).waitForDeployment(); // waitForDeployment is on Contract
    const escrowSourceAddress = await escrowSource.getAddress();
    console.log(`FusionEscrowSource deployed to: ${escrowSourceAddress}`);

    // Maker: Mint MockERC20 tokens (to self)
    let tx = await mockERC20.connect(makerEVM).mint(await makerEVM.getAddress(), ethers.parseUnits('1000', 18));
    await tx.wait();
    console.log(`Maker minted 1000 MTK`);

    // Maker: Approve FusionEscrowSource to spend MockERC20
    tx = await mockERC20.connect(makerEVM).approve(escrowSourceAddress, TOKEN_AMOUNT_EVM);
    await tx.wait();
    console.log(`Maker approved EscrowSource for ${ethers.formatUnits(TOKEN_AMOUNT_EVM, 18)} MTK`);

    // Maker: Create Order
    console.log(`Creating order on EVM...`);
    const createOrderTx = await escrowSource.connect(makerEVM).createOrder(
        orderIdGlobal,
        await resolverEVM.getAddress(),
        mockERC20Address,
        TOKEN_AMOUNT_EVM,
        hashSecret,
        BigInt(TIMEOUT_DURATION_SECONDS),
        { value: SAFETY_DEPOSIT_EVM }
    );
    const receipt = await createOrderTx.wait();
    console.log(`Order created on EVM. Tx Hash: ${createOrderTx.hash}`);
    // TODO: Parse OrderCreated event from receipt.logs (need to use escrowSource.interface.parseLog)

    // --- Phase 2: Publish SUI Modules (if needed) & Resolver Fills Order on SUI ---
    console.log("\n--- Phase 2: SUI Order Filling ---");
    const { packageId } = await ensureSuiModulesPublished(suiClient);
    console.log(`Using SUI Package ID: ${packageId}`);
    
    // For SUI, we need a Coin object for the token and for the safety deposit (SUI itself).
    // Let's assume the resolver has some SUI coins.
    // For the token, we need a mock SUI token. This is more complex than EVM's ERC20.
    // For simplicity, let's assume the SUI contract will use SUI as the "token" for this demo,
    // or we need a pre-existing published mock fungible asset type on SUI.
    // Let's use SUI as the token for simplicity in this demo script.
    // The resolver needs to provide two SUI Coin objects.

    // Get SUI coins for resolver for token and safety deposit
    const suiCoins = await suiClient.getCoins({ owner: resolverSUIKeypair.getPublicKey().toSuiAddress(), coinType: '0x2::sui::SUI' });
    if (suiCoins.data.length < 2) {
        console.error("Resolver SUI account does not have enough SUI Coin objects. Please fund and split if necessary.");
        return;
    }
    const tokenCoinSuiId = suiCoins.data[0].coinObjectId; // Using SUI as the token
    const safetyDepositCoinSuiId = suiCoins.data[1].coinObjectId; // Using SUI as safety deposit

    // TODO: Ensure these coins have enough balance. The contract checks for > 0.
    // For a real scenario, you'd split coins to exact amounts.
    const tokenAmountSui = BigInt(100_000_000); // Example: 0.1 SUI as token amount (MIST), in MIST
    const safetyDepositAmountSui = BigInt(50_000_000); // Example: 0.05 SUI as safety deposit (MIST), in MIST

    console.log(`Filling order on SUI...`);
    const txbFill = new Transaction(); // Changed from TransactionBlock
    const [tokenCoinToLock] = txbFill.splitCoins(txbFill.gas, [tokenAmountSui]); // Using txb.gas as primary coin for split
    const [safetyDepositCoinToLock] = txbFill.splitCoins(txbFill.gas, [safetyDepositAmountSui]); // Can also use a specific coin object if needed and available
    
    txbFill.moveCall({
        target: `${packageId}::fusion_escrow_destination::fill_order`,
        arguments: [
            txbFill.pure(getBytes(orderIdGlobal)), // order_id_global: vector<u8>
            txbFill.pure.address(await makerEVM.getAddress()), // maker: address
            tokenCoinToLock, // tokens_to_lock: Coin<SUI>
            safetyDepositCoinToLock, // safety_deposit_sui: Coin<SUI>
            txbFill.pure(getBytes(hashSecret)), // hash_secret: vector<u8>
            txbFill.pure.u64(TIMEOUT_DURATION_MS), // timeout_duration_ms: u64
            txbFill.object(SUI_CLOCK_OBJECT_ID) // Clock object ID
        ],
        typeArguments: ['0x2::sui::SUI'], // Assuming SUI is the token type T
    });
    const fillResult = await suiClient.signAndExecuteTransaction({
        signer: resolverSUIKeypair,
        transaction: txbFill,
        options: { showEffects: true, showEvents: true } 
    });
    console.log(`Order filled on SUI. Digest: ${fillResult.digest}`);
    // TODO: Parse OrderFilled event from fillResult.events

    const createdObjects = fillResult.effects?.created;
    const filledOrderObject = createdObjects?.find((obj: { owner: any; reference: any; }) => {
        // Heuristic: find an object whose owner is an AddressOwner but not the resolver's address.
        // This assumes the Order object is shared or owned by the maker/escrow logic.
        // A more robust way is to check the object type if available in effects, or parse events.
        if (obj.owner && typeof obj.owner === 'object' && 'AddressOwner' in obj.owner) {
            return obj.owner.AddressOwner !== resolverSUIKeypair.getPublicKey().toSuiAddress();
        }
        return false;
    });
    if (!filledOrderObject) {
        console.error("Could not find created Order object on SUI");
        return;
    }
    const suiOrderObjectId = filledOrderObject.reference.objectId;
    console.log(`SUI Order Object ID: ${suiOrderObjectId}`);


    // --- Phase 3: Resolver Withdraws from EVM ---
    console.log("\n--- Phase 3: Resolver Withdraws from EVM ---");
    console.log(`Resolver withdrawing from EVM escrow...`);
    const withdrawEvmTx = await escrowSource.connect(resolverEVM).withdraw(orderIdGlobal, secret);
    await withdrawEvmTx.wait();
    console.log(`Resolver withdrew from EVM. Tx Hash: ${withdrawEvmTx.hash}`);
    // TODO: Parse OrderWithdrawn event and check balances


    // --- Phase 4: Maker Withdraws from SUI ---
    console.log("\n--- Phase 4: Maker Withdraws from SUI ---");
    console.log(`Maker withdrawing from SUI escrow...`);
    const txbWithdrawSui = new Transaction(); // Changed from TransactionBlock
    txbWithdrawSui.moveCall({
        target: `${packageId}::fusion_escrow_destination::withdraw_by_maker`,
        arguments: [
            txbWithdrawSui.object(suiOrderObjectId), // order: &mut Order<T>
            txbWithdrawSui.pure(getBytes(secret)), // secret: vector<u8>
            txbWithdrawSui.object(SUI_CLOCK_OBJECT_ID) // Clock object ID
        ],
        typeArguments: ['0x2::sui::SUI'], // Assuming SUI is the token type T
    });
    const withdrawSuiResult = await suiClient.signAndExecuteTransaction({
        signer: makerSUIKeypair,
        transaction: txbWithdrawSui,
        options: { showEvents: true }
    });
    console.log(`Maker withdrew from SUI. Digest: ${withdrawSuiResult.digest}`);
    // TODO: Parse MakerWithdrawn event and check balances

    console.log("\nHappy Path Demo Completed!");
    console.log("To run this demo:");
    console.log("1. Ensure you have a local Hardhat EVM node and a local SUI node running.");
    console.log("2. Compile EVM contracts: cd escrow-base/escrow-base-evm && npx hardhat compile");
    console.log("3. Publish SUI package: cd escrow-base/escrow-base-sui/fusion_escrow && sui client publish --gas-budget 100000000 . (ensure this path is correct relative to where you run sui client)");
    console.log("4. Create a .env file in escrow-base/Resolver_EVM->SUI/ with SUI_PACKAGE_ID, MAKER_SEED_PHRASE_SUI, RESOLVER_SEED_PHRASE_SUI.");
    console.log("   (Optionally EVM_RPC_URL, SUI_RPC_URL, MAKER_PRIVATE_KEY_EVM, RESOLVER_PRIVATE_KEY_EVM if not using defaults).");
    console.log("5. Install dependencies: cd escrow-base/Resolver && pnpm install");
    console.log("6. Run the script: cd escrow-base/Resolver && pnpm start");

}

main().catch((error) => {
    console.error("Demo failed:", error);
    process.exit(1);
});
