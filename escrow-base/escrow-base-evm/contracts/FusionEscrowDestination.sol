// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FusionEscrowDestination is ReentrancyGuard {
    struct Order {
        bytes32 orderId; // Same ID as on the source chain
        address maker; // The original maker from the source chain
        address resolver; // The resolver who is filling this order
        IERC20 token; // Token on the destination chain
        uint256 amount; // Amount of token on the destination chain
        uint256 safetyDeposit; // Safety deposit by the resolver
        bytes32 hashSecret; // Hash of the secret, same as on source chain
        uint256 timeoutTimestamp; // Timeout for this side of the swap
        bool makerWithdrawn; // If the maker has withdrawn
        bool cancelledByResolver; // If the resolver has cancelled
    }

    mapping(bytes32 => Order) public orders;

    event OrderFilled(
        bytes32 indexed orderId,
        address indexed maker,
        address indexed resolver,
        address token,
        uint256 amount,
        uint256 safetyDeposit,
        bytes32 hashSecret,
        uint256 timeoutTimestamp
    );

    event MakerWithdrawn(bytes32 indexed orderId, address indexed maker, bytes32 secret);
    event OrderCancelledByResolver(bytes32 indexed orderId, address indexed resolver);

    error OrderAlreadyFilled();
    error OrderDoesNotExist();
    error OrderAlreadyWithdrawnByMaker();
    error OrderAlreadyCancelledByResolver();
    error OrderNotExpired();
    error OrderExpired();
    error InvalidSecret();
    error CallerNotMaker();
    error CallerNotResolver();
    error TransferFailed();
    error ZeroAmount();


    modifier orderExists(bytes32 _orderId) {
        if (orders[_orderId].resolver == address(0)) revert OrderDoesNotExist();
        _;
    }

    modifier notMakerWithdrawn(bytes32 _orderId) {
        if (orders[_orderId].makerWithdrawn) revert OrderAlreadyWithdrawnByMaker();
        _;
    }

    modifier notCancelledByResolver(bytes32 _orderId) {
        if (orders[_orderId].cancelledByResolver) revert OrderAlreadyCancelledByResolver();
        _;
    }

    constructor() {}

    /**
     * @notice Resolver fills an order by depositing tokens and a safety deposit on the destination chain.
     * @param _orderId The unique identifier for the order (must match the source chain orderId).
     * @param _maker The address of the original maker.
     * @param _token The ERC20 token contract address for the swap on this chain.
     * @param _amount The amount of tokens to be locked by the resolver.
     * @param _hashSecret The Keccak256 hash of the secret (must match the source chain).
     * @param _timeoutDuration The duration in seconds after which the order can be cancelled by the resolver.
     */
    function fillOrder(
        bytes32 _orderId,
        address _maker,
        IERC20 _token,
        uint256 _amount,
        bytes32 _hashSecret,
        uint256 _timeoutDuration
    ) external payable nonReentrant {
        if (orders[_orderId].resolver != address(0)) revert OrderAlreadyFilled();
        if (_amount == 0) revert ZeroAmount();
        if (msg.value == 0) revert ZeroAmount(); // Safety deposit must be > 0

        uint256 timeoutTimestamp = block.timestamp + _timeoutDuration;

        orders[_orderId] = Order({
            orderId: _orderId,
            maker: _maker,
            resolver: msg.sender,
            token: _token,
            amount: _amount,
            safetyDeposit: msg.value,
            hashSecret: _hashSecret,
            timeoutTimestamp: timeoutTimestamp,
            makerWithdrawn: false,
            cancelledByResolver: false
        });

        // Transfer tokens from resolver to this contract
        if (!_token.transferFrom(msg.sender, address(this), _amount)) {
            revert TransferFailed();
        }

        emit OrderFilled(
            _orderId,
            _maker,
            msg.sender,
            address(_token),
            _amount,
            msg.value,
            _hashSecret,
            timeoutTimestamp
        );
    }

    /**
     * @notice Allows the maker to withdraw the tokens by providing the correct secret.
     * @param _orderId The ID of the order.
     * @param _secret The secret corresponding to the hashSecret.
     */
    function makerWithdraw(bytes32 _orderId, bytes32 _secret)
        external
        nonReentrant
        orderExists(_orderId)
        notMakerWithdrawn(_orderId)
        notCancelledByResolver(_orderId)
    {
        Order storage order = orders[_orderId];

        if (msg.sender != order.maker) revert CallerNotMaker();
        if (keccak256(abi.encodePacked(_secret)) != order.hashSecret) revert InvalidSecret();
        if (block.timestamp >= order.timeoutTimestamp) revert OrderExpired(); // Maker must withdraw before resolver can cancel

        order.makerWithdrawn = true;

        // Transfer tokens to maker
        if (!order.token.transfer(order.maker, order.amount)) {
            revert TransferFailed();
        }

        // Transfer safety deposit to maker (as a reward or part of the agreement)
        (bool success, ) = order.maker.call{value: order.safetyDeposit}("");
        if (!success) {
            revert TransferFailed(); // Safety deposit transfer failed
        }

        emit MakerWithdrawn(_orderId, order.maker, _secret);
    }

    /**
     * @notice Allows the resolver to cancel an order and reclaim funds after its timeout has been reached,
     *         if the maker has not withdrawn.
     * @param _orderId The ID of the order to cancel.
     */
    function cancelOrder(bytes32 _orderId)
        external
        nonReentrant
        orderExists(_orderId)
        notMakerWithdrawn(_orderId)
        notCancelledByResolver(_orderId)
    {
        Order storage order = orders[_orderId];

        if (msg.sender != order.resolver) revert CallerNotResolver();
        if (block.timestamp < order.timeoutTimestamp) revert OrderNotExpired();

        order.cancelledByResolver = true;

        // Return tokens to resolver
        if (!order.token.transfer(order.resolver, order.amount)) {
            revert TransferFailed();
        }

        // Return safety deposit to resolver
        (bool success, ) = order.resolver.call{value: order.safetyDeposit}("");
        if (!success) {
            revert TransferFailed(); // Safety deposit refund failed
        }

        emit OrderCancelledByResolver(_orderId, order.resolver);
    }

    // Fallback function to receive ETH for safety deposits
    receive() external payable {}
}
