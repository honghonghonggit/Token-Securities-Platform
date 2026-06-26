import { ethers, network } from "hardhat";

/**
 * 배포 순서: InvestorRegistry → SecurityToken(레지스트리 주소 주입).
 * 데모 편의를 위해 배포자(발행자)를 화이트리스트에 등록한다.
 *
 * 사용: npx hardhat run scripts/deploy.ts --network sepolia
 * (.env 의 SEPOLIA_RPC_URL / PRIVATE_KEY 필요)
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`네트워크: ${network.name}`);
  console.log(`배포자: ${deployer.address}`);

  // 1) 컴플라이언스 레지스트리
  const Registry = await ethers.getContractFactory("InvestorRegistry");
  const registry = await Registry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log(`InvestorRegistry 배포됨: ${registryAddress}`);

  // 2) 토큰증권 (레지스트리 주소 주입)
  const Token = await ethers.getContractFactory("SecurityToken");
  const token = await Token.deploy("Demo Security Token", "DST", registryAddress);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`SecurityToken 배포됨: ${tokenAddress}`);

  // 3) 데모: 배포자를 적격 투자자로 등록
  const tx = await registry.addInvestor(deployer.address);
  await tx.wait();
  console.log(`배포자를 화이트리스트에 등록: ${deployer.address}`);

  console.log("\n=== 배포 요약 ===");
  console.log(`InvestorRegistry: ${registryAddress}`);
  console.log(`SecurityToken:    ${tokenAddress}`);
  console.log(
    `\nEtherscan 검증(선택):\n` +
      `  npx hardhat verify --network ${network.name} ${registryAddress}\n` +
      `  npx hardhat verify --network ${network.name} ${tokenAddress} "Demo Security Token" "DST" ${registryAddress}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
