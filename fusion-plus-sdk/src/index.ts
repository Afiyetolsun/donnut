// 1. ALL IMPORT STATEMENTS AT THE VERY TOP
import { HashLock, SDK } from '@1inch/cross-chain-sdk'; // Removed unused Address import
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


if (!makerPrivateKey) throw new Error('MAKER_PRIVATE_KEY is not set in .env');
if (!makerAddressEnv) throw new Error('MAKER_ADDRESS is not set in .env');
if (!receiverAddressEnv) throw new Error('RECEIVER_ADDRESS is not set in .env');
if (!nodeUrl) throw new Error('NODE_URL is not set in .env');
if (!authKeyEnv) throw new Error('AUTH_KEY is not set in .env');

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
    srcChainId: 42161,
    dstChainId: 10,
    srcTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    dstTokenAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    amount: '1000000',
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
    const secretHashes = secrets.map((x) => HashLock.hashSecret(x));

    const hashLock =
      secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(
            secretHashes.map((secretHash, i) =>
              ethers.utils.solidityKeccak256(['uint64', 'bytes32'], [i, secretHash]) as string & { _tag: 'MerkleLeaf' }
            )
          );
    
    // THIS IS LINE ~147 from your error log - IT MUST BE .toString() for the hashLockString variable
    const hashLockString = hashLock.toString();
    console.log('HashLock generated:', hashLockString);
    console.log('SecretHashes:', secretHashes);

    const placeOrderParams = {
      walletAddress: makerAddressEnv,
      receiver: receiverAddressEnv,
      hashLock, // Pass the HashLock OBJECT itself here
      secretHashes,
    };

    // THIS IS LINE ~160 from your error log - FOR LOGGING, use hashLockString (which is hashLock.toString())
    console.log('Placing order with params (logging string hashLock):', {
        ...placeOrderParams,
        hashLock: hashLockString // Log the string for readability
    });
    const order = await sdk.placeOrder(quote, placeOrderParams);

    console.log('Order placed successfully:', order);
  } catch (error: any) {
    console.error("Error executing swap:", error.message || error);
    if (error.isAxiosError && error.response) {
        console.error("Status Code:", error.response.status);
        console.error("Response Body:", error.response.data);
        console.error("Response Headers:", error.response.headers);
    } else if (error.response && typeof error.response.data !== 'undefined') {
        console.error("Response Body (fallback):", error.response.data);
    } else {
        console.error("Full error object:", error);
    }
  }
}

// 6. EXECUTE MAIN FUNCTION
main();