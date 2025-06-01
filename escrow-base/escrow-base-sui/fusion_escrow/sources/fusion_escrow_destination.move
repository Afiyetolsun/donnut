// Module for the destination chain in a cross-chain atomic swap
module fusion_escrow::fusion_escrow_destination {
    use sui::coin::{Self as CoinModule, Coin};
    use sui::balance::{Self as BalanceModule, Balance};
    use sui::object::{Self as ObjectModule, ID, UID};
    use sui::transfer;
    use sui::tx_context::{Self as TxContextModule, TxContext};
    use sui::event;
    use sui::clock::{Self as ClockModule, Clock};
    use sui::hash;
    // use std::vector; // Removed
    use std::option::Option;

    // Errors (can share error codes with source if in the same package, or redefine)
    // const E_ORDER_ALREADY_FILLED: u64 = 101; // Unused
    // const E_ORDER_DOES_NOT_EXIST: u64 = 102; // Unused
    const E_ORDER_ALREADY_WITHDRAWN_BY_MAKER: u64 = 103;
    const E_ORDER_ALREADY_CANCELLED_BY_RESOLVER: u64 = 104;
    const E_ORDER_NOT_EXPIRED: u64 = 105;
    const E_ORDER_EXPIRED: u64 = 106; // Maker must withdraw before resolver can cancel
    const E_INVALID_SECRET: u64 = 107;
    const E_CALLER_NOT_MAKER: u64 = 108;
    const E_CALLER_NOT_RESOLVER: u64 = 109;
    const E_ZERO_AMOUNT: u64 = 110;
    const E_SAFETY_DEPOSIT_TOO_LOW: u64 = 111;

    // Represents a swap order on the destination chain
    public struct Order<phantom T> has key, store {
        id: UID,
        order_id_global: vector<u8>, // Same global ID as on the source chain
        maker: address,              // The original maker from the source chain
        resolver: address,           // The resolver who is filling this order
        token_balance: Balance<T>,   // Locked tokens by the resolver
        safety_deposit: Balance<sui::sui::SUI>, // Locked SUI by the resolver
        hash_secret: vector<u8>,     // Hash of the secret, same as on source chain
        timeout_timestamp_ms: u64,   // Timeout for this side of the swap
        is_maker_withdrawn: bool,
        is_cancelled_by_resolver: bool,
    }

    // Events
    public struct OrderFilled has copy, drop {
        order_object_id: ID,
        order_id_global: vector<u8>,
        maker: address,
        resolver: address,
        token_type: vector<u8>,
        amount: u64,
        safety_deposit_amount: u64,
        hash_secret: vector<u8>,
        timeout_timestamp_ms: u64,
    }

    public struct MakerWithdrawn has copy, drop {
        order_object_id: ID,
        order_id_global: vector<u8>,
        maker: address,
        secret: vector<u8>,
    }

    public struct OrderCancelledByResolver has copy, drop {
        order_object_id: ID,
        order_id_global: vector<u8>,
        resolver: address,
    }

    fun init(_ctx: &mut TxContext) {
        // No specific init needed for this module if AdminCap is not used here
        // or if orders are managed as independent shared objects.
    }

    // Placeholder for type name, similar to source module
    fun type_name_as_vector(): vector<u8> { // Removed unused <T>
        b"UNKNOWN_TOKEN_TYPE"
    }

