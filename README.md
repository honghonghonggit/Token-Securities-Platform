# 토큰증권(STO) 발행·유통 샌드박스

가상 자산을 토큰화해 발행하고, **규제 컴플라이언스(투자자 적격성·한도·전매제한)를 스마트컨트랙트 코드로 강제**하며, 2차 시장에서 유통하는 토큰증권 플랫폼 샌드박스입니다. 코스콤이 신사업으로 추진하는 토큰증권(STO) 공동플랫폼의 **개념을 이해하고 핵심 원리를 직접 구현**해보는 것이 목표입니다.

> ⚠️ **테스트넷 기반 교육·포트폴리오 데모입니다.** 실제 증권 발행·실자금·실제 투자자 판매가 아닙니다. 실제 STO는 자본시장법 등 규제 대상입니다. 코스콤 플랫폼을 그대로 재현한 것이 아니라, 그 개념을 이해하고 핵심 원리를 직접 구현한 것입니다.

## 차별점

단순 ERC-20 발행 프로젝트는 흔합니다. 이 프로젝트의 차별점은 **금융 규제를 코드로 구현**했다는 것입니다 — 아무나 못 사고(투자자 적격성), 한도를 넘겨 못 사고(투자한도), 일정 기간 못 파는(전매제한) 규제를 스마트컨트랙트가 전송 시점에 강제합니다.

## 현재 상태

| 단계 | 범위 | 상태 |
|------|------|------|
| **Phase 1** | 토큰 발행 컨트랙트 + 화이트리스트 적격성 + Hardhat 테스트 | 완료 |
| **Phase 2-A** | 투자한도(등급별 보유상한) + 전매제한(lock-up) + 테스트 | 완료 |
| **Phase 2-B** | 프론트엔드(React+MetaMask) — 발행·투자·전송·위반 거부 데모 | 완료 |
| Phase 3 | 2차 시장 매칭, 배당 등 라이프사이클 | 범위 외 |

