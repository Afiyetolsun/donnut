# Solana Cross-Chain Atomic Swap Contracts (Fusion-Inspired)

This project will contain Solana smart contracts implementing a cross-chain atomic swap system, inspired by the EVM-based FusionEscrow contracts.

## Features (Planned)

- **HTLC Logic**: Utilizes a secret hash and timelocks to ensure atomicity.
- **Escrow Deposits**: Both maker and resolver lock funds and safety deposits.
- **Secret-Based Withdrawal**: Funds are released upon revealing the correct secret.
- **Timeout Cancellation**: Orders can be cancelled after a timeout period, allowing fund recovery.
- **Event Emission (via CPIs or accounts)**: Contracts will log significant actions for off-chain relayer coordination.
- **SPL Token Support**: Compatible with any SPL token.

## Contracts (Planned)

1.  **`FusionEscrowSource` (Solana Program)**:
    - Deployed on the source Solana chain/ledger.
    - Maker initiates an order by locking tokens and a safety deposit.
    - Resolver withdraws funds by providing the secret.
    - Anyone can cancel after timeout if not withdrawn.

2.  **`FusionEscrowDestination` (Solana Program)**:
    - Deployed on the destination Solana chain/ledger.
    - Resolver fills an order by locking equivalent tokens and a safety deposit.
    - Maker withdraws funds by providing the secret.
    - Resolver can cancel after timeout if not withdrawn by the maker.

## Setup and Usage (To Be Documented)

Instructions for setting up the Solana/Anchor environment, building, deploying, and testing the contracts will be added here.

## Testing (To Be Documented)

Details about the test suites will be provided here.
