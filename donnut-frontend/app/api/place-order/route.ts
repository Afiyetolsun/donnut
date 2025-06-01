import { 
    BlockchainProviderConnector, 
    PresetEnum, 
    SDK, 
    HashLock, 
    Quote, 
    EIP712TypedData,
    CrossChainOrder,
    Address 
} from '@1inch/cross-chain-sdk';
import { JsonRpcProvider, hexlify, randomBytes } from 'ethers';
import { NextResponse } from 'next/server';

interface PlaceOrderRequestBodyClient {
  quote: any;
  walletAddress: string; // This is the maker's address
  receiver: string;
  preset: number; 
  source: string;
  srcChainId: number; // Chain ID for the source chain / where the order is signed
}

export async function POST(request: Request) {
  try {
    const {
      quote,
      walletAddress, // Maker's address
      receiver,
      preset: numericPreset, 
      source,
      srcChainId, // This is the chainId for the EIP-712 domain and for the provider
    }: PlaceOrderRequestBodyClient = await request.json();

    console.log('[API /api/place-order] Received for placeOrder. Provider srcChainId:', srcChainId);
    console.log('[API /api/place-order] Received plain quote object:', JSON.stringify(quote, null, 2));
    console.log(`[API /api/place-order] Received numericPreset value: ${numericPreset} (type: ${typeof numericPreset})`);
    try {
      console.log(`[API /api/place-order] SDK PresetEnum values: fast=${JSON.stringify(PresetEnum.fast)}, medium=${JSON.stringify(PresetEnum.medium)}, slow=${JSON.stringify(PresetEnum.slow)}`);
    } catch (e) {
      console.log(`[API /api/place-order] SDK PresetEnum values (raw): fast=${PresetEnum.fast}, medium=${PresetEnum.medium}, slow=${PresetEnum.slow}`);
    }

    if (!quote || !walletAddress || !receiver || numericPreset === undefined || numericPreset === null || !source || !srcChainId) { 
      return NextResponse.json(
        { error: 'Missing required fields for placing order (quote, walletAddress, receiver, preset, source, srcChainId)' },
        { status: 400 }
      );
    }

    const AUTH_KEY = process.env.ONE_INCH_AUTH_KEY;
    const RPC_URL = process.env.RPC_URL; 

    if (!AUTH_KEY) {
      return NextResponse.json({ error: 'ONE_INCH_AUTH_KEY environment variable not set' }, { status: 500 });
    }
    if (!RPC_URL) {
      return NextResponse.json({ error: 'RPC_URL environment variable not set for backend SDK' }, { status: 500 });
    }

    class BackendBlockchainProvider implements BlockchainProviderConnector {
      private provider: JsonRpcProvider;
      constructor(provider: JsonRpcProvider) {
        this.provider = provider;
      }
      async ethCall(contractAddress: string, callData: string): Promise<string> {
        return this.provider.call({ to: contractAddress, data: callData });
      }
      async signTypedData(_walletAddress: string, _typedData: any): Promise<string> {
        throw new Error('signTypedData is not supported on the backend for this operation.');
      }
    }

    const provider = new JsonRpcProvider(RPC_URL, srcChainId); 
    const bcProvider = new BackendBlockchainProvider(provider);
    const sdk = new SDK({
      url: 'https://api.1inch.dev/fusion-plus',
      authKey: AUTH_KEY,
      blockchainProvider: bcProvider,
    });

    if (
      !quote.params ||
      !quote.srcTokenAmount || 
      !quote.params.srcChain || 
      !quote.params.dstChain || 
      !quote.params.srcTokenAddress || !quote.params.srcTokenAddress.val ||
      !quote.params.dstTokenAddress || !quote.params.dstTokenAddress.val
    ) {
        console.error('[API /api/place-order] Received quote object is missing critical params for re-fetching:', JSON.stringify(quote, null, 2));
        return NextResponse.json(
            { error: 'Received quote object is missing necessary parameters for re-fetching. Check server logs for details.' },
            { status: 400 }
        );
    }
    
    const getQuoteParams = {
        srcChainId: quote.params.srcChain, 
        dstChainId: quote.params.dstChain,
        srcTokenAddress: quote.params.srcTokenAddress.val,
        dstTokenAddress: quote.params.dstTokenAddress.val,
        amount: quote.srcTokenAmount, 
        walletAddress: walletAddress, 
        enableEstimate: quote.params.enableEstimate !== undefined ? quote.params.enableEstimate : true,
    };
    console.log('[API /api/place-order] Params for re-fetching quote:', getQuoteParams);
    const freshQuoteInstance = await sdk.getQuote(getQuoteParams);
    console.log('[API /api/place-order] Fresh quote instance details for placeOrder:', {
        srcChainId: freshQuoteInstance.srcChainId, 
        dstChainId: freshQuoteInstance.dstChainId,
    });

    let sdkPresetValue: PresetEnum;
    let presetKeyForLookup: 'fast' | 'medium' | 'slow';

    if (numericPreset === 1) { 
        sdkPresetValue = PresetEnum.fast;
        presetKeyForLookup = 'fast';
    } else if (numericPreset === 2) { 
        sdkPresetValue = PresetEnum.medium;
        presetKeyForLookup = 'medium';
    } else if (numericPreset === 3) { 
        sdkPresetValue = PresetEnum.slow;
        presetKeyForLookup = 'slow';
    } else {
        console.error(`[API /api/place-order] Unsupported numericPreset value: ${numericPreset}`);
        return NextResponse.json({ error: `Unsupported numericPreset value: ${numericPreset}` }, { status: 400 });
    }

    const presetDetails = freshQuoteInstance.presets[presetKeyForLookup];
    if (!presetDetails || typeof presetDetails.secretsCount !== 'number') {
        console.error(`[API /api/place-order] Could not find preset details or secretsCount for preset '${presetKeyForLookup}'. Presets:`, freshQuoteInstance.presets);
        return NextResponse.json({ error: `Could not determine secretsCount for preset: ${presetKeyForLookup}` }, { status: 400 });
    }
    const secretsCount = presetDetails.secretsCount;
    const localSecrets: string[] = Array.from({ length: secretsCount }).map(() => hexlify(randomBytes(32)));
    const localSecretHashes = localSecrets.map((s) => HashLock.hashSecret(s));
    const localHashLockInstance = secretsCount === 1
        ? HashLock.forSingleFill(localSecrets[0])
        : HashLock.forMultipleFills(HashLock.getMerkleLeaves(localSecrets));

    const createOrderActualParams = {
        receiver: new Address(receiver), // Instantiate Address class
        preset: sdkPresetValue,
        source: source,
        hashLock: localHashLockInstance,
        secretHashes: localSecretHashes,
        // maker: walletAddress as unknown as Address, // If createOrder needs maker explicitly
    };
    console.log('[API /api/place-order] Preparing to call freshQuoteInstance.createOrder with params:', {
      ...createOrderActualParams,
      hashLock: localHashLockInstance.toString() 
    });
    
    const crossChainOrderInstance: CrossChainOrder = freshQuoteInstance.createOrder(createOrderActualParams);
    
    // Pass srcChainId to getTypedData for EIP-712 domain
    const typedDataToSignForClient: EIP712TypedData = crossChainOrderInstance.getTypedData(srcChainId); 
    // Pass srcChainId to getOrderHash
    const orderHashValue: string = crossChainOrderInstance.getOrderHash(srcChainId); 

    const responsePayload = {
        orderHash: orderHashValue,
        typedDataToSign: typedDataToSignForClient,
    };

    const serializableResponsePayload = JSON.parse(JSON.stringify(responsePayload, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
    return NextResponse.json(serializableResponsePayload);
  } catch (error) {
    console.error('Error preparing order on backend:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (error instanceof Error && 'details' in error) {
        console.error('Error details:', (error as any).details);
        return NextResponse.json({ error: `Failed to prepare order: ${errorMessage}`, details: (error as any).details }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to prepare order: ${errorMessage}` }, { status: 500 });
  }
}
