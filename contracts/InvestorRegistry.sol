// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IComplianceRegistry} from "./interfaces/IComplianceRegistry.sol";

/**
 * @title InvestorRegistry
 * @notice 투자자 적격성(화이트리스트)을 관리하는 컴플라이언스 "두뇌".
 *         SecurityToken 은 전송 시 이 컨트랙트에 검증을 위임한다.
 * @dev    Phase 1 은 단순화를 위해 Ownable(owner = 발행자/등록 관리자)을 사용한다.
 *         Phase 2 에서 등록 관리자와 발행자를 분리(AccessControl)하고,
 *         canTransfer 에 투자한도·전매제한(lock-up) 규칙을 누적하는 것을 고려한다.
 *
 *         ⚠️ 테스트넷 기반 교육·포트폴리오 데모. 실제 증권 발행·실자금과 무관하며,
 *            실제 STO 는 자본시장법 등 규제 대상이다.
 */
contract InvestorRegistry is IComplianceRegistry, Ownable {
    /// @dev 주소별 적격 여부.
    mapping(address => bool) private _verified;

    event InvestorAdded(address indexed account);
    event InvestorRemoved(address indexed account);

    error ZeroAddress();

    constructor() Ownable(msg.sender) {}

    /// @notice 투자자를 화이트리스트에 등록한다.
    function addInvestor(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        _verified[account] = true;
        emit InvestorAdded(account);
    }

    /// @notice 투자자를 화이트리스트에서 제거한다.
    function removeInvestor(address account) external onlyOwner {
        if (account == address(0)) revert ZeroAddress();
        _verified[account] = false;
        emit InvestorRemoved(account);
    }

    /// @notice 여러 투자자를 한 번에 등록한다 (데모 편의).
    function batchAddInvestors(address[] calldata accounts) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            address account = accounts[i];
            if (account == address(0)) revert ZeroAddress();
            _verified[account] = true;
            emit InvestorAdded(account);
        }
    }

    /// @inheritdoc IComplianceRegistry
    function isVerified(address account) external view returns (bool) {
        return _verified[account];
    }

    /// @inheritdoc IComplianceRegistry
    /// @dev Phase 1 규칙: 송신자·수신자 모두 적격이어야 전송 가능.
    function canTransfer(address from, address to, uint256 /* value */ )
        external
        view
        returns (bool)
    {
        return _verified[from] && _verified[to];
    }
}
