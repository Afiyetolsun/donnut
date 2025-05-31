const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("FusionEscrow Contracts", function () {
  let FusionEscrowSource, fusionEscrowSource;
  let FusionEscrowDestination, fusionEscrowDestination;
  let MockERC20, tokenA, tokenB;
  let owner, maker, resolver, anyone;

  const ORDER_ID = ethers.utils.formatBytes32String("testOrder123");
  const SECRET_PHRASE = "supersecretphrase";
  const SECRET = ethers.utils.formatBytes32String(SECRET_PHRASE);
  const HASH_SECRET = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["bytes32"], [SECRET]));
  const TOKEN_AMOUNT = ethers.utils.parseUnits("100", 18);
  const SAFETY_DEPOSIT_ETH = ethers.utils.parseEther("0.1");
  const TIMEOUT_DURATION_SOURCE = 24 * 60 * 60; // 24 hours
  const TIMEOUT_DURATION_DESTINATION = 12 * 60 * 60; // 12 hours

  beforeEach(async function () {
    [owner, maker, resolver, anyone] = await ethers.getSigners();

    // Deploy Mock ERC20 tokens
    MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("TokenA", "TKA", ethers.utils.parseUnits("10000", 18)); // Source chain token
    await tokenA.deployed();
    tokenB = await MockERC20.deploy("TokenB", "TKB", ethers.utils.parseUnits("10000", 18)); // Destination chain token
    await tokenB.deployed();

    // Distribute tokens to maker and resolver
    await tokenA.transfer(maker.address, TOKEN_AMOUNT.mul(2)); // Maker gets TokenA
    await tokenB.transfer(resolver.address, TOKEN_AMOUNT.mul(2)); // Resolver gets TokenB

    // Deploy Escrow Contracts
    FusionEscrowSource = await ethers.getContractFactory("FusionEscrowSource");
    fusionEscrowSource = await FusionEscrowSource.deploy();
    await fusionEscrowSource.deployed();

    FusionEscrowDestination = await ethers.getContractFactory("FusionEscrowDestination");
    fusionEscrowDestination = await FusionEscrowDestination.deploy();
    await fusionEscrowDestination.deployed();

    // Approve tokens for escrow contracts
    await tokenA.connect(maker).approve(fusionEscrowSource.address, TOKEN_AMOUNT);
    await tokenB.connect(resolver).approve(fusionEscrowDestination.address, TOKEN_AMOUNT);
  });

  describe("FusionEscrowSource Workflow", function () {
    it("Should allow maker to create an order", async function () {
      const initialMakerBalance = await tokenA.balanceOf(maker.address);
      const initialContractBalance = await tokenA.balanceOf(fusionEscrowSource.address);
      const initialMakerEthBalance = await ethers.provider.getBalance(maker.address);

      const tx = await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID,
        resolver.address,
        tokenA.address,
        TOKEN_AMOUNT,
        HASH_SECRET,
        TIMEOUT_DURATION_SOURCE,
        { value: SAFETY_DEPOSIT_ETH }
      );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);


      const order = await fusionEscrowSource.orders(ORDER_ID);
      expect(order.maker).to.equal(maker.address);
      expect(order.resolver).to.equal(resolver.address);
      expect(order.token).to.equal(tokenA.address);
      expect(order.amount).to.equal(TOKEN_AMOUNT);
      expect(order.safetyDeposit).to.equal(SAFETY_DEPOSIT_ETH);
      expect(order.hashSecret).to.equal(HASH_SECRET);
      expect(order.withdrawn).to.be.false;
      expect(order.cancelled).to.be.false;

      expect(await tokenA.balanceOf(maker.address)).to.equal(initialMakerBalance.sub(TOKEN_AMOUNT));
      expect(await tokenA.balanceOf(fusionEscrowSource.address)).to.equal(initialContractBalance.add(TOKEN_AMOUNT));
      expect(await ethers.provider.getBalance(fusionEscrowSource.address)).to.equal(SAFETY_DEPOSIT_ETH);
      expect(await ethers.provider.getBalance(maker.address)).to.equal(initialMakerEthBalance.sub(SAFETY_DEPOSIT_ETH).sub(gasUsed));

      await expect(tx)
        .to.emit(fusionEscrowSource, "OrderCreated")
        .withArgs(ORDER_ID, maker.address, resolver.address, tokenA.address, TOKEN_AMOUNT, SAFETY_DEPOSIT_ETH, HASH_SECRET, order.timeoutTimestamp);
    });

    it("Should allow resolver to withdraw if secret is correct and not expired", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );

      const initialResolverBalance = await tokenA.balanceOf(resolver.address);
      const initialResolverEthBalance = await ethers.provider.getBalance(resolver.address);

      const tx = await fusionEscrowSource.connect(resolver).withdraw(ORDER_ID, SECRET);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const order = await fusionEscrowSource.orders(ORDER_ID);
      expect(order.withdrawn).to.be.true;

      expect(await tokenA.balanceOf(resolver.address)).to.equal(initialResolverBalance.add(TOKEN_AMOUNT));
      expect(await ethers.provider.getBalance(resolver.address)).to.equal(initialResolverEthBalance.add(SAFETY_DEPOSIT_ETH).sub(gasUsed));
      expect(await tokenA.balanceOf(fusionEscrowSource.address)).to.equal(0);
      expect(await ethers.provider.getBalance(fusionEscrowSource.address)).to.equal(0);

      await expect(tx)
        .to.emit(fusionEscrowSource, "OrderWithdrawn")
        .withArgs(ORDER_ID, resolver.address, SECRET);
    });

    it("Should prevent resolver from withdrawing with invalid secret", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );
      const INVALID_SECRET = ethers.utils.formatBytes32String("wrongsecret");
      await expect(fusionEscrowSource.connect(resolver).withdraw(ORDER_ID, INVALID_SECRET))
        .to.be.revertedWithCustomError(fusionEscrowSource, "InvalidSecret");
    });
    
    it("Should prevent resolver from withdrawing if order expired", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );
      await time.increase(TIMEOUT_DURATION_SOURCE + 1); // Increase time beyond timeout
      await expect(fusionEscrowSource.connect(resolver).withdraw(ORDER_ID, SECRET))
        .to.be.revertedWithCustomError(fusionEscrowSource, "OrderExpired");
    });

    it("Should allow anyone to cancel if order expired and not withdrawn", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );
      
      const initialMakerBalance = await tokenA.balanceOf(maker.address);
      const initialMakerEthBalance = await ethers.provider.getBalance(maker.address);

      await time.increase(TIMEOUT_DURATION_SOURCE + 1); // Increase time beyond timeout

      const tx = await fusionEscrowSource.connect(anyone).cancel(ORDER_ID);
      const receipt = await tx.wait();
      // Note: gas cost for `anyone` is not tracked here as it's less relevant for the test's core logic

      const order = await fusionEscrowSource.orders(ORDER_ID);
      expect(order.cancelled).to.be.true;

      expect(await tokenA.balanceOf(maker.address)).to.equal(initialMakerBalance.add(TOKEN_AMOUNT));
      expect(await ethers.provider.getBalance(maker.address)).to.equal(initialMakerEthBalance.add(SAFETY_DEPOSIT_ETH));
      expect(await tokenA.balanceOf(fusionEscrowSource.address)).to.equal(0);
      expect(await ethers.provider.getBalance(fusionEscrowSource.address)).to.equal(0);

      await expect(tx)
        .to.emit(fusionEscrowSource, "OrderCancelled")
        .withArgs(ORDER_ID, anyone.address);
    });

    it("Should prevent cancellation if order not expired", async function () {
       await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );
      await expect(fusionEscrowSource.connect(anyone).cancel(ORDER_ID))
        .to.be.revertedWithCustomError(fusionEscrowSource, "OrderNotExpired");
    });
  });


  describe("FusionEscrowDestination Workflow", function () {
    it("Should allow resolver to fill an order", async function () {
      const initialResolverBalance = await tokenB.balanceOf(resolver.address);
      const initialContractBalance = await tokenB.balanceOf(fusionEscrowDestination.address);
      const initialResolverEthBalance = await ethers.provider.getBalance(resolver.address);

      const tx = await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID,
        maker.address,
        tokenB.address,
        TOKEN_AMOUNT,
        HASH_SECRET,
        TIMEOUT_DURATION_DESTINATION,
        { value: SAFETY_DEPOSIT_ETH }
      );
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const order = await fusionEscrowDestination.orders(ORDER_ID);
      expect(order.maker).to.equal(maker.address);
      expect(order.resolver).to.equal(resolver.address);
      expect(order.token).to.equal(tokenB.address);
      expect(order.amount).to.equal(TOKEN_AMOUNT);
      expect(order.safetyDeposit).to.equal(SAFETY_DEPOSIT_ETH);
      expect(order.hashSecret).to.equal(HASH_SECRET);
      expect(order.makerWithdrawn).to.be.false;
      expect(order.cancelledByResolver).to.be.false;

      expect(await tokenB.balanceOf(resolver.address)).to.equal(initialResolverBalance.sub(TOKEN_AMOUNT));
      expect(await tokenB.balanceOf(fusionEscrowDestination.address)).to.equal(initialContractBalance.add(TOKEN_AMOUNT));
      expect(await ethers.provider.getBalance(fusionEscrowDestination.address)).to.equal(SAFETY_DEPOSIT_ETH);
      expect(await ethers.provider.getBalance(resolver.address)).to.equal(initialResolverEthBalance.sub(SAFETY_DEPOSIT_ETH).sub(gasUsed));
      
      await expect(tx)
        .to.emit(fusionEscrowDestination, "OrderFilled")
        .withArgs(ORDER_ID, maker.address, resolver.address, tokenB.address, TOKEN_AMOUNT, SAFETY_DEPOSIT_ETH, HASH_SECRET, order.timeoutTimestamp);
    });

    it("Should allow maker to withdraw from destination if secret is correct and not expired", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );

      const initialMakerTokenBalance = await tokenB.balanceOf(maker.address);
      const initialMakerEthBalance = await ethers.provider.getBalance(maker.address);

      const tx = await fusionEscrowDestination.connect(maker).makerWithdraw(ORDER_ID, SECRET);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const order = await fusionEscrowDestination.orders(ORDER_ID);
      expect(order.makerWithdrawn).to.be.true;

      expect(await tokenB.balanceOf(maker.address)).to.equal(initialMakerTokenBalance.add(TOKEN_AMOUNT));
      expect(await ethers.provider.getBalance(maker.address)).to.equal(initialMakerEthBalance.add(SAFETY_DEPOSIT_ETH).sub(gasUsed));
      expect(await tokenB.balanceOf(fusionEscrowDestination.address)).to.equal(0);
      expect(await ethers.provider.getBalance(fusionEscrowDestination.address)).to.equal(0);

      await expect(tx)
        .to.emit(fusionEscrowDestination, "MakerWithdrawn")
        .withArgs(ORDER_ID, maker.address, SECRET);
    });

    it("Should prevent maker from withdrawing with invalid secret from destination", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );
      const INVALID_SECRET = ethers.utils.formatBytes32String("wrongsecretagain");
      await expect(fusionEscrowDestination.connect(maker).makerWithdraw(ORDER_ID, INVALID_SECRET))
        .to.be.revertedWithCustomError(fusionEscrowDestination, "InvalidSecret");
    });

    it("Should prevent maker from withdrawing from destination if order expired", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );
      await time.increase(TIMEOUT_DURATION_DESTINATION + 1);
      await expect(fusionEscrowDestination.connect(maker).makerWithdraw(ORDER_ID, SECRET))
        .to.be.revertedWithCustomError(fusionEscrowDestination, "OrderExpired");
    });
    
    it("Should allow resolver to cancel from destination if order expired and not withdrawn by maker", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );

      const initialResolverTokenBalance = await tokenB.balanceOf(resolver.address);
      const initialResolverEthBalance = await ethers.provider.getBalance(resolver.address);
      
      await time.increase(TIMEOUT_DURATION_DESTINATION + 1);

      const tx = await fusionEscrowDestination.connect(resolver).cancelOrder(ORDER_ID);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

      const order = await fusionEscrowDestination.orders(ORDER_ID);
      expect(order.cancelledByResolver).to.be.true;

      expect(await tokenB.balanceOf(resolver.address)).to.equal(initialResolverTokenBalance.add(TOKEN_AMOUNT));
      expect(await ethers.provider.getBalance(resolver.address)).to.equal(initialResolverEthBalance.add(SAFETY_DEPOSIT_ETH).sub(gasUsed));
      expect(await tokenB.balanceOf(fusionEscrowDestination.address)).to.equal(0);
      expect(await ethers.provider.getBalance(fusionEscrowDestination.address)).to.equal(0);

      await expect(tx)
        .to.emit(fusionEscrowDestination, "OrderCancelledByResolver")
        .withArgs(ORDER_ID, resolver.address);
    });

    it("Should prevent resolver from cancelling from destination if order not expired", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.address, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );
      await expect(fusionEscrowDestination.connect(resolver).cancelOrder(ORDER_ID))
        .to.be.revertedWithCustomError(fusionEscrowDestination, "OrderNotExpired");
    });
  });

  // MockERC20 contract for testing purposes
  // This would typically be in a separate file like `contracts/test/MockERC20.sol`
  // For simplicity in this example, its factory is used directly.
  // If you don't have a MockERC20.sol, you can create one:
  /*
    // SPDX-License-Identifier: MIT
    pragma solidity ^0.8.0;

    import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

    contract MockERC20 is ERC20 {
        constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
            _mint(msg.sender, initialSupply);
        }

        function mint(address to, uint256 amount) public {
            _mint(to, amount);
        }
    }
  */
});

// Helper MockERC20 contract (simplified, place in contracts/test/MockERC20.sol or similar for better organization)
// For this test to run, you need a MockERC20.sol file in your contracts directory or a test subdirectory.
// Example MockERC20.sol:
/*
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol) {
        _mint(msg.sender, initialSupply); // Mints to deployer
    }

    // Allow anyone to mint for testing purposes
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }

    // Allow anyone to burn for testing purposes
    function burn(address account, uint256 amount) public {
        _burn(account, amount);
    }
}
*/
