import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

const NAME = "Demo Security Token";
const SYMBOL = "DST";

describe("SecurityToken", () => {
  async function deployFixture() {
    const [issuer, alice, bob, mallory] = await ethers.getSigners();

    const Registry = await ethers.getContractFactory("InvestorRegistry");
    const registry = await Registry.deploy();

    const Token = await ethers.getContractFactory("SecurityToken");
    const token = await Token.deploy(NAME, SYMBOL, await registry.getAddress());

    // alice, bob 은 적격 투자자, mallory 는 미등록.
    await registry.batchAddInvestors([alice.address, bob.address]);

    return { registry, token, issuer, alice, bob, mallory };
  }

  describe("배포", () => {
    it("name/symbol/compliance 주소/owner가 올바르다", async () => {
      const { token, registry, issuer } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal(NAME);
      expect(await token.symbol()).to.equal(SYMBOL);
      expect(await token.compliance()).to.equal(await registry.getAddress());
      expect(await token.owner()).to.equal(issuer.address);
    });

    it("레지스트리 주소가 0이면 배포가 revert된다", async () => {
      const Token = await ethers.getContractFactory("SecurityToken");
      await expect(
        Token.deploy(NAME, SYMBOL, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(Token, "ZeroComplianceAddress");
    });
  });

  describe("발행(mint)", () => {
    it("적격 투자자에게 발행하면 잔액이 늘고 Transfer 이벤트가 발생한다", async () => {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.mint(alice.address, 1000))
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, alice.address, 1000);
      expect(await token.balanceOf(alice.address)).to.equal(1000);
    });

    it("미등록 주소에게 발행하면 NotVerified로 revert된다", async () => {
      const { token, mallory } = await loadFixture(deployFixture);
      await expect(token.mint(mallory.address, 1000))
        .to.be.revertedWithCustomError(token, "NotVerified")
        .withArgs(mallory.address);
    });

    it("비-owner의 발행은 revert된다", async () => {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await expect(
        token.connect(alice).mint(bob.address, 1000)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("전송(transfer) — 컴플라이언스 강제", () => {
    it("적격→적격 전송은 성공한다", async () => {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await token.mint(alice.address, 1000);
      await expect(token.connect(alice).transfer(bob.address, 400)).to.changeTokenBalances(
        token,
        [alice, bob],
        [-400, 400]
      );
    });

    it("적격→미등록 전송은 TransferNotCompliant로 revert된다", async () => {
      const { token, alice, mallory } = await loadFixture(deployFixture);
      await token.mint(alice.address, 1000);
      await expect(token.connect(alice).transfer(mallory.address, 100))
        .to.be.revertedWithCustomError(token, "TransferNotCompliant")
        .withArgs(alice.address, mallory.address);
    });

    it("보유자를 화이트리스트에서 제거하면(미등록→적격) 전송이 거부된다", async () => {
      const { token, registry, alice, bob } = await loadFixture(deployFixture);
      await token.mint(alice.address, 1000);
      await registry.removeInvestor(alice.address);
      await expect(token.connect(alice).transfer(bob.address, 100))
        .to.be.revertedWithCustomError(token, "TransferNotCompliant")
        .withArgs(alice.address, bob.address);
    });
  });

  describe("소각(burn) — 컴플라이언스 예외", () => {
    it("적격 보유자가 자신의 토큰을 소각할 수 있다", async () => {
      const { token, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, 1000);
      await expect(token.connect(alice).burn(400)).to.changeTokenBalance(token, alice, -400);
    });

    it("화이트리스트에서 제거된 보유자도 소각은 가능하다", async () => {
      const { token, registry, alice } = await loadFixture(deployFixture);
      await token.mint(alice.address, 1000);
      await registry.removeInvestor(alice.address);
      await expect(token.connect(alice).burn(400)).to.changeTokenBalance(token, alice, -400);
    });
  });
});
