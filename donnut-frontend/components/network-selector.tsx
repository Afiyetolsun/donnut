import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, Info } from 'lucide-react';

const NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', icon: '/chains/ethereum.svg' },
  { id: 'optimism', name: 'Optimism', icon: '/chains/optimism.svg' },
  { id: 'arbitrum', name: 'Arbitrum', icon: '/chains/arbitrum.svg' },
  { id: 'polygon', name: 'Polygon', icon: '/chains/polygon.svg' },
];

interface NetworkSelectorProps {
  currentChain: string;
  updateUserChain: (chain: string) => void;
}

export function NetworkSelector({ currentChain, updateUserChain }: NetworkSelectorProps) {
  const [selectedNetwork, setSelectedNetwork] = useState(
    NETWORKS.find(n => n.id === currentChain) || NETWORKS[0]
  );

  useEffect(() => {
    const network = NETWORKS.find(n => n.id === currentChain) || NETWORKS[0];
    setSelectedNetwork(network);
  }, [currentChain]);

  const handleNetworkChange = (network: typeof NETWORKS[0]) => {
    setSelectedNetwork(network);
    updateUserChain(network.id);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Convert all donations to USDC on:</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-5 w-5 text-[#A076F9] hover:text-[#8A5CF5] cursor-help transition-colors" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[300px] p-4">
              <p>Select the network where you want to receive your donations. All donations will be automatically converted to USDC on this network.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2">
            <Image
              src={selectedNetwork.icon}
              alt={selectedNetwork.name}
              width={20}
              height={20}
              className="rounded-full"
            />
            <span>{selectedNetwork.name}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {NETWORKS.map((network) => (
            <DropdownMenuItem
              key={network.id}
              onClick={() => handleNetworkChange(network)}
              className="flex items-center gap-2"
            >
              <Image
                src={network.icon}
                alt={network.name}
                width={20}
                height={20}
                className="rounded-full"
              />
              <span>{network.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
} 