'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { WalletButton } from "@/components/WalletButton"

export function Header() {
  const { user, authenticated, login, logout } = usePrivy();
  const router = useRouter();
  const pathname = usePathname()
  const isLandingPage = pathname === '/'

  return (
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
            {isLandingPage ? (
              <div className="hidden md:flex space-x-6">
                <Link
                  href="#how-it-works"
                  className="text-sm font-medium hover:opacity-75"
                  style={{ color: "#5D4037" }}
                >
                  How it Works
                </Link>
                <Link 
                  href="#for-fans" 
                  className="text-sm font-medium hover:opacity-75" 
                  style={{ color: "#5D4037" }}
                >
                  For Fans
                </Link>
                <Link
                  href="#for-creators"
                  className="text-sm font-medium hover:opacity-75"
                  style={{ color: "#5D4037" }}
                >
                  For Creators
                </Link>
                <Link
                  href="#transparency"
                  className="text-sm font-medium hover:opacity-75"
                  style={{ color: "#5D4037" }}
                >
                  Transparency
                </Link>
              </div>
            ) : (
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
            )}
          </div>
          <div className="flex items-center space-x-4">
            <WalletButton />
            {isLandingPage && (
              <Button className="rounded-full text-white font-semibold" style={{ backgroundColor: "#A076F9" }}>
                Send a Donnut
              </Button>
            )}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" style={{ color: "#5D4037" }} />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
} 