# 토큰증권(STO) 발행·유통 샌드박스

가상 자산을 토큰화해 발행하고, **규제 컴플라이언스(투자자 적격성·한도·전매제한)를 스마트컨트랙트 코드로 강제**하며, 2차 시장에서 유통하는 토큰증권 플랫폼 샌드박스입니다. 코스콤이 신사업으로 추진하는 토큰증권(STO) 공동플랫폼의 **개념을 이해하고 핵심 원리를 직접 구현**해보는 것이 목표입니다.

> ⚠️ **테스트넷 기반 교육·포트폴리오 데모입니다.** 실제 증권 발행·실자금·실제 투자자 판매가 아닙니다. 실제 STO는 자본시장법 등 규제 대상입니다. 코스콤 플랫폼을 그대로 재현한 것이 아니라, 그 개념을 이해하고 핵심 원리를 직접 구현한 것입니다.

## 차별점

단순 ERC-20 발행 프로젝트는 흔합니다. 이 프로젝트의 차별점은 **금융 규제를 코드로 구현**했다는 것입니다 — 아무나 못 사고(투자자 적격성), 한도를 넘겨 못 사고(투자한도), 일정 기간 못 파는(전매제한) 규제를 스마트컨트랙트가 전송 시점에 강제합니다.

## 현재 상태 — Phase 1 (MVP)

| 단계 | 범위 | 상태 |
|------|------|------|
| **Phase 1** | 토큰 발행 컨트랙트 + 화이트리스트 적격성 + Hardhat 테스트 + Sepolia 배포 | 구현됨 |
| Phase 2 | 투자한도·전매제한(lock-up), 발행/등록 흐름, 프론트엔드(MetaMask) | 예정 |
| Phase 3 | 2차 시장 매칭(MINI-Exchange 개념 재사용), 배당 등 라이프사이클 | 예정 |

## 아키텍처 (Phase 1)

```
                 ┌─────────────────────────────┐
   발행자(owner) │        SecurityToken        │  OZ ERC20 + ERC20Burnable 상속
   ── mint ────► │  _update() 훅에서 검증 위임  │
                 └──────────────┬──────────────┘
                                │ canTransfer / isVerified
                                ▼
                 ┌─────────────────────────────┐
                 │      InvestorRegistry       │  화이트리스트(적격성) = 컴플라이언스 "두뇌"
                 │  IComplianceRegistry 구현   │  (Phase 2: 한도·lock-up 규칙 누적)
                 └─────────────────────────────┘
```

전송 시점 규칙:
- **발행(mint)**: 수신자가 적격(화이트리스트)이어야 함
- **일반 전송**: 송신자·수신자 **모두** 적격이어야 함
- **소각(burn)**: 컴플라이언스 예외(허용)

## 설계 결정

- **토큰 표준 — ERC-20 + 커스텀 규제 로직**: 증권형 표준(ERC-1400/ERC-3643) 대신, 검증된 OpenZeppelin `ERC20`을 상속하고 규제 로직을 직접 구현했습니다. "규제를 코드로 어떻게 강제했는지"를 명확히 보여주기 위함입니다.
- **컴플라이언스 분리 — 모듈 구조**: 적격성 검증을 별도 `InvestorRegistry`로 분리하고, 토큰은 `IComplianceRegistry` 인터페이스에만 의존합니다. Phase 2의 한도·전매제한이 토큰 변경 없이 레지스트리 확장만으로 얹힙니다.
- **전송 강제 지점 — `_update` 훅**: OZ ERC20 v5의 모든 잔액 변경이 거치는 단일 훅에서 검증해, mint/transfer/burn을 빠짐없이 통제합니다.
- **보안**: OZ 검증 컨트랙트 재사용으로 직접 구현을 최소화했습니다. 정수 오버플로우는 Solidity 0.8 + OZ가 보장하며, 컴플라이언스 검증은 `view` 호출만 하므로 재진입 위험이 낮습니다. `mint`·화이트리스트 변경은 `onlyOwner`로 제한됩니다.

## 기술 스택

Solidity 0.8.24 · Hardhat · OpenZeppelin Contracts v5 · TypeScript · ethers v6 · Sepolia 테스트넷

## 실행 방법

> 사전 요구: Node.js(LTS) 설치.

```bash
# 1) 의존성 설치
npm install

# 2) 컴파일
npx hardhat compile

# 3) 테스트 (컴플라이언스 강제 — 발행/전송 허용·거부 케이스)
npx hardhat test

# 4) (선택) 커버리지
npx hardhat coverage

# 5) Sepolia 배포 (.env 설정 후)
npx hardhat run scripts/deploy.ts --network sepolia
```

### 환경 변수 (`.env`)

`.env.example`를 복사해 `.env`로 만들고 값을 채웁니다. **`.env`는 절대 커밋하지 않습니다.**

```
SEPOLIA_RPC_URL=...
PRIVATE_KEY=...        # 실자금 없는 테스트 계정만 사용
ETHERSCAN_API_KEY=...
```

## 프로젝트 구조

```
contracts/
├── interfaces/IComplianceRegistry.sol   # 토큰↔레지스트리 계약(인터페이스)
├── InvestorRegistry.sol                 # 화이트리스트(적격성)
└── SecurityToken.sol                    # ERC20 + 검증 위임
scripts/deploy.ts                        # Registry → Token 순서 배포
test/                                    # Hardhat 테스트
```
