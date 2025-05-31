import { NextResponse } from 'next/server';
import { createDonation } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const {
      paymentLinkId,
      amount,
      currency,
      fromAddress,
      toAddress,
      transactionHash,
    } = await request.json();

    if (!paymentLinkId || !amount || !currency || !fromAddress || !toAddress || !transactionHash) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const donation = await createDonation(
      paymentLinkId,
      amount,
      currency,
      fromAddress,
      toAddress,
      transactionHash
    );

    return NextResponse.json(donation);
  } catch (error) {
    console.error('Error creating donation:', error);
    return NextResponse.json(
      { error: 'Failed to create donation' },
      { status: 500 }
    );
  }
} 