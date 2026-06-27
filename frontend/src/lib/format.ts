// 표시용 포맷 헬퍼.

// InvestorRegistry.Grade enum 순서와 일치.
export const GRADE_LABELS = ["미등록", "일반(RETAIL)", "전문(PROFESSIONAL)", "기관(INSTITUTIONAL)"] as const;

export const GRADE_OPTIONS = [
  { value: 1, label: "일반 (RETAIL)" },
  { value: 2, label: "전문 (PROFESSIONAL)" },
  { value: 3, label: "기관 (INSTITUTIONAL)" },
] as const;

export function gradeLabel(grade: number): string {
  return GRADE_LABELS[grade] ?? `등급 ${grade}`;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** lockedUntil(초 단위 Unix time)을 사람이 읽는 문자열로. */
export function lockupLabel(lockedUntil: bigint): string {
  const until = Number(lockedUntil);
  if (until === 0) return "잠금 없음";
  const now = Math.floor(Date.now() / 1000);
  const date = new Date(until * 1000).toLocaleString("ko-KR");
  if (now >= until) return `해제됨 (${date})`;
  const remain = until - now;
  const days = Math.floor(remain / 86400);
  const hours = Math.floor((remain % 86400) / 3600);
  return `잠금 중 — 해제까지 약 ${days}일 ${hours}시간 (${date})`;
}

/** "무제한" 또는 숫자 문자열. */
export function capLabel(cap: bigint): string {
  return cap === 0n ? "무제한" : cap.toString();
}
