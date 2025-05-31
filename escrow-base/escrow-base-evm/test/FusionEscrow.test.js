const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("FusionEscrow Contracts", function () {
  let FusionEscrowSource, fusionEscrowSource;
  let FusionEscrowDestination, fusionEscrowDestination;
  let MockERC20, tokenA, tokenB;
  let owner, maker, resolver, anyone;

  const toBytes32 = (str) => ethers.zeroPadBytes(ethers.toUtf8Bytes(str), 32);

  const ORDER_ID = toBytes32("testOrder123");
  const SECRET_PHRASE = "supersecretphrase";
  const SECRET = toBytes32(SECRET_PHRASE);
  const HASH_SECRET = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [SECRET]));
  const TOKEN_AMOUNT = ethers.parseUnits("100", 18);
  const SAFETY_DEPOSIT_ETH = ethers.parseEther("0.1");
  const TIMEOUT_DURATION_SOURCE = 24 * 60 * 60; // 24 hours (number)
  const TIMEOUT_DURATION_DESTINATION = 12 * 60 * 60; // 12 hours (number)

  beforeEach(async function () {
    [owner, maker, resolver, anyone] = await ethers.getSigners();

    MockERC20 = await ethers.getContractFactory("MockERC20");
    tokenA = await MockERC20.deploy("TokenA", "TKA", ethers.parseUnits("10000", 18));
    tokenB = await MockERC20.deploy("TokenB", "TKB", ethers.parseUnits("10000", 18));

    await tokenA.transfer(maker.address, TOKEN_AMOUNT * 2n);
    await tokenB.transfer(resolver.address, TOKEN_AMOUNT * 2n);

    FusionEscrowSource = await ethers.getContractFactory("FusionEscrowSource");
    fusionEscrowSource = await FusionEscrowSource.deploy();

    FusionEscrowDestination = await ethers.getContractFactory("FusionEscrowDestination");
    fusionEscrowDestination = await FusionEscrowDestination.deploy();

    await tokenA.connect(maker).approve(fusionEscrowSource.target, TOKEN_AMOUNT);
    await tokenB.connect(resolver).approve(fusionEscrowDestination.target, TOKEN_AMOUNT);
  });

  describe("FusionEscrowSource Workflow", function () {
    it("Should allow maker to create an order", async function () {
      const initialMakerBalance = await tokenA.balanceOf(maker.address);
      const initialContractBalance = await tokenA.balanceOf(fusionEscrowSource.target);
      const initialMakerEthBalance = await ethers.provider.getBalance(maker.address);

      const tx = await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID,
        resolver.address,
        tokenA.target,
        TOKEN_AMOUNT,
        HASH_SECRET,
        TIMEOUT_DURATION_SOURCE, // This is a number, passed to contract which expects uint
        { value: SAFETY_DEPOSIT_ETH }
      );
      const receipt = await tx.wait();
      const effectiveGasPriceToUse = receipt.effectiveGasPrice ?? 0n; // MODIFIED
      const gasUsed = receipt.gasUsed * effectiveGasPriceToUse;       // MODIFIED

      const order = await fusionEscrowSource.orders(ORDER_ID);
      expect(order.maker).to.equal(maker.address);
      expect(order.resolver).to.equal(resolver.address);
      expect(order.token).to.equal(tokenA.target);
      expect(order.amount).to.equal(TOKEN_AMOUNT);
      expect(order.safetyDeposit).to.equal(SAFETY_DEPOSIT_ETH);
      expect(order.hashSecret).to.equal(HASH_SECRET);
      expect(order.withdrawn).to.be.false;
      expect(order.cancelled).to.be.false;

      expect(await tokenA.balanceOf(maker.address)).to.equal(initialMakerBalance - TOKEN_AMOUNT);
      expect(await tokenA.balanceOf(fusionEscrowSource.target)).to.equal(initialContractBalance + TOKEN_AMOUNT);
      expect(await ethers.provider.getBalance(fusionEscrowSource.target)).to.equal(SAFETY_DEPOSIT_ETH);
      expect(await ethers.provider.getBalance(maker.address)).to.equal(initialMakerEthBalance - SAFETY_DEPOSIT_ETH - gasUsed);

      await expect(tx)
        .to.emit(fusionEscrowSource, "OrderCreated")
        .withArgs(ORDER_ID, maker.address, resolver.address, tokenA.target, TOKEN_AMOUNT, SAFETY_DEPOSIT_ETH, HASH_SECRET, order.timeoutTimestamp);
    });

    it("Should allow resolver to withdraw if secret is correct and not expired", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );

      const initialResolverBalance = await tokenA.balanceOf(resolver.address);
      const initialResolverEthBalance = await ethers.provider.getBalance(resolver.address);

      const tx = await fusionEscrowSource.connect(resolver).withdraw(ORDER_ID, SECRET);
      const receipt = await tx.wait();
      const effectiveGasPriceToUse = receipt.effectiveGasPrice ?? 0n; // MODIFIED
      const gasUsed = receipt.gasUsed * effectiveGasPriceToUse;       // MODIFIED

      const order = await fusionEscrowSource.orders(ORDER_ID);
      expect(order.withdrawn).to.be.true;

      expect(await tokenA.balanceOf(resolver.address)).to.equal(initialResolverBalance + TOKEN_AMOUNT);
      expect(await ethers.provider.getBalance(resolver.address)).to.equal(initialResolverEthBalance + SAFETY_DEPOSIT_ETH - gasUsed);
      expect(await tokenA.balanceOf(fusionEscrowSource.target)).to.equal(0n);
      expect(await ethers.provider.getBalance(fusionEscrowSource.target)).to.equal(0n);

      await expect(tx)
        .to.emit(fusionEscrowSource, "OrderWithdrawn")
        .withArgs(ORDER_ID, resolver.address, SECRET);
    });

    it("Should prevent resolver from withdrawing with invalid secret", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );
      const INVALID_SECRET = toBytes32("wrongsecret");
      await expect(fusionEscrowSource.connect(resolver).withdraw(ORDER_ID, INVALID_SECRET))
        .to.be.revertedWithCustomError(fusionEscrowSource, "InvalidSecret");
    });

    it("Should prevent resolver from withdrawing if order expired", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );
      await time.increase(TIMEOUT_DURATION_SOURCE + 1); // TIMEOUT_DURATION_SOURCE is a number
      await expect(fusionEscrowSource.connect(resolver).withdraw(ORDER_ID, SECRET))
        .to.be.revertedWithCustomError(fusionEscrowSource, "OrderExpired");
    });

    it("Should allow anyone to cancel if order expired and not withdrawn", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );

      const initialMakerBalance = await tokenA.balanceOf(maker.address);
      const initialMakerEthBalance = await ethers.provider.getBalance(maker.address);

      await time.increase(TIMEOUT_DURATION_SOURCE + 1); // TIMEOUT_DURATION_SOURCE is a number

      const tx = await fusionEscrowSource.connect(anyone).cancel(ORDER_ID);
      await tx.wait();

      const order = await fusionEscrowSource.orders(ORDER_ID);
      expect(order.cancelled).to.be.true;

      expect(await tokenA.balanceOf(maker.address)).to.equal(initialMakerBalance + TOKEN_AMOUNT);
      expect(await ethers.provider.getBalance(maker.address)).to.equal(initialMakerEthBalance + SAFETY_DEPOSIT_ETH);
      expect(await tokenA.balanceOf(fusionEscrowSource.target)).to.equal(0n);
      expect(await ethers.provider.getBalance(fusionEscrowSource.target)).to.equal(0n);

      await expect(tx)
        .to.emit(fusionEscrowSource, "OrderCancelled")
        .withArgs(ORDER_ID, anyone.address);
    });

    it("Should prevent cancellation if order not expired", async function () {
      await fusionEscrowSource.connect(maker).createOrder(
        ORDER_ID, resolver.address, tokenA.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_SOURCE, { value: SAFETY_DEPOSIT_ETH }
      );
      await expect(fusionEscrowSource.connect(anyone).cancel(ORDER_ID))
        .to.be.revertedWithCustomError(fusionEscrowSource, "OrderNotExpired");
    });
  });

  describe("FusionEscrowDestination Workflow", function () {
    it("Should allow resolver to fill an order", async function () {
      const initialResolverBalance = await tokenB.balanceOf(resolver.address);
      const initialContractBalance = await tokenB.balanceOf(fusionEscrowDestination.target);
      const initialResolverEthBalance = await ethers.provider.getBalance(resolver.address);

      const tx = await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID,
        maker.address,
        tokenB.target,
        TOKEN_AMOUNT,
        HASH_SECRET,
        TIMEOUT_DURATION_DESTINATION, // This is a number
        { value: SAFETY_DEPOSIT_ETH }
      );
      const receipt = await tx.wait();
      const effectiveGasPriceToUse = receipt.effectiveGasPrice ?? 0n; // MODIFIED
      const gasUsed = receipt.gasUsed * effectiveGasPriceToUse;       // MODIFIED

      const order = await fusionEscrowDestination.orders(ORDER_ID);
      expect(order.maker).to.equal(maker.address);
      expect(order.resolver).to.equal(resolver.address);
      expect(order.token).to.equal(tokenB.target);
      expect(order.amount).to.equal(TOKEN_AMOUNT);
      expect(order.safetyDeposit).to.equal(SAFETY_DEPOSIT_ETH);
      expect(order.hashSecret).to.equal(HASH_SECRET);
      expect(order.makerWithdrawn).to.be.false;
      expect(order.cancelledByResolver).to.be.false;

      expect(await tokenB.balanceOf(resolver.address)).to.equal(initialResolverBalance - TOKEN_AMOUNT);
      expect(await tokenB.balanceOf(fusionEscrowDestination.target)).to.equal(initialContractBalance + TOKEN_AMOUNT);
      expect(await ethers.provider.getBalance(fusionEscrowDestination.target)).to.equal(SAFETY_DEPOSIT_ETH);
      expect(await ethers.provider.getBalance(resolver.address)).to.equal(initialResolverEthBalance - SAFETY_DEPOSIT_ETH - gasUsed);

      await expect(tx)
        .to.emit(fusionEscrowDestination, "OrderFilled")
        .withArgs(ORDER_ID, maker.address, resolver.address, tokenB.target, TOKEN_AMOUNT, SAFETY_DEPOSIT_ETH, HASH_SECRET, order.timeoutTimestamp);
    });

    it("Should allow maker to withdraw from destination if secret is correct and not expired", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );

      const initialMakerTokenBalance = await tokenB.balanceOf(maker.address);
      const initialMakerEthBalance = await ethers.provider.getBalance(maker.address);

      const tx = await fusionEscrowDestination.connect(maker).makerWithdraw(ORDER_ID, SECRET);
      const receipt = await tx.wait();
      const effectiveGasPriceToUse = receipt.effectiveGasPrice ?? 0n; // MODIFIED
      const gasUsed = receipt.gasUsed * effectiveGasPriceToUse;       // MODIFIED

      const order = await fusionEscrowDestination.orders(ORDER_ID);
      expect(order.makerWithdrawn).to.be.true;

      expect(await tokenB.balanceOf(maker.address)).to.equal(initialMakerTokenBalance + TOKEN_AMOUNT);
      expect(await ethers.provider.getBalance(maker.address)).to.equal(initialMakerEthBalance + SAFETY_DEPOSIT_ETH - gasUsed);
      expect(await tokenB.balanceOf(fusionEscrowDestination.target)).to.equal(0n);
      expect(await ethers.provider.getBalance(fusionEscrowDestination.target)).to.equal(0n);

      await expect(tx)
        .to.emit(fusionEscrowDestination, "MakerWithdrawn")
        .withArgs(ORDER_ID, maker.address, SECRET);
    });

    it("Should prevent maker from withdrawing with invalid secret from destination", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );
      const INVALID_SECRET = toBytes32("wrongsecretagain");
      await expect(fusionEscrowDestination.connect(maker).makerWithdraw(ORDER_ID, INVALID_SECRET))
        .to.be.revertedWithCustomError(fusionEscrowDestination, "InvalidSecret");
    });

    it("Should prevent maker from withdrawing from destination if order expired", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );
      await time.increase(TIMEOUT_DURATION_DESTINATION + 1); // TIMEOUT_DURATION_DESTINATION is a number
      await expect(fusionEscrowDestination.connect(maker).makerWithdraw(ORDER_ID, SECRET))
        .to.be.revertedWithCustomError(fusionEscrowDestination, "OrderExpired");
    });

    it("Should allow resolver to cancel from destination if order expired and not withdrawn by maker", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );

      const initialResolverTokenBalance = await tokenB.balanceOf(resolver.address);
      const initialResolverEthBalance = await ethers.provider.getBalance(resolver.address);

      await time.increase(TIMEOUT_DURATION_DESTINATION + 1); // TIMEOUT_DURATION_DESTINATION is a number

      const tx = await fusionEscrowDestination.connect(resolver).cancelOrder(ORDER_ID);
      const receipt = await tx.wait();
      const effectiveGasPriceToUse = receipt.effectiveGasPrice ?? 0n; // MODIFIED
      const gasUsed = receipt.gasUsed * effectiveGasPriceToUse;       // MODIFIED

      const order = await fusionEscrowDestination.orders(ORDER_ID);
      expect(order.cancelledByResolver).to.be.true;

      expect(await tokenB.balanceOf(resolver.address)).to.equal(initialResolverTokenBalance + TOKEN_AMOUNT);
      expect(await ethers.provider.getBalance(resolver.address)).to.equal(initialResolverEthBalance + SAFETY_DEPOSIT_ETH - gasUsed);
      expect(await tokenB.balanceOf(fusionEscrowDestination.target)).to.equal(0n);
      expect(await ethers.provider.getBalance(fusionEscrowDestination.target)).to.equal(0n);

      await expect(tx)
        .to.emit(fusionEscrowDestination, "OrderCancelledByResolver")
        .withArgs(ORDER_ID, resolver.address);
    });

    it("Should prevent resolver from cancelling from destination if order not expired", async function () {
      await fusionEscrowDestination.connect(resolver).fillOrder(
        ORDER_ID, maker.address, tokenB.target, TOKEN_AMOUNT, HASH_SECRET, TIMEOUT_DURATION_DESTINATION, { value: SAFETY_DEPOSIT_ETH }
      );
      await expect(fusionEscrowDestination.connect(resolver).cancelOrder(ORDER_ID))
        .to.be.revertedWithCustomError(fusionEscrowDestination, "OrderNotExpired");
    });
  });
});