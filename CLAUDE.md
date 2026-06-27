# 프로젝트: 토큰증권(STO) 발행·유통 샌드박스

가상 자산을 토큰화하는 스마트컨트랙트 + 규제 컴플라이언스 로직 + 2차 시장(유통)을 구현하는 토큰증권 플랫폼 샌드박스.
실거래·실자금·실제 증권 발행이 아닌 테스트넷 기반 교육·포트폴리오 데모임을 명확히 한다.
전체 기획/스코프/스택은 @docs/PROJECT_BRIEF.md 참고. MINI-Exchange, RA-Testbed, Market-Surveillance와 동일한 운영 원칙을 따른다.

## 기술 스택
- 스마트컨트랙트: Solidity, Hardhat(개발/테스트/배포 프레임워크), OpenZeppelin(검증된 표준 컨트랙트 라이브러리)
- 테스트넷: Sepolia (실자금 없는 이더리움 테스트넷)
- 백엔드: Node.js/TypeScript 또는 Python (컨트랙트와 통신, ethers.js/web3.py)
- 프론트엔드: React + TypeScript (MetaMask 연동), ethers.js
- 테스트: Hardhat 테스트(스마트컨트랙트), 백엔드/프론트 단위 테스트
- 배포: 컨트랙트는 Sepolia 테스트넷, 프론트는 Vercel/Netlify 등 정적 호스팅

## 빌드 / 테스트
- 의존성 설치: `npm install`
- 컨트랙트: `npx hardhat compile`, `npx hardhat test` (현재 32개 테스트 통과), `npx hardhat run scripts/deploy.ts --network sepolia`
- (Phase 2) 프론트: `npm run dev`, `npm run build`

## 개발 순서
1. 토큰 컨트랙트(ERC-20 기반 + 규제 확장) + Hardhat 테스트부터 TDD로
2. 컴플라이언스 로직(투자자 등급/한도/전매제한) 컨트랙트 + 테스트
3. 발행자(Issuer)/투자자 등록(Investor Registry) 흐름
4. 2차 시장(유통) — MINI-Exchange의 가격-시간 우선 매칭 개념 재사용
5. 프론트엔드(MetaMask 연동) + Sepolia 배포

## 핵심 원칙
- 범위는 Phase1(MVP) → Phase2(차별화) → Phase3(스트레치) 순서로 단계적으로 확장한다. Phase1이 끝나기 전 다음 단계에 손대지 않는다.
- 이 프로젝트의 차별점은 단순 토큰 발행이 아니라 "규제 컴플라이언스 로직(투자한도·전매제한·투자자 적격성)을 코드로 구현한 것"이다. README 설계 결정에서 이 부분을 가장 비중 있게 다룬다.
- 스마트컨트랙트는 한번 배포하면 수정이 어렵고 자금 손실 위험이 크므로, OpenZeppelin 같은 검증된 라이브러리를 최대한 재사용하고 직접 구현은 최소화한다. 보안 고려사항(재진입 공격 등)을 인지하고 문서화한다.
- 절대 실제 증권을 발행하거나 실제 투자자에게 판매하는 것처럼 표현하지 않는다. "테스트넷 기반 샌드박스/데모"임을 README와 화면에 명시한다. 실제 STO는 자본시장법 등 규제 대상임을 명시한다.
- 코스콤이 운영하는 토큰증권 공동플랫폼을 "그대로 재현했다"는 단정적 표현은 쓰지 않는다. "그 개념을 이해하고 핵심 원리를 직접 구현해본 것"이라고 서술한다.
- 2차 시장 매칭은 MINI-Exchange에서 구현한 가격-시간 우선 매칭엔진 개념을 재사용했음을 README에 명시한다.
- 커밋 메시지에 "Co-Authored-By: Claude"나 attribution을 절대 넣지 않는다. (전역 설정 includeCoAuthoredBy:false와 함께 이중 안전장치)
- 큰 설계 변경 전에는 plan mode로 먼저 합의받는다.

## 폴더 구조 (초안)
```
Token-Securities-Platform/
├── contracts/                  # Solidity 스마트컨트랙트
├── scripts/                    # 배포 스크립트
├── test/                       # Hardhat 테스트
├── frontend/                   # React + MetaMask 연동
├── hardhat.config.js
├── package.json
└── README.md
```

## 보안 주의사항 (개인키/시드)
- 절대 개인키, 니모닉(시드 구문), Sepolia 배포용 계정 비밀번호를 코드나 깃에 커밋하지 않는다.
- .env로 분리하고 .gitignore에 반드시 포함. 배포 시에는 환경변수로 주입.
