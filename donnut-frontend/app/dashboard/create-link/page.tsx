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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please connect your wallet</h1>
          <p className="text-gray-600">You need to connect your wallet to create payment links.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-8"
        onClick={() => router.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Create Payment Link</h1>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                placeholder="e.g., YouTube Channel, Twitter Profile, etc."
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setError(null); // Clear error when user types
                }}
                maxLength={50}
                className={error ? 'border-red-500' : ''}
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

            <p className="text-gray-600">
              Create a new payment link that you can share with your audience. When someone uses this link,
              they'll be able to send you donations directly to your wallet.
            </p>

            <Button
              onClick={handleCreateLink}
              disabled={isCreating || !label.trim()}
              className="w-full bg-[#A076F9] hover:bg-[#A076F9]/90"
            >
              {isCreating ? 'Creating...' : 'Create Payment Link'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 