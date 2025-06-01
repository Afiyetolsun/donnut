export interface Chain {
  id: number;
  name: string;
  symbol: string;
  logo: string;
  blockscoutUrl: string;
  coingeckoId: string;
  caip2Id: string; // Chain ID in CAIP-2 format (e.g., 'eip155:1')
}

export const SUPPORTED_CHAINS: Chain[] = [
  {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    logo: '/chains/ethereum.svg',
    blockscoutUrl: 'https://eth.blockscout.com/api/v2',
    coingeckoId: 'ethereum',
    caip2Id: 'eip155:1'
  },
  {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    logo: '/chains/polygon.svg',
    blockscoutUrl: 'https://polygon.blockscout.com/api/v2',
    coingeckoId: 'matic-network',
    caip2Id: 'eip155:137'
  },
  {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    logo: '/chains/arbitrum.svg',
    blockscoutUrl: 'https://arbitrum.blockscout.com/api/v2',
    coingeckoId: 'ethereum',
    caip2Id: 'eip155:42161'
  },
  {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    logo: '/chains/optimism.svg',
    blockscoutUrl: 'https://optimism.blockscout.com/api/v2',
    coingeckoId: 'ethereum',
    caip2Id: 'eip155:10'
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