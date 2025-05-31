'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PaymentLink } from '@/lib/db';

export default function DashboardPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPaymentLinks = async () => {
      if (!user?.wallet?.address) return;
      
      try {
        const response = await fetch(`/api/payment-links?walletAddress=${user.wallet.address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch payment links');
        }
        const data = await response.json();
        setPaymentLinks(data);
      } catch (error) {
        console.error('Error fetching payment links:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (authenticated) {
      fetchPaymentLinks();
    }
  }, [authenticated, user?.wallet?.address]);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
          <p className="text-gray-600">You need to connect your wallet to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Your Payment Links</h1>
        <Button
          onClick={() => router.push('/dashboard/create-link')}
          className="bg-[#A076F9] hover:bg-[#A076F9]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Link
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <p>Loading your payment links...</p>
        </div>
      ) : paymentLinks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">You haven't created any payment links yet.</p>
          <Button
            onClick={() => router.push('/dashboard/create-link')}
            className="bg-[#A076F9] hover:bg-[#A076F9]/90"
          >
            Create Your First Link
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {paymentLinks.map((link) => (
            <div
              key={link.id}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <div className="flex justify-between items-start">
                <div className="w-full">
                  <h3 className="text-lg font-semibold mb-2">{link.label}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Created on {new Date(link.created_at).toLocaleDateString()}
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={link.link}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-50 font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(link.link);
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 