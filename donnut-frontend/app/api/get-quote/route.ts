import { NextResponse } from 'next/server';
import { SDK, BlockchainProviderConnector } from '@1inch/cross-chain-sdk';
import { JsonRpcProvider } from 'ethers';

// Custom BackendBlockchainProvider to satisfy SDK's BlockchainProviderConnector interface
class BackendBlockchainProvider implements BlockchainProviderConnector {
  private provider: JsonRpcProvider;

  constructor(provider: JsonRpcProvider) {
    this.provider = provider;
  }

  async ethCall(contractAddress: string, callData: string): Promise<string> {
    return this.provider.call({ to: contractAddress, data: callData });
  }

  async signTypedData(walletAddress: string, typedData: any): Promise<string> {
    throw new Error('signTypedData is not supported on the backend for getQuote operation.');
  }
}

interface GetQuoteRequestBody {
  srcChainId: number;
  dstChainId: number;
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string;
  enableEstimate: boolean;
  walletAddress: string;
}

export async function POST(request: Request) {
  try {
    const {
      srcChainId,
      dstChainId,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      enableEstimate,
      walletAddress,
    }: GetQuoteRequestBody = await request.json();

    console.log('[API /api/get-quote] Received for getQuote:', {
      srcChainId,
      dstChainId,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      walletAddress,
      enableEstimate
    });

    if (!srcChainId || !dstChainId || !srcTokenAddress || !dstTokenAddress || !amount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields for fetching quote' },
        { status: 400 }
      );
    }

    const AUTH_KEY = process.env.ONE_INCH_AUTH_KEY;
    const RPC_URL = process.env.RPC_URL; // RPC URL for the source chain

    if (!AUTH_KEY) {
      return NextResponse.json(
        { error: 'ONE_INCH_AUTH_KEY environment variable not set' },
        { status: 500 }
      );
    }

    if (!RPC_URL) {
      return NextResponse.json(
        { error: 'RPC_URL environment variable not set for backend SDK' },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(RPC_URL, srcChainId);
    const bcProvider = new BackendBlockchainProvider(provider);

    const sdk = new SDK({
      url: 'https://api.1inch.dev/fusion-plus',
      authKey: AUTH_KEY,
      blockchainProvider: bcProvider,
    });

    const quote = await sdk.getQuote({
      srcChainId,
      dstChainId,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      enableEstimate,
      walletAddress,
    });

    // Convert BigInts to strings before sending the response
    const serializableQuote = JSON.parse(JSON.stringify(quote, (key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value // return everything else unchanged
    ));
    console.log('[API /api/get-quote] Serializable quote being returned:', JSON.stringify(serializableQuote, null, 2));
    return NextResponse.json(serializableQuote);
  } catch (error) {
    console.error('Error fetching quote on backend:', error);
    return NextResponse.json(
      { error: `Failed to fetch quote: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
