import { HashLock, SDK, PresetEnum, ReadyToAcceptSecretFills, ReadyToExecutePublicActions, OrderStatusResponse, OrderStatus } from '@1inch/cross-chain-sdk';
import dotenv from 'dotenv';
import { BigNumber, ethers } from 'ethers';

// 2. CLASS DEFINITIONS
class EthersBlockchainProvider {
  private wallet: ethers.Wallet;

  constructor(privateKey: string, provider: ethers.providers.JsonRpcProvider) {
    this.wallet = new ethers.Wallet(privateKey, provider);
  }

  async signTypedData(walletAddress: string, typedData: any): Promise<string> {
    const { domain, types, message } = typedData;
    const { EIP712Domain, ...signTypes } = types;
    return this.wallet._signTypedData(domain, signTypes, message);
  }

  async ethCall(contractAddress: string, callData: string): Promise<string> {
    return this.wallet.provider.call({
      to: contractAddress,
      data: callData,
    });
  }
}

// 3. HELPER FUNCTION DEFINITIONS
async function ensureAllowance(
  wallet: ethers.Wallet,
  tokenAddress: string,
  spenderAddress: string, 
  amount: string | BigNumber | bigint
) {
  const tokenContract = new ethers.Contract(
    tokenAddress,
    [
      'function allowance(address owner, address spender) view returns (uint256)',
      'function approve(address spender, uint256 amount) returns (bool)',
    ],
    wallet
  );

  const ownerAddress = await wallet.getAddress();
  const currentAllowance = await tokenContract.allowance(ownerAddress, spenderAddress);
  
  console.log(`Token Address: ${tokenAddress}`);
  console.log(`Owner Address (Maker): ${ownerAddress}`);
  console.log(`Spender Address (Escrow Factory/Settlement): ${spenderAddress}`);
  console.log(`Current allowance: ${currentAllowance.toString()}`);

  const requiredAmount = BigNumber.from(amount);

  if (currentAllowance.lt(requiredAmount)) {
    console.log(`Required allowance: ${requiredAmount.toString()}. Current allowance is insufficient.`);
    console.log(`Approving ${spenderAddress} to spend ${requiredAmount.toString()} tokens...`);
    try {
      const approveTx = await tokenContract.approve(spenderAddress, requiredAmount);
      console.log(`Approval transaction sent: ${approveTx.hash} (waiting for confirmation...)`);
      const receipt = await approveTx.wait();
      console.log(`Approval transaction confirmed. Gas used: ${receipt.gasUsed.toString()}`);
      
      const newAllowance = await tokenContract.allowance(ownerAddress, spenderAddress);
      console.log(`New allowance after approval: ${newAllowance.toString()}`);
      if (newAllowance.lt(requiredAmount)) {
          console.error("ERROR: Allowance after approval is still less than required.");
          throw new Error("Allowance not updated correctly after approval.");
      }
    } catch (e) {
      console.error("Error during token approval transaction:", e);
      throw e;
    }
  } else {
    console.log(`Sufficient allowance already set: ${currentAllowance.toString()} >= ${requiredAmount.toString()}`);
  }
}

// 4. LOAD ENVIRONMENT VARIABLES
dotenv.config();

// 5. VALIDATE ENVIRONMENT VARIABLES AND THE REST OF YOUR SCRIPT LOGIC
const makerPrivateKey = process.env.MAKER_PRIVATE_KEY || "";
const makerAddressEnv = process.env.MAKER_ADDRESS || "";
const receiverAddressEnv = process.env.RECEIVER_ADDRESS || "";
const nodeUrl = process.env.NODE_URL || "";
const authKeyEnv = process.env.AUTH_KEY || "";



