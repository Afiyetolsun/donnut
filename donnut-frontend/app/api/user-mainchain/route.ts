import { NextResponse } from 'next/server';
import { getUserMainChain, createOrUpdateUserMainChain } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get('walletAddress');

  if (!walletAddress) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  try {
    console.log('Fetching user chain for wallet:', walletAddress);
    let userChain = await getUserMainChain(walletAddress);
    console.log('User chain result:', userChain);

    // If user doesn't exist, create a new entry with Ethereum as default
    if (!userChain) {
      console.log('No existing chain found, creating default entry');
      userChain = await createOrUpdateUserMainChain(walletAddress, 'ethereum');
      console.log('Created new user chain:', userChain);
    }

    return NextResponse.json({ current_chain: userChain.current_chain });
  } catch (error) {
    console.error('Detailed error in GET /api/user-mainchain:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      walletAddress
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { walletAddress, chain } = await request.json();
    console.log('Updating chain for wallet:', { walletAddress, chain });

    if (!walletAddress || !chain) {
      return NextResponse.json({ error: 'Wallet address and chain are required' }, { status: 400 });
    }

    const validChains = ['ethereum', 'optimism', 'arbitrum', 'polygon'];
    if (!validChains.includes(chain)) {
      return NextResponse.json({ error: 'Invalid chain' }, { status: 400 });
    }

    const userChain = await createOrUpdateUserMainChain(walletAddress, chain);
    console.log('Updated user chain:', userChain);
    return NextResponse.json({ success: true, current_chain: userChain.current_chain });
  } catch (error) {
    console.error('Detailed error in PUT /api/user-mainchain:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 