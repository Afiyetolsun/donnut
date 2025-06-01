// ── components/CrossChainForm.tsx ───────────────────────────────────────────

'use client'

import React, { useState, useEffect } from 'react'
import {
  BrowserProvider,
  JsonRpcSigner,
  Contract,
  hexlify,
  randomBytes,
  parseUnits,
} from 'ethers'
import { useEthersPrivy } from '../hooks/useEthersPrivy'
import { Button } from './ui/button'
import { SUPPORTED_CHAINS, getChainByName, Chain } from '../lib/chains'

// Define types that were previously imported from @1inch/cross-chain-sdk
// These will be used for API request/response types
enum PresetEnum {
  none = 0,
  fast = 1,
  medium = 2,
  slow = 3,
}

enum OrderStatus {
  Created = 'created',
  Filling = 'filling',
  PartialFilled = 'partial-filled',
  Executed = 'executed',
  Expired = 'expired',
  Cancelled = 'cancelled',
  Refunded = 'refunded',
}

interface ReadyToAcceptSecretFills {
  fills: any[]; // Simplified, adjust as needed
}

interface CrossChainFormProps {
  receiverAddress: string;
  srcChainIdFromTokenSelector: number;
  srcTokenAddressFromTokenSelector: string;
  srcTokenSymbol?: string;
  srcTokenDecimals: number; // Added
  amount: string;
}

/**
 * A simple button/form that:
 * 1) Gets a Fusion+ quote
 * 2) Checks ERC-20 allowance (and, if needed, calls approve() via Privy)
 * 3) Places the cross-chain order (Privy signs EIP-712)
 * 4) Polls getReadyToAcceptSecretFills
 * 5) Reveals each secret (Privy signs reveal Tx)
 * 6) Polls getOrderStatus until a terminal state
 */