async function main() {
  const provider = new ethers.providers.JsonRpcProvider(nodeUrl);
  const blockchainProvider = new EthersBlockchainProvider(makerPrivateKey, provider);

  const derivedMakerAddress = new ethers.Wallet(makerPrivateKey).address;
  if (ethers.utils.getAddress(makerAddressEnv) !== ethers.utils.getAddress(derivedMakerAddress)) {
    console.warn(`Warning: MAKER_ADDRESS (${makerAddressEnv}) does not match address derived from MAKER_PRIVATE_KEY (${derivedMakerAddress}).`);
  }
  
  const sdk = new SDK({
    url: 'https://api.1inch.dev/fusion-plus',
    authKey: authKeyEnv,
    blockchainProvider,
  });

  const params = {
    srcChainId: 42161, // Arbitrum chain ID
    dstChainId: 10, // Optimism chain ID
    srcTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
    dstTokenAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT on Optimism
    amount: '950000', // 0.95 USDC (6 decimals)
    enableEstimate: true,
    walletAddress: makerAddressEnv, 
  };

  try {
    console.log('Fetching quote with params:', params);
    const quote = await sdk.getQuote(params);
    console.log('Quote received. Recommended preset:', quote.recommendedPreset);

    // THIS IS LINE ~118 from your error log - IT MUST BE .toString()
    const spenderAddressString = quote.srcEscrowFactory.toString(); 
    console.log(`Spender address (srcEscrowFactory) requiring allowance: ${spenderAddressString}`);
    
    const tokenAmountToApprove = params.amount; 
    const approvalWallet = new ethers.Wallet(makerPrivateKey, provider);

    console.log(`Ensuring allowance for maker ${await approvalWallet.getAddress()} to let spender ${spenderAddressString} use ${tokenAmountToApprove} of token ${params.srcTokenAddress}...`);
    await ensureAllowance(
      approvalWallet,
      params.srcTokenAddress,
      spenderAddressString, 
      tokenAmountToApprove
    );

    const secretsCount = quote.getPreset().secretsCount;
    console.log('Secrets count required:', secretsCount);

    const secrets = Array.from({ length: secretsCount }).map(() => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const secretHashes = secrets.map((s) => HashLock.hashSecret(s));


    const hashLock =
      secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : 
        // HashLock.forMultipleFills(
        //     secretHashes.map((secretHash, i) =>
        //       ethers.utils.solidityKeccak256(['uint64', 'bytes32'], [i, secretHash]) as string & { _tag: 'MerkleLeaf' }
        //     )
        HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets)
      );

    // Place order
    console.log('Placing order...');
    const order = await sdk.placeOrder(quote, {
      walletAddress: makerAddressEnv,
      receiver: receiverAddressEnv,
      preset: PresetEnum.fast,
      source: 'sdk-tutorial',
      hashLock,
      secretHashes,
    });

  const orderHash = order.orderHash;
  console.log('▶️ OrderHash:', orderHash);

  // 4) Wait for escrows & finality
  let ready: ReadyToAcceptSecretFills;
  do {
    console.log('⏳ Waiting for escrows & finality...');
    ready = await sdk.getReadyToAcceptSecretFills(orderHash);
    await new Promise((r) => setTimeout(r, 5000));
  } while (ready.fills.length === 0);

  // 5) Reveal your secret(s) to unlock the escrows
  for (const secret of secrets) {
    console.log('🔓 Submitting secret:', secret);
    await sdk.submitSecret(orderHash, secret);
  }

  // 6) Monitor until the order reaches a terminal state
  const terminalStates = [
    OrderStatus.Executed,
    OrderStatus.Expired,
    OrderStatus.Cancelled,
    OrderStatus.Refunded,
  ];
  let status: OrderStatus;
  do {
    const resp = await sdk.getOrderStatus(orderHash);
    status = resp.status;
    console.log('Status:', status);
    if (terminalStates.includes(status)) break;
    await new Promise((r) => setTimeout(r, 5000));
  } while (true);

  console.log('✅ Final status:', status);
  } catch (error) {
    console.error('❌ Error:', error);
  }

}

main();