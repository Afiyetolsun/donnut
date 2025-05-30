import { HashLock, SDK } from '@1inch/cross-chain-sdk';
import dotenv from 'dotenv';
import { ethers } from 'ethers';

// Custom BlockchainProviderConnector for ethers
class EthersBlockchainProvider {
  private wallet: ethers.Wallet;

  constructor(privateKey: string, provider: ethers.providers.JsonRpcProvider) {
    this.wallet = new ethers.Wallet(privateKey, provider);
  }

  async signTypedData(walletAddress: string, typedData: any): Promise<string> {
    // Extract primary type and remove EIP712Domain from types
    const { domain, types, message } = typedData;
    const { EIP712Domain, ...signTypes } = types; // Remove EIP712Domain
    return this.wallet._signTypedData(domain, signTypes, message);
  }

  async ethCall(contractAddress: string, callData: string): Promise<string> {
    return this.wallet.provider.call({
      to: contractAddress,
      data: callData,
    });
  }
}

// Load environment variables
dotenv.config();

// Validate environment variables
const makerPrivateKey = process.env.MAKER_PRIVATE_KEY || "";
const makerAddress = process.env.MAKER_ADDRESS || "";
const receiverAddress = process.env.RECEIVER_ADDRESS;
const nodeUrl = process.env.NODE_URL;
const authKey = process.env.AUTH_KEY;

if (!makerPrivateKey) throw new Error('MAKER_PRIVATE_KEY is not set in .env');
if (!makerAddress) throw new Error('MAKER_ADDRESS is not set in .env');
if (!receiverAddress) throw new Error('RECEIVER_ADDRESS is not set in .env');
if (!nodeUrl) throw new Error('NODE_URL is not set in .env');
if (!authKey) throw new Error('AUTH_KEY is not set in .env');

async function main() {
  // Initialize ethers provider
  const provider = new ethers.providers.JsonRpcProvider(nodeUrl);
  const blockchainProvider = new EthersBlockchainProvider(makerPrivateKey, provider);

  // Initialize 1inch Fusion+ SDK
  const sdk = new SDK({
    url: 'https://api.1inch.dev/fusion-plus',
    authKey,
    blockchainProvider,
  });

  // Define swap parameters for 0.1 USDC on Arbitrum to USDT on Optimism
  const params = {
    srcChainId: 42161, // Arbitrum chain ID
    dstChainId: 10, // Optimism chain ID
    srcTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
    dstTokenAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', // USDT on Optimism
    amount: '10000000', // 10 USDC (6 decimals)
    enableEstimate: true,
    walletAddress: makerAddress,
  };

  try {
    // Get quote
    console.log('Fetching quote...');
    const quote = await sdk.getQuote(params);

    // Generate secrets and hash locks
    const secretsCount = quote.getPreset().secretsCount;
    const secrets = Array.from({ length: secretsCount }).map(() => ethers.utils.hexlify(ethers.utils.randomBytes(32)));
    const secretHashes = secrets.map((x) => HashLock.hashSecret(x));

    const hashLock =
      secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(
            secretHashes.map((secretHash, i) =>
              ethers.utils.solidityKeccak256(['uint64', 'bytes32'], [i, secretHash]) as string & { _tag: 'MerkleLeaf' }
            )
          );

    // Place order
    console.log('Placing order...');
    const order = await sdk.placeOrder(quote, {
      walletAddress: makerAddress,
      receiver: receiverAddress,
      hashLock,
      secretHashes,
      // fee: {
      //   takingFeeBps: 1, // 1%
      //   takingFeeReceiver: makerAddress,
      // },
    });

    console.log('Order placed successfully:', order);
  } catch (error) {
    console.error("Error executing swap:", error);
    // console.log("Response body:", error.response?.data);
  }
}

main();