export function CrossChainForm(props: CrossChainFormProps) {
  const { provider, signer, userAddress, chainId } = useEthersPrivy()
  const [statusText, setStatusText] = useState<string>('')
  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [dstChain, setDstChain] = useState<Chain | null>(null)
  const [dstTokenAddress, setDstTokenAddress] = useState<string>('')
  const [dstChainName, setDstChainName] = useState<string>('')


  const AUTH_KEY = process.env.NEXT_PUBLIC_1INCH_AUTH_KEY || ''

  useEffect(() => {
    async function fetchUserMainChain() {
      if (props.receiverAddress) {
        try {
          setStatusText('Fetching destination chain info...');
          const response = await fetch(`/api/user-mainchain?walletAddress=${props.receiverAddress}`);
          if (!response.ok) {
            throw new Error(`Failed to fetch user main chain: ${response.statusText}`);
          }
          const data = await response.json();
          const fetchedChainName = data.current_chain;
          setDstChainName(fetchedChainName);
          const chainDetails = getChainByName(fetchedChainName);
          if (chainDetails) {
            setDstChain(chainDetails);
            setDstTokenAddress(chainDetails.usdcAddress); // Assuming USDC for now, can be made dynamic
            setStatusText(`Destination chain: ${chainDetails.name}, Token: USDC`);
          } else {
            setStatusText(`🔴 Destination chain ${fetchedChainName} not supported.`);
            setDstChain(null);
            setDstTokenAddress('');
          }
        } catch (error) {
          console.error('Error fetching user main chain:', error);
          setStatusText(`🔴 Error fetching destination chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setDstChain(null);
          setDstTokenAddress('');
        }
      }
    }
    fetchUserMainChain();
  }, [props.receiverAddress]);

  // Enable only if Privy is connected and on the correct chain.
  const isBrowserProvider = provider instanceof BrowserProvider;
  const isJsonRpcSigner = signer instanceof JsonRpcSigner;
  const isUserAddressSet = userAddress !== '';
  const isChainIdCorrect = chainId === props.srcChainIdFromTokenSelector;
  const isReceiverAddressSet = !!props.receiverAddress;
  const isDstChainSet = !!dstChain;
  const isSrcTokenAddressSet = !!props.srcTokenAddressFromTokenSelector;
  const isAmountValid = parseFloat(props.amount) > 0;

  const isReady =
    isBrowserProvider &&
    isJsonRpcSigner &&
    isUserAddressSet &&
    isChainIdCorrect &&
    isReceiverAddressSet &&
    isDstChainSet &&
    isSrcTokenAddressSet &&
    isAmountValid;

  useEffect(() => {
    console.log('[CrossChainForm] isReady check:', {
        isBrowserProvider,
        isJsonRpcSigner,
        isUserAddressSet,
        isChainIdCorrect,
        isReceiverAddressSet,
        isDstChainSet,
        isSrcTokenAddressSet,
        isAmountValid,
        isReadyOverall: isReady,
        propsAmount: props.amount,
        propsSrcChainId: props.srcChainIdFromTokenSelector,
        actualChainId: chainId,
        propsReceiverAddress: props.receiverAddress,
        dstChainObj: dstChain,
        propsSrcTokenAddress: props.srcTokenAddressFromTokenSelector,
    });
  }, [isBrowserProvider, isJsonRpcSigner, isUserAddressSet, isChainIdCorrect, isReceiverAddressSet, isDstChainSet, isSrcTokenAddressSet, isAmountValid, isReady, props.amount, props.srcChainIdFromTokenSelector, chainId, props.receiverAddress, dstChain, props.srcTokenAddressFromTokenSelector]);


  async function onCrossChainClick() {
    console.log('[CrossChainForm] onCrossChainClick called. isReady:', isReady, 'dstChain:', dstChain);
    if (!isReady || !dstChain) {
      console.log('[CrossChainForm] onCrossChainClick returning early. Conditions not met.');
      if (!props.receiverAddress) {
        setStatusText('🔴 Receiver address is not set.')
      } else if (!dstChain) {
        setStatusText(`🔴 Destination chain details not available or not supported for ${dstChainName}.`)
      } else if (chainId !== props.srcChainIdFromTokenSelector) {
        const srcChainDetails = SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector);
        setStatusText(`🔴 Please connect Privy on ${srcChainDetails?.name || `chain ID ${props.srcChainIdFromTokenSelector}`}`)
      } else if (!props.srcTokenAddressFromTokenSelector){
        setStatusText('🔴 Source token not selected.')
      } else if (parseFloat(props.amount) <= 0) {
        setStatusText('🔴 Amount must be greater than 0.')
      } else {
        // General message if one of the isReady conditions is false but not caught by specific checks above
        setStatusText('🔴 Swap prerequisites not met. Check console for details.');
      }
      return
    }

    setIsRunning(true)
    setStatusText('1) Preparing transaction…');

    let effectiveSrcTokenAddress = props.srcTokenAddressFromTokenSelector;
    let finalAmountInBaseUnits: string;

    try {
      finalAmountInBaseUnits = parseUnits(props.amount, props.srcTokenDecimals).toString();
      console.log(`[CrossChainForm] Initial Amount: ${props.amount}, Decimals: ${props.srcTokenDecimals}, Amount in base units: ${finalAmountInBaseUnits}`);
    } catch (e) {
      console.error("[CrossChainForm] Error parsing amount with decimals:", e);
      setStatusText(`❌ Invalid amount or decimals. Amount: ${props.amount}, Decimals: ${props.srcTokenDecimals}`);
      setIsRunning(false);
      return;
    }

    // Check if native currency needs wrapping
    if (props.srcTokenAddressFromTokenSelector.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      const srcChainInfo = SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector);
      if (srcChainInfo && srcChainInfo.wrappedNativeAddress) {
        setStatusText(`2) Wrapping ${srcChainInfo.symbol} to ${srcChainInfo.wrappedNativeSymbol}...`);
        try {
          const wethAbi = ["function deposit() payable", "function approve(address spender, uint256 amount) returns (bool)", "function allowance(address owner, address spender) view returns (uint256)"];
          const wethContract = new Contract(srcChainInfo.wrappedNativeAddress, wethAbi, signer);
          
          console.log(`[CrossChainForm] Wrapping ${finalAmountInBaseUnits} of ${srcChainInfo.symbol} to ${srcChainInfo.wrappedNativeAddress}`);
          const wrapTx = await wethContract.deposit({ value: finalAmountInBaseUnits });
          setStatusText(`⏳ Waiting for ${srcChainInfo.symbol} wrap transaction to confirm...`);
          await wrapTx.wait();
          setStatusText(`✅ ${srcChainInfo.symbol} wrapped to ${srcChainInfo.wrappedNativeSymbol} successfully.`);
          effectiveSrcTokenAddress = srcChainInfo.wrappedNativeAddress; // Use WETH address for quote and allowance
        } catch (err) {
          console.error("[CrossChainForm] Error wrapping native currency:", err);
          setStatusText(`❌ Error wrapping ${srcChainInfo.symbol}. Check console.`);
          setIsRunning(false);
          return;
        }
      } else {
        setStatusText(`🔴 Wrapped native token address not found for chain ID ${props.srcChainIdFromTokenSelector}.`);
        setIsRunning(false);
        return;
      }
    }

    // No SDK initialization on client side
    setStatusText('3) Fetching quote from backend…')
    let quote;
    try {
      console.log('[CrossChainForm] Calling /api/get-quote with:', {
        srcChainId: props.srcChainIdFromTokenSelector,
        dstChainId: dstChain.id,
        srcTokenAddress: effectiveSrcTokenAddress,
        dstTokenAddress: dstTokenAddress,
        amount: finalAmountInBaseUnits,
        walletAddress: userAddress,
      });
      const response = await fetch('/api/get-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srcChainId: props.srcChainIdFromTokenSelector,
          dstChainId: dstChain.id,
          srcTokenAddress: effectiveSrcTokenAddress,
          dstTokenAddress: dstTokenAddress,
          amount: finalAmountInBaseUnits,
          enableEstimate: true,
          walletAddress: userAddress,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch quote from backend');
      }
      quote = await response.json();
      console.log('[CrossChainForm] Received quote from backend:', quote);
      console.log('[CrossChainForm] quote.srcEscrowFactory:', quote.srcEscrowFactory);
    } catch (err) {
      console.error(err);
      setStatusText(`❌ Error fetching quote from backend: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsRunning(false);
      return;
    }

    // Allowance check for the effective source token (could be WETH or original ERC20)
    setStatusText('5) Checking ERC-20 allowance…')
    let spender: string | null = null;
    if (quote.srcEscrowFactory) {
      if (typeof quote.srcEscrowFactory === 'string') {
        spender = quote.srcEscrowFactory;
      } else if (typeof quote.srcEscrowFactory === 'object' && quote.srcEscrowFactory.val && typeof quote.srcEscrowFactory.val === 'string') {
        // Check for .val property based on new logs
        spender = quote.srcEscrowFactory.val;
      } else if (typeof quote.srcEscrowFactory === 'object' && quote.srcEscrowFactory.address && typeof quote.srcEscrowFactory.address === 'string') {
        // Keep the .address check as a fallback
        spender = quote.srcEscrowFactory.address;
      } else {
        // Fallback if it's an object but not matching known structures
        spender = quote.srcEscrowFactory.toString(); 
      }
    }
    
    console.log('[CrossChainForm] Determined spender:', spender, 'from quote.srcEscrowFactory:', quote.srcEscrowFactory);

    if (!spender || spender === '[object Object]' || !/^0x[a-fA-F0-9]{40}$/.test(spender)) {
      console.error("[CrossChainForm] Spender address is invalid or not a valid Ethereum address. Spender:", spender, "Quote:", quote);
      setStatusText('❌ Error: Spender address invalid or not available from quote.');
      setIsRunning(false);
      return;
    }
    const tokenAmt = BigInt(finalAmountInBaseUnits)

    console.log('[CrossChainForm] Allowance Check Details:', {
      userAddress,
      spender,
      effectiveSrcTokenAddress,
      tokenAmount: finalAmountInBaseUnits,
      isSignerAvailable: !!signer,
      currentChainId: chainId,
      expectedChainId: props.srcChainIdFromTokenSelector,
    });

    const erc20 = new Contract(
      effectiveSrcTokenAddress, // Use effective address
      [
        'function allowance(address owner, address spender) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)',
      ],
      signer
    )

    let currentAllowance: bigint
    try {
      currentAllowance = await erc20.allowance(userAddress, spender)
    } catch (err) {
      console.error("Error during erc20.allowance call:", err);
      setStatusText('❌ Failed to read allowance.')
      setIsRunning(false)
      return
    }

    if (currentAllowance < tokenAmt) {
      setStatusText(
        `4) Allowance is ${currentAllowance.toString()}. Requesting approve(${spender}, ${tokenAmt.toString()})…`
      )
      try {
        const tx = await erc20.approve(spender, tokenAmt)
        setStatusText('⏳ Waiting for approve transaction to confirm…')
        await tx.wait()
        setStatusText('✅ Approval confirmed.')
      } catch (err) {
        console.error(err)
        setStatusText('❌ Approval failed or was rejected by user.')
        setIsRunning(false)
        return
      }
    } else {
      setStatusText(`✅ Existing allowance ${currentAllowance.toString()} is sufficient.`)
    }

    // 5) Generate secrets & hashLock via backend API
    setStatusText('5) Generating secrets & hashLock via backend…')
    let secrets: string[];
    let secretHashes: string[];
    let hashLock: any; // Type will be determined by backend response
    try {
      // Access secretsCount from the plain quote object structure
      // Assuming 'fast' preset is used, as it is in placeOrder
      const secretsCount = quote.presets?.fast?.secretsCount;
      if (typeof secretsCount !== 'number') {
        console.error("Error: Could not determine secretsCount from quote. Quote presets:", quote.presets);
        setStatusText('❌ Error: Could not determine secretsCount for hashLock generation.');
        setIsRunning(false);
        return;
      }

      const response = await fetch('/api/generate-secrets-and-hashlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretsCount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate secrets and hashLock from backend');
      }
      const data = await response.json();
      secrets = data.secrets;
      secretHashes = data.secretHashes;
      hashLock = data.hashLock;
    } catch (err) {
      console.error(err);
      setStatusText(`❌ Error generating secrets and hashLock from backend: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsRunning(false);
      return;
    }

    // 6) Place order (Privy will ask you to sign the EIP-712 payload)
    // 6) Place order by calling backend API (Privy will still prompt for signature)
    setStatusText('6) Placing order via backend API (Privy will prompt for signature)…')
    let placeOrderApiResp; // Will contain { orderHash, typedDataToSign }
    try {
      const placeOrderPayload = {
        quote, 
        walletAddress: userAddress,
        receiver: props.receiverAddress,
        preset: PresetEnum.fast, // Client sends 1
        source: 'privy-frontend',
        srcChainId: props.srcChainIdFromTokenSelector,
      };
      console.log('[CrossChainForm] Calling /api/place-order with payload:', placeOrderPayload);
      console.log('[CrossChainForm] Quote details for place-order:', {
        quoteParamsSrcChainId: placeOrderPayload.quote?.params?.srcChainId,
        quoteParamsDstChainId: placeOrderPayload.quote?.params?.dstChainId,
        requestBodySrcChainId: placeOrderPayload.srcChainId,
      });

      const response = await fetch('/api/place-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(placeOrderPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to prepare order via backend API');
      }
      placeOrderApiResp = await response.json();
      if (!placeOrderApiResp.typedDataToSign || !placeOrderApiResp.orderHash) {
        throw new Error('Backend /api/place-order did not return typedDataToSign or orderHash');
      }
    } catch (err) {
      console.error(err);
      setStatusText(`❌ Order preparation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsRunning(false);
      return;
    }

    // 6.1) Sign the EIP-712 payload using Privy
    setStatusText('6.1) Awaiting signature via Privy…');
    let signature: string;
    try {
      if (!signer) throw new Error("Signer not available for signing typed data.");
      // Privy's useEthers hook provides a signer that should handle signTypedData
      // The structure of typedDataToSign should be { domain, types, message, primaryType }
      // Ensure primaryType is correctly set or handled by the signer.
      // Ethers v6 signer.signTypedData expects domain, types, value
      const { domain, types, message } = placeOrderApiResp.typedDataToSign;
      // Ethers v5/v6 compatibility: EIP712Domain might be part of types.
      // If types.EIP712Domain exists, it should be removed for ethers v6 _signTypedData
      const { EIP712Domain, ...messageTypes } = types; 
      
      console.log('[CrossChainForm] Signing typed data:', { domain, types: messageTypes, message });
      signature = await signer.signTypedData(domain, messageTypes, message);
      setStatusText('✅ Signature obtained.');
    } catch (err) {
      console.error("Error signing typed data:", err);
      setStatusText(`❌ Signature failed or was rejected: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsRunning(false);
      return;
    }

    // 6.2) Submit signed order to 1inch via backend API
    setStatusText('6.2) Submitting signed order to 1inch…');
    try {
      const relayPayload = {
        orderMessage: placeOrderApiResp.typedDataToSign.message,
        signature,
        srcChainId: props.srcChainIdFromTokenSelector,
        quoteId: quote.quoteId, // Pass quoteId from the original quote
      };
      console.log('[CrossChainForm] Calling /api/relay-signed-order with payload:', relayPayload);
      const relayResponse = await fetch('/api/relay-signed-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relayPayload),
      });

      const relayResponseData = await relayResponse.json();
      if (!relayResponse.ok) {
        throw new Error(relayResponseData.error || `Failed to submit signed order (status ${relayResponse.status})`);
      }
      console.log('[CrossChainForm] Signed order submitted successfully:', relayResponseData);
      // At this point, the order is submitted to 1inch.
    } catch (err) {
      console.error(err);
      setStatusText(`❌ Order submission failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsRunning(false);
      return;
    }
    
    const orderHash = placeOrderApiResp.orderHash; // Use orderHash from /api/place-order response
    setStatusText(`✅ Order submitted to 1inch. OrderHash = ${orderHash}. Now polling status...`);

    // 7) Poll getReadyToAcceptSecretFills via backend API
    let ready: ReadyToAcceptSecretFills;
    do {
      setStatusText('7) Polling for escrow funding status via backend…');
      try {
        const response = await fetch('/api/get-ready-to-accept-secret-fills', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderHash, srcChainId: props.srcChainIdFromTokenSelector }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to poll ready to accept secret fills from backend');
        }
        ready = await response.json();
      } catch (err) {
        console.error(err);
        setStatusText(`❌ Error polling getReadyToAcceptSecretFills from backend: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsRunning(false);
        return;
      }
      if (ready.fills.length === 0) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } while (ready.fills.length === 0);

    setStatusText('✅ Escrows funded on both chains. Revealing secrets…');

    // 8) Reveal each secret via backend API (Privy will prompt signature for each)
    for (const secret of secrets) {
      setStatusText(`8) Revealing secret ${secret} via backend (Privy will ask to sign)…`);
      try {
        const response = await fetch('/api/submit-secret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderHash, secret, srcChainId: props.srcChainIdFromTokenSelector }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to submit secret via backend');
        }
        await response.json(); // Or check for success status
      } catch (err) {
        console.error(err);
        setStatusText(`❌ submitSecret failed or was rejected via backend: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsRunning(false);
        return;
      }
      // Small delay if multiple secrets
      await new Promise((r) => setTimeout(r, 1000));
    }

    // 9) Poll getOrderStatus until we hit a terminal state via backend API
    setStatusText('9) Polling final order status via backend…');
    const terminalStates = [
      OrderStatus.Executed,
      OrderStatus.Expired,
      OrderStatus.Cancelled,
      OrderStatus.Refunded,
    ];
    let finalStatus: OrderStatus; // Changed to non-nullable
    do {
      let resp;
      try {
        const response = await fetch('/api/get-order-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderHash, srcChainId: props.srcChainIdFromTokenSelector }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get order status from backend');
        }
        resp = await response.json();
      } catch (err) {
        console.error(err);
        setStatusText(`❌ Error polling getOrderStatus from backend: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setIsRunning(false);
        return;
      }
      finalStatus = resp.status;
      setStatusText(`⏳ Current status: ${finalStatus}`);
      if (terminalStates.includes(finalStatus)) break;
      await new Promise((r) => setTimeout(r, 2000));
    } while (true);

    setStatusText(`✅ Done! Final status: ${finalStatus}`);
    setIsRunning(false);
  }

  return (
    <div className="border rounded p-4 my-4 shadow-sm">
      {!isReady && (
        <p className="text-sm text-red-600">
          {!isBrowserProvider ? "🔴 Browser provider not available. " : ""}
          {!isJsonRpcSigner ? "🔴 JSON RPC Signer not available. " : ""}
          {!isUserAddressSet ? "🔴 User address not available. " : ""}
          {!isReceiverAddressSet ? "🔴 Receiver address not set in props. " : ""}
          {!isDstChainSet ? `🔴 Destination chain details not available or not supported for ${dstChainName}. ` : ""}
          {!isSrcTokenAddressSet ? "🔴 Source token not selected. " : ""}
          {!isAmountValid ? "🔴 Amount must be greater than 0. " : ""}
          {isUserAddressSet && isChainIdCorrect === false ? // Only show chain mismatch if user address is set (Privy connected)
            `🔴 Wallet connected to chain ID ${chainId}, but token selected on chain ID ${props.srcChainIdFromTokenSelector} (${SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector)?.name || 'Unknown Chain'}). Please switch wallet to ${SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector)?.name || `chain ID ${props.srcChainIdFromTokenSelector}`}. ` : ""
          }
          {!isUserAddressSet && props.srcChainIdFromTokenSelector ? // If Privy not connected but a source chain is selected
            `Please connect Privy on ${SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector)?.name || `chain ID ${props.srcChainIdFromTokenSelector}`} to enable swaps.` : ""
          }
        </p>
      )}

      <Button
        onClick={onCrossChainClick}
        disabled={!isReady || isRunning}
        className="mt-2"
      >
        {isRunning ? 'Processing…' :
          `Swap ${props.srcTokenSymbol || 'Token'} (${SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector)?.name || 'Src Chain'}) → USDC (${dstChain?.name || 'Dst Chain'})`
        }
      </Button>

      <pre className="mt-4 whitespace-pre-wrap text-xs">{statusText}</pre>
    </div>
  );
}