테스트 **32개 통과**(적격성·투자한도·전매제한의 허용/거부 케이스). 컨트랙트는 배포 직전 보안 점검 완료(아래 [설계 결정 · 보안](#설계-결정) 참고).

> **Phase 3는 의도적으로 범위에서 제외했습니다.** 2차 시장의 가격-시간 우선 매칭은 별도 프로젝트 [MINI-Exchange]에서 이미 구현했기에, 본 프로젝트는 중복을 피해 **"규제 컴플라이언스를 코드로 강제"**라는 차별점에 집중했습니다. 온체인 매칭은 가스 비용이 크므로, 확장 시에는 오프체인 매칭 + 온체인 정산 구조가 현실적입니다.

## 데모

> Sepolia 배포 완료. 컨트랙트 소스코드 검증됨(Etherscan).

| 항목 | 링크 |
|------|------|
| SecurityToken (Sepolia) | [0x5e49c6A2ad526Fa1D25e3e4211C1899c3D23a9cF](https://sepolia.etherscan.io/address/0x5e49c6A2ad526Fa1D25e3e4211C1899c3D23a9cF#code) |
| InvestorRegistry (Sepolia) | [0x68826F03e758aa4540A1051702273b3C04f55904](https://sepolia.etherscan.io/address/0x68826F03e758aa4540A1051702273b3C04f55904#code) |
| 프론트엔드 (정적 호스팅) | _배포 후 링크 기입_ |

로컬에서 바로 실행하려면 [프론트엔드 데모(로컬 · MetaMask)](#프론트엔드-데모-로컬--metamask)를 참고하세요. 컴플라이언스 위반 3종(미등록 수신자·보유상한 초과·lock-up 기간)이 **온체인에서 거부되고 그 사유가 화면에 표시**되는 것이 핵심 장면입니다.

<!-- 스크린샷 자리: docs/screenshots/ 에 이미지 추가 후 아래 주석 해제
![발행자·투자자 패널](docs/screenshots/panels.png)
![lock-up 위반 거부](docs/screenshots/lockup-rejected.png)
-->


## 아키텍처

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

전송 시점 규칙 (`_update` 훅에서 강제):
- **발행(mint)**: 수신자가 적격(화이트리스트)이어야 함 + 수신 후 잔액이 등급별 보유상한 이내 + 전매제한(lock-up) 설정
- **일반 전송**: 송신자·수신자 **모두** 적격 + 송신자 lock-up 해제됨 + 수신자 한도 이내
- **소각(burn)**: 컴플라이언스 예외(허용)

### 컴플라이언스 엔진 (이 프로젝트의 핵심)

규제를 토큰 전송 시점에 스마트컨트랙트가 강제로 검증합니다. 규칙의 원천은 `InvestorRegistry`, 강제 집행은 잔액·시각을 아는 `SecurityToken`이 담당하도록 역할을 분리했습니다.

| 규제 | 구현 | 위반 시 |
|------|------|---------|
| **투자자 적격성** | 등록된(화이트리스트) 투자자만 토큰 수령·전송 가능 | `NotVerified` / `TransferNotCompliant` revert |
| **투자한도** | 3등급(RETAIL/PROFESSIONAL/INSTITUTIONAL)별 보유상한, 수령 후 잔액과 비교(0=무제한) | `ExceedsHoldingLimit` revert |
| **전매제한(lock-up)** | 발행 시점 기준 투자자별 `lockedUntil` 설정, 해제 전 전송 차단 | `LockupActive` revert |

## 설계 결정

- **토큰 표준 — ERC-20 + 커스텀 규제 로직**: 증권형 표준(ERC-1400/ERC-3643) 대신, 검증된 OpenZeppelin `ERC20`을 상속하고 규제 로직을 직접 구현했습니다. "규제를 코드로 어떻게 강제했는지"를 명확히 보여주기 위함입니다.
- **컴플라이언스 분리 — 규칙/집행 역할 분리**: 적격성·등급·한도·lock-up 규칙은 `InvestorRegistry`(컴플라이언스 두뇌)가 `view`로 제공하고, 실제 집행은 잔액·시각을 아는 `SecurityToken`이 합니다. 토큰은 `IComplianceRegistry` 인터페이스에만 의존하므로, 한도·전매제한 추가도 토큰 구조 변경 없이 레지스트리 확장으로 얹혔습니다.
- **전송 강제 지점 — `_update` 훅**: OZ ERC20 v5의 모든 잔액 변경이 거치는 단일 훅에서 검증해, mint/transfer/burn을 빠짐없이 통제합니다.
- **투자한도 — 수령 후 잔액 검증**: 등급별 상한을 두고 `balanceOf(to) + value > cap`이면 거부합니다. 상한 0은 무제한(기관 투자자)으로 둬 규제 강도를 등급으로 표현합니다.
- **전매제한 — 투자자별 발행시점 기준**: 발행 시 `lockedUntil[투자자] = now + lockupPeriod`를 설정하고(추가 발행 시 더 늦은 시각으로 갱신), 해제 전 송신을 차단합니다. 글로벌 발행일 방식보다 투자자별 차등이 가능해 현실적입니다.
- **보안**: OZ 검증 컨트랙트 재사용으로 직접 구현을 최소화했습니다. 정수 오버플로우는 Solidity 0.8 + OZ가 보장하며, 컴플라이언스 검증은 `view` 호출만 하고 레지스트리 주소는 `immutable`이라 재진입·악의적 교체 위험이 낮습니다. `mint`·화이트리스트 변경은 `onlyOwner`로 제한됩니다. 배포 전 보안 점검(재진입·권한·정수·0주소 발행)에서 Critical/High 이슈는 없었고, 아래 두 가지는 **의도된 설계 결정**으로 문서화했습니다.
  - **전매제한은 1차 발행 시점에만 적용**: 2차 시장 전송으로 받은 수신자에겐 새 lock-up이 걸리지 않습니다(단 송신자는 자신의 lock-up이 풀려야 보낼 수 있어, 최초 배정분의 보유기간은 강제됩니다).
  - **보유상한 변경은 소급 적용 안 됨**: 한도를 낮춰도 기존 초과 보유자를 강제 처분하지 않고, 신규 수령만 차단합니다(grandfathering).

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

### 프론트엔드 데모 (로컬 — MetaMask)

규제 위반 시 트랜잭션이 거부되는 장면을 직접 시연합니다. 터미널 3개를 사용합니다.

```bash
# 터미널 1 — 로컬 체인
npx hardhat node

# 터미널 2 — 배포(주소·ABI가 frontend/.env.local 로 자동 주입됨)
npx hardhat run scripts/deploy.ts --network localhost

# 터미널 3 — 프론트엔드
cd frontend
npm install
npm run dev          # http://localhost:5173
```

MetaMask 설정: 네트워크 `localhost:8545`(chainId **31337**) 추가 → Hardhat이 출력한 테스트 계정을
import(발행자 = 배포자 계정, 투자자 = 다른 계정). 데모 흐름:

1. **발행자** 계정으로 투자자 등록(등급)·보유상한·lock-up 설정 후 발행(mint)
2. **투자자** 계정으로 전송 시도 → 정상 전송은 성공, 다음 위반은 **거부 사유와 함께 차단**:
   - 미등록 수신자 → `NotVerified` / `TransferNotCompliant`
   - 보유상한 초과 → `ExceedsHoldingLimit`
   - 전매제한 기간 → `LockupActive`

> 전송 버튼은 실제 전송 전에 `staticCall`로 시뮬레이션해 위반 사유를 즉시 표시합니다.

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
├── InvestorRegistry.sol                 # 적격성·등급·한도·lock-up 규칙(컴플라이언스 두뇌)
└── SecurityToken.sol                    # ERC20 + _update 훅에서 규칙 집행
scripts/deploy.ts                        # Registry → Token 배포 + 프론트 연동(.env.local/ABI)
test/                                    # Hardhat 테스트 (32개)
frontend/                                # React + TS + ethers v6 (MetaMask) dApp
├── src/lib/                             # useWallet, contracts, errors(거부사유 디코딩), format
└── src/components/                      # ConnectWallet, IssuerPanel, InvestorPanel, TxResult
```

## 회고

- **"규제를 코드로"가 핵심**: 토큰을 찍는 것 자체는 쉽지만, 적격성·한도·전매제한을 *전송 시점에* 강제하는 것이 이 프로젝트의 본질이었다. OZ ERC20 v5의 `_update` 단일 훅에서 mint/transfer/burn을 한 곳에서 통제할 수 있다는 점이 구현을 깔끔하게 만들었다.
- **역할 분리의 효과**: 규칙(`InvestorRegistry`)과 집행(`SecurityToken`)을 인터페이스로 분리하니, Phase 2에서 한도·lock-up을 추가할 때 토큰 본체를 거의 손대지 않았다. 인터페이스 의존이 확장 비용을 낮춘다는 것을 체감했다.
- **표준 vs 커스텀**: ERC-3643 같은 증권형 표준을 그대로 쓰는 대신 ERC-20 + 커스텀 규제로 간 것은 "규제를 어떻게 코드로 강제하는가"를 직접 드러내기 위함이었다. 실무라면 검증된 표준 채택이 정석이라는 점도 인지하고 있다.
- **배포 전 보안 점검**: 컨트랙트는 한 번 배포하면 수정이 어려우므로 배포 직전 재진입·권한·정수·엣지케이스를 점검했다. Critical 이슈는 없었고, "전매제한이 1차 발행에만 걸린다"·"보유상한 변경은 비소급"이라는 설계 특성을 명시적으로 문서화한 것이 의미 있었다.
- **다음 단계**: Phase 3(2차 시장 매칭)는 MINI-Exchange의 가격-시간 우선 매칭을 재사용하되, 온체인 매칭의 가스 비용을 고려해 오프체인 매칭 + 온체인 정산 구조를 검토 중이다.

## 라이선스

MIT
