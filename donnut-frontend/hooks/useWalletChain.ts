import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'sonner';

export function useWalletChain() {
  const { user, authenticated } = usePrivy();
  const [currentChain, setCurrentChain] = useState<string>('ethereum');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserChain = async () => {
    if (!authenticated || !user?.wallet?.address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/user-mainchain?walletAddress=${user.wallet.address}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCurrentChain(data.current_chain);
    } catch (err) {
      console.error('Error fetching user chain:', err);
      setError('Failed to fetch wallet chain');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserChain = async (chain: string) => {
    if (!authenticated || !user?.wallet?.address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user-mainchain', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: user.wallet.address,
          chain,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentChain(data.current_chain);
      toast.success('Network updated successfully');
    } catch (err) {
      console.error('Error updating user chain:', err);
      setError('Failed to update wallet chain');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchUserChain();
    }
  }, [authenticated, user?.wallet?.address]);

  return {
    currentChain,
    isLoading,
    error,
    updateUserChain,
    refreshChain: fetchUserChain,
  };
} 