// ── hooks/useEthersPrivy.ts ─────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { BrowserProvider, JsonRpcSigner } from 'ethers'
import { useWallets } from '@privy-io/react-auth'

/**
 * Wraps Privy’s injected provider (window.privy) in ethers.BrowserProvider,
 * then exposes:
 *   • provider: BrowserProvider
 *   • signer:   JsonRpcSigner
 *   • userAddress: string
 *   • chainId:  number
 */
export function useEthersPrivy() {
  const { wallets } = useWallets()
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null)
  const [userAddress, setUserAddress] = useState<string>('')
  const [chainId, setChainId] = useState<number>(0)

  useEffect(() => {
    const setupProvider = async () => {
      if (wallets.length > 0 && typeof wallets[0].getEthereumProvider === 'function') {
        console.log(`[useEthersPrivy] Attempting to set up provider for wallet: ${wallets[0].address}, connectorType: ${wallets[0].connectorType}`);
        try {
          const privyProvider = await wallets[0].getEthereumProvider();
          if (!privyProvider) {
            throw new Error('wallets[0].getEthereumProvider() returned null or undefined');
          }
          // Wrap Privy’s EIP-1193 provider into ethers.js
          const w3provider = new BrowserProvider(privyProvider);
          const w3signer = await w3provider.getSigner();

          const w = wallets[0];
          setUserAddress(w.address);
          const parts = w.chainId.split(':');
          const numericChainId = parseInt(parts[1], 10);
          setChainId(numericChainId);

          setProvider(w3provider);
          setSigner(w3signer);
          console.log('[useEthersPrivy] Provider and signer setup successfully:', { address: w.address, chainId: numericChainId, connectorType: w.connectorType });
        } catch (error) {
          console.error('[useEthersPrivy] Error setting up provider:', error);
          setProvider(null);
          setSigner(null);
          setUserAddress('');
          setChainId(0);
        }
      } else {
        setProvider(null);
        setSigner(null);
        setUserAddress('');
        setChainId(0);
        if (wallets.length > 0) {
          console.log('[useEthersPrivy] Wallet found, but getEthereumProvider is not a function or not available for connectorType:', wallets[0].connectorType);
        } else {
          // console.log('[useEthersPrivy] No wallets available to set up provider.');
        }
      }
    }
    setupProvider()
  }, [wallets])

  return { provider, signer, userAddress, chainId }
}