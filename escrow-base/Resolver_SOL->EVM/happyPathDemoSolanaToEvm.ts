import { AnchorProvider, Idl, Program, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, createAccount, createMint, getAccount, mintTo } from '@solana/spl-token';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import dotenv from 'dotenv';
import { Contract, ContractFactory, Wallet as EthersWallet, TransactionResponse, ethers, toUtf8Bytes } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- Configuration ---
const EVM_RPC_URL = process.env.EVM_RPC_URL || 'http://127.0.0.1:8545';
const MAKER_PRIVATE_KEY_EVM = process.env.MAKER_PRIVATE_KEY_EVM || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat account 0
const RESOLVER_PRIVATE_KEY_EVM = process.env.RESOLVER_PRIVATE_KEY_EVM || '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Default Hardhat account 1

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'http://127.0.0.1:8899';
const MAKER_SOLANA_SECRET_KEY_PATH = process.env.MAKER_SOLANA_SECRET_KEY_PATH || path.resolve(process.env.HOME || '~', '.config/solana/id.json'); // Path to keypair file
const RESOLVER_SOLANA_SECRET_KEY_PATH = process.env.RESOLVER_SOLANA_SECRET_KEY_PATH; // Path to keypair file for resolver

const SOLANA_FUSION_ESCROW_PROGRAM_ID = new PublicKey(process.env.SOLANA_FUSION_ESCROW_PROGRAM_ID || '9xPGJy3Um9CXU6mpcZmcAospg3NwDkghJtVp7rJfpPVF');

// Contract paths for EVM
const MOCK_ERC20_ARTIFACT_PATH = '../../../escrow-base-evm/artifacts/contracts/test/MockERC20.sol/MockERC20.json';
const ESCROW_DESTINATION_ARTIFACT_PATH = '../../../escrow-base-evm/artifacts/contracts/FusionEscrowDestination.sol/FusionEscrowDestination.json';

// Solana Program IDL and Type
import solanaIdl from '../escrow-base-solana/target/idl/fusion_escrow_solana.json';

// Demo parameters
const TOKEN_AMOUNT_SOLANA = new BN(100 * 10 ** 6); // 100 Mock SPL tokens (assuming 6 decimals)
const SAFETY_DEPOSIT_SOL = new BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
const TOKEN_AMOUNT_EVM = ethers.parseUnits('100', 18); // 100 Mock ERC20 tokens
const SAFETY_DEPOSIT_EVM = ethers.parseEther('0.1'); // 0.1 ETH
const TIMEOUT_DURATION_SECONDS_SOL = new BN(3600); // 1 hour (for Solana program)
const TIMEOUT_DURATION_SECONDS_EVM = BigInt(3600); // 1 hour (for EVM program)


