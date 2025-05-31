'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePrivy } from '@privy-io/react-auth';
import { TokenSelector } from '@/components/TokenSelector';
import { ArrowDown, Copy, Gift, Menu } from 'lucide-react';
import Link from 'next/link';
import { WalletButton } from '@/components/WalletButton';
import { Textarea } from '@/components/ui/textarea';

interface PaymentPageClientProps {
  linkId: string;
}

export default function PaymentPageClient({ linkId }: PaymentPageClientProps) {
  const { user, authenticated, login } = usePrivy();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('');
  const [selectedChain, setSelectedChain] = useState(1);
  const [message, setMessage] = useState('');

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
      <div className="min-h-screen" style={{ backgroundColor: "#F5E6CC" }}>
        <nav className="border-b border-opacity-20 border-gray-400 bg-white bg-opacity-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center">
                  <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
                  <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                    donnut
                  </span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <WalletButton />
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" style={{ color: "#5D4037" }} />
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A076F9] mx-auto mb-4"></div>
            <p className="text-gray-600">Loading payment information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F5E6CC" }}>
        <nav className="border-b border-opacity-20 border-gray-400 bg-white bg-opacity-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center">
                  <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
                  <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                    donnut
                  </span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <WalletButton />
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" style={{ color: "#5D4037" }} />
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F5E6CC" }}>
        <nav className="border-b border-opacity-20 border-gray-400 bg-white bg-opacity-50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-8">
                <Link href="/" className="flex items-center">
                  <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
                  <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                    donnut
                  </span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <WalletButton />
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" style={{ color: "#5D4037" }} />
                </Button>
              </div>
            </div>
          </div>
        </nav>
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4" style={{ color: "#5D4037" }}>Connect Wallet to Donate</h1>
            <p className="text-gray-600 mb-6">Please connect your wallet to proceed with the donation.</p>
            <Button
              onClick={login}
              className="rounded-full px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl"
              style={{ backgroundColor: "#A076F9" }}
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleDonate = () => {
    // TODO: Implement actual donation logic
    console.log('Donating:', {
      amount,
      token: selectedToken,
      chain: selectedChain,
      recipient: walletAddress,
      message,
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5E6CC" }}>
      {/* Header */}
      <nav className="border-b border-opacity-20 border-gray-400 bg-white bg-opacity-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center">
                <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
                <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                  donnut
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <WalletButton />
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" style={{ color: "#5D4037" }} />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-xl">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#FFCAD4" }}>
                <Gift className="w-8 h-8 text-white" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: "#5D4037" }}>Send a Donnut</h1>
            
            <div className="space-y-6">
              <TokenSelector
                onAmountChange={setAmount}
                onTokenChange={setSelectedToken}
                onChainChange={setSelectedChain}
              />

              <div className="flex justify-center">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: "#A076F9" }}>
                  <ArrowDown className="h-4 w-4 text-white" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm mb-2" style={{ color: "#5D4037" }}>Recipient Address:</p>
                <div className="flex items-center justify-between">
                  <div className="bg-white p-2 rounded-md break-all font-mono text-sm flex-1 mr-2" style={{ color: "#5D4037" }}>
                    {walletAddress}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (walletAddress) {
                        navigator.clipboard.writeText(walletAddress);
                      }
                    }}
                    className="hover:bg-[#A076F9]/10"
                  >
                    <Copy className="h-4 w-4" style={{ color: "#A076F9" }} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: "#5D4037" }}>
                  Message (optional)
                </label>
                <Textarea
                  placeholder="Add a message to your donation..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                  className="resize-none rounded-xl border-gray-200 focus:border-[#A076F9] focus:ring-[#A076F9]"
                  rows={3}
                />
                <div className="text-right text-sm text-gray-500">
                  {message.length}/100 characters
                </div>
              </div>

              <Button
                onClick={handleDonate}
                className="w-full rounded-full px-8 py-6 text-lg font-semibold text-white shadow-xl transition-all duration-200 transform hover:scale-105 hover:shadow-2xl"
                style={{ backgroundColor: "#A076F9" }}
                disabled={!amount || !selectedToken}
              >
                Send Donnut
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-opacity-20 border-gray-400 bg-white bg-opacity-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
              <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                donnut
              </span>
            </div>
            <div className="flex space-x-6">
              <Link href="#" className="opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Twitter
              </Link>
              <Link href="#" className="opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                GitHub
              </Link>
              <Link href="#" className="opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Terms
              </Link>
              <Link href="#" className="opacity-75 hover:opacity-100" style={{ color: "#5D4037" }}>
                Privacy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 