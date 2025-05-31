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

export async function getPaymentLinksByWalletAddress(walletAddress: string): Promise<PaymentLink[]> {
  const result = await sql`
    SELECT * FROM payment_links 
    WHERE wallet_address = ${walletAddress}
    ORDER BY created_at DESC
  `;
  return result as PaymentLink[];
}

// Export the pool for more complex queries if needed
export { pool }; 