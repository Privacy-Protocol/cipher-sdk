// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import {GovernorConfidential} from "./GovernorConfidential.sol";
import {IVotesConfidential} from "./interfaces/IVotesConfidential.sol";
import {Time} from "@openzeppelin/contracts/utils/types/Time.sol";
import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @dev Extension of {Governor} for confidential voting weight extraction from an {ERC20Votes},
 * {ERC721Votes} and {ERC7984Votes} tokens.
 */

abstract contract GovernorVotesConfidential is GovernorConfidential {
    IVotesConfidential private immutable _token;

    constructor(address tokenAddress) {
        _token = IVotesConfidential(tokenAddress);
    }

    /**
     * @dev The token that voting power is sourced from.
     */
    function token() public view virtual returns (IVotesConfidential) {
        return _token;
    }

    /**
     * @dev Clock (as specified in ERC-6372) is set to match the token's clock. Fallback to block numbers if the token
     * does not implement ERC-6372.
     */
    function clock() public view virtual override returns (uint48) {
        try token().clock() returns (uint48 timepoint) {
            return timepoint;
        } catch {
            return Time.blockNumber();
        }
    }

    /**
     * @dev Machine-readable description of the clock as specified in ERC-6372.
     */
    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public view virtual override returns (string memory) {
        try token().CLOCK_MODE() returns (string memory clockmode) {
            return clockmode;
        } catch {
            return "mode=blocknumber&from=default";
        }
    }

    /**
     * Read the voting weight from the token's built in snapshot mechanism (similar to {Governor-_getVotes}).
     */
    function _getConfidentialVotes(
        address account,
        uint256 timepoint,
        bytes memory /*params*/
    ) internal view virtual override returns (euint64) {
        return token().getPastVotes(account, timepoint);
    }
}
