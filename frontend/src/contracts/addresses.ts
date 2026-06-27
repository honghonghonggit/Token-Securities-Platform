// 배포 주소/체인 ID는 Vite 환경변수에서 읽는다.
// 로컬 데모: `npx hardhat run scripts/deploy.ts --network localhost` 가 frontend/.env.local 을 생성한다.

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID ?? "31337");
export const REGISTRY_ADDRESS = (import.meta.env.VITE_REGISTRY_ADDRESS ?? "").trim();
export const TOKEN_ADDRESS = (import.meta.env.VITE_TOKEN_ADDRESS ?? "").trim();

/** 주소가 주입되어 컨트랙트와 통신할 준비가 됐는지. */
export const isConfigured = (): boolean =>
  REGISTRY_ADDRESS.length > 0 && TOKEN_ADDRESS.length > 0;
