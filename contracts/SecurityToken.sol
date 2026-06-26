// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IComplianceRegistry} from "./interfaces/IComplianceRegistry.sol";

/**
 * @title SecurityToken
 * @notice 규제 컴플라이언스를 코드로 강제하는 토큰증권(ERC-20 기반).
 *         OpenZeppelin ERC20 을 상속하되, 모든 잔액 변경이 거치는 _update 훅에서
 *         InvestorRegistry(컴플라이언스)에 적격성 검증을 위임한다.
 *         → "아무나 못 받는다(적격성)"는 규제를 전송 시점에 컨트랙트가 강제한다.
 * @dev    Phase 1 검증 범위:
 *           - 발행(mint, from==0): 수신자(to)가 적격이어야 함.
 *           - 소각(burn, to==0):   허용(컴플라이언스 예외).
 *           - 일반 전송:           from·to 모두 적격이어야 함(registry.canTransfer).
 *
 *         OZ 의 검증된 컨트랙트를 재사용해 직접 구현을 최소화한다.
 *         정수 오버플로우는 Solidity 0.8 + OZ 가 보장하며, view 호출만 하는
 *         컴플라이언스 검증 경로엔 외부 콜백이 없어 재진입 위험이 낮다.
 *         mint 및 화이트리스트 변경은 권한(onlyOwner)으로 제한된다.
 *
 *         ⚠️ 테스트넷 기반 교육·포트폴리오 데모. 실제 증권 발행·실자금과 무관하며,
 *            실제 STO 는 자본시장법 등 규제 대상이다.
 */
contract SecurityToken is ERC20, ERC20Burnable, Ownable {
    /// @notice 전송 적격성을 검증하는 컴플라이언스 레지스트리.
    IComplianceRegistry public immutable compliance;

    /// @dev 발행 시 수신자가 적격(화이트리스트)이 아님.
    error NotVerified(address account);
    /// @dev 전송이 컴플라이언스 규칙(from·to 적격)을 통과하지 못함.
    error TransferNotCompliant(address from, address to);
    /// @dev 컴플라이언스 레지스트리 주소가 0.
    error ZeroComplianceAddress();

    constructor(string memory name_, string memory symbol_, address registry_)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {
        if (registry_ == address(0)) revert ZeroComplianceAddress();
        compliance = IComplianceRegistry(registry_);
    }

    /// @notice 발행자(owner)가 적격 투자자에게 토큰을 발행한다(1차 발행).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev ERC20 의 모든 잔액 변경(mint/burn/transfer)이 거치는 단일 훅.
     *      super._update 호출 전에 컴플라이언스를 강제한다.
     */
    function _update(address from, address to, uint256 value) internal override {
        if (from == address(0)) {
            // 발행(mint): 수신자가 적격이어야 함.
            if (!compliance.isVerified(to)) revert NotVerified(to);
        } else if (to == address(0)) {
            // 소각(burn): 컴플라이언스 예외 — 통과.
        } else {
            // 일반 전송: from·to 모두 적격이어야 함.
            if (!compliance.canTransfer(from, to, value)) {
                revert TransferNotCompliant(from, to);
            }
        }

        super._update(from, to, value);
    }
}
