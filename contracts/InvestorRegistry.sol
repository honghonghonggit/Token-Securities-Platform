// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IComplianceRegistry} from "./interfaces/IComplianceRegistry.sol";

/**
 * @title InvestorRegistry
 * @notice 투자자 적격성(화이트리스트)·등급·투자한도·전매제한 규칙을 관리하는 컴플라이언스 "두뇌".
 *         SecurityToken 은 전송 시 이 컨트랙트에 규칙을 조회해 강제한다.
 * @dev    역할 분리: 이 레지스트리는 "규칙의 원천"(등급, 등급별 보유상한, lock-up 기간)을 view 로
 *         제공하고, 잔액·시각 기반의 실제 강제는 그 상태를 아는 토큰이 수행한다.
 *
 *         Phase 1 은 단순 화이트리스트(bool)였고, Phase 2 에서 이를 등급(Grade)으로 확장했다.
 *         미등록(Grade.NONE) = 부적격. 기본 한도 0(무제한)·기본 lockupPeriod 0(무잠금)이라
 *         규칙을 설정하지 않으면 화이트리스트만 작동한다(Phase 1 동작과 동일).
 *         Phase 1 은 Ownable(owner = 발행자/등록 관리자)을 사용한다. Phase 3 이후 등록 관리자와
 *         발행자를 AccessControl 로 분리하는 것을 고려한다.
 *
 *         ⚠️ 테스트넷 기반 교육·포트폴리오 데모. 실제 증권 발행·실자금과 무관하며,
 *            실제 STO 는 자본시장법 등 규제 대상이다.
 */
contract InvestorRegistry is IComplianceRegistry, Ownable {
    /// @notice 투자자 등급. 자본시장법의 일반/전문 투자자 개념을 차용한 데모용 분류.
    enum Grade {
        NONE, // 미등록(부적격)
        RETAIL, // 일반 투자자
        PROFESSIONAL, // 전문 투자자
        INSTITUTIONAL // 기관 투자자
    }

    /// @dev 주소별 등급(NONE = 미등록).
    mapping(address => Grade) private _grade;

    /// @notice 등급별 최대 보유 가능 수량(0 = 무제한).
    mapping(Grade => uint256) public gradeLimit;

    /// @notice 발행 시 적용할 전매제한(lock-up) 기간(초, 0 = 잠금 없음).
    uint256 public lockupPeriod;

    event InvestorAdded(address indexed account);
    event InvestorRemoved(address indexed account);
    event GradeSet(address indexed account, Grade grade);
    event GradeLimitSet(Grade indexed grade, uint256 limit);
    event LockupPeriodSet(uint256 period);

    error ZeroAddress();
    error InvalidGrade();

    constructor() Ownable(msg.sender) {}

    // --- 투자자 등록/등급 ---

    /// @notice 투자자를 기본 등급(RETAIL)으로 등록한다. (Phase 1 호환 시그니처)
    function addInvestor(address account) external onlyOwner {
        _setGrade(account, Grade.RETAIL);
        emit InvestorAdded(account);
    }

    /// @notice 투자자를 지정 등급으로 등록한다.
    function addInvestor(address account, Grade grade) external onlyOwner {
        if (grade == Grade.NONE) revert InvalidGrade();
        _setGrade(account, grade);
        emit InvestorAdded(account);
    }

    /// @notice 등록된 투자자의 등급을 변경한다(NONE 으로 변경 시 등록 해제).
    function setGrade(address account, Grade grade) external onlyOwner {
        _setGrade(account, grade);
        if (grade == Grade.NONE) emit InvestorRemoved(account);
    }

    /// @notice 투자자를 화이트리스트에서 제거한다(Grade.NONE).
    function removeInvestor(address account) external onlyOwner {
        _setGrade(account, Grade.NONE); // 0주소 검사 + GradeSet emit 재사용
        emit InvestorRemoved(account);
    }

    /// @notice 여러 투자자를 기본 등급(RETAIL)으로 한 번에 등록한다. (데모 편의)
    function batchAddInvestors(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            _setGrade(accounts[i], Grade.RETAIL);
            emit InvestorAdded(accounts[i]);
        }
    }

    function _setGrade(address account, Grade grade) private {
        if (account == address(0)) revert ZeroAddress();
        _grade[account] = grade;
        emit GradeSet(account, grade);
    }

    // --- 규칙 설정(투자한도/전매제한) ---

    /// @notice 등급별 최대 보유 수량을 설정한다(0 = 무제한).
    function setGradeLimit(Grade grade, uint256 limit) external onlyOwner {
        if (grade == Grade.NONE) revert InvalidGrade();
        gradeLimit[grade] = limit;
        emit GradeLimitSet(grade, limit);
    }

    /// @notice 전매제한(lock-up) 기간(초)을 설정한다(0 = 잠금 없음).
    function setLockupPeriod(uint256 period) external onlyOwner {
        lockupPeriod = period;
        emit LockupPeriodSet(period);
    }

    // --- 조회(IComplianceRegistry) ---

    /// @notice 해당 주소의 등급.
    function gradeOf(address account) external view returns (Grade) {
        return _grade[account];
    }

    /// @inheritdoc IComplianceRegistry
    function isVerified(address account) external view returns (bool) {
        return _grade[account] != Grade.NONE;
    }

    /// @inheritdoc IComplianceRegistry
    /// @dev Phase 1 규칙: 송신자·수신자 모두 적격이어야 전송 가능(한도·lock-up 은 토큰이 강제).
    function canTransfer(address from, address to, uint256 /* value */ )
        external
        view
        returns (bool)
    {
        return _grade[from] != Grade.NONE && _grade[to] != Grade.NONE;
    }

    /// @inheritdoc IComplianceRegistry
    function maxBalanceOf(address account) external view returns (uint256) {
        return gradeLimit[_grade[account]];
    }
}
