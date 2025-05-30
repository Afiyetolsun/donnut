import { HashLock, NetworkEnum, PrivateKeyProviderConnector, SDK, getRandomBytes32 } from '@1inch/cross-chain-sdk';
import dotenv from 'dotenv';
import Web3 from 'web3';

// Load environment variables
dotenv.config();

// Validate environment variables
const makerPrivateKey = process.env.MAKER_PRIVATE_KEY;
const makerAddress = process.env.MAKER_ADDRESS;
const receiverAddress = process.env.RECEIVER_ADDRESS;
const nodeUrl = process.env.NODE_URL;
const authKey = process.env.AUTH_KEY;

if (!makerPrivateKey || !makerAddress || !receiverAddress || !nodeUrl || !authKey) {
  throw new Error('Missing required environment variables');
}

async function main() {
  // Initialize Web3 and blockchain provider
  const web3 = new Web3(nodeUrl);
  const blockchainProvider = new PrivateKeyProviderConnector(makerPrivateKey, web3);

  // Initialize 1inch Fusion+ SDK
  const sdk = new SDK({
    url: 'https://api.1inch.dev/fusion-plus',
    authKey,
    blockchainProvider,
  });

  // Define swap parameters
  const params = {
    srcChainId: NetworkEnum.ETHEREUM,
    dstChainId: NetworkEnum.GNOSIS,
    srcTokenAddress: '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI on Ethereum
    dstTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // Native token on Gnosis
    amount: '1000000000000000000000', // 1000 DAI
    enableEstimate: true,
    walletAddress: makerAddress,
  };

  try {
    // Get quote
    console.log('Fetching quote...');
    const quote = await sdk.getQuote(params);

    // Generate secrets and hash locks
    const secretsCount = quote.getPreset().secretsCount;
    const secrets = Array.from({ length: secretsCount }).map(() => getRandomBytes32());
    const secretHashes = secrets.map((x) => HashLock.hashSecret(x));

    const hashLock =
      secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(
            secretHashes.map((secretHash, i) =>
              web3.utils.soliditySha3({ type: 'uint64', value: i }, { type: 'bytes32', value: secretHash }) as string & { _tag: 'MerkleLeaf' }
            )
          );

    // Place order
    console.log('Placing order...');
    const order = await sdk.placeOrder(quote, {
      walletAddress: makerAddress,
      receiver: receiverAddress,
      hashLock,
      secretHashes,
      fee: {
        takingFeeBps: 100, // 1%
        takingFeeReceiver: '0x0000000000000000000000000000000000000000',
      },
    });

    console.log('Order placed successfully:', order);
  } catch (error) {
    console.error('Error executing swap:', error);
  }
}

main();