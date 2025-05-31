
module fusion_escrow::fusion_escrow_source {
    use sui::coin::{Self as CoinModule, Coin};
    use sui::balance::{Self as BalanceModule, Balance};
    use sui::object::{Self as ObjectModule};
    // MODIFIED: Removed 'use sui::transfer;'
    use sui::tx_context::{Self as TxContextModule};
    use sui::event;
    use sui::clock::{Self as ClockModule, Clock};
    use sui::hash;

    const E_ORDER_ALREADY_WITHDRAWN: u64 = 3;
    const E_ORDER_ALREADY_CANCELLED: u64 = 4;
    const E_ORDER_NOT_EXPIRED: u64 = 5;
    const E_ORDER_EXPIRED: u64 = 6;
    const E_INVALID_SECRET: u64 = 7;
    const E_CALLER_NOT_RESOLVER: u64 = 8;
    const E_ZERO_AMOUNT: u64 = 10;
    const E_SAFETY_DEPOSIT_TOO_LOW: u64 = 11;

    public struct AdminCap has key, store {
        id: object::UID
    }

    // MODIFIED: Added 'phantom' back as T is phantom in Balance<T>
    public struct Order<phantom T: store> has key, store {
        id: object::UID,
        order_id_global: vector<u8>,
        maker: address,
        resolver: address,
        token_balance: Balance<T>,
        safety_deposit: Balance<sui::sui::SUI>,
        hash_secret: vector<u8>,
        timeout_timestamp_ms: u64,
        is_withdrawn: bool,
        is_cancelled: bool,
    }

    public struct OrderCreated has copy, drop {
        order_object_id: object::ID,
        order_id_global: vector<u8>,
        maker: address,
        resolver: address,
        token_type: vector<u8>,
        amount: u64,
        safety_deposit_amount: u64,
        hash_secret: vector<u8>,
        timeout_timestamp_ms: u64,
    }

    public struct OrderWithdrawn has copy, drop {
        order_object_id: object::ID,
        order_id_global: vector<u8>,
        resolver: address,
        secret: vector<u8>,
    }

    public struct OrderCancelled has copy, drop {
        order_object_id: object::ID,
        order_id_global: vector<u8>,
        canceller: address,
    }

    public struct OrderBook has key {
        id: object::UID,
    }

    fun init(ctx: &mut tx_context::TxContext) {
        // MODIFIED: Fully qualify transfer
        sui::transfer::transfer(AdminCap {
            id: ObjectModule::new(ctx),
        }, TxContextModule::sender(ctx));
    }

    fun type_name_as_vector(): vector<u8> {
        b"UNKNOWN_TOKEN_TYPE"
    }

    public entry fun create_order<T: store>(
        order_id_global: vector<u8>,
        resolver: address,
        tokens_to_lock: Coin<T>,
        safety_deposit_sui: Coin<sui::sui::SUI>,
        hash_secret: vector<u8>,
        timeout_duration_ms: u64,
        clock: &Clock,
        ctx: &mut tx_context::TxContext,
    ) {
        let maker = TxContextModule::sender(ctx);
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
            is_withdrawn: false,
            is_cancelled: false,
        };

        event::emit(OrderCreated {
            order_object_id: ObjectModule::id(&order),
            order_id_global: order.order_id_global,
            maker,
            resolver,
            token_type: type_name_as_vector(),
            amount: token_amount,
            safety_deposit_amount: sui_amount,
            hash_secret: order.hash_secret,
            timeout_timestamp_ms,
        });
        // MODIFIED: Fully qualify share_object
        sui::transfer::share_object(order);
    }

    public entry fun withdraw_by_resolver<T: store>(
        order: &mut Order<T>,
        secret: vector<u8>,
        clock: &Clock,
        ctx: &mut tx_context::TxContext,
    ) {
        assert!(TxContextModule::sender(ctx) == order.resolver, E_CALLER_NOT_RESOLVER);
        assert!(!order.is_withdrawn, E_ORDER_ALREADY_WITHDRAWN);
        assert!(!order.is_cancelled, E_ORDER_ALREADY_CANCELLED);
        assert!(ClockModule::timestamp_ms(clock) < order.timeout_timestamp_ms, E_ORDER_EXPIRED);

        let hashed_input_secret = hash::keccak256(&secret);
        assert!(hashed_input_secret == order.hash_secret, E_INVALID_SECRET);

        order.is_withdrawn = true;

        let tokens_to_resolver = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.token_balance), ctx);
        let sui_to_resolver = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.safety_deposit), ctx);

        // MODIFIED: Fully qualify public_transfer
        sui::transfer::public_transfer(tokens_to_resolver, order.resolver);
        sui::transfer::public_transfer(sui_to_resolver, order.resolver);

        event::emit(OrderWithdrawn {
            order_object_id: ObjectModule::id(order),
            order_id_global: order.order_id_global,
            resolver: order.resolver,
            secret,
        });
    }

    public entry fun cancel_order_by_maker<T: store>(
        order: &mut Order<T>,
        clock: &Clock,
        ctx: &mut tx_context::TxContext,
    ) {
        assert!(!order.is_withdrawn, E_ORDER_ALREADY_WITHDRAWN);
        assert!(!order.is_cancelled, E_ORDER_ALREADY_CANCELLED);
        assert!(ClockModule::timestamp_ms(clock) >= order.timeout_timestamp_ms, E_ORDER_NOT_EXPIRED);

        order.is_cancelled = true;

        let tokens_to_maker = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.token_balance), ctx);
        let sui_to_maker = CoinModule::from_balance(BalanceModule::withdraw_all(&mut order.safety_deposit), ctx);

        // MODIFIED: Fully qualify public_transfer
        sui::transfer::public_transfer(tokens_to_maker, order.maker);
        sui::transfer::public_transfer(sui_to_maker, order.maker);

        event::emit(OrderCancelled {
            order_object_id: ObjectModule::id(order),
            order_id_global: order.order_id_global,
            canceller: TxContextModule::sender(ctx),
        });
    }

    public fun get_order_details<T: store>(order: &Order<T>): (vector<u8>, address, address, u64, u64, vector<u8>, u64, bool, bool) {
        (
            order.order_id_global,
            order.maker,
            order.resolver,
            BalanceModule::value(&order.token_balance),
            BalanceModule::value(&order.safety_deposit),
            order.hash_secret,
            order.timeout_timestamp_ms,
            order.is_withdrawn,
            order.is_cancelled
        )
    }

    public fun is_order_withdrawn<T: store>(order: &Order<T>): bool {
        order.is_withdrawn
    }

    public fun is_order_cancelled<T: store>(order: &Order<T>): bool {
        order.is_cancelled
    }
}