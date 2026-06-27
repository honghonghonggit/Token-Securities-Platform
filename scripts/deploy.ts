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

  // 3) 데모: 컴플라이언스 규칙 셋업 (등급별 보유상한 + 전매제한 기간)
  //    Grade enum: NONE=0, RETAIL=1, PROFESSIONAL=2, INSTITUTIONAL=3
  const DAY = 24 * 60 * 60;
  await (await registry.setGradeLimit(1, 1000)).wait(); // RETAIL: 1,000
  await (await registry.setGradeLimit(2, 10000)).wait(); // PROFESSIONAL: 10,000
  // INSTITUTIONAL(3)은 상한 미설정 = 무제한
  await (await registry.setLockupPeriod(30 * DAY)).wait(); // 전매제한 30일
  console.log("규칙 설정: RETAIL≤1000, PROFESSIONAL≤10000, INSTITUTIONAL=무제한, lock-up=30일");

  // 배포자를 INSTITUTIONAL(무제한·데모 발행이 한도에 걸리지 않도록)로 등록
  await (await registry["addInvestor(address,uint8)"](deployer.address, 3)).wait();
  console.log(`배포자를 INSTITUTIONAL 등급으로 등록: ${deployer.address}`);

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
