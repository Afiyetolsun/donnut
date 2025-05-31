'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';

interface PaymentPageClientProps {
  linkId: string;
}

export default function PaymentPageClient({ linkId }: PaymentPageClientProps) {
  const { user, authenticated, login } = usePrivy();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWalletAddress = async () => {
      if (!linkId) return;
      
      try {
        const response = await fetch(`/api/payment-links/${linkId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('Payment link not found');
          } else {
            throw new Error('Failed to fetch payment information');
          }
          return;
        }

        const data = await response.json();
        setWalletAddress(data.walletAddress);
      } catch (err) {
        console.error('Error fetching wallet address:', err);
        setError('Error loading payment information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchWalletAddress();
  }, [linkId]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A076F9] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Wallet to Donate</h1>
          <p className="text-gray-600 mb-6">Please connect your wallet to proceed with the donation.</p>
          <Button
            onClick={login}
            className="bg-[#A076F9] hover:bg-[#A076F9]/90"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h1 className="text-2xl font-bold mb-4">Send Donation</h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-2">Recipient Address:</p>
            <div className="bg-gray-50 p-3 rounded-md break-all font-mono text-sm">
              {walletAddress}
            </div>
          </div>

          <p className="text-gray-600 mb-6">
            Connect your wallet and use your preferred wallet interface to send the donation
            to the address above.
          </p>

          <Button
            onClick={() => {
              // Copy wallet address to clipboard
              if (walletAddress) {
                navigator.clipboard.writeText(walletAddress);
              }
            }}
            className="w-full bg-[#A076F9] hover:bg-[#A076F9]/90"
          >
            Copy Address
          </Button>
        </div>
      </div>
    </div>
  );
} 