// --- Helper Functions ---
function loadContractArtifact(artifactPath: string): { abi: any, bytecode: string } {
    const fullPath = path.resolve(__dirname, artifactPath);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Artifact not found at ${fullPath}. Make sure EVM contracts are compiled. Path: ${fullPath}`);
    }
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return { abi: artifact.abi, bytecode: artifact.bytecode };
}

async function generateSecretAndHash(): Promise<{ secret: Buffer, hash: Buffer, secretHex: string, hashHex: string }> {
    const secretBytes = ethers.randomBytes(32);
    const hash = ethers.keccak256(secretBytes);
    return { 
        secret: Buffer.from(secretBytes), 
        hash: Buffer.from(ethers.getBytes(hash)), // Ensure hash is Buffer
        secretHex: ethers.hexlify(secretBytes),
        hashHex: hash
    };
}

function loadSolanaKeypair(keypairPath: string): Keypair {
    if (!fs.existsSync(keypairPath)) {
        throw new Error(`Solana keypair file not found at ${keypairPath}`);
    }
    const secretKeyString = fs.readFileSync(keypairPath, { encoding: 'utf8' });
    const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
    return Keypair.fromSecretKey(secretKey);
}

// --- EVM Contract Interfaces ---
interface IMockERC20 {
    mint: (to: string, amount: bigint) => Promise<TransactionResponse>;
    approve: (spender: string, amount: bigint) => Promise<TransactionResponse>;
    getAddress(): Promise<string>;
    balanceOf(owner: string): Promise<bigint>;
}

interface IFusionEscrowDestination {
    fillOrder: (
        orderId: string, // bytes32
        makerOnSource: string, // address (Solana pubkey as string)
        token: string, // address
        amount: bigint,
        hashSecret: string, // bytes32
        timeoutDuration: bigint,
        options: { value: bigint }
    ) => Promise<TransactionResponse>;
    makerWithdraw: (orderId: string, secret: string) => Promise<TransactionResponse>;
    getAddress(): Promise<string>;
}


// --- Main Demo Logic ---
async function main() {
    console.log("Starting Happy Path Demo for Solana-EVM Escrow...");

    // Initialize EVM providers and signers
    const evmProvider = new ethers.JsonRpcProvider(EVM_RPC_URL);
    const makerEVM = new EthersWallet(MAKER_PRIVATE_KEY_EVM!, evmProvider); // This is for withdrawing on EVM
    const resolverEVM = new EthersWallet(RESOLVER_PRIVATE_KEY_EVM!, evmProvider);
    console.log(`Maker EVM Address (for withdrawal): ${await makerEVM.getAddress()}`);
    console.log(`Resolver EVM Address: ${await resolverEVM.getAddress()}`);

    // Initialize Solana client and keypairs
    const solanaConnection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const makerSolana = loadSolanaKeypair(MAKER_SOLANA_SECRET_KEY_PATH);
    if (!RESOLVER_SOLANA_SECRET_KEY_PATH) {
        console.error("Please provide RESOLVER_SOLANA_SECRET_KEY_PATH in .env");
        return;
    }
    const resolverSolana = loadSolanaKeypair(RESOLVER_SOLANA_SECRET_KEY_PATH);
    
    // Airdrop SOL if needed (especially for resolver)
    const resolverSolBalance = await solanaConnection.getBalance(resolverSolana.publicKey);
    if (resolverSolBalance < 0.5 * LAMPORTS_PER_SOL) {
        console.log(`Airdropping SOL to Resolver Solana account ${resolverSolana.publicKey.toBase58()}...`);
        await solanaConnection.requestAirdrop(resolverSolana.publicKey, 1 * LAMPORTS_PER_SOL);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for airdrop
    }
    console.log(`Maker Solana Address: ${makerSolana.publicKey.toBase58()}`);
    console.log(`Resolver Solana Address: ${resolverSolana.publicKey.toBase58()}`);

    // Setup Anchor provider and program for Solana
    const anchorProvider = new AnchorProvider(solanaConnection, new Wallet(makerSolana), AnchorProvider.defaultOptions());

    const solanaProgram = new Program<Idl>(
        solanaIdl as any, // Temporary cast to bypass strict typing
        SOLANA_FUSION_ESCROW_PROGRAM_ID,
        anchorProvider
    );

    // --- Phase 0: Generate Secret & Order ID ---
    const { secret, hash, secretHex, hashHex } = await generateSecretAndHash();
    // Ensure orderId is 32 bytes, pad if necessary
    const orderIdString = `SOL_EVM_ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const orderIdBytes = Buffer.alloc(32);
    Buffer.from(toUtf8Bytes(orderIdString)).copy(orderIdBytes); // orderId for Solana program
    const orderIdGlobalBytes32 = ethers.hexlify(orderIdBytes); // orderId for EVM program (bytes32 hex string)

    console.log(`Generated Order ID (string): ${orderIdString}`);
    console.log(`Generated Order ID (bytes for Solana): ${orderIdBytes.toString('hex')}`);
    console.log(`Generated Order ID (bytes32 for EVM): ${orderIdGlobalBytes32}`);
    console.log(`Generated Secret (hex): ${secretHex}`);
    console.log(`Generated Hash Secret (hex for EVM): ${hashHex}`);
    console.log(`Generated Hash Secret (Buffer for Solana): ${hash.toString('hex')}`);


    // --- Phase 1: Maker Creates Order on Solana ---
    console.log("\n--- Phase 1: Solana Order Creation ---");

    // Create SPL Token Mint (Token A on Solana)
    const tokenMintSolana = await createMint(
        solanaConnection,
        makerSolana, // Payer
        makerSolana.publicKey, // Mint authority
        null, // Freeze authority
        6 // Decimals
    );
    console.log(`SPL Token Mint (Token A on Solana) created: ${tokenMintSolana.toBase58()}`);

    // Create Token Accounts
    const makerTokenAccountSolana = await createAccount(solanaConnection, makerSolana, tokenMintSolana, makerSolana.publicKey);
    // For resolver to receive tokens on Solana
    const resolverTokenAccountSolana = await createAccount(solanaConnection, resolverSolana, tokenMintSolana, resolverSolana.publicKey);


    console.log(`Maker Solana Token Account A: ${makerTokenAccountSolana.toBase58()}`);
    console.log(`Resolver Solana Token Account A: ${resolverTokenAccountSolana.toBase58()}`);

    // Mint tokens to Maker's Solana account
    await mintTo(
        solanaConnection,
        makerSolana, // Payer
        tokenMintSolana,
        makerTokenAccountSolana,
        makerSolana.publicKey, // Mint authority
        BigInt(200 * 10 ** 6) // Amount: 200 tokens
    );
    console.log(`Minted 200 Mock SPL tokens to Maker's Solana account.`);

    // Derive PDAs for Solana
    const [orderStatePdaSource, orderStateBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("order_source"), orderIdBytes],
        solanaProgram.programId
    );
    const [escrowAuthorityPda, escrowAuthorityBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_authority"), orderIdBytes],
        solanaProgram.programId
    );
    // Escrow token account PDA (derived differently in contract)
     const [escrowTokenAccountPdaSource, escrowTokenBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_authority"), orderIdBytes, Buffer.from("token_source")],
        solanaProgram.programId
    );

    console.log(`Order State PDA (Solana Source): ${orderStatePdaSource.toBase58()}`);
    console.log(`Escrow Authority PDA (Solana): ${escrowAuthorityPda.toBase58()}`);
    console.log(`Escrow Token Account PDA (Solana Source): ${escrowTokenAccountPdaSource.toBase58()}`);
    
    console.log(`Creating order on Solana...`);
    const createOrderTx = await solanaProgram.methods
        .createOrderSource(
            Array.from(orderIdBytes), // order_id: [u8; 32]
            resolverSolana.publicKey,
            TOKEN_AMOUNT_SOLANA,
            Array.from(hash), // hash_secret: [u8; 32]
            TIMEOUT_DURATION_SECONDS_SOL,
            SAFETY_DEPOSIT_SOL
        )
        .accounts({
            orderStateSource: orderStatePdaSource,
            maker: makerSolana.publicKey,
            makerTokenAccountSource: makerTokenAccountSolana,
            escrowTokenAccountSource: escrowTokenAccountPdaSource, // This will be created by the instruction
            escrowAuthority: escrowAuthorityPda,
            tokenMintSource: tokenMintSolana,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([makerSolana])
        .rpc({skipPreflight: true}); // Skip preflight for local testing if issues with PDA creation timing

    console.log(`Order created on Solana. Tx Signature: ${createOrderTx}`);
    await solanaConnection.confirmTransaction(createOrderTx, 'confirmed');

    const orderAccountDataSol = await solanaProgram.account.orderStateSource.fetch(orderStatePdaSource);
    console.log("Solana Order State Account Data:", orderAccountDataSol);


    // --- Phase 2: Resolver Fills Order on EVM ---
    console.log("\n--- Phase 2: EVM Order Filling ---");
    const mockERC20ArtifactEvm = loadContractArtifact(MOCK_ERC20_ARTIFACT_PATH);
    const escrowDestArtifactEvm = loadContractArtifact(ESCROW_DESTINATION_ARTIFACT_PATH);

    const MockERC20Factory = new ContractFactory(mockERC20ArtifactEvm.abi, mockERC20ArtifactEvm.bytecode, resolverEVM);
    const mockERC20 = await MockERC20Factory.deploy("MockTokenDest", "MTD", ethers.parseUnits('1000000', 18)) as unknown as IMockERC20;
    await (mockERC20 as unknown as Contract).waitForDeployment();
    const mockERC20Address = await mockERC20.getAddress();
    console.log(`MockERC20 (for EVM dest) deployed to: ${mockERC20Address}`);

    const EscrowDestFactory = new ContractFactory(escrowDestArtifactEvm.abi, escrowDestArtifactEvm.bytecode, resolverEVM);
    const escrowDestination = await EscrowDestFactory.deploy() as unknown as IFusionEscrowDestination;
    await (escrowDestination as unknown as Contract).waitForDeployment();
    const escrowDestinationAddress = await escrowDestination.getAddress();
    console.log(`FusionEscrowDestination (EVM) deployed to: ${escrowDestinationAddress}`);

    await ((mockERC20 as any).connect(resolverEVM) as IMockERC20).mint(await resolverEVM.getAddress(), ethers.parseUnits('1000', 18));
    await ((mockERC20 as any).connect(resolverEVM) as IMockERC20).approve(escrowDestinationAddress, TOKEN_AMOUNT_EVM);
    console.log(`Resolver EVM minted and approved MockERC20 for EscrowDestination`);

    console.log(`Filling order on EVM...`);
    // makerSolana.publicKey.toBase58() is the maker_on_source
    const fillEvmTx = await ((escrowDestination as any).connect(resolverEVM) as IFusionEscrowDestination).fillOrder(
        orderIdGlobalBytes32,          // bytes32 orderId
        makerSolana.publicKey.toBase58(), // maker_on_source (Solana pubkey as string)
        mockERC20Address,
        TOKEN_AMOUNT_EVM,
        hashHex,                       // bytes32 hashSecret
        TIMEOUT_DURATION_SECONDS_EVM,
        { value: SAFETY_DEPOSIT_EVM }
    );
    await fillEvmTx.wait();
    console.log(`Order filled on EVM. Tx Hash: ${fillEvmTx.hash}`);


    // --- Phase 3: Resolver Withdraws from Solana ---
    console.log("\n--- Phase 3: Solana Resolver Withdrawal ---");
    console.log(`Resolver withdrawing from Solana escrow source...`);
    
    // Ensure resolver has the token account for Token A on Solana
    // It was created earlier. If not, create it:
    // const resolverTokenAccountSolana = await getAssociatedTokenAddressSync(tokenMintSolana, resolverSolana.publicKey, false);
    // const accInfo = await solanaConnection.getAccountInfo(resolverTokenAccountSolana);
    // if (!accInfo) {
    //     const createAtaTx = new anchor.web3.Transaction().add(
    //         anchor.utils.token.createAssociatedTokenAccountInstruction(
    //             resolverSolana.publicKey, resolverTokenAccountSolana, resolverSolana.publicKey, tokenMintSolana
    //         )
    //     );
    //     await anchorProvider.sendAndConfirm(createAtaTx, [resolverSolana]);
    //     console.log(`Created Resolver's Associated Token Account for Token A on Solana: ${resolverTokenAccountSolana.toBase58()}`);
    // }


    const withdrawSolanaResolverTx = await solanaProgram.methods
        .withdrawSource(
            Array.from(orderIdBytes), // order_id
            Array.from(secret)        // secret
        )
        .accounts({
            orderStateSource: orderStatePdaSource,
            resolver: resolverSolana.publicKey,
            resolverTokenAccountSource: resolverTokenAccountSolana,
            escrowTokenAccountSource: escrowTokenAccountPdaSource,
            escrowAuthority: escrowAuthorityPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([resolverSolana])
        .rpc({skipPreflight: true});
    console.log(`Resolver withdrew from Solana. Tx Signature: ${withdrawSolanaResolverTx}`);
    await solanaConnection.confirmTransaction(withdrawSolanaResolverTx, 'confirmed');

    // Verify resolver received tokens on Solana
    const resolverTokenAccDataSol = await getAccount(solanaConnection, resolverTokenAccountSolana);
    console.log(`Resolver's Solana Token A balance after withdrawal: ${resolverTokenAccDataSol.amount.toString()}`);


    // --- Phase 4: Maker Withdraws from EVM ---
    console.log("\n--- Phase 4: EVM Maker Withdrawal ---");
    console.log(`Maker (EVM identity) withdrawing from EVM escrow destination...`);
    // Note: makerEVM is used here, which should correspond to the intended recipient on EVM.
    // The Solana contract's maker_on_source (makerSolana.publicKey) is used in fillOrder to identify the order.
    // The EVM contract's makerWithdraw checks the secret.
    const withdrawEvmMakerTx = await (escrowDestination as any).connect(makerEVM).makerWithdraw(orderIdGlobalBytes32, secretHex);
    await withdrawEvmMakerTx.wait();
    console.log(`Maker withdrew from EVM. Tx Hash: ${withdrawEvmMakerTx.hash}`);

    // Verify maker received tokens on EVM
    const makerEvmTokenBalance = await (mockERC20 as any).connect(makerEVM).balanceOf(await makerEVM.getAddress());
    console.log(`Maker's EVM Token balance after withdrawal: ${ethers.formatUnits(makerEvmTokenBalance, 18)}`);

    console.log("\nSolana-EVM Happy Path Demo Completed!");
    console.log("\n--- Setup Instructions ---");
    console.log("1. Ensure Solana local validator is running (solana-test-validator).");
    console.log("2. Ensure Hardhat local node is running (npx hardhat node).");
    console.log("3. Deploy the Solana escrow program: cd escrow-base/escrow-base-solana && anchor deploy");
    console.log("   - Update SOLANA_FUSION_ESCROW_PROGRAM_ID in .env if it changes.");
    console.log("4. Compile EVM contracts: cd escrow-base/escrow-base-evm && npx hardhat compile");
    console.log("5. Create .env file in escrow-base/Resolver_SOL->EVM/ with:");
    console.log("   MAKER_SOLANA_SECRET_KEY_PATH=/path/to/your/solana/maker_keypair.json");
    console.log("   RESOLVER_SOLANA_SECRET_KEY_PATH=/path/to/your/solana/resolver_keypair.json");
    console.log("   (And other RPC URLs, EVM private keys if not using defaults)");
    console.log("   Example Solana keypair generation: solana-keygen new --outfile ~/.config/solana/my_resolver_key.json");
    console.log("6. Fund the Resolver's Solana account with some SOL if it's new (script attempts airdrop).");
    console.log("7. Run the script: ts-node escrow-base/Resolver_SOL->EVM/happyPathDemoSolanaToEvm.ts");

}

main().catch((error) => {
    console.error("Solana-EVM Demo failed:", error);
    process.exit(1);
});
