import { useState } from "react";
import { useWallet } from "./lib/useWallet";
import { isConfigured, REGISTRY_ADDRESS, TOKEN_ADDRESS } from "./contracts/addresses";
import { shortAddress } from "./lib/format";
import { ConnectWallet } from "./components/ConnectWallet";
import { IssuerPanel } from "./components/IssuerPanel";
import { InvestorPanel } from "./components/InvestorPanel";
import { TxResult, type TxStatus } from "./components/TxResult";

export default function App() {
  const wallet = useWallet();
  const [status, setStatus] = useState<TxStatus>({ kind: "idle" });
  const [reloadNonce, setReloadNonce] = useState(0);
  const onChanged = () => setReloadNonce((n) => n + 1);

  return (
    <div className="app">
      <div className="disclaimer">
        ⚠️ 테스트넷 기반 <strong>교육·포트폴리오 데모</strong>입니다. 실제 증권 발행·실거래·실자금과
        무관하며, 실제 STO는 자본시장법 등 규제 대상입니다.
      </div>

      <header className="header">
        <div>
          <h1>토큰증권 컴플라이언스 샌드박스</h1>
          <p className="subtitle">
            적격성·투자한도·전매제한을 스마트컨트랙트가 전송 시점에 강제합니다. 위반 트랜잭션은
            온체인에서 거부됩니다.
          </p>
        </div>
        <ConnectWallet wallet={wallet} />
      </header>

      {!isConfigured() ? (
        <div className="card card--warn">
          <h2>컨트랙트 주소가 설정되지 않았습니다</h2>
          <p>로컬 데모 실행 순서:</p>
          <ol>
            <li>
              <code>npx hardhat node</code> (프로젝트 루트, 별도 터미널)
            </li>
            <li>
              <code>npx hardhat run scripts/deploy.ts --network localhost</code> → <code>frontend/.env.local</code> 자동 생성
            </li>
            <li>
              <code>npm run dev</code> 재시작 후 MetaMask를 localhost:8545에 연결
            </li>
          </ol>
        </div>
      ) : (
        <>
          <div className="addresses">
            <span>Token: {shortAddress(TOKEN_ADDRESS)}</span>
            <span>Registry: {shortAddress(REGISTRY_ADDRESS)}</span>
          </div>

          <TxResult status={status} />

          {wallet.account ? (
            <div className="panels">
              <IssuerPanel wallet={wallet} setStatus={setStatus} onChanged={onChanged} />
              <InvestorPanel
                wallet={wallet}
                setStatus={setStatus}
                reloadNonce={reloadNonce}
                onChanged={onChanged}
              />
            </div>
          ) : (
            <div className="card">지갑을 연결하면 발행자·투자자 패널이 표시됩니다.</div>
          )}
        </>
      )}

      <footer className="footer">
        규칙은 InvestorRegistry(컴플라이언스 두뇌), 집행은 SecurityToken(_update 훅)이 담당 — 역할 분리
        설계.
      </footer>
    </div>
  );
}
