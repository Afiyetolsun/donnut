'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Wallet, User, Copy, ExternalLink, LogOut } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { getChainByCaip2Id } from '@/lib/chains';

// Blockscout URLs for different networks
const BLOCKSCOUT_URLS: { [key: string]: string } = {
  'eip155:1': 'https://eth.blockscout.com',
  'eip155:42161': 'https://arbitrum.blockscout.com/',
  'eip155:8453': 'https://base.blockscout.com',
  'eip155:56': 'https://bscscan.com/',
  'eip155:43114': 'https://subnets.avax.network/',
  'eip155:10': 'https://optimism.blockscout.com',
  'eip155:137': 'https://polygon.blockscout.com',
  'eip155:5000': 'https://explorer.mantle.xyz',
  'eip155:130': 'https://unichain.blockscout.com/',
  'eip155:534352': 'https://scroll.blockscout.com',
};

export function WalletButton() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [copyFeedback, setCopyFeedback] = useState(false);
  const router = useRouter();

  const currentWalletAddress = user?.wallet?.address;

  const handleCopyAddress = async () => {
    if (currentWalletAddress) {
      await navigator.clipboard.writeText(currentWalletAddress);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 1000);
    }
  };

  const handleViewOnBlockscout = () => {
    if (currentWalletAddress) {
      // Get the connected wallet that matches the user's wallet address
      const connectedWallet = wallets.find(w => w.address.toLowerCase() === currentWalletAddress.toLowerCase());
      // Get the chain ID in CAIP-2 format (e.g., 'eip155:1' for Ethereum mainnet)
      const chainId = connectedWallet?.chainId || 'eip155:1';
      const baseUrl = BLOCKSCOUT_URLS[chainId] || 'https://eth.blockscout.com';
      window.open(`${baseUrl}/address/${currentWalletAddress}`, '_blank');
    }
  };

  if (!authenticated) {
    return (
      <Button
        variant="outline"
        className="hidden sm:inline-flex border-2 rounded-full hover:bg-[#A076F9] hover:text-white transition-colors"
        style={{ borderColor: "#A076F9", color: "#A076F9" }}
        onClick={login}
      >
        <Wallet className="mr-2 h-4 w-4" />
        Connect Wallet
      </Button>
    );
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="hidden sm:inline-flex border-2 rounded-full hover:bg-[#A076F9] hover:text-white transition-colors group"
          style={{ borderColor: "#A076F9", color: "#A076F9" }}
        >
          <Wallet className="mr-2 h-4 w-4 group-hover:text-white transition-colors" />
          {currentWalletAddress ? shortenAddress(currentWalletAddress) : 'Connected'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          className="py-3 cursor-pointer hover:bg-[#A076F9]/10 focus:bg-[#A076F9]/10"
          onClick={() => router.push('/creator-dashboard')}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Creator Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="py-3 cursor-pointer hover:bg-[#A076F9]/10 focus:bg-[#A076F9]/10"
          onClick={handleCopyAddress}
        >
          <Copy className={cn("mr-2 h-4 w-4", copyFeedback && "text-green-500")} />
          <span>{copyFeedback ? 'Copied!' : 'Copy address'}</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          className="py-3 cursor-pointer hover:bg-[#A076F9]/10 focus:bg-[#A076F9]/10"
          onClick={handleViewOnBlockscout}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>View on Blockscout</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="py-3 cursor-pointer hover:bg-red-100 focus:bg-red-100 text-red-600 hover:text-red-700"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Disconnect</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 