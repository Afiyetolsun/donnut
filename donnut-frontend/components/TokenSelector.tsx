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
import { SUPPORTED_CHAINS, Chain } from '@/lib/chains';

interface Token { // This is the full token info fetched
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
}

export interface SelectedTokenInfo { // This is what we'll pass to the parent
  address: string;
  decimals: number;
  symbol: string;
}

interface TokenSelectorProps {
  onAmountChange: (amount: string) => void;
  onTokenChange: (token: SelectedTokenInfo | null) => void; // Changed
  onChainChange: (chainId: number) => void;
}

export function TokenSelector({ onAmountChange, onTokenChange, onChainChange }: TokenSelectorProps) {
  const { wallets } = useWallets();
  const [selectedChain, setSelectedChain] = useState<Chain>(SUPPORTED_CHAINS[0]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [previousChainId, setPreviousChainId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch token balances using Blockscout API
  const fetchTokenBalances = async (address: string, chainId: number) => {
    if (isLoading) return; // Prevent concurrent fetches
    
    try {
      setIsLoading(true);
      console.log('Fetching balances for address:', address, 'chain:', chainId);
      const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
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
                decimals: parseInt(String(token.token.decimals), 10),
                balance: balance.toFixed(6)
              });
            }
          }
        }

        // Sort tokens by balance (highest to lowest)
        processedTokens.sort((a, b) => Number(b.balance) - Number(a.balance));

        console.log('Final processed tokens:', processedTokens);
        
        if (processedTokens.length === 0) {
          console.log('No tokens found with balance > 0');
          setTokens([]);
          setSelectedToken(null);
          return;
        }

        setTokens(processedTokens);
        
        // Set the first token as selected if none is selected
        if (!selectedToken && processedTokens.length > 0) {
          const firstToken = processedTokens[0];
          setSelectedToken(firstToken);
          onTokenChange({ address: firstToken.address, decimals: firstToken.decimals, symbol: firstToken.symbol });
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
        const chain = SUPPORTED_CHAINS.find(c => c.id === numericChainId);
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
      onTokenChange({ address: token.address, decimals: token.decimals, symbol: token.symbol });
    } else {
      onTokenChange(null); // Should not happen if tokenAddress is from the list
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