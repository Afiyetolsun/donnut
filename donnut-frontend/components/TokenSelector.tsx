import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ChevronDown, Coins } from 'lucide-react';

// Hardcoded chains and tokens for now
const CHAINS = [
  { id: 1, name: 'Ethereum', symbol: 'ETH' },
  { id: 137, name: 'Polygon', symbol: 'MATIC' },
  { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
  { id: 10, name: 'Optimism', symbol: 'ETH' },
];

const TOKENS = {
  1: [ // Ethereum
    { address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether', decimals: 6 },
  ],
  137: [ // Polygon
    { address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'MATIC', name: 'Polygon', decimals: 18 },
    { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT', name: 'Tether', decimals: 6 },
  ],
  42161: [ // Arbitrum
    { address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', symbol: 'USDT', name: 'Tether', decimals: 6 },
  ],
  10: [ // Optimism
    { address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', symbol: 'ETH', name: 'Ethereum', decimals: 18 },
    { address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', symbol: 'USDT', name: 'Tether', decimals: 6 },
  ],
};

interface TokenSelectorProps {
  onAmountChange: (amount: string) => void;
  onTokenChange: (token: string) => void;
  onChainChange: (chainId: number) => void;
}

export function TokenSelector({ onAmountChange, onTokenChange, onChainChange }: TokenSelectorProps) {
  const [selectedChain, setSelectedChain] = useState(CHAINS[0]);
  const [selectedToken, setSelectedToken] = useState(TOKENS[selectedChain.id][0]);
  const [amount, setAmount] = useState('');

  // Hardcoded balances for now
  const balances = {
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee': '1.234',
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': '1000.00',
    '0xdac17f958d2ee523a2206206994597c13d831ec7': '500.00',
  };

  const handleChainChange = (chainId: string) => {
    const chain = CHAINS.find(c => c.id === parseInt(chainId));
    if (chain) {
      setSelectedChain(chain);
      setSelectedToken(TOKENS[chain.id][0]);
      onChainChange(chain.id);
    }
  };

  const handleTokenChange = (tokenAddress: string) => {
    const token = TOKENS[selectedChain.id].find(t => t.address === tokenAddress);
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
        <Select onValueChange={handleChainChange} value={selectedChain.id.toString()}>
          <SelectTrigger className="w-[180px] rounded-full border-2" style={{ borderColor: "#A076F9" }}>
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4" style={{ color: "#A076F9" }} />
              <SelectValue placeholder="Select chain" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {CHAINS.map((chain) => (
              <SelectItem key={chain.id} value={chain.id.toString()}>
                <div className="flex items-center space-x-2">
                  <span>{chain.name}</span>
                  <span className="text-sm text-gray-500">({chain.symbol})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <Select onValueChange={handleTokenChange} value={selectedToken.address}>
            <SelectTrigger className="w-[180px] rounded-full border-2" style={{ borderColor: "#A076F9" }}>
              <div className="flex items-center space-x-2">
                <span style={{ color: "#5D4037" }}>{selectedToken.symbol}</span>
              </div>
            </SelectTrigger>
            <SelectContent>
              {TOKENS[selectedChain.id].map((token) => (
                <SelectItem key={token.address} value={token.address}>
                  <div className="flex items-center justify-between w-full">
                    <span style={{ color: "#5D4037" }}>{token.symbol}</span>
                    <span className="text-sm ml-4" style={{ color: "#A076F9" }}>
                      Balance: {balances[token.address] || '0.00'}
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