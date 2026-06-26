import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("InvestorRegistry", () => {
  async function deployFixture() {
    const [owner, alice, bob, carol] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("InvestorRegistry");
    const registry = await Registry.deploy();
    return { registry, owner, alice, bob, carol };
  }

  it("배포자가 owner가 된다", async () => {
    const { registry, owner } = await loadFixture(deployFixture);
    expect(await registry.owner()).to.equal(owner.address);
  });

  it("addInvestor 후 isVerified가 true이고 이벤트를 발생시킨다", async () => {
    const { registry, alice } = await loadFixture(deployFixture);
    await expect(registry.addInvestor(alice.address))
      .to.emit(registry, "InvestorAdded")
      .withArgs(alice.address);
    expect(await registry.isVerified(alice.address)).to.equal(true);
  });

  it("removeInvestor 후 isVerified가 false이고 이벤트를 발생시킨다", async () => {
    const { registry, alice } = await loadFixture(deployFixture);
    await registry.addInvestor(alice.address);
    await expect(registry.removeInvestor(alice.address))
      .to.emit(registry, "InvestorRemoved")
      .withArgs(alice.address);
    expect(await registry.isVerified(alice.address)).to.equal(false);
  });

  it("0 주소 등록은 ZeroAddress로 revert된다", async () => {
    const { registry } = await loadFixture(deployFixture);
    await expect(registry.addInvestor(ethers.ZeroAddress)).to.be.revertedWithCustomError(
      registry,
      "ZeroAddress"
    );
  });

  it("비-owner의 addInvestor는 revert된다", async () => {
    const { registry, alice, bob } = await loadFixture(deployFixture);
    await expect(
      registry.connect(alice).addInvestor(bob.address)
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });

  it("batchAddInvestors로 다건 등록한다", async () => {
    const { registry, alice, bob, carol } = await loadFixture(deployFixture);
    await registry.batchAddInvestors([alice.address, bob.address, carol.address]);
    expect(await registry.isVerified(alice.address)).to.equal(true);
    expect(await registry.isVerified(bob.address)).to.equal(true);
    expect(await registry.isVerified(carol.address)).to.equal(true);
  });

  describe("canTransfer", () => {
    it("from·to 모두 등록되면 true", async () => {
      const { registry, alice, bob } = await loadFixture(deployFixture);
      await registry.batchAddInvestors([alice.address, bob.address]);
      expect(await registry.canTransfer(alice.address, bob.address, 100)).to.equal(true);
    });

    it("한쪽이라도 미등록이면 false", async () => {
      const { registry, alice, bob } = await loadFixture(deployFixture);
      await registry.addInvestor(alice.address);
      expect(await registry.canTransfer(alice.address, bob.address, 100)).to.equal(false);
      expect(await registry.canTransfer(bob.address, alice.address, 100)).to.equal(false);
    });
  });
});
