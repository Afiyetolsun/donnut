import { NextResponse } from 'next/server';
// No SDK imports needed if making a direct HTTP call

interface RelaySignedOrderRequestBody {
  orderMessage: any; // The EIP-712 message (order structure)
  signature: string;
  srcChainId: number; // Chain ID where the order is submitted
  quoteId?: string; 
}

export async function POST(request: Request) {
  try {
    const { 
        orderMessage, 
        signature, 
        srcChainId,
        quoteId // Now expecting quoteId
    }: RelaySignedOrderRequestBody = await request.json();

    // quoteId is optional for the 1inch API but might help
    if (!orderMessage || !signature || !srcChainId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderMessage, signature, or srcChainId' },
        { status: 400 }
      );
    }

    const AUTH_KEY = process.env.ONE_INCH_AUTH_KEY;
    if (!AUTH_KEY) {
      return NextResponse.json({ error: 'ONE_INCH_AUTH_KEY environment variable not set' }, { status: 500 });
    }

    // Construct the 1inch Fusion Relayer API URL
    // This URL might need to be confirmed from 1inch documentation
    // Trying a simpler path under /fusion-plus/
    const relayerApiUrl = `https://api.1inch.dev/fusion-plus/${srcChainId}/order`; // Common REST pattern for POST to /orders or /{chainId}/orders
    // Or perhaps it's POST to /fusion-plus/orders with chainId in body or as query param.
    // Let's try POST to /fusion-plus/{srcChainId}/order (without /submit) first.
    // If this fails, the next guess would be /fusion-plus/orders and include chainId in payload if API expects it.
    
    const payloadToSubmit: { order: any; signature: string; quoteId?: string } = {
        order: orderMessage,
        signature: signature,
    };
    if (quoteId) {
        payloadToSubmit.quoteId = quoteId;
    }

    console.log('[API /api/relay-signed-order] Submitting to 1inch Relayer URL:', relayerApiUrl);
    console.log('[API /api/relay-signed-order] Payload:', JSON.stringify(payloadToSubmit, null, 2));

    const response = await fetch(relayerApiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_KEY}` // Assuming Bearer token auth
        },
        body: JSON.stringify(payloadToSubmit),
    });

    if (!response.ok) {
        const errorText = await response.text(); // Get error as text first
        console.error(`[API /api/relay-signed-order] 1inch API Error (status ${response.status}):`, errorText);
        let errorDetails: any = { message: errorText };
        try {
            errorDetails = JSON.parse(errorText); // Try to parse as JSON if it might be
        } catch (e) {
            // Keep errorText if not JSON
        }
        return NextResponse.json(
            { 
                error: `Failed to submit order to 1inch: ${errorDetails.description || errorDetails.message || response.statusText}`, 
                details: errorDetails 
            }, 
            { status: response.status }
        );
    }
    
    // If response.ok, then try to parse as JSON
    const responseData = await response.json(); 
    console.log('[API /api/relay-signed-order] 1inch API Success Response:', responseData);
    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    // This catch block now handles errors from fetch itself or if response.json() fails when response.ok was true (unlikely for typical APIs)
    console.error('Error relaying signed order (outer catch):', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to relay signed order: ${errorMessage}` }, 
      { status: 500 }
    );
  }
}
