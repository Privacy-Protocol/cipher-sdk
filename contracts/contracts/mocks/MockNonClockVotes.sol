// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IVotesConfidential} from "../Governance/interfaces/IVotesConfidential.sol";
import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @dev Test-only votes token whose `clock()` and `CLOCK_MODE()` revert, so a {GovernorVotesConfidential}
/// built on it is forced down the ERC-6372 fallback path (block-number clock).
contract MockNonClockVotes is IVotesConfidential {
    function clock() public pure override returns (uint48) {
        revert("MockNonClockVotes: no clock");
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        revert("MockNonClockVotes: no clock mode");
    }

    function getVotes(address) external pure override returns (euint64) {
        return euint64.wrap(bytes32(0));
    }

    function getPastVotes(address, uint256) external pure override returns (euint64) {
        return euint64.wrap(bytes32(0));
    }

    function getPastTotalSupply(uint256) external pure override returns (euint64) {
        return euint64.wrap(bytes32(0));
    }

    function confidentialTotalSupply() external pure override returns (euint64) {
        return euint64.wrap(bytes32(0));
    }

    function delegates(address) external pure override returns (address) {
        return address(0);
    }

    function delegate(address) external override {}

    function delegateBySig(address, uint256, uint256, uint8, bytes32, bytes32) external override {}

    function nonces(address) external pure override returns (uint256) {
        return 0;
    }
}
