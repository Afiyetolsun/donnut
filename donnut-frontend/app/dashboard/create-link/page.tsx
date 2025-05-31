'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { generateSlug } from '@/lib/utils';
import { toast } from 'sonner';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Card, CardContent } from '@/components/ui/card';

export default function CreateLinkPage() {
  const { user, authenticated } = usePrivy();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleCreateLink = async () => {
    if (!user?.wallet?.address || !label.trim()) return;
    
    setError(null);
    setIsCreating(true);
    try {
      // Generate a slug from the label
      const slug = generateSlug(label.trim());
      const link = `${window.location.origin}/donnut/${slug}`;
      
      const response = await fetch('/api/payment-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: user.wallet.address,
          link,
          label: label.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error);
        return;
      }

      toast.success('Payment link created successfully!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating payment link:', error);
      setError('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F5E6CC" }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "#5D4037" }}>Please connect your wallet</h1>
          <p className="text-gray-600">You need to connect your wallet to create payment links.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F5E6CC" }}>
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          className="mb-8"
          onClick={() => router.back()}
          style={{ color: "#5D4037" }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8" style={{ color: "#5D4037" }}>Create Payment Link</h1>
          
          <Card className="border-0 shadow-lg rounded-3xl bg-white bg-opacity-80 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="label" className="text-[#5D4037]">Label</Label>
                  <Input
                    id="label"
                    placeholder="e.g., YouTube Channel, Twitter Profile, etc."
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      setError(null);
                    }}
                    maxLength={50}
                    className={`rounded-full border-gray-200 ${error ? 'border-red-500' : ''}`}
                  />
                  {error && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-sm text-gray-500">
                    Give your payment link a descriptive name. This will be used to create a unique URL for your link.
                    You cannot create multiple links with the same label.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-4">
                  <h3 className="font-semibold mb-2" style={{ color: "#5D4037" }}>How it works</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Your payment link will be created with a unique URL based on the label</li>
                    <li>• Share this link with your audience to receive donations</li>
                    <li>• All donations will be sent directly to your connected wallet</li>
                    <li>• You can create multiple links for different purposes</li>
                  </ul>
                </div>

                <Button
                  onClick={handleCreateLink}
                  disabled={isCreating || !label.trim()}
                  className="w-full rounded-full text-white font-semibold"
                  style={{ backgroundColor: "#A076F9" }}
                >
                  {isCreating ? 'Creating...' : 'Create Payment Link'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 