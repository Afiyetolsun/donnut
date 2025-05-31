'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';

export function Header() {
  const { user, authenticated, login, logout } = usePrivy();
  const router = useRouter();

  return (
    <header className="border-b border-opacity-20 border-gray-400 bg-white bg-opacity-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <img src="/logo.svg" alt="Donnut logo" className="w-8 h-8 rounded-full mr-2" />
              <span className="text-2xl font-bold" style={{ color: "#5D4037" }}>
                donnut
              </span>
            </Link>
            <div className="hidden md:flex space-x-6">
              <Link
                href="/dashboard"
                className="text-sm font-medium hover:opacity-75"
                style={{ color: "#5D4037" }}
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/create-link"
                className="text-sm font-medium hover:opacity-75"
                style={{ color: "#5D4037" }}
              >
                Create Link
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {authenticated ? (
              <Button
                variant="outline"
                onClick={() => logout()}
                className="text-sm rounded-full"
                style={{ borderColor: "#A076F9", color: "#A076F9" }}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                onClick={() => login()}
                className="rounded-full text-white font-semibold"
                style={{ backgroundColor: "#A076F9" }}
              >
                Connect Wallet
              </Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" style={{ color: "#5D4037" }} />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
} 