    /// Resolver fills an order by depositing tokens and a safety deposit on the destination chain.
    public entry fun fill_order<T>(
        order_id_global: vector<u8>,
        maker: address, // Original maker's address
        tokens_to_lock: Coin<T>,
        safety_deposit_sui: Coin<sui::sui::SUI>,
        hash_secret: vector<u8>, // Must match the source chain's hash_secret
        timeout_duration_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let resolver = TxContextModule::sender(ctx);
        let token_amount = CoinModule::value(&tokens_to_lock);
        let sui_amount = CoinModule::value(&safety_deposit_sui);

        assert!(token_amount > 0, E_ZERO_AMOUNT);
        assert!(sui_amount > 0, E_SAFETY_DEPOSIT_TOO_LOW);

        let timeout_timestamp_ms = ClockModule::timestamp_ms(clock) + timeout_duration_ms;

        let order = Order<T> {
            id: ObjectModule::new(ctx),
            order_id_global,
            maker,
            resolver,
            token_balance: CoinModule::into_balance(tokens_to_lock),
            safety_deposit: CoinModule::into_balance(safety_deposit_sui),
            hash_secret,
            timeout_timestamp_ms,
            is_maker_withdrawn: false,
            is_cancelled_by_resolver: false,
        };

        event::emit(OrderFilled {
            order_object_id: ObjectModule::id(&order),
            order_id_global: order.order_id_global,
            maker,
            resolver,
            token_type: type_name_as_vector(), // Removed <T>
            amount: token_amount,
            safety_deposit_amount: sui_amount,
            hash_secret: order.hash_secret,
            timeout_timestamp_ms,
        });

        transfer::share_object(order);
    }

    /// Allows the original maker to withdraw the tokens by providing the correct secret.
    public entry fun withdraw_by_maker<T>(
        order: &mut Order<T>,
        secret: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(TxContextModule::sender(ctx) == order.maker, E_CALLER_NOT_MAKER);
        assert!(!order.is_maker_withdrawn, E_ORDER_ALREADY_WITHDRAWN_BY_MAKER);
        assert!(!order.is_cancelled_by_resolver, E_ORDER_ALREADY_CANCELLED_BY_RESOLVER);
        // Maker must withdraw before resolver can cancel (destination timeout)
        assert!(ClockModule::timestamp_ms(clock) < order.timeout_timestamp_ms, E_ORDER_EXPIRED);

        let hashed_input_secret = hash::keccak256(&secret);
        assert!(hashed_input_secret == order.hash_secret, E_INVALID_SECRET);

        order.is_maker_withdrawn = true;

        let tokens_to_maker = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.token_balance), ctx);
        let sui_to_maker = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.safety_deposit), ctx);

        transfer::public_transfer(tokens_to_maker, order.maker);
        transfer::public_transfer(sui_to_maker, order.maker);

        event::emit(MakerWithdrawn {
            order_object_id: ObjectModule::id(order),
            order_id_global: order.order_id_global,
            maker: order.maker,
            secret,
        });
    }

    /// Allows the resolver to cancel an order and reclaim funds after timeout, if maker hasn't withdrawn.
    public entry fun cancel_order_by_resolver<T>(
        order: &mut Order<T>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(TxContextModule::sender(ctx) == order.resolver, E_CALLER_NOT_RESOLVER);
        assert!(!order.is_maker_withdrawn, E_ORDER_ALREADY_WITHDRAWN_BY_MAKER);
        assert!(!order.is_cancelled_by_resolver, E_ORDER_ALREADY_CANCELLED_BY_RESOLVER);
        assert!(ClockModule::timestamp_ms(clock) >= order.timeout_timestamp_ms, E_ORDER_NOT_EXPIRED);

        order.is_cancelled_by_resolver = true;

        let tokens_to_resolver = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.token_balance), ctx);
        let sui_to_resolver = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.safety_deposit), ctx);

        transfer::public_transfer(tokens_to_resolver, order.resolver);
        transfer::public_transfer(sui_to_resolver, order.resolver);

        event::emit(OrderCancelledByResolver {
            order_object_id: ObjectModule::id(order),
            order_id_global: order.order_id_global,
            resolver: order.resolver,
        });
    }

    // --- Getter functions (view functions) ---
    public fun get_order_details<T: store>(order: &Order<T>): (vector<u8>, address, address, u64, u64, vector<u8>, u64, bool, bool) {
        (
            order.order_id_global,
            order.maker,
            order.resolver,
            BalanceModule::value(&order.token_balance),
            BalanceModule::value(&order.safety_deposit),
            order.hash_secret,
            order.timeout_timestamp_ms,
            order.is_maker_withdrawn,
            order.is_cancelled_by_resolver
        )
    }

    public fun is_order_maker_withdrawn<T: store>(order: &Order<T>): bool {
        order.is_maker_withdrawn
    }

    public fun is_order_cancelled_by_resolver<T: store>(order: &Order<T>): bool {
        order.is_cancelled_by_resolver
    }
}
