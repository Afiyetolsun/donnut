import { BlockchainProviderConnector, SDK } from '@1inch/cross-chain-sdk';
import { JsonRpcProvider } from 'ethers';
import { NextResponse } from 'next/server';

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
    throw new Error('signTypedData is not supported on the backend for getReadyToAcceptSecretFills operation.');
  }
}

interface GetReadyToAcceptSecretFillsRequestBody {
  orderHash: string;
  srcChainId: number; // Needed for SDK initialization
}

export async function POST(request: Request) {
  try {
    const { orderHash, srcChainId }: GetReadyToAcceptSecretFillsRequestBody = await request.json();

    if (!orderHash || !srcChainId) {
      return NextResponse.json(
        { error: 'Missing required fields for getting ready to accept secret fills' },
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

    const readyToAcceptSecretFills = await sdk.getReadyToAcceptSecretFills(orderHash);

    // Convert BigInts to strings before sending the response
    const serializableResponse = JSON.parse(JSON.stringify(readyToAcceptSecretFills, (key, value) =>
      typeof value === 'bigint'
        ? value.toString()
        : value // return everything else unchanged
    ));
    return NextResponse.json(serializableResponse);
  } catch (error) {
    console.error('Error getting ready to accept secret fills on backend:', error);
    return NextResponse.json(
      { error: `Failed to get ready to accept secret fills: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
