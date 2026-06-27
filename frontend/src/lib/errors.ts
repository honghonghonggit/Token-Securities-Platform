// 컨트랙트 revert(커스텀 에러)·지갑 에러를 친절한 한국어 메시지로 디코딩한다.
// 데모의 핵심: "왜 거부됐는지"를 사람이 읽을 수 있게 보여준다.

interface DecodedError {
  name: string; // 커스텀 에러 이름 또는 분류
  message: string; // 사용자에게 보여줄 한국어 설명
}

function describe(name: string, args: readonly unknown[]): string {
  switch (name) {
    case "NotVerified":
      return "발행 거부: 수신자가 등록되지 않은(부적격) 투자자입니다.";
    case "TransferNotCompliant":
      return "전송 거부: 송신자·수신자 중 등록되지 않은 투자자가 있습니다.";
    case "ExceedsHoldingLimit": {
      const attempted = args[1]?.toString() ?? "?";
      const cap = args[2]?.toString() ?? "?";
      return `전송 거부: 수령 후 잔액(${attempted})이 등급 보유상한(${cap})을 초과합니다.`;
    }
    case "LockupActive": {
      const until = args[1];
      const when =
        typeof until === "bigint" || typeof until === "number"
          ? new Date(Number(until) * 1000).toLocaleString("ko-KR")
          : "?";
      return `전송 거부: 전매제한(lock-up) 기간입니다. 해제 시각: ${when}`;
    }
    case "OwnableUnauthorizedAccount":
      return "권한 없음: 발행자(owner) 계정만 호출할 수 있습니다.";
    case "ZeroAddress":
      return "잘못된 주소(0x0)입니다.";
    case "InvalidGrade":
      return "유효하지 않은 등급입니다.";
    case "ZeroComplianceAddress":
      return "컴플라이언스 레지스트리 주소가 잘못됐습니다.";
    default:
      return `거부됨: ${name}`;
  }
}

export function decodeError(err: unknown): DecodedError {
  const e = err as {
    code?: string;
    reason?: string;
    shortMessage?: string;
    message?: string;
    revert?: { name: string; args: readonly unknown[] };
  };

  // 사용자가 지갑에서 서명 거부
  if (e?.code === "ACTION_REJECTED") {
    return { name: "ACTION_REJECTED", message: "사용자가 지갑에서 트랜잭션을 거부했습니다." };
  }

  // ethers v6: 디코딩된 커스텀 에러
  if (e?.revert?.name) {
    return { name: e.revert.name, message: describe(e.revert.name, e.revert.args ?? []) };
  }

  // reason 문자열에 커스텀 에러 이름이 들어오는 경우(폴백)
  const known = [
    "NotVerified",
    "TransferNotCompliant",
    "ExceedsHoldingLimit",
    "LockupActive",
    "OwnableUnauthorizedAccount",
  ];
  const haystack = `${e?.reason ?? ""} ${e?.shortMessage ?? ""} ${e?.message ?? ""}`;
  for (const n of known) {
    if (haystack.includes(n)) return { name: n, message: describe(n, []) };
  }

  return {
    name: "UNKNOWN",
    message: e?.shortMessage ?? e?.reason ?? e?.message ?? "알 수 없는 오류가 발생했습니다.",
  };
}
