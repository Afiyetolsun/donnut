'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function SendDonutPage() {
  const router = useRouter();
  const [donutLink, setDonutLink] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Extract the donut ID from the link
      const donutId = donutLink.split('/').pop();
      
      // Check if the payment link exists in the database
      const response = await fetch(`/api/payment-links/${donutId}`);
      
      if (response.ok) {
        // Show success state
        setIsSuccess(true);
        // Wait for 1.5 seconds to show the success animation
        setTimeout(() => {
          router.push(`/donnut/${donutId}`);
        }, 1500);
      } else {
        const data = await response.json();
        setError(data.error || 'This donut link does not exist. Please check the link and try again.');
      }
    } catch (err) {
      setError('An error occurred while checking the donut link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#F5E6CC] via-[#FFE5E5] to-[#F5E6CC]">
      <Header />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#5D4037" }}>
              Send Donut Now
            </h1>
            <p className="mt-2 text-sm" style={{ color: "#5D4037" }}>
              Enter the donut link to proceed with your donation
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="space-y-4">
              <Input
                type="text"
                placeholder="Enter donut link"
                value={donutLink}
                onChange={(e) => setDonutLink(e.target.value)}
                className="w-full bg-white bg-opacity-60 backdrop-blur-sm border-input"
                required
                disabled={isLoading || isSuccess}
              />
              
              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              {isSuccess && (
                <div className="flex items-center justify-center space-x-2 text-green-600 animate-fade-in">
                  <CheckCircle2 className="h-5 w-5 animate-bounce" />
                  <span className="font-medium">Link found! Redirecting...</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full rounded-full text-white font-semibold shadow-xl"
              style={{ backgroundColor: "#A076F9" }}
              disabled={isLoading || isSuccess}
            >
              {isLoading ? 'Checking...' : isSuccess ? 'Found!' : 'Continue'}
            </Button>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
} 