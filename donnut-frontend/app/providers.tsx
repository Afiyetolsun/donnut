'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ''}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'light',
          accentColor: '#A076F9',
          showWalletLoginFirst: true,
        },
      }}
    >
      {children}
      <Toaster />
    </PrivyProvider>
  );
} 