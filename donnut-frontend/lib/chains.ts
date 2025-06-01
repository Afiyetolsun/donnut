export interface Chain {
  id: number;
  name: string;
  symbol: string; // Native currency symbol
  logo: string;
  blockscoutUrl: string;
  coingeckoId: string; // For native currency price lookup (e.g., 'ethereum', 'matic-network')
  caip2Id: string; // Chain ID in CAIP-2 format (e.g., 'eip155:1')
  usdcAddress: string; // USDC token contract address
  wrappedNativeAddress: string; // Wrapped native currency address (e.g., WETH, WMATIC)
  wrappedNativeSymbol: string; // Wrapped native currency symbol (e.g., WETH, WMATIC)
}

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    logo: '/chains/ethereum.svg',
    blockscoutUrl: 'https://eth.blockscout.com/api/v2',
    coingeckoId: 'ethereum',
    caip2Id: 'eip155:1',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    wrappedNativeAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    wrappedNativeSymbol: 'WETH',
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    logo: '/chains/polygon.svg',
    blockscoutUrl: 'https://polygon.blockscout.com/api/v2',
    coingeckoId: 'matic-network',
    caip2Id: 'eip155:137',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    wrappedNativeAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    wrappedNativeSymbol: 'WMATIC',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    logo: '/chains/arbitrum.svg',
    blockscoutUrl: 'https://arbitrum.blockscout.com/api/v2',
    coingeckoId: 'ethereum', // Native token is ETH on Arbitrum
    caip2Id: 'eip155:42161',
    usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    wrappedNativeAddress: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    wrappedNativeSymbol: 'WETH',
  },
  {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    logo: '/chains/optimism.svg',
    blockscoutUrl: 'https://optimism.blockscout.com/api/v2',
    coingeckoId: 'ethereum', // Native token is ETH on Optimism
    caip2Id: 'eip155:10',
    usdcAddress: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    wrappedNativeAddress: '0x4200000000000000000000000000000000000006',
    wrappedNativeSymbol: 'WETH',
  }
];

// Helper functions
export function getChainById(id: number): Chain | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.id === id);
}

export function getChainByCaip2Id(caip2Id: string): Chain | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.caip2Id === caip2Id);
}

export function getChainByName(name: string): Chain | undefined {
  return SUPPORTED_CHAINS.find(chain => chain.name.toLowerCase() === name.toLowerCase());
}

// Network selector specific interface
export interface NetworkOption {
  id: string;
  name: string;
  icon: string;
}

export const NETWORK_OPTIONS: NetworkOption[] = SUPPORTED_CHAINS.map(chain => ({
  id: chain.name.toLowerCase(),
  name: chain.name,
  icon: chain.logo
})); 
