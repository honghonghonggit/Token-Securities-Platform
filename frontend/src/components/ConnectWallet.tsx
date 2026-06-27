import type { WalletState } from "../lib/useWallet";
import { CHAIN_ID } from "../contracts/addresses";
import { shortAddress } from "../lib/format";

export function ConnectWallet({ wallet }: { wallet: WalletState }) {
  if (!wallet.hasMetaMask) {
    return (
      <div className="card card--warn">
        MetaMask가 필요합니다.{" "}
        <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">
          설치하기
        </a>
      </div>
    );
  }

  if (!wallet.account) {
    return (
      <div className="connect">
        <button className="btn btn--primary" onClick={wallet.connect} disabled={wallet.connecting}>
          {wallet.connecting ? "연결 중…" : "지갑 연결"}
        </button>
        {wallet.error && <span className="error-text">{wallet.error}</span>}
      </div>
    );
  }

  return (
    <div className="connect">
      <span className="badge">🔗 {shortAddress(wallet.account)}</span>
      {wallet.onRightChain ? (
        <span className="badge badge--ok">체인 {wallet.chainId}</span>
      ) : (
        <>
          <span className="badge badge--warn">잘못된 체인 {wallet.chainId ?? "?"}</span>
          <button className="btn" onClick={wallet.switchNetwork}>
            localhost({CHAIN_ID})로 전환
          </button>
        </>
      )}
    </div>
  );
}
