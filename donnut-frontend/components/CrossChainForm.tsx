// ── components/CrossChainForm.tsx ───────────────────────────────────────────

'use client'

import React, { useState, useEffect } from 'react'
import {
  SDK,
  PresetEnum,
  HashLock,
  OrderStatus,
  ReadyToAcceptSecretFills,
} from '@1inch/cross-chain-sdk'
import {
  BrowserProvider,
  JsonRpcSigner,
  Contract,
  hexlify,
  randomBytes,
  parseUnits, // Added
} from 'ethers'
import { useEthersPrivy } from '../hooks/useEthersPrivy'
import { BrowserBlockchainProvider } from '../lib/BrowserBlockchainProvider'
import { Button } from './ui/button'
import { SUPPORTED_CHAINS, getChainByName, Chain } from '../lib/chains'

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

    setStatusText('3) Initializing Fusion+ SDK…')
    const bcProvider = new BrowserBlockchainProvider(signer, provider)
    const sdk = new SDK({
      url: 'https://api.1inch.dev/fusion-plus',
      authKey: AUTH_KEY,
      blockchainProvider: bcProvider,
    })

    setStatusText('4) Fetching quote from 1inch Fusion+…')
    let quote
    try {
      quote = await sdk.getQuote({
        srcChainId: props.srcChainIdFromTokenSelector,
        dstChainId: dstChain.id,
        srcTokenAddress: effectiveSrcTokenAddress, // Use effective address
        dstTokenAddress: dstTokenAddress,
        amount: finalAmountInBaseUnits,      // Already in base units
        enableEstimate: true,
        walletAddress: userAddress,
      })
    } catch (err) {
      console.error(err)
      setStatusText('❌ Error fetching quote—check console.')
      setIsRunning(false)
      return
    }

    // Allowance check for the effective source token (could be WETH or original ERC20)
    setStatusText('5) Checking ERC-20 allowance…')
    const spender = quote.srcEscrowFactory.toString()
    const tokenAmt = BigInt(finalAmountInBaseUnits)
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
      console.error(err)
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

    // 5) Build secrets & hashLock
    setStatusText('5) Building secrets & hashLock…')
    const secretsCount = quote.getPreset().secretsCount
    const secrets: string[] = Array.from({ length: secretsCount }).map(() =>
      hexlify(randomBytes(32))
    )
    const secretHashes = secrets.map((s) => HashLock.hashSecret(s))
    const hashLock =
      secretsCount === 1
        ? HashLock.forSingleFill(secrets[0])
        : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets))

    // 6) Place order (Privy will ask you to sign the EIP-712 payload)
    setStatusText('6) Placing order (Privy will prompt for signature)…')
    let orderResponse
    try {
      orderResponse = await sdk.placeOrder(quote, {
        walletAddress: userAddress,
        receiver: props.receiverAddress, // Use prop here
        preset: PresetEnum.fast,
        source: 'privy-frontend',
        hashLock,
        secretHashes,
      })
    } catch (err) {
      console.error(err)
      setStatusText('❌ Order placement failed or was rejected.')
      setIsRunning(false)
      return
    }
    const orderHash = orderResponse.orderHash
    setStatusText(`✅ Order placed. OrderHash = ${orderHash}`)

    // 7) Poll getReadyToAcceptSecretFills
    let ready: ReadyToAcceptSecretFills
    do {
      setStatusText('7) Polling for escrow funding status…')
      try {
        ready = await sdk.getReadyToAcceptSecretFills(orderHash)
      } catch (err) {
        console.error(err)
        setStatusText('❌ Error polling getReadyToAcceptSecretFills.')
        setIsRunning(false)
        return
      }
      if (ready.fills.length === 0) {
        await new Promise((r) => setTimeout(r, 2000))
      }
    } while (ready.fills.length === 0)

    setStatusText('✅ Escrows funded on both chains. Revealing secrets…')

    // 8) Reveal each secret (Privy will prompt signature for each)
    for (const secret of secrets) {
      setStatusText(`8) Revealing secret ${secret} (Privy will ask to sign)…`)
      try {
        await sdk.submitSecret(orderHash, secret)
      } catch (err) {
        console.error(err)
        setStatusText('❌ submitSecret failed or was rejected.')
        setIsRunning(false)
        return
      }
      // Small delay if multiple secrets
      await new Promise((r) => setTimeout(r, 1000))
    }

    // 9) Poll getOrderStatus until we hit a terminal state
    setStatusText('9) Polling final order status…')
    const terminalStates = [
      OrderStatus.Executed,
      OrderStatus.Expired,
      OrderStatus.Cancelled,
      OrderStatus.Refunded,
    ]
    let finalStatus: OrderStatus | null = null
    do {
      let resp
      try {
        resp = await sdk.getOrderStatus(orderHash)
      } catch (err) {
        console.error(err)
        setStatusText('❌ Error polling getOrderStatus.')
        setIsRunning(false)
        return
      }
      finalStatus = resp.status
      setStatusText(`⏳ Current status: ${finalStatus}`)
      if (terminalStates.includes(finalStatus)) break
      await new Promise((r) => setTimeout(r, 2000))
    } while (true)

    setStatusText(`✅ Done! Final status: ${finalStatus}`)
    setIsRunning(false)
  }

  return (
    <div className="border rounded p-4 my-4 shadow-sm">
      {!isReady && (
        <p className="text-sm text-red-600">
          { !isBrowserProvider ? "🔴 Browser provider not available. " : "" }
          { !isJsonRpcSigner ? "🔴 JSON RPC Signer not available. " : "" }
          { !isUserAddressSet ? "🔴 User address not available. " : "" }
          { !isReceiverAddressSet ? "🔴 Receiver address not set in props. " : "" }
          { !isDstChainSet ? `🔴 Destination chain details not available or not supported for ${dstChainName}. ` : "" }
          { !isSrcTokenAddressSet ? "🔴 Source token not selected. " : "" }
          { !isAmountValid ? "🔴 Amount must be greater than 0. " : "" }
          { isUserAddressSet && isChainIdCorrect === false ? // Only show chain mismatch if user address is set (Privy connected)
            `🔴 Wallet connected to chain ID ${chainId}, but token selected on chain ID ${props.srcChainIdFromTokenSelector} (${SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector)?.name || 'Unknown Chain'}). Please switch wallet to ${SUPPORTED_CHAINS.find(c => c.id === props.srcChainIdFromTokenSelector)?.name || `chain ID ${props.srcChainIdFromTokenSelector}`}. ` : ""
          }
          { !isUserAddressSet && props.srcChainIdFromTokenSelector ? // If Privy not connected but a source chain is selected
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
  )
}