import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing env.DATABASE_URL');
}

// Create a Neon database client
const sql = neon(process.env.DATABASE_URL);

// Create a connection pool for more complex queries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Types for our database tables
export type PaymentLink = {
  id: string;
  wallet_address: string;
  link: string;
  label: string;
  created_at: string;
};

export type Donation = {
  id: string;
  payment_link_id: string;
  transaction_hash: string;
  created_at: string;
};

export type PaymentLinkWithDonations = PaymentLink & {
  donations: Donation[];
};

export type UserMainChain = {
  id: string;
  wallet_address: string;
  current_chain: string;
  updated_at: string;
};

// Database helper functions
export async function createPaymentLink(walletAddress: string, link: string, label: string): Promise<PaymentLink> {
  // First check if a link with this label already exists for this wallet
  const existingLink = await sql`
    SELECT id, label FROM payment_links 
    WHERE wallet_address = ${walletAddress} AND label = ${label}
  `;

  if (existingLink.length > 0) {
    throw new Error(`This label is already in use. Please choose a different name for your payment link.`);
  }

  const result = await sql`
    INSERT INTO payment_links (wallet_address, link, label)
    VALUES (${walletAddress}, ${link}, ${label})
    RETURNING *
  `;
  return result[0] as PaymentLink;
}

export async function getPaymentLinksByWalletAddress(walletAddress: string): Promise<PaymentLinkWithDonations[]> {
  try {
    const result = await sql`
      SELECT 
        pl.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', d.id,
              'payment_link_id', d.payment_link_id,
              'transaction_hash', d.transaction_hash,
              'created_at', d.created_at
            )
          ) FILTER (WHERE d.id IS NOT NULL),
          '[]'
        ) as donations
      FROM payment_links pl
      LEFT JOIN donations d ON pl.id = d.payment_link_id
      WHERE pl.wallet_address = ${walletAddress}
      GROUP BY pl.id
      ORDER BY pl.created_at DESC
    `;
    return result as PaymentLinkWithDonations[];
  } catch (error) {
    console.error('Error in getPaymentLinksByWalletAddress:', error);
    throw new Error('Failed to fetch payment links from database');
  }
}

export async function createDonation(
  paymentLinkId: string,
  transactionHash: string
): Promise<Donation> {
  try {
    const result = await sql`
      INSERT INTO donations (
        payment_link_id,
        transaction_hash
      )
      VALUES (
        ${paymentLinkId},
        ${transactionHash}
      )
      RETURNING *
    `;
    return result[0] as Donation;
  } catch (error) {
    console.error('Error in createDonation:', error);
    throw new Error('Failed to create donation record');
  }
}

export async function getUserMainChain(walletAddress: string): Promise<UserMainChain | null> {
  try {
    console.log('Executing getUserMainChain query for:', walletAddress);
    const result = await sql`
      SELECT * FROM user_mainchain 
      WHERE wallet_address = ${walletAddress}
    `;
    console.log('getUserMainChain query result:', result);
    return result[0] as UserMainChain || null;
  } catch (error) {
    console.error('Error in getUserMainChain:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      walletAddress
    });
    throw new Error(`Failed to fetch user main chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function createOrUpdateUserMainChain(walletAddress: string, chain: string): Promise<UserMainChain> {
  try {
    console.log('Executing createOrUpdateUserMainChain query:', { walletAddress, chain });
    const result = await sql`
      INSERT INTO user_mainchain (wallet_address, current_chain)
      VALUES (${walletAddress}, ${chain})
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        current_chain = ${chain},
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    console.log('createOrUpdateUserMainChain query result:', result);
    return result[0] as UserMainChain;
  } catch (error) {
    console.error('Error in createOrUpdateUserMainChain:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      walletAddress,
      chain
    });
    throw new Error(`Failed to create or update user main chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export the pool for more complex queries if needed
export { pool }; 