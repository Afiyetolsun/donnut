import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { FusionEscrowSolana } from '../target/types/fusion_escrow_solana';
import { Keypair, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createMint, createAccount, mintTo, getAccount } from '@solana/spl-token';
import { assert } from 'chai';
import BN from 'bn.js';

describe('fusion_escrow_solana', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FusionEscrowSolana as Program<FusionEscrowSolana>;

  // Wallets and users
  const maker = provider.wallet as anchor.Wallet; // Use provider's wallet as maker
  const resolver = Keypair.generate();
  const anotherUser = Keypair.generate(); // For cancellation tests

  // Mints and token accounts
  let tokenMintA: PublicKey; // Token to be escrowed on source
  let makerTokenAccountA: PublicKey;
  let resolverTokenAccountA: PublicKey;
  let escrowTokenAccountA: PublicKey; // Escrow's token account for token A

  // Order details
  const orderId = anchor.utils.bytes.utf8.encode('testOrder123'.padEnd(32, '\0')); // 32 bytes
  const secret = anchor.utils.bytes.utf8.encode('mySuperSecret123'.padEnd(32, '\0'));
  let hashSecret: Buffer;
  const amountToEscrow = new BN(100 * 10 ** 6); // Assuming 6 decimals for token A
  const safetyDepositSol = new BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
  const timeoutDurationSeconds = new BN(60 * 5); // 5 minutes

  // PDAs (to be derived)
  let orderStatePdaSource: PublicKey;
  let escrowAuthorityPda: PublicKey; // PDA to act as authority for token escrow

  before(async () => {
    // Airdrop SOL to resolver and anotherUser for transaction fees
    await provider.connection.requestAirdrop(resolver.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(anotherUser.publicKey, 1 * LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for airdrop

    // Create token mint A (source chain token)
    tokenMintA = await createMint(
      provider.connection,
      maker.payer, // Payer for mint creation
      maker.publicKey, // Mint authority
      null, // Freeze authority (optional)
      6 // Decimals
    );

    // Create token accounts for maker and resolver
    makerTokenAccountA = await createAccount(provider.connection, maker.payer, tokenMintA, maker.publicKey);
    resolverTokenAccountA = await createAccount(provider.connection, resolver, tokenMintA, resolver.publicKey);

    // Mint some tokens to maker's account
    await mintTo(
      provider.connection,
      maker.payer,
      tokenMintA,
      makerTokenAccountA,
      maker.publicKey, // Mint authority
      200 * 10 ** 6 // Amount: 200 tokens
    );

    // Calculate hash of the secret
    const secretBuffer = Buffer.from(secret);
    hashSecret = Buffer.from(anchor.utils.sha256.hash(secretBuffer)).slice(0, 32);


    // Derive PDAs
    // Order State PDA for source chain
    [orderStatePdaSource] = PublicKey.findProgramAddressSync(
        [Buffer.from("order_source"), Buffer.from(orderId)],
        program.programId
    );

    // Escrow Authority PDA (this PDA will own the escrowed tokens)
    [escrowAuthorityPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow_authority"), Buffer.from(orderId)],
        program.programId
    );

    // Create the escrow's token account for token A, owned by the escrowAuthorityPda
    escrowTokenAccountA = await createAccount(
        provider.connection,
        maker.payer, // Payer for account creation
        tokenMintA,
        escrowAuthorityPda // Owner of this token account is the PDA
    );

    console.log("Setup complete.");
    console.log("Maker:", maker.publicKey.toBase58());
    console.log("Resolver:", resolver.publicKey.toBase58());
    console.log("Token Mint A:", tokenMintA.toBase58());
    console.log("Maker Token Account A:", makerTokenAccountA.toBase58());
    console.log("Order State PDA (Source):", orderStatePdaSource.toBase58());
    console.log("Escrow Authority PDA:", escrowAuthorityPda.toBase58());
    console.log("Escrow Token Account A:", escrowTokenAccountA.toBase58());
    console.log("Hash Secret:", Buffer.from(hashSecret).toString('hex'));
  });

  it('Is initialized!', async () => {
    // Add your initialization tests here if needed
    // For now, we assume the program is deployed and ready.
    assert.ok(program.programId);
  });

  // --- Source Chain Logic Tests ---

  it('Creates an order on the source chain', async () => {
    // TODO: Implement the test for create_order_source
    // This will involve:
    // 1. Calling the create_order_source instruction
    // 2. Verifying the order_state_source account is created with correct data
    // 3. Verifying tokens are transferred from maker to escrowTokenAccountA
    // 4. Verifying safety deposit SOL is transferred (this might need a separate escrow account or program logic)
    //
    // Example (incomplete):
    // await program.methods
    //   .createOrderSource(
    //     orderId,
    //     resolver.publicKey,
    //     tokenMintA,
    //     amountToEscrow,
    //     Array.from(hashSecret), // Convert Buffer to number[]
    //     timeoutDurationSeconds
    //   )
    //   .accounts({
    //     orderState: orderStatePdaSource,
    //     maker: maker.publicKey,
    //     makerTokenAccount: makerTokenAccountA,
    //     escrowTokenAccount: escrowTokenAccountA,
    //     escrowAuthority: escrowAuthorityPda, // If needed for SOL escrow or token transfer authority
    //     tokenProgram: TOKEN_PROGRAM_ID,
    //     systemProgram: SystemProgram.programId,
    //   })
    //   .signers([maker.payer]) // maker is the signer
    //   .rpc();

    // const orderAccountData = await program.account.orderStateSource.fetch(orderStatePdaSource);
    // assert.deepStrictEqual(orderAccountData.orderId, orderId);
    // ... more assertions
    console.log("TODO: Test create_order_source");
  });

  it('Resolver withdraws from source chain', async () => {
    // TODO: Implement the test for withdraw_source
    // This depends on a successful create_order_source
    // - Verify secret and timeout
    // - Verify tokens and SOL are transferred to resolver
    // - Verify order account is closed
    console.log("TODO: Test withdraw_source");
  });

  it('Cancels an order on source chain after timeout', async () => {
    // TODO: Implement the test for cancel_source
    // This depends on a successful create_order_source
    // - Advance blockchain time beyond timeout
    // - Verify tokens and SOL are returned to maker
    // - Verify order account is closed
    console.log("TODO: Test cancel_source");
  });


  // --- Destination Chain Logic Tests ---
  // These would typically be in a separate test suite or file if the programs are distinct,
  // but for a single combined program, they can be here.

  it('Fills an order on the destination chain', async () => {
    // TODO: Implement the test for fill_order_destination
    // This would involve:
    // - Simulating resolver locking funds on destination
    // - Creating a destination order state account
    console.log("TODO: Test fill_order_destination");
  });

  it('Maker withdraws from destination chain', async () => {
    // TODO: Implement the test for withdraw_destination
    // This depends on a successful fill_order_destination
    // - Verify secret and timeout
    // - Verify tokens and SOL are transferred to maker
    console.log("TODO: Test withdraw_destination");
  });

  it('Resolver cancels an order on destination chain after timeout', async () => {
    // TODO: Implement the test for cancel_destination
    // This depends on a successful fill_order_destination
    // - Advance time
    // - Verify funds returned to resolver
    console.log("TODO: Test cancel_destination");
  });

});
