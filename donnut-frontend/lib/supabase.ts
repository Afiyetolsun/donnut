import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}
if (!process.env.SUPABASE_API_KEY) {
  throw new Error('Missing env.SUPABASE_API_KEY')
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_API_KEY
)

// Types for our database tables
export type UserWallet = {
  id: string
  wallet_address: string
  created_at: string
}

export type PaymentLink = {
  id: string
  user_wallet_id: string
  link: string
  created_at: string
}

// Database helper functions
export async function getUserWalletByAddress(walletAddress: string) {
  const { data, error } = await supabase
    .from('users_wallets')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single()
  
  if (error) throw error
  return data as UserWallet
}

export async function createUserWallet(walletAddress: string) {
  const { data, error } = await supabase
    .from('users_wallets')
    .insert([{ wallet_address: walletAddress }])
    .select()
    .single()
  
  if (error) throw error
  return data as UserWallet
}

export async function createPaymentLink(userWalletId: string, link: string) {
  const { data, error } = await supabase
    .from('payment_links')
    .insert([{ user_wallet_id: userWalletId, link }])
    .select()
    .single()
  
  if (error) throw error
  return data as PaymentLink
}

export async function getPaymentLinksByUserWalletId(userWalletId: string) {
  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .eq('user_wallet_id', userWalletId)
  
  if (error) throw error
  return data as PaymentLink[]
} 