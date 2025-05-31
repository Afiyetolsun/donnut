'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ChevronRight, ChevronDown, ChevronUp, Search, Copy, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PaymentLink } from '@/lib/db';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface Donation {
  id: string;
  transaction_hash: string;
  created_at: string;
}

interface PaymentLinkWithDonations extends PaymentLink {
  donations: Donation[];
}

export default function DashboardPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkWithDonations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLinks, setExpandedLinks] = useState<Set<string>>(new Set());
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const getDonutColor = (seed: string) => {
    // Generate a consistent color based on the seed
    const colors = [
      'hue-rotate(0deg) saturate(200%) brightness(100%)', // pink
      'hue-rotate(60deg) saturate(200%) brightness(100%)', // yellow
      'hue-rotate(240deg) saturate(200%) brightness(100%)', // purple
      'hue-rotate(300deg) saturate(200%) brightness(100%)', // hot pink
      'hue-rotate(120deg) saturate(200%) brightness(100%)', // green
      'hue-rotate(180deg) saturate(200%) brightness(100%)', // cyan
      'hue-rotate(30deg) saturate(200%) brightness(100%)', // orange
      'hue-rotate(270deg) saturate(200%) brightness(100%)', // magenta
    ];
    
    // Use the seed to pick a consistent color
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

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
        toast.error('Failed to fetch payment links');
      } finally {
        setIsLoading(false);
      }
    };

    if (authenticated) {
      fetchPaymentLinks();
    }
  }, [authenticated, user?.wallet?.address]);

  const toggleLinkExpansion = (linkId: string) => {
    setExpandedLinks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(linkId)) {
        newSet.delete(linkId);
      } else {
        newSet.add(linkId);
      }
      return newSet;
    });
  };

  const filteredLinks = paymentLinks
    .filter(link => 
      link.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalDonations = paymentLinks.reduce((sum, link) => sum + link.donations.length, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const copyToClipboard = async (link: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(linkId);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5E6CC" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "#5D4037" }}>Please connect your wallet</h1>
          <p className="text-gray-600">You need to connect your wallet to view your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5E6CC" }}>
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: "#5D4037" }}>Dashboard</h1>
          <Button
            onClick={() => router.push('/dashboard/create-link')}
            className="rounded-full text-white font-semibold"
            style={{ backgroundColor: "#A076F9" }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Link
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle style={{ color: "#5D4037" }}>Total Links</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" style={{ color: "#A076F9" }}>{paymentLinks.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle style={{ color: "#5D4037" }}>Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" style={{ color: "#A076F9" }}>{totalDonations}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p style={{ color: "#5D4037" }}>Loading your payment links...</p>
          </div>
        ) : paymentLinks.length === 0 ? (
          <div className="text-center py-8">
            <p className="mb-4" style={{ color: "#5D4037" }}>You haven't created any payment links yet.</p>
            <Button
              onClick={() => router.push('/dashboard/create-link')}
              className="rounded-full text-white font-semibold"
              style={{ backgroundColor: "#A076F9" }}
            >
              Create Your First Link
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search links by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-full border-gray-200"
              />
            </div>
            
            {filteredLinks.map((link) => (
              <Card key={link.id} className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 flex items-center justify-center text-3xl">
                        <span 
                          className="transform transition-transform hover:scale-110"
                          style={{ filter: getDonutColor(link.id) }}
                        >
                          🍩
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold truncate" style={{ color: "#5D4037" }}>{link.label}</h3>
                        <span className="text-sm text-gray-500 ml-2 whitespace-nowrap">Created {formatDate(link.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <p className="truncate">{link.link}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(link.link, link.id);
                          }}
                          variant="outline"
                          size="sm"
                          className="rounded-full text-sm"
                          style={{ borderColor: "#A076F9", color: "#A076F9" }}
                        >
                          {copiedLinkId === link.id ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => toggleLinkExpansion(link.id)}
                          variant="ghost"
                          size="sm"
                          className="rounded-full text-sm text-gray-500 hover:text-gray-700"
                        >
                          {expandedLinks.has(link.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-2" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Show More
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {expandedLinks.has(link.id) && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      {link.donations.length > 0 ? (
                        <div>
                          <p className="text-sm text-gray-500 mb-4">Recent Transactions:</p>
                          <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Transaction Hash</TableHead>
                                  <TableHead>Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {link.donations.map((donation) => (
                                  <TableRow key={donation.id}>
                                    <TableCell className="font-mono text-sm">
                                      {donation.transaction_hash.slice(0, 8)}...{donation.transaction_hash.slice(-6)}
                                    </TableCell>
                                    <TableCell>
                                      {formatDate(donation.created_at)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No transactions yet</p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
} 