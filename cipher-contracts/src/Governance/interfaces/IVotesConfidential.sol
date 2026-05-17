// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";
import {IERC6372} from "@openzeppelin/contracts/interfaces/IERC6372.sol";

interface IVotesConfidential is IERC6372 {
    /**
     * @dev Emitted when a token transfer or delegate change results in changes
     * to a delegate's number of voting units.
     */
    event DelegateVotesChanged(address indexed delegate, euint64 previousVotes, euint64 newVotes);

    /**
     * @dev Emitted when an account changes their delegate.
     */
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);

    /**
     * @dev The signature used has expired.
     */
    error VotesExpiredSignature(uint256 expiry);

    /**
     * @dev The clock was incorrectly modified.
     */
    error ERC6372InconsistentClock();

    /**
     * @dev Lookup to future votes is not available.
     */
    error ERC5805FutureLookup(uint256 timepoint, uint48 clock);

    /**
     * @dev Returns the current amount of votes that `account` has.
     */
    function getVotes(address account) external view returns (euint64);

    /**
     * @dev Returns the amount of votes that `account` had at a specific moment in the past.
     */
    function getPastVotes(address account, uint256 timepoint) external view returns (euint64);

    /**
     * @dev Returns the total supply of votes available at a specific moment in the past.
     */
    function getPastTotalSupply(uint256 timepoint) external view returns (euint64);

    /**
     * @dev Returns the current total supply of votes as an encrypted uint64.
     */
    function confidentialTotalSupply() external view returns (euint64);

    /**
     * @dev Returns the delegate that `account` has chosen.
     */
    function delegates(address account) external view returns (address);

    /**
     * @dev Delegates votes from the sender to `delegatee`.
     */
    function delegate(address delegatee) external;

    /**
     * @dev Delegates votes from an EOA to `delegatee` via an ECDSA signature.
     */
    function delegateBySig(address delegatee, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) external;

    /**
     * @dev Returns the current nonce for `owner`.
     *
     * Included because VotesConfidential inherits Nonces.
     */
    function nonces(address owner) external view returns (uint256);
}
