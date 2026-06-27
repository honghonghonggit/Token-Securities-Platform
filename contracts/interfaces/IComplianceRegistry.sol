// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title IComplianceRegistry
 * @notice 토큰이 전송 시점에 컴플라이언스(규제 적격성)를 위임하는 계약(인터페이스).
 *         SecurityToken 은 이 인터페이스에만 의존하므로, Phase 2 에서 한도·전매제한(lock-up)
 *         규칙이 추가되어도 토큰 코드 변경 없이 레지스트리 구현만 확장/교체하면 된다.
 * @dev    교육·포트폴리오용 테스트넷 샌드박스. 실제 증권 발행과 무관.
 */
interface IComplianceRegistry {
    /// @notice 해당 주소가 적격(화이트리스트 등록) 투자자인지 여부.
    function isVerified(address account) external view returns (bool);

    /// @notice from→to 전송이 컴플라이언스 규칙을 통과하는지 여부.
    /// @dev    Phase 1: from·to 모두 적격이어야 true. 한도·lock-up 은 토큰이 자신의
    ///         잔액·시각 상태로 별도 강제한다(이 view 는 적격성만 판단).
    function canTransfer(address from, address to, uint256 value) external view returns (bool);

    /// @notice 해당 주소의 최대 보유 가능 수량(등급별 상한). 0 이면 무제한.
    /// @dev    Phase 2(투자한도): 토큰이 수신 후 잔액과 비교해 강제한다.
    function maxBalanceOf(address account) external view returns (uint256);

    /// @notice 발행(mint) 시 적용할 전매제한(lock-up) 기간(초). 0 이면 잠금 없음.
    /// @dev    Phase 2(전매제한): 토큰이 발행 시점 + 이 기간으로 해제시각을 정한다.
    function lockupPeriod() external view returns (uint256);
}
