export type TxStatus =
  | { kind: "idle" }
  | { kind: "pending"; label: string }
  | { kind: "success"; label: string; hash?: string }
  | { kind: "rejected"; label: string; reason: string; errorName: string };

export function TxResult({ status }: { status: TxStatus }) {
  if (status.kind === "idle") return null;

  if (status.kind === "pending") {
    return (
      <div className="tx tx--pending">
        <span className="spinner" /> {status.label} 처리 중…
      </div>
    );
  }

  if (status.kind === "success") {
    return (
      <div className="tx tx--success">
        ✅ {status.label} 성공
        {status.hash && <code className="tx__hash">{status.hash}</code>}
      </div>
    );
  }

  // rejected — 데모의 핵심: 거부 사유를 명확히 표시
  return (
    <div className="tx tx--rejected">
      <strong>❌ {status.label} 거부됨</strong>
      <div className="tx__reason">{status.reason}</div>
      <span className="tx__tag">{status.errorName}</span>
    </div>
  );
}
