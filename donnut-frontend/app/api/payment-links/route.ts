import { NextResponse } from 'next/server';
import { createPaymentLink, getPaymentLinksByWalletAddress } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { walletAddress, link, label } = await request.json();
    
    if (!walletAddress || !link || !label) {
      return NextResponse.json(
        { error: 'Wallet address, link, and label are required' },
        { status: 400 }
      );
    }

    // Ensure the link is a full URL
    if (!link.startsWith('http')) {
      return NextResponse.json(
        { error: 'Invalid link format. Must be a full URL.' },
        { status: 400 }
      );
    }

    try {
      const paymentLink = await createPaymentLink(walletAddress, link, label);
      return NextResponse.json(paymentLink);
    } catch (error) {
      // Handle duplicate label error
      if (error instanceof Error) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error creating payment link:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    const paymentLinks = await getPaymentLinksByWalletAddress(walletAddress);
    return NextResponse.json(paymentLinks);
  } catch (error) {
    console.error('Error fetching payment links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment links' },
      { status: 500 }
    );
  }
} 