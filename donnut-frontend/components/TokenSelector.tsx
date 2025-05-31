import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Coins } from 'lucide-react';
import { useWallets } from '@privy-io/react-auth';
import { toast } from 'sonner';

// Hardcoded chains for now
const CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH', logo: '/chains/ethereum.svg', blockscoutUrl: 'https://eth.blockscout.com/api/v2', coingeckoId: 'ethereum' },
  { id: 137, name: 'Polygon', symbol: 'MATIC', logo: '/chains/polygon.svg', blockscoutUrl: 'https://polygon.blockscout.com/api/v2', coingeckoId: 'matic-network' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH', logo: '/chains/arbitrum.svg', blockscoutUrl: 'https://arbitrum.blockscout.com/api/v2', coingeckoId: 'ethereum' },
  { id: 10, name: 'Optimism', symbol: 'ETH', logo: '/chains/optimism.svg', blockscoutUrl: 'https://optimism.blockscout.com/api/v2', coingeckoId: 'ethereum' },
];

// Cache for token prices
const priceCache: {
  native: { [key: string]: { price: number; timestamp: number } };
  tokens: { [key: string]: { price: number; timestamp: number } };
} = {
  native: {},
  tokens: {},
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  usdValue?: string;
}

interface TokenSelectorProps {
  onAmountChange: (amount: string) => void;
  onTokenChange: (token: string) => void;
  onChainChange: (chainId: number) => void;
}

