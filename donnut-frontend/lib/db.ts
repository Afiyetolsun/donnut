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
export type UserWallet = {
  id: string;
  wallet_address: string;
  created_at: string;
};

export type PaymentLink = {
  id: string;
  user_wallet_id: string;
  link: string;
  created_at: string;
};

// Database helper functions
export async function getUserWalletByAddress(walletAddress: string): Promise<UserWallet | null> {
  const result = await sql`
    SELECT * FROM users_wallets 
    WHERE wallet_address = ${walletAddress}
    LIMIT 1
  `;
  return result[0] || null;
}

export async function createUserWallet(walletAddress: string): Promise<UserWallet> {
  const result = await sql`
    INSERT INTO users_wallets (wallet_address)
    VALUES (${walletAddress})
    RETURNING *
  `;
  return result[0];
}

export async function createPaymentLink(userWalletId: string, link: string): Promise<PaymentLink> {
  const result = await sql`
    INSERT INTO payment_links (user_wallet_id, link)
    VALUES (${userWalletId}, ${link})
    RETURNING *
  `;
  return result[0];
}

export async function getPaymentLinksByUserWalletId(userWalletId: string): Promise<PaymentLink[]> {
  const result = await sql`
    SELECT * FROM payment_links 
    WHERE user_wallet_id = ${userWalletId}
  `;
  return result;
}

// Export the pool for more complex queries if needed
export { pool }; 