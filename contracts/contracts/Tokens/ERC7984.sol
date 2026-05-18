// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0 and Confidential Contracts ^0.3.1
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";
import {ERC7984Votes} from "@openzeppelin/confidential-contracts/token/ERC7984/extensions/ERC7984Votes.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract MyToken is ERC7984, ZamaEthereumConfig, EIP712, ERC7984Votes, AccessControl {
    bytes32 public constant HANDLE_VIEWER_ROLE = keccak256("HANDLE_VIEWER_ROLE");

    constructor(address defaultAdmin, address handleViewer) ERC7984("MyToken", "MTK", "") EIP712("MyToken", "1") {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(HANDLE_VIEWER_ROLE, handleViewer);
    }

    function mint(
        address to,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (euint64) {
        return _mint(to, FHE.fromExternal(encryptedAmount, inputProof));
    }

    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }

    function _validateHandleAllowance(bytes32) internal view override onlyRole(HANDLE_VIEWER_ROLE) returns (bool) {
        return true;
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(bytes4 interfaceId) public view override(ERC7984, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address from,
        address to,
        euint64 amount
    ) internal override(ERC7984, ERC7984Votes) returns (euint64 transferred) {
        return super._update(from, to, amount);
    }

    function confidentialTotalSupply() public view override(ERC7984, ERC7984Votes) returns (euint64) {
        return super.confidentialTotalSupply();
    }
}