export function TokenSelector({ onAmountChange, onTokenChange, onChainChange }: TokenSelectorProps) {
  const { wallets } = useWallets();
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [previousChainId, setPreviousChainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch token prices from CoinGecko with caching
  const fetchTokenPrices = async (tokens: Token[], chain: typeof CHAINS[0]) => {
    try {
      const now = Date.now();
      let nativePrice = 0;

      // Check cache for native token price
      if (priceCache.native[chain.coingeckoId] && 
          now - priceCache.native[chain.coingeckoId].timestamp < CACHE_DURATION) {
        nativePrice = priceCache.native[chain.coingeckoId].price;
      } else {
        try {
          const nativePriceResponse = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${chain.coingeckoId}&vs_currencies=usd`
          );
          if (!nativePriceResponse.ok) {
            throw new Error('Failed to fetch native token price');
          }
          const nativePriceData = await nativePriceResponse.json();
          nativePrice = nativePriceData[chain.coingeckoId]?.usd || 0;
          
          // Update cache
          priceCache.native[chain.coingeckoId] = {
            price: nativePrice,
            timestamp: now
          };
        } catch (error) {
          console.error('Error fetching native token price:', error);
          // Try to use cached price even if expired
          if (priceCache.native[chain.coingeckoId]) {
            nativePrice = priceCache.native[chain.coingeckoId].price;
          }
        }
      }

      // Get ERC20 token prices
      const tokenAddresses = tokens
        .filter(t => t.address !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')
        .map(t => t.address.toLowerCase());
      
      let tokenPricesData: { [key: string]: { usd: number } } = {};
      
      if (tokenAddresses.length > 0) {
        // Filter out tokens that have valid cached prices
        const uncachedAddresses = tokenAddresses.filter(addr => 
          !priceCache.tokens[addr] || 
          now - priceCache.tokens[addr].timestamp >= CACHE_DURATION
        );

        if (uncachedAddresses.length > 0) {
          try {
            const tokenPricesResponse = await fetch(
              `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${uncachedAddresses.join(',')}&vs_currencies=usd`
            );
            if (!tokenPricesResponse.ok) {
              throw new Error('Failed to fetch token prices');
            }
            const newPrices = await tokenPricesResponse.json();
            
            // Update cache with new prices
            Object.entries(newPrices).forEach(([addr, data]) => {
              priceCache.tokens[addr] = {
                price: (data as { usd: number }).usd,
                timestamp: now
              };
            });
          } catch (error) {
            console.error('Error fetching ERC20 token prices:', error);
          }
        }

        // Combine cached and new prices
        tokenPricesData = tokenAddresses.reduce((acc, addr) => {
          if (priceCache.tokens[addr]) {
            acc[addr] = { usd: priceCache.tokens[addr].price };
          }
          return acc;
        }, {} as { [key: string]: { usd: number } });
      }

      // Update tokens with USD values and filter out low-value tokens
      const MIN_USD_VALUE = 0.5; // Minimum USD value to show token
      const updatedTokens = tokens
        .map(token => {
          if (token.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
            // Native token
            const usdValue = (Number(token.balance) * nativePrice).toFixed(2);
            return { ...token, usdValue };
          } else {
            // ERC20 token
            const price = tokenPricesData[token.address.toLowerCase()]?.usd || 0;
            const usdValue = (Number(token.balance) * price).toFixed(2);
            return { ...token, usdValue };
          }
        })
        .filter(token => {
          const usdValue = Number(token.usdValue || 0);
          return usdValue >= MIN_USD_VALUE;
        });

      return updatedTokens;
    } catch (error) {
      console.error('Error in fetchTokenPrices:', error);
      // Return only native token if available
      return tokens.filter(token => 
        token.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      );
    }
  };

  // Function to fetch token balances using Blockscout API
  const fetchTokenBalances = async (address: string, chainId: number) => {
    if (isLoading) return; // Prevent concurrent fetches
    
    try {
      setIsLoading(true);
      console.log('Fetching balances for address:', address, 'chain:', chainId);
      const chain = CHAINS.find(c => c.id === chainId);
      if (!chain) {
        console.error('Chain not found:', chainId);
        return;
      }

      const processedTokens: Token[] = [];
      const wallet = wallets[0];

      if (!wallet) {
        console.error('No wallet connected');
        return;
      }

      try {
        // Get native token balance
        const nativeBalanceResponse = await fetch(`${chain.blockscoutUrl}/addresses/${address}`);
        if (!nativeBalanceResponse.ok) {
          throw new Error('Failed to fetch native token balance');
        }
        const nativeBalanceData = await nativeBalanceResponse.json();
        const nativeBalanceInEth = Number(nativeBalanceData.coin_balance) / Math.pow(10, 18);
        
        if (nativeBalanceInEth > 0) {
          processedTokens.push({
            address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
            symbol: chain.symbol,
            name: chain.name,
            decimals: 18,
            balance: nativeBalanceInEth.toFixed(6)
          });
        }

        // Get ERC20 token balances
        const tokenBalancesResponse = await fetch(
          `${chain.blockscoutUrl}/addresses/${address}/token-balances`
        );
        
        if (!tokenBalancesResponse.ok) {
          throw new Error('Failed to fetch token balances');
        }

        const tokenBalancesData = await tokenBalancesResponse.json();
        console.log('Token balances response:', tokenBalancesData);
        
        // Process each token balance
        if (Array.isArray(tokenBalancesData)) {
          for (const token of tokenBalancesData) {
            const balance = Number(token.value) / Math.pow(10, token.token.decimals);
            if (balance > 0) {
              processedTokens.push({
                address: token.token.address,
                symbol: token.token.symbol,
                name: token.token.name,
                decimals: token.token.decimals,
                balance: balance.toFixed(6)
              });
            }
          }
        }

        // Fetch USD prices and update tokens
        const tokensWithPrices = await fetchTokenPrices(processedTokens, chain);

        // Sort tokens by USD value (highest to lowest)
        tokensWithPrices.sort((a, b) => {
          const valueA = Number(a.usdValue || 0);
          const valueB = Number(b.usdValue || 0);
          return valueB - valueA;
        });

        console.log('Final processed tokens:', tokensWithPrices);
        
        if (tokensWithPrices.length === 0) {
          console.log('No tokens found with balance > 0');
          setTokens([]);
          setSelectedToken(null);
          return;
        }

        setTokens(tokensWithPrices);
        
        // Set the first token as selected if none is selected
        if (!selectedToken && tokensWithPrices.length > 0) {
          setSelectedToken(tokensWithPrices[0]);
          onTokenChange(tokensWithPrices[0].address);
        }
      } catch (error) {
        console.error('Error fetching token balances:', error);
        toast.error('Failed to fetch token balances. Please try again later.');
      }
    } catch (error) {
      console.error('Error in fetchTokenBalances:', error);
      toast.error('Failed to fetch token balances. Please try again later.');
      setTokens([]);
      setSelectedToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (wallets && wallets.length > 0) {
      const connectedWallet = wallets[0];
      console.log('Connected wallet:', connectedWallet);
      
      // Function to update chain state
      const updateChainState = async (chainId: string) => {
        console.log('Updating chain state:', chainId);
        const numericChainId = parseInt(chainId.split(':')[1]);
        const chain = CHAINS.find(c => c.id === numericChainId);
        if (chain) {
          // Show toast notification if chain has changed
          if (previousChainId && previousChainId !== chainId) {
            toast.success(`Switched to ${chain.name}`);
          }
          
          setSelectedChain(chain);
          setSelectedToken(null); // Reset selected token when chain changes
          onChainChange(chain.id);
          setPreviousChainId(chainId);

          // Fetch token balances when chain changes
          await fetchTokenBalances(connectedWallet.address, chain.id);
        }
      };

      // Initial chain setup
      updateChainState(connectedWallet.chainId);

      // Listen for chain changes
      const handleChainChange = (event: any) => {
        if (event.detail && event.detail.chainId) {
          updateChainState(event.detail.chainId);
        }
      };

      // Add event listener for chain changes
      window.addEventListener('chainChanged', handleChainChange);

      // Cleanup
      return () => {
        window.removeEventListener('chainChanged', handleChainChange);
      };
    }
  }, [wallets, onChainChange, previousChainId]);

  const handleTokenChange = (tokenAddress: string) => {
    const token = tokens.find(t => t.address === tokenAddress);
    if (token) {
      setSelectedToken(token);
      onTokenChange(tokenAddress);
    }
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    onAmountChange(value);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center space-x-2">
        <div className="w-[180px] rounded-full border-2 p-2 flex items-center space-x-2" style={{ borderColor: "#A076F9" }}>
          {selectedChain?.logo ? (
            <img
              src={selectedChain.logo}
              alt={selectedChain.name}
              className="w-5 h-5 object-contain"
            />
          ) : (
            <Coins className="w-4 h-4" style={{ color: "#A076F9" }} />
          )}
          <span className="text-sm" style={{ color: "#5D4037" }}>{selectedChain?.name || 'Select Chain'}</span>
        </div>
      </div>

      <div className="flex flex-col space-y-2">
        <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm">
          <Input
            type="number"
            placeholder="0.0"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className="text-2xl font-bold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 mr-2"
            style={{ color: "#5D4037" }}
          />
          <Select 
            onValueChange={handleTokenChange} 
            value={selectedToken?.address}
          >
            <SelectTrigger className="w-[180px] rounded-full border-2" style={{ borderColor: "#A076F9" }}>
              <div className="flex items-center space-x-2">
                <span style={{ color: "#5D4037" }}>{selectedToken?.symbol || 'Select Token'}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {tokens.map((token) => (
                <SelectItem key={token.address} value={token.address}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span style={{ color: "#5D4037" }}>{token.symbol}</span>
                      {token.usdValue && (
                        <span className="text-xs text-gray-500">${token.usdValue}</span>
                      )}
                    </div>
                    <span className="text-sm ml-4" style={{ color: "#A076F9" }}>
                      Balance: {token.balance}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
} 