import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { linkId: string } }
) {
  try {
    const linkId = params.linkId; // Directly access the property
    if (!linkId) {
      return NextResponse.json(
        { error: 'Link ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      'SELECT wallet_address FROM payment_links WHERE link = $1',
      [`${process.env.NEXT_PUBLIC_APP_URL}/donnut/${linkId}`]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ walletAddress: result.rows[0].wallet_address });
  } catch (error) {
    console.error('Error fetching payment link:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment link' },
      { status: 500 }
    );
  }
}
