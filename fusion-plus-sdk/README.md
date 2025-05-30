# 1inch Fusion+ Swap Project

This project demonstrates how to use the 1inch Fusion+ SDK to perform a cross-chain swap from Ethereum to Gnosis chain.

## Prerequisites

- Node.js (v16 or higher)
- A valid Ethereum wallet with sufficient funds
- A 1inch API key
- Access to an Ethereum node (e.g., Infura, Alchemy)

## Setup

1. Clone the repository:

```bash
git clone git@github.com:Afiyetolsun/donnut.git
cd 1inch-fusion-plus-swap
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env` file in the project root and add the following variables (use `.env.example` as a template):

```
MAKER_PRIVATE_KEY=your_private_key_here
MAKER_ADDRESS=your_wallet_address_here
RECEIVER_ADDRESS=target_wallet_address_here
NODE_URL=your_ethereum_node_url_here
AUTH_KEY=your_1inch_api_key_here
```

## Configuration

- `MAKER_PRIVATE_KEY`: Your wallet's private key (keep this secure!)
- `MAKER_ADDRESS`: Your wallet address
- `RECEIVER_ADDRESS`: The target wallet address to receive the swapped tokens
- `NODE_URL`: Your Ethereum node URL (e.g., Infura or Alchemy endpoint)
- `AUTH_KEY`: Your 1inch API key

## Usage

1. Ensure your wallet has sufficient funds for the swap (1000 DAI in this example) and gas fees.
2. Run the project:

```bash
pnpm start
```

3. The script will:
   - Fetch a quote for swapping 1000 DAI from Ethereum to native tokens on Gnosis
   - Generate necessary secrets and hash locks
   - Place the cross-chain swap order
   - Output the order details or any errors

## Project Structure

- `src/index.ts`: Main script for executing the cross-chain swap
- `.env.example`: Template for environment variables
- `package.json`: Project dependencies and scripts
- `tsconfig.json`: TypeScript configuration

## Notes

- The swap is configured for 1000 DAI from Ethereum to native tokens on Gnosis chain.
- A 1% fee is set in the example, sent to a null address.
- Modify the `params` object in `index.ts` to change the swap amount, tokens, or chains.
- Ensure your wallet has sufficient gas for Ethereum transactions.
- Keep your `.env` file secure and never commit it to version control.

## Troubleshooting

- **Insufficient funds**: Ensure your wallet has enough DAI and ETH for gas.
- **API key issues**: Verify your 1inch API key is valid.
- **Node connection**: Check your Ethereum node URL is correct and accessible.

For more details, refer to the [1inch Fusion+ SDK documentation](https://docs.1inch.io/docs/fusion-plus/introduction).
