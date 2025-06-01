// ── lib/BrowserBlockchainProvider.ts ────────────────────────────────────────

import { BrowserProvider, JsonRpcSigner, Provider } from 'ethers'

/**
 * Implements the two methods the 1inch Fusion+ SDK expects:
 *   1) signTypedData(walletAddress, typedData) → EIP-712 signature
 *   2) ethCall(contractAddress, data)           → read-only RPC call
 *
 * Under the hood, this will route all signatures through Privy’s signer,
 * so Privy will pop up “Do you want to sign this?” whenever needed.
 */
export class BrowserBlockchainProvider {
  private signer: JsonRpcSigner
  private provider: Provider

  constructor(signer: JsonRpcSigner, provider: Provider) {
    this.signer = signer
    this.provider = provider
  }

  // Called by the Fusion+ SDK whenever it needs an EIP-712 signature.
  async signTypedData(
    walletAddress: string,
    typedData: {
      domain: Record<string, any>
      types: Record<string, any>
      message: Record<string, any>
    }
  ): Promise<string> {
    // In ethers v6, `signer._signTypedData` still exists and ignores “EIP712Domain” automatically.
    return this.signer.signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    )
  }

  // Called by the Fusion+ SDK for any “view” RPC call
  async ethCall(contractAddress: string, data: string): Promise<string> {
    return this.provider.call({
      to: contractAddress,
      data,
    })
  }
}