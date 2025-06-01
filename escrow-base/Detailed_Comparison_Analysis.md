# EVM vs. SUI Escrow Contract Comparison

This document provides a detailed comparison of the Fusion Escrow smart contracts implemented for EVM (Solidity) and SUI (Move). The analysis covers both the "Source" and "Destination" components of the escrow system.

## Part 1: Source Contracts

**Contracts Analyzed:**
*   EVM: `escrow-base-evm/contracts/FusionEscrowSource.sol`
*   SUI: `escrow-base-sui/fusion_escrow/sources/fusion_escrow_source.move`

**Overall Conclusion (Source):**
The SUI source contract (`fusion_escrow_source.move`) successfully preserves the core logic and intended functionality of the EVM source contract (`FusionEscrowSource.sol`). Both contracts implement a similar escrow mechanism where a "maker" locks assets (tokens and a native currency safety deposit) against a hashed secret, designating a "resolver" who can claim these assets by providing the correct pre-image of the secret. If the resolver fails to do so within a timeout period, the maker (or anyone, in the EVM version, though typically the maker) can cancel the order and reclaim the assets.

**Detailed Comparison (Source):**

1.  **Order Structure and State:**
    *   **EVM:** Uses a `struct Order` storing `orderId`, `maker`, `resolver`, `token` (IERC20 address), `amount`, `safetyDeposit` (native currency), `hashSecret`, `timeoutTimestamp`, `withdrawn`, `cancelled`. Orders are stored in a `mapping(bytes32 => Order)`.
    *   **SUI:** Uses a `struct Order<phantom T: store>` storing `id` (object UID), `order_id_global` (equivalent to EVM's `orderId`), `maker`, `resolver`, `token_balance` (Balance<T>), `safety_deposit` (Balance<sui::sui::SUI>), `hash_secret`, `timeout_timestamp_ms`, `is_withdrawn`, `is_cancelled`. Each order is a distinct shared SUI object.
    *   **Logic Preservation:** Essential data fields are present in both. SUI's object model means each order is an independent object, but the conceptual data is the same.

2.  **Order Creation (`createOrder` / `create_order`):**
    *   **EVM:** Maker calls, provides details, and `msg.value` as safety deposit. Tokens are transferred from maker to contract. Reverts if `_orderId` already exists. Timeout in seconds.
    *   **SUI:** Maker calls, provides `Coin<T>` for tokens and `Coin<sui::sui::SUI>` for safety deposit. A new `Order` object is created. Timeout in milliseconds. Uniqueness of `order_id_global` across different `Order` objects is not enforced at the module level beyond SUI's object ID uniqueness.
    *   **Logic Preservation:** Largely preserved. Both lock tokens and a safety deposit. Timeout mechanism is conceptually identical.

3.  **Withdrawal by Resolver (`withdraw` / `withdraw_by_resolver`):**
    *   **EVM:** Resolver calls with `_orderId` and `_secret`. Verifies caller, secret, and that order is not expired/withdrawn/cancelled. Transfers tokens and safety deposit to resolver.
    *   **SUI:** Resolver calls with `Order` object reference and `secret`. Verifies caller, secret, and conditions similarly. Transfers balances to resolver.
    *   **Logic Preservation:** Identical.

4.  **Cancellation (`cancel` / `cancel_order_by_maker`):**
    *   **EVM:** Anyone can call if order is expired and not withdrawn/cancelled. Returns funds to `order.maker`.
    *   **SUI:** Function name `cancel_order_by_maker` implies maker-only, but logic allows anyone if conditions (expired, not withdrawn/cancelled) are met. Returns funds to `order.maker`.
    *   **Logic Preservation:** Identical in effect.

5.  **Events & Error Handling:**
    *   **EVM:** `OrderCreated`, `OrderWithdrawn`, `OrderCancelled` events. Custom errors.
    *   **SUI:** Similar event structs. Constant error codes.
    *   **Logic Preservation:** Consistent. SUI's `OrderCreated` event has a placeholder `token_type`.

6.  **Reentrancy Guard:**
    *   **EVM:** Uses `nonReentrant` modifier.
    *   **SUI:** No explicit guard, relies on SUI's model.
    *   **Logic Preservation:** Architectural difference.

---

## Part 2: Destination Contracts

**Contracts Analyzed:**
*   EVM: `escrow-base-evm/contracts/FusionEscrowDestination.sol`
*   SUI: `escrow-base-sui/fusion_escrow/sources/fusion_escrow_destination.move`

**Overall Conclusion (Destination):**
The SUI destination contract (`fusion_escrow_destination.move`) effectively mirrors the logic of the EVM destination contract (`FusionEscrowDestination.sol`). Both facilitate the "filling" of an order by a resolver, who locks assets on the destination chain. The original maker can then withdraw these assets using the same secret. If the maker doesn't act within a timeout, the resolver can reclaim their locked assets.

**Detailed Comparison (Destination):**

1.  **Order Structure and State:**
    *   **EVM:** `struct Order` with `orderId`, `maker` (original), `resolver` (filler), `token`, `amount`, `safetyDeposit` (by resolver), `hashSecret`, `timeoutTimestamp`, `makerWithdrawn`, `cancelledByResolver`. Stored in `mapping(bytes32 => Order)`.
    *   **SUI:** `struct Order<phantom T>` with `id` (UID), `order_id_global`, `maker`, `resolver`, `token_balance`, `safety_deposit` (Balance<SUI>), `hash_secret`, `timeout_timestamp_ms`, `is_maker_withdrawn`, `is_cancelled_by_resolver`. Each order is a shared SUI object.
    *   **Logic Preservation:** Core data fields are consistent for the destination leg.

2.  **Order Filling (`fillOrder` / `fill_order`):**
    *   **EVM:** Resolver calls, provides `_orderId`, `_maker` address. Locks tokens (transferred from resolver) and `msg.value` (safety deposit). Reverts if `_orderId` already filled.
    *   **SUI:** Resolver calls, provides `order_id_global`, `maker` address. Locks `Coin<T>` and `Coin<SUI>`. Creates a new `Order` object.
    *   **Logic Preservation:** Resolver locks assets against a global ID and maker address.

3.  **Withdrawal by Maker (`makerWithdraw` / `withdraw_by_maker`):**
    *   **EVM:** Original maker calls with `_orderId` and `_secret`. Verifies caller, secret, and that order is not expired for maker withdrawal. Transfers tokens and resolver's safety deposit to maker.
    *   **SUI:** Original maker calls with `Order` object and `secret`. Similar verifications. Transfers balances to maker.
    *   **Logic Preservation:** Identical. Maker uses secret to claim assets.

4.  **Cancellation by Resolver (`cancelOrder` / `cancel_order_by_resolver`):**
    *   **EVM:** Resolver calls if order is expired for maker withdrawal and not already maker-withdrawn/resolver-cancelled. Returns funds to resolver.
    *   **SUI:** Resolver calls under similar conditions. Returns funds to resolver.
    *   **Logic Preservation:** Identical. Resolver reclaims funds if maker times out.

5.  **Events & Error Handling:**
    *   **EVM:** `OrderFilled`, `MakerWithdrawn`, `OrderCancelledByResolver` events. Custom errors.
    *   **SUI:** Similar event structs. Constant error codes.
    *   **Logic Preservation:** Consistent. SUI's `OrderFilled` event has a placeholder `token_type`.

6.  **Reentrancy Guard:**
    *   **EVM:** Uses `nonReentrant` modifier.
    *   **SUI:** No explicit guard.
    *   **Logic Preservation:** Architectural difference.

**General Observations (Applicable to both Source and Destination):**

*   **Timestamp Granularity:** EVM uses seconds for timeouts; SUI uses milliseconds. This is an implementation detail.
*   **`order_id_global` Uniqueness in SUI:** While EVM contracts enforce `orderId` uniqueness within their state mapping, SUI contracts create new unique `Order` objects. If strict uniqueness of the `order_id_global` field itself (across all `Order` objects from a module) is critical, it might require an additional SUI-specific mechanism (e.g., a central registry object).
*   **Token Type Representation in SUI Events:** The `token_type` field in SUI event structs is currently a placeholder (`b"UNKNOWN_TOKEN_TYPE"`). A more robust solution would involve deriving or storing the actual type name.

**Final Summary:**
The SUI contracts for both source and destination successfully replicate the core logic of their EVM counterparts, adapting the escrow mechanism to SUI's object model and transaction patterns. The fundamental flows of asset locking, secret-based withdrawal, and timeout-based cancellations are well-maintained across both platforms.
