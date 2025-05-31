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
  created_at: string;
};

// Database helper functions
export async function createPaymentLink(walletAddress: string, link: string): Promise<PaymentLink> {
  const result = await sql`
    INSERT INTO payment_links (wallet_address, link)
    VALUES (${walletAddress}, ${link})
    RETURNING *
  `;
  return result[0];
}

export async function getPaymentLinksByWalletAddress(walletAddress: string): Promise<PaymentLink[]> {
  const result = await sql`
    SELECT * FROM payment_links 
    WHERE wallet_address = ${walletAddress}
  `;
  return result;
}

// Export the pool for more complex queries if needed
export { pool }; 