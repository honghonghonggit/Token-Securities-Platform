import type { ContractTransactionResponse } from "ethers";
import { decodeError } from "./errors";
import type { TxStatus } from "../components/TxResult";

/**
 * 쓰기 트랜잭션을 실행하고 상태를 보고한다.
 * preflight(staticCall 등)를 주면 전송 전에 시뮬레이션해 위반 사유를 먼저 드러낸다.
 */
export async function runTx(
  label: string,
  setStatus: (s: TxStatus) => void,
  send: () => Promise<ContractTransactionResponse>,
  opts?: { preflight?: () => Promise<unknown>; onDone?: () => void }
): Promise<void> {
  setStatus({ kind: "pending", label });
  try {
    if (opts?.preflight) await opts.preflight();
    const tx = await send();
    await tx.wait();
    setStatus({ kind: "success", label, hash: tx.hash });
    opts?.onDone?.();
  } catch (e) {
    const d = decodeError(e);
    setStatus({ kind: "rejected", label, reason: d.message, errorName: d.name });
  }
}
