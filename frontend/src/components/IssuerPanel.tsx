import { useEffect, useState } from "react";
import type { WalletState } from "../lib/useWallet";
import { getRegistry, getToken } from "../lib/contracts";
import { runTx } from "../lib/runTx";
import { GRADE_OPTIONS, shortAddress } from "../lib/format";
import type { TxStatus } from "./TxResult";

interface Props {
  wallet: WalletState;
  setStatus: (s: TxStatus) => void;
  onChanged: () => void;
}

export function IssuerPanel({ wallet, setStatus, onChanged }: Props) {
  const { signer, provider, account } = wallet;
  const [owner, setOwner] = useState<string | null>(null);

  // 등록 폼
  const [regAddr, setRegAddr] = useState("");
  const [regGrade, setRegGrade] = useState<number>(1);
  // 한도 폼
  const [limitGrade, setLimitGrade] = useState<number>(1);
  const [limitAmount, setLimitAmount] = useState("1000");
  // lock-up 폼
  const [lockDays, setLockDays] = useState("30");
  // 발행 폼
  const [mintAddr, setMintAddr] = useState("");
  const [mintAmount, setMintAmount] = useState("1000");

  useEffect(() => {
    if (!provider) return;
    getToken(provider)
      .owner()
      .then((o: string) => setOwner(o))
      .catch(() => setOwner(null));
  }, [provider]);

  const isOwner = !!owner && !!account && owner.toLowerCase() === account.toLowerCase();
  const disabled = !signer || !wallet.onRightChain;

  return (
    <section className="card">
      <h2>발행자 패널</h2>
      {owner && (
        <p className={isOwner ? "hint hint--ok" : "hint hint--warn"}>
          {isOwner
            ? "현재 계정이 발행자(owner)입니다."
            : `발행자 계정이 아닙니다. owner: ${shortAddress(owner)} — 아래 동작은 거부될 수 있습니다.`}
        </p>
      )}

      <div className="form-row">
        <h3>1. 투자자 등록 (등급)</h3>
        <input placeholder="투자자 주소 0x…" value={regAddr} onChange={(e) => setRegAddr(e.target.value)} />
        <select value={regGrade} onChange={(e) => setRegGrade(Number(e.target.value))}>
          {GRADE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <button
          className="btn"
          disabled={disabled}
          onClick={() =>
            runTx(
              "투자자 등록",
              setStatus,
              () => getRegistry(signer!)["addInvestor(address,uint8)"](regAddr, regGrade),
              { onDone: onChanged }
            )
          }
        >
          등록
        </button>
      </div>

      <div className="form-row">
        <h3>2. 등급별 보유상한 설정 (0 = 무제한)</h3>
        <select value={limitGrade} onChange={(e) => setLimitGrade(Number(e.target.value))}>
          {GRADE_OPTIONS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="상한"
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
        />
        <button
          className="btn"
          disabled={disabled}
          onClick={() =>
            runTx(
              "보유상한 설정",
              setStatus,
              () => getRegistry(signer!).setGradeLimit(limitGrade, BigInt(limitAmount || "0")),
              { onDone: onChanged }
            )
          }
        >
          설정
        </button>
      </div>

      <div className="form-row">
        <h3>3. 전매제한(lock-up) 기간 설정</h3>
        <input type="number" value={lockDays} onChange={(e) => setLockDays(e.target.value)} />
        <span className="unit">일</span>
        <button
          className="btn"
          disabled={disabled}
          onClick={() =>
            runTx(
              "lock-up 설정",
              setStatus,
              () =>
                getRegistry(signer!).setLockupPeriod(BigInt(Math.floor(Number(lockDays || "0") * 86400))),
              { onDone: onChanged }
            )
          }
        >
          설정
        </button>
      </div>

      <div className="form-row">
        <h3>4. 발행 (mint)</h3>
        <input placeholder="수신자 주소 0x…" value={mintAddr} onChange={(e) => setMintAddr(e.target.value)} />
        <input
          type="number"
          placeholder="수량"
          value={mintAmount}
          onChange={(e) => setMintAmount(e.target.value)}
        />
        <button
          className="btn btn--primary"
          disabled={disabled}
          onClick={() =>
            runTx("발행", setStatus, () => getToken(signer!).mint(mintAddr, BigInt(mintAmount || "0")), {
              preflight: () => getToken(signer!).mint.staticCall(mintAddr, BigInt(mintAmount || "0")),
              onDone: onChanged,
            })
          }
        >
          발행
        </button>
      </div>
    </section>
  );
}
