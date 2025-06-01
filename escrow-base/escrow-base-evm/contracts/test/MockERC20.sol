// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; // Optional: if you want to restrict minting

// A mock ERC20 token for testing purposes.
contract MockERC20 is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) { // Set deployer as owner
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply); // Mint initial supply to the deployer
        }
    }

    /**
     * @notice Allows anyone to mint new tokens.
     * @dev In a real scenario, minting should be restricted (e.g., to Ownable).
     * For testing, making it public simplifies token distribution.
     */
    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    /**
     * @notice Allows anyone to burn tokens from their own account.
     */
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    // burnFrom is inherited from OpenZeppelin's ERC20.sol
    // No need to override if we are not changing its behavior.
}
