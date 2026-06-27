import { useCallback, useEffect, useState } from "react";
import type { WalletState } from "../lib/useWallet";
import { getRegistry, getToken } from "../lib/contracts";
import { runTx } from "../lib/runTx";
import { capLabel, gradeLabel, lockupLabel } from "../lib/format";
import type { TxStatus } from "./TxResult";

interface Props {
  wallet: WalletState;
  setStatus: (s: TxStatus) => void;
  reloadNonce: number;
  onChanged: () => void;
}

interface Holdings {
  balance: bigint;
  grade: number;
  cap: bigint;
  lockedUntil: bigint;
}

export function InvestorPanel({ wallet, setStatus, reloadNonce, onChanged }: Props) {
  const { signer, provider, account } = wallet;
  const [h, setH] = useState<Holdings | null>(null);
  const [toAddr, setToAddr] = useState("");
  const [amount, setAmount] = useState("100");

  const load = useCallback(async () => {
    if (!provider || !account) return;
    try {
      const token = getToken(provider);
      const registry = getRegistry(provider);
      const [balance, grade, cap, lockedUntil] = await Promise.all([
        token.balanceOf(account) as Promise<bigint>,
        registry.gradeOf(account) as Promise<bigint>,
        registry.maxBalanceOf(account) as Promise<bigint>,
        token.lockedUntil(account) as Promise<bigint>,
      ]);
      setH({ balance, grade: Number(grade), cap, lockedUntil });
    } catch {
      setH(null);
    }
  }, [provider, account]);

  useEffect(() => {
    load();
  }, [load, reloadNonce]);

  const disabled = !signer || !wallet.onRightChain;

  return (
    <section className="card">
      <h2>투자자 패널</h2>
      {h ? (
        <ul className="holdings">
          <li>
            <span>보유 잔액</span>
            <strong>{h.balance.toString()}</strong>
          </li>
          <li>
            <span>등급</span>
            <strong>{gradeLabel(h.grade)}</strong>
          </li>
          <li>
            <span>보유상한</span>
            <strong>{capLabel(h.cap)}</strong>
          </li>
          <li>
            <span>전매제한</span>
            <strong>{lockupLabel(h.lockedUntil)}</strong>
          </li>
        </ul>
      ) : (
        <p className="hint">계정 정보를 불러오는 중이거나 등록되지 않은 계정입니다.</p>
      )}

      <div className="form-row">
        <h3>전송 (transfer)</h3>
        <input placeholder="수신자 주소 0x…" value={toAddr} onChange={(e) => setToAddr(e.target.value)} />
        <input
          type="number"
          placeholder="수량"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button
          className="btn btn--primary"
          disabled={disabled}
          onClick={() =>
            runTx(
              "전송",
              setStatus,
              () => getToken(signer!).transfer(toAddr, BigInt(amount || "0")),
              {
                // 전송 전에 시뮬레이션 → 컴플라이언스 위반이면 사유를 즉시 표시
                preflight: () => getToken(signer!).transfer.staticCall(toAddr, BigInt(amount || "0")),
                onDone: () => {
                  load();
                  onChanged();
                },
              }
            )
          }
        >
          전송
        </button>
        <button className="btn" onClick={load}>
          새로고침
        </button>
      </div>
    </section>
  );
}
