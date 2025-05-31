// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract FusionEscrowSource is ReentrancyGuard {
    struct Order {
        bytes32 orderId;
        address maker;
        address resolver;
        IERC20 token;
        uint256 amount;
        uint256 safetyDeposit;
        bytes32 hashSecret;
        uint256 timeoutTimestamp; // Timestamp after which the order can be cancelled
        bool withdrawn;
        bool cancelled;
    }

    mapping(bytes32 => Order) public orders;

    event OrderCreated(
        bytes32 indexed orderId,
        address indexed maker,
        address indexed resolver,
        address token,
        uint256 amount,
        uint256 safetyDeposit,
        bytes32 hashSecret,
        uint256 timeoutTimestamp
    );

    event OrderWithdrawn(bytes32 indexed orderId, address indexed resolver, bytes32 secret);
    event OrderCancelled(bytes32 indexed orderId, address indexed canceller);

    error OrderAlreadyExists();
    error OrderDoesNotExist();
    error OrderAlreadyWithdrawn();
    error OrderAlreadyCancelled();
    error OrderNotExpired();
    error OrderExpired();
    error InvalidSecret();
    error CallerNotResolver();
    error TransferFailed();
    error ZeroAmount();

    modifier orderExists(bytes32 _orderId) {
        if (orders[_orderId].maker == address(0)) revert OrderDoesNotExist();
        _;
    }

    modifier notWithdrawn(bytes32 _orderId) {
        if (orders[_orderId].withdrawn) revert OrderAlreadyWithdrawn();
        _;
    }

    modifier notCancelled(bytes32 _orderId) {
        if (orders[_orderId].cancelled) revert OrderAlreadyCancelled();
        _;
    }

    constructor() {}

    /**
     * @notice Creates a new swap order. Maker locks tokens and a safety deposit.
     * @param _orderId A unique identifier for the order.
     * @param _resolver The address of the resolver who will fulfill the order on the destination chain.
     * @param _token The ERC20 token contract address for the swap.
     * @param _amount The amount of tokens to be swapped.
     * @param _safetyDepositAmount The amount of native currency (ETH) for the safety deposit.
     * @param _hashSecret The Keccak256 hash of the secret.
     * @param _timeoutDuration The duration in seconds after which the order can be cancelled.
     */
    function createOrder(
        bytes32 _orderId,
        address _resolver,
        IERC20 _token,
        uint256 _amount,
        bytes32 _hashSecret,
        uint256 _timeoutDuration
    ) external payable nonReentrant {
        if (orders[_orderId].maker != address(0)) revert OrderAlreadyExists();
        if (_amount == 0) revert ZeroAmount();
        if (msg.value == 0) revert ZeroAmount(); // Safety deposit must be > 0

        uint256 timeoutTimestamp = block.timestamp + _timeoutDuration;

        orders[_orderId] = Order({
            orderId: _orderId,
            maker: msg.sender,
            resolver: _resolver,
            token: _token,
            amount: _amount,
            safetyDeposit: msg.value,
            hashSecret: _hashSecret,
            timeoutTimestamp: timeoutTimestamp,
            withdrawn: false,
            cancelled: false
        });

        // Transfer tokens from maker to this contract
        if (!_token.transferFrom(msg.sender, address(this), _amount)) {
            revert TransferFailed();
        }

        emit OrderCreated(
            _orderId,
            msg.sender,
            _resolver,
            address(_token),
            _amount,
            msg.value,
            _hashSecret,
            timeoutTimestamp
        );
    }

    /**
     * @notice Allows the resolver to withdraw the tokens by providing the correct secret.
     * @param _orderId The ID of the order.
     * @param _secret The secret corresponding to the hashSecret.
     */
    function withdraw(bytes32 _orderId, bytes32 _secret)
        external
        nonReentrant
        orderExists(_orderId)
        notWithdrawn(_orderId)
        notCancelled(_orderId)
    {
        Order storage order = orders[_orderId];

        if (msg.sender != order.resolver) revert CallerNotResolver();
        if (keccak256(abi.encodePacked(_secret)) != order.hashSecret) revert InvalidSecret();
        if (block.timestamp >= order.timeoutTimestamp) revert OrderExpired();

        order.withdrawn = true;

        // Transfer tokens to resolver
        if (!order.token.transfer(order.resolver, order.amount)) {
            revert TransferFailed();
        }

        // Transfer safety deposit to resolver
        (bool success, ) = order.resolver.call{value: order.safetyDeposit}("");
        if (!success) {
            revert TransferFailed(); // Safety deposit transfer failed
        }

        emit OrderWithdrawn(_orderId, order.resolver, _secret);
    }

    /**
     * @notice Allows anyone to cancel an order after its timeout has been reached.
     * @param _orderId The ID of the order to cancel.
     */
    function cancel(bytes32 _orderId)
        external
        nonReentrant
        orderExists(_orderId)
        notWithdrawn(_orderId)
        notCancelled(_orderId)
    {
        Order storage order = orders[_orderId];

        if (block.timestamp < order.timeoutTimestamp) revert OrderNotExpired();

        order.cancelled = true;

        // Return tokens to maker
        if (!order.token.transfer(order.maker, order.amount)) {
            revert TransferFailed();
        }

        // Return safety deposit to maker
        (bool success, ) = order.maker.call{value: order.safetyDeposit}("");
        if (!success) {
            revert TransferFailed(); // Safety deposit refund failed
        }

        emit OrderCancelled(_orderId, msg.sender);
    }

    // Fallback function to receive ETH for safety deposits
    receive() external payable {}
}
