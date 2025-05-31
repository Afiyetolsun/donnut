'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';

export function WalletButton() {
  const { login, logout, authenticated } = usePrivy();

  return (
    <Button
      variant="outline"
      className="hidden sm:inline-flex border-2 rounded-full"
      style={{ borderColor: "#A076F9", color: "#A076F9" }}
      onClick={authenticated ? logout : login}
    >
      {authenticated ? 'Disconnect Wallet' : 'Connect Wallet'}
    </Button>
  );
} 