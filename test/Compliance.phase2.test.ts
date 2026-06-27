import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

// InvestorRegistry.Grade enum 값 (Solidity enum 순서와 일치)
const Grade = { NONE: 0, RETAIL: 1, PROFESSIONAL: 2, INSTITUTIONAL: 3 } as const;

const NAME = "Demo Security Token";
const SYMBOL = "DST";
const DAY = 24 * 60 * 60;

describe("Phase 2 — 투자한도 + 전매제한(lock-up)", () => {
  async function deployFixture() {
    const [issuer, alice, bob, carol] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("InvestorRegistry");
    const registry = await Registry.deploy();

    const Token = await ethers.getContractFactory("SecurityToken");
    const token = await Token.deploy(NAME, SYMBOL, await registry.getAddress());

    return { registry, token, issuer, alice, bob, carol };
  }

  describe("등급 / 레지스트리 규칙", () => {
    it("등급 지정 등록 후 gradeOf가 반영된다", async () => {
      const { registry, alice } = await loadFixture(deployFixture);
      await expect(registry["addInvestor(address,uint8)"](alice.address, Grade.PROFESSIONAL))
        .to.emit(registry, "GradeSet")
        .withArgs(alice.address, Grade.PROFESSIONAL);
      expect(await registry.gradeOf(alice.address)).to.equal(Grade.PROFESSIONAL);
      expect(await registry.isVerified(alice.address)).to.equal(true);
    });

    it("NONE 등급으로 addInvestor하면 InvalidGrade로 revert된다", async () => {
      const { registry, alice } = await loadFixture(deployFixture);
      await expect(
        registry["addInvestor(address,uint8)"](alice.address, Grade.NONE)
      ).to.be.revertedWithCustomError(registry, "InvalidGrade");
    });

    it("setGradeLimit 후 maxBalanceOf가 등급 상한을 반환한다", async () => {
      const { registry, alice } = await loadFixture(deployFixture);
      await registry["addInvestor(address,uint8)"](alice.address, Grade.RETAIL);
      await expect(registry.setGradeLimit(Grade.RETAIL, 1000))
        .to.emit(registry, "GradeLimitSet")
        .withArgs(Grade.RETAIL, 1000);
      expect(await registry.maxBalanceOf(alice.address)).to.equal(1000);
    });

    it("setLockupPeriod가 lockupPeriod에 반영된다", async () => {
      const { registry } = await loadFixture(deployFixture);
      await expect(registry.setLockupPeriod(30 * DAY))
        .to.emit(registry, "LockupPeriodSet")
        .withArgs(30 * DAY);
      expect(await registry.lockupPeriod()).to.equal(30 * DAY);
    });

    it("비-owner는 규칙 setter를 호출할 수 없다", async () => {
      const { registry, alice } = await loadFixture(deployFixture);
      await expect(
        registry.connect(alice).setGradeLimit(Grade.RETAIL, 1000)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
      await expect(
        registry.connect(alice).setLockupPeriod(DAY)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("투자한도 (등급별 보유상한)", () => {
    async function limitFixture() {
      const base = await deployFixture();
      const { registry, alice, bob, carol } = base;
      await registry["addInvestor(address,uint8)"](alice.address, Grade.RETAIL);
      await registry["addInvestor(address,uint8)"](bob.address, Grade.RETAIL);
      await registry["addInvestor(address,uint8)"](carol.address, Grade.INSTITUTIONAL);
      await registry.setGradeLimit(Grade.RETAIL, 1000);
      // INSTITUTIONAL 은 상한 미설정(0 = 무제한)
      return base;
    }

    it("상한 이내 발행은 성공한다", async () => {
      const { token, alice } = await loadFixture(limitFixture);
      await token.mint(alice.address, 1000);
      expect(await token.balanceOf(alice.address)).to.equal(1000);
    });

    it("상한 초과 발행은 ExceedsHoldingLimit로 revert된다", async () => {
      const { token, alice } = await loadFixture(limitFixture);
      await expect(token.mint(alice.address, 1001))
        .to.be.revertedWithCustomError(token, "ExceedsHoldingLimit")
        .withArgs(alice.address, 1001, 1000);
    });

    it("전송으로 수신자 잔액이 상한을 넘으면 revert된다", async () => {
      const { token, alice, bob } = await loadFixture(limitFixture);
      await token.mint(alice.address, 1000);
      await token.mint(bob.address, 800);
      // bob(800) + 300 = 1100 > 1000
      await expect(token.connect(alice).transfer(bob.address, 300))
        .to.be.revertedWithCustomError(token, "ExceedsHoldingLimit")
        .withArgs(bob.address, 1100, 1000);
    });

    it("INSTITUTIONAL(상한 0=무제한)은 대량 보유가 가능하다", async () => {
      const { token, carol } = await loadFixture(limitFixture);
      await token.mint(carol.address, 1_000_000);
      expect(await token.balanceOf(carol.address)).to.equal(1_000_000);
    });
  });

  describe("전매제한 (lock-up)", () => {
    async function lockFixture() {
      const base = await deployFixture();
      const { registry, alice, bob } = base;
      await registry["addInvestor(address,uint8)"](alice.address, Grade.INSTITUTIONAL);
      await registry["addInvestor(address,uint8)"](bob.address, Grade.INSTITUTIONAL);
      await registry.setLockupPeriod(30 * DAY);
      return base;
    }

    it("발행 시 lockedUntil이 발행시점 + 기간으로 설정된다", async () => {
      const { token, alice } = await loadFixture(lockFixture);
      const tx = await token.mint(alice.address, 1000);
      const block = await ethers.provider.getBlock(tx.blockNumber!);
      expect(await token.lockedUntil(alice.address)).to.equal(block!.timestamp + 30 * DAY);
    });

    it("잠금 기간 내 전송은 LockupActive로 revert된다", async () => {
      const { token, alice, bob } = await loadFixture(lockFixture);
      await token.mint(alice.address, 1000);
      const until = await token.lockedUntil(alice.address);
      await expect(token.connect(alice).transfer(bob.address, 100))
        .to.be.revertedWithCustomError(token, "LockupActive")
        .withArgs(alice.address, until);
    });

    it("잠금 해제 후 전송은 성공한다", async () => {
      const { token, alice, bob } = await loadFixture(lockFixture);
      await token.mint(alice.address, 1000);
      await time.increase(30 * DAY);
      await expect(token.connect(alice).transfer(bob.address, 100)).to.changeTokenBalances(
        token,
        [alice, bob],
        [-100, 100]
      );
    });

    it("잠금은 투자자별로 독립적이다", async () => {
      const { token, registry, alice, bob } = await loadFixture(lockFixture);
      await token.mint(alice.address, 1000);
      await time.increase(20 * DAY);
      // bob 은 20일 뒤에 발행 → bob 의 잠금은 alice 보다 늦게 풀린다.
      await token.mint(bob.address, 1000);
      await time.increase(11 * DAY); // alice: 31일 경과(해제), bob: 11일 경과(잠김)

      // alice → carol 가능하도록 carol 등록
      await registry["addInvestor(address,uint8)"](
        (await ethers.getSigners())[3].address,
        Grade.INSTITUTIONAL
      );
      await expect(token.connect(alice).transfer(bob.address, 50)).to.not.be.reverted;
      await expect(
        token.connect(bob).transfer(alice.address, 50)
      ).to.be.revertedWithCustomError(token, "LockupActive");
    });

    it("추가 발행 시 더 늦은 해제시각으로 갱신된다", async () => {
      const { token, alice } = await loadFixture(lockFixture);
      await token.mint(alice.address, 100);
      const first = await token.lockedUntil(alice.address);
      await time.increase(10 * DAY);
      await token.mint(alice.address, 100);
      expect(await token.lockedUntil(alice.address)).to.be.greaterThan(first);
    });
  });
});
