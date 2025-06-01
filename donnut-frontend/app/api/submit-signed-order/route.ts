import { 
    BlockchainProviderConnector, 
    SDK,
    CrossChainOrderStruct // Assuming this type exists for the order message
} from '@1inch/cross-chain-sdk';
import { JsonRpcProvider } from 'ethers';
import { NextResponse } from 'next/server';

interface SubmitSignedOrderRequestBody {
  orderMessage: CrossChainOrderStruct; // The EIP-712 message part of typedDataToSign
  signature: string;
  quoteId?: string; // Optional, but often useful for relayers
  srcChainId: number; // Chain ID where the order is submitted
}

export async function POST(request: Request) {
  try {
    const { 
        orderMessage, 
        signature, 
        quoteId, 
        srcChainId 
    }: SubmitSignedOrderRequestBody = await request.json();

    if (!orderMessage || !signature || !srcChainId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderMessage, signature, or srcChainId' },
        { status: 400 }
      );
    }

    const AUTH_KEY = process.env.ONE_INCH_AUTH_KEY;
    const RPC_URL = process.env.RPC_URL; 

    if (!AUTH_KEY) {
      return NextResponse.json({ error: 'ONE_INCH_AUTH_KEY environment variable not set' }, { status: 500 });
    }
    if (!RPC_URL) { // Though not strictly needed for relayer, good practice for SDK init
      return NextResponse.json({ error: 'RPC_URL environment variable not set for backend SDK' }, { status: 500 });
    }

    // Minimal provider for SDK, as relayer might not need full blockchain interaction for submission
    class MinimalBlockchainProvider implements BlockchainProviderConnector {
      async ethCall(_contractAddress: string, _callData: string): Promise<string> {
        throw new Error('ethCall not implemented for submission-only provider');
      }
      async signTypedData(_walletAddress: string, _typedData: any): Promise<string> {
        throw new Error('signTypedData not implemented for submission-only provider');
      }
    }
    // SDK needs a provider, even if relayer doesn't use all its methods for submission
    const provider = new JsonRpcProvider(RPC_URL, srcChainId); 
    const bcProvider = new MinimalBlockchainProvider(); // Or use BackendBlockchainProvider if some calls are made

    const sdk = new SDK({
      url: 'https://api.1inch.dev/fusion-plus', // Ensure this is the correct base URL for relayer
      authKey: AUTH_KEY,
      blockchainProvider: bcProvider, 
    });

    console.log('[API /api/submit-signed-order] Submitting order to relayer:', { orderMessage, signature, quoteId, srcChainId });

    // The actual submission to 1inch Fusion Relayer
    // The relayer endpoint might be different from the main SDK URL.
    // sdk.relayer.submitOrder might construct the URL based on chainId.
    const submissionResponse = await sdk.relayer.submitOrder(
        { order: orderMessage, signature, quoteId },
        srcChainId
    );
    
    console.log('[API /api/submit-signed-order] Submission response:', submissionResponse);

    // submissionResponse might be just a status or could include transaction hash if relayed on-chain by 1inch
    return NextResponse.json({ success: true, data: submissionResponse });

  } catch (error) {
    console.error('Error submitting signed order to 1inch:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let errorDetails = {};
    if (error instanceof Error && 'details' in error) {
        errorDetails = (error as any).details;
        console.error('Submission error details:', errorDetails);
    }
     if (error instanceof Error && 'response' in error && (error as any).response?.data) {
        errorDetails = (error as any).response.data;
        console.error('Submission error response data:', errorDetails);
    }
    return NextResponse.json(
      { error: `Failed to submit signed order: ${errorMessage}`, details: errorDetails }, 
      { status: 500 }
    );
  }
}
