import { SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import dotenv from 'dotenv';
import { Contract, ContractFactory, TransactionResponse, Wallet, ethers, getBytes, toUtf8Bytes } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- Configuration ---
const EVM_RPC_URL = process.env.EVM_RPC_URL || 'http://127.0.0.1:8545';
const MAKER_PRIVATE_KEY_EVM = process.env.MAKER_PRIVATE_KEY_EVM || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat account 0
const RESOLVER_PRIVATE_KEY_EVM = process.env.RESOLVER_PRIVATE_KEY_EVM || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Default Hardhat account 1

const SUI_RPC_URL = process.env.SUI_RPC_URL || 'http://127.0.0.1:9000';
const MAKER_SUI_PRIVATE_KEY_HEX = process.env.MAKER_SEED_PHRASE_SUI; // Expects hex private key
const RESOLVER_SUI_PRIVATE_KEY_HEX = process.env.RESOLVER_SEED_PHRASE_SUI; // Expects hex private key

// Contract paths
const MOCK_ERC20_ARTIFACT_PATH = '../../escrow-base-evm/artifacts/contracts/test/MockERC20.sol/MockERC20.json';
const ESCROW_DESTINATION_ARTIFACT_PATH = '../../escrow-base-evm/artifacts/contracts/FusionEscrowDestination.sol/FusionEscrowDestination.json';
// SUI source module is used from the published package ID

const SUI_ESCROW_PACKAGE_PATH_FOR_PUBLISH_INFO = '../../escrow-base-sui/fusion_escrow';

// Demo parameters
const TOKEN_AMOUNT_SUI = BigInt(100_000_000); // 0.1 Mock SUI Token (or SUI if using 0x2::sui::SUI type)
const SAFETY_DEPOSIT_SUI = BigInt(50_000_000); // 0.05 SUI
const TOKEN_AMOUNT_EVM = ethers.parseUnits('100', 18); // 100 Mock ERC20 tokens
const SAFETY_DEPOSIT_EVM = ethers.parseEther('0.1'); // 0.1 ETH
const TIMEOUT_DURATION_SECONDS = 3600; // 1 hour
const SUI_CLOCK_OBJECT_ID = '0x6';
const TIMEOUT_DURATION_MS = TIMEOUT_DURATION_SECONDS * 1000;

// --- Helper Functions --- (Mostly same as EVM->SUI demo)
function loadContractArtifact(artifactPath: string): { abi: any, bytecode: string } {
    const fullPath = path.resolve(__dirname, artifactPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Artifact not found at ${fullPath}. Make sure EVM contracts are compiled. Path: ${fullPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return { abi: artifact.abi, bytecode: artifact.bytecode };
}

async function generateSecretAndHash(): Promise<{ secret: string, hash: string }> {
    const secretBytes = ethers.randomBytes(32);
    const hash = ethers.keccak256(secretBytes);
    return { secret: ethers.hexlify(secretBytes), hash };
}

async function ensureSuiModulesPublished(suiClient: SuiClient): Promise<{ packageId: string }> {
    console.log(`Make sure the SUI modules from ${SUI_ESCROW_PACKAGE_PATH_FOR_PUBLISH_INFO} are published.`);
    console.log(`Run: cd ${path.resolve(__dirname, SUI_ESCROW_PACKAGE_PATH_FOR_PUBLISH_INFO)} && sui client publish --gas-budget 100000000 .`);
    const packageId = process.env.SUI_PACKAGE_ID;
    if (!packageId) {
        throw new Error("SUI_PACKAGE_ID not set in .env. Please publish the SUI package and set its ID.");
    }
    return { packageId };
}

// --- EVM Contract Interfaces ---
// Note: These do not extend ethers.Contract directly in the interface definition
// to avoid conflicts with its index signature when defining methods.
// We cast to these interfaces after contract instantiation.
interface IMockERC20 {
    mint: (to: string, amount: bigint) => Promise<TransactionResponse>;
    approve: (spender: string, amount: bigint) => Promise<TransactionResponse>;
    getAddress(): Promise<string>;
    // connect method is part of ethers.Contract, no need to redefine here
}

interface IFusionEscrowDestination {
    fillOrder: (
        orderId: string,
        maker: string,
        token: string,
        amount: bigint,
        hashSecret: string,
        timeoutDuration: bigint,
        options: { value: bigint }
    ) => Promise<TransactionResponse>;
    makerWithdraw: (orderId: string, secret: string) => Promise<TransactionResponse>;
    getAddress(): Promise<string>;
    // connect method is part of ethers.Contract, no need to redefine here
}


// --- Main Demo Logic ---
async function main() {
    console.log("Starting Happy Path Demo for SUI-EVM Escrow...");

    // Initialize EVM providers and signers
    const evmProvider = new ethers.JsonRpcProvider(EVM_RPC_URL);
    const makerEVM = new Wallet(MAKER_PRIVATE_KEY_EVM!, evmProvider);
    const resolverEVM = new Wallet(RESOLVER_PRIVATE_KEY_EVM!, evmProvider);
    console.log(`Maker EVM Address: ${await makerEVM.getAddress()}`);
    console.log(`Resolver EVM Address: ${await resolverEVM.getAddress()}`);

    // Initialize SUI client and keypairs
    const suiClient = new SuiClient({ url: SUI_RPC_URL });
    if (!MAKER_SUI_PRIVATE_KEY_HEX || !RESOLVER_SUI_PRIVATE_KEY_HEX) {
        console.error("Please provide SUI private keys (hex format) in .env for MAKER_SEED_PHRASE_SUI and RESOLVER_SEED_PHRASE_SUI");
        return;
    }
    const makerSUIKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(MAKER_SUI_PRIVATE_KEY_HEX.startsWith('0x') ? MAKER_SUI_PRIVATE_KEY_HEX.substring(2) : MAKER_SUI_PRIVATE_KEY_HEX, 'hex'));
    const resolverSUIKeypair = Ed25519Keypair.fromSecretKey(Buffer.from(RESOLVER_SUI_PRIVATE_KEY_HEX.startsWith('0x') ? RESOLVER_SUI_PRIVATE_KEY_HEX.substring(2) : RESOLVER_SUI_PRIVATE_KEY_HEX, 'hex'));
    const makerSuiAddress = makerSUIKeypair.getPublicKey().toSuiAddress();
    const resolverSuiAddress = resolverSUIKeypair.getPublicKey().toSuiAddress();
    console.log(`Maker SUI Address: ${makerSuiAddress}`);
    console.log(`Resolver SUI Address: ${resolverSuiAddress}`);

    // --- Phase 0: Generate Secret ---
    const { secret, hash: hashSecret } = await generateSecretAndHash();
    const orderIdGlobal = ethers.keccak256(toUtf8Bytes(`SUI_EVM_ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`));
    console.log(`Generated Order ID (bytes32): ${orderIdGlobal}`);
    console.log(`Generated Secret (hex): ${secret}`);
    console.log(`Generated Hash Secret (hex): ${hashSecret}`);

    // --- Phase 1: Maker Creates Order on SUI ---
    console.log("\n--- Phase 1: SUI Order Creation ---");
    const { packageId } = await ensureSuiModulesPublished(suiClient);
    console.log(`Using SUI Package ID: ${packageId}`);

    // Maker needs SUI coins for the token (e.g., 0x2::sui::SUI) and safety deposit.
    // This example assumes the token being escrowed is SUI itself (0x2::sui::SUI).
    // For a custom fungible asset, the typeArgument and coin fetching would change.
    const suiCoinsForMaker = await suiClient.getCoins({ owner: makerSuiAddress, coinType: '0x2::sui::SUI' });
    if (suiCoinsForMaker.data.length < 2) { // Need at least two coin objects to split from for token and safety deposit
        console.error(`Maker SUI account ${makerSuiAddress} does not have enough SUI Coin objects. Please fund and split if necessary.`);
        return;
    }
    // Note: In a real scenario, you'd pick coins with sufficient balance or use a more robust coin selection.
    // For simplicity, we use txb.gas for splitting, assuming it has enough balance.

    console.log(`Creating order on SUI...`);
    const txbCreateSui = new Transaction();
    const [tokenCoinToLockSui] = txbCreateSui.splitCoins(txbCreateSui.gas, [TOKEN_AMOUNT_SUI]);
    const [safetyDepositCoinToLockSui] = txbCreateSui.splitCoins(txbCreateSui.gas, [SAFETY_DEPOSIT_SUI]);

    txbCreateSui.moveCall({
        target: `${packageId}::fusion_escrow_source::create_order`,
        arguments: [
            txbCreateSui.pure(getBytes(orderIdGlobal)),      // order_id_global: vector<u8>
            txbCreateSui.pure.address(resolverSuiAddress),   // resolver: address
            tokenCoinToLockSui,                              // tokens_to_lock: Coin<T>
            safetyDepositCoinToLockSui,                      // safety_deposit_sui: Coin<SUI>
            txbCreateSui.pure(getBytes(hashSecret)),         // hash_secret: vector<u8>
            txbCreateSui.pure.u64(TIMEOUT_DURATION_MS),      // timeout_duration_ms: u64
            txbCreateSui.object(SUI_CLOCK_OBJECT_ID)         // clock: &Clock
        ],
        typeArguments: ['0x2::sui::SUI'], // Assuming T is SUI for this demo
    });
    const createSuiResult = await suiClient.signAndExecuteTransaction({
        signer: makerSUIKeypair,
        transaction: txbCreateSui,
        options: { showEffects: true, showEvents: true }
    });
    console.log(`Order created on SUI. Digest: ${createSuiResult.digest}`);
    
    const suiOrderCreatedEvent = createSuiResult.events?.find(e => e.type === `${packageId}::fusion_escrow_source::OrderCreated`);
    if (!suiOrderCreatedEvent) throw new Error("SUI OrderCreated event not found");
    const suiOrderObjectId = (suiOrderCreatedEvent.parsedJson as any)?.order_object_id;
    if (!suiOrderObjectId) throw new Error("SUI Order Object ID not found in event");
    console.log(`SUI Order Object ID: ${suiOrderObjectId}`);


    // --- Phase 2: Resolver Fills Order on EVM ---
    console.log("\n--- Phase 2: EVM Order Filling ---");
    const mockERC20ArtifactEvm = loadContractArtifact(MOCK_ERC20_ARTIFACT_PATH);
    const escrowDestArtifactEvm = loadContractArtifact(ESCROW_DESTINATION_ARTIFACT_PATH);

    const MockERC20Factory = new ContractFactory(mockERC20ArtifactEvm.abi, mockERC20ArtifactEvm.bytecode, resolverEVM);
    const mockERC20 = await MockERC20Factory.deploy("MockTokenDest", "MTD", ethers.parseUnits('1000000', 18)) as unknown as IMockERC20; // Corrected cast
    await (mockERC20 as unknown as Contract).waitForDeployment(); // Base contract has waitForDeployment
    const mockERC20Address = await mockERC20.getAddress();
    console.log(`MockERC20 (for EVM dest) deployed to: ${mockERC20Address}`);

    const EscrowDestFactory = new ContractFactory(escrowDestArtifactEvm.abi, escrowDestArtifactEvm.bytecode, resolverEVM);
    const escrowDestination = await EscrowDestFactory.deploy() as unknown as IFusionEscrowDestination; // This cast is already correct
    await (escrowDestination as unknown as Contract).waitForDeployment(); // Base contract has waitForDeployment
    const escrowDestinationAddress = await escrowDestination.getAddress();
    console.log(`FusionEscrowDestination (EVM) deployed to: ${escrowDestinationAddress}`);

    await ((mockERC20 as any).connect(resolverEVM) as IMockERC20).mint(await resolverEVM.getAddress(), ethers.parseUnits('1000', 18));
    await ((mockERC20 as any).connect(resolverEVM) as IMockERC20).approve(escrowDestinationAddress, TOKEN_AMOUNT_EVM);
    console.log(`Resolver EVM minted and approved MockERC20 for EscrowDestination`);

    console.log(`Filling order on EVM...`);
    const fillEvmTx = await ((escrowDestination as any).connect(resolverEVM) as IFusionEscrowDestination).fillOrder(
        orderIdGlobal,          // Must match the SUI order_id_global
        makerSuiAddress,        // Original maker's SUI address (or mapped EVM addr)
        mockERC20Address,
        TOKEN_AMOUNT_EVM,
        hashSecret,
        BigInt(TIMEOUT_DURATION_SECONDS),
        { value: SAFETY_DEPOSIT_EVM }
    );
    await fillEvmTx.wait();
    console.log(`Order filled on EVM. Tx Hash: ${fillEvmTx.hash}`);


    // --- Phase 3: Resolver Withdraws from SUI ---
    console.log("\n--- Phase 3: SUI Resolver Withdrawal ---");
    console.log(`Resolver withdrawing from SUI escrow source...`);
    const txbWithdrawSuiResolver = new Transaction();
    txbWithdrawSuiResolver.moveCall({
        target: `${packageId}::fusion_escrow_source::withdraw_by_resolver`,
        arguments: [
            txbWithdrawSuiResolver.object(suiOrderObjectId),
            txbWithdrawSuiResolver.pure(getBytes(secret)),
            txbWithdrawSuiResolver.object(SUI_CLOCK_OBJECT_ID)
        ],
        typeArguments: ['0x2::sui::SUI'], // Assuming T is SUI
    });
    const withdrawSuiResolverResult = await suiClient.signAndExecuteTransaction({
        signer: resolverSUIKeypair,
        transaction: txbWithdrawSuiResolver,
        options: { showEvents: true }
    });
    console.log(`Resolver withdrew from SUI. Digest: ${withdrawSuiResolverResult.digest}`);


    // --- Phase 4: Maker Withdraws from EVM ---
    console.log("\n--- Phase 4: EVM Maker Withdrawal ---");
    console.log(`Maker withdrawing from EVM escrow destination...`);
    const withdrawEvmMakerTx = await (escrowDestination as any).connect(makerEVM).makerWithdraw(orderIdGlobal, secret);
    await withdrawEvmMakerTx.wait();
    console.log(`Maker withdrew from EVM. Tx Hash: ${withdrawEvmMakerTx.hash}`);

    console.log("\nSUI-EVM Happy Path Demo Completed!");
    // Add setup instructions similar to the other demo script
}

main().catch((error) => {
    console.error("SUI-EVM Demo failed:", error);
    process.exit(1);
});
