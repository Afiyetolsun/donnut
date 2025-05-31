import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Donnut – The Sweetest Way to Support Creativity in Web3',
  description: 'Fans donate seamlessly from any blockchain. Creators receive USDC on Flow. Powered by 1inch Cross-chain Swap (Fusion+).',
  generator: 'donnut.app',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Donnut – The Sweetest Way to Support Creativity in Web3',
    description: 'Fans donate seamlessly from any blockchain. Creators receive USDC on Flow. Powered by 1inch Cross-chain Swap (Fusion+).',
    url: 'https://donnut.app',
    siteName: 'Donnut',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 800,
        alt: 'Donnut logo',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Donnut – The Sweetest Way to Support Creativity in Web3',
    description: 'Fans donate seamlessly from any blockchain. Creators receive USDC on Flow. Powered by 1inch Cross-chain Swap (Fusion+).',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
