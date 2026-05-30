// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IVotesConfidential} from "../Governance/interfaces/IVotesConfidential.sol";
import {GovernorCountingSimpleConfidential} from "../Governance/GovernorCountingSimpleConfidential.sol";
import {GovernorVotesConfidential} from "../Governance/GovernorVotesConfidential.sol";
import {GovernorVotesQuorumFractionConfidential} from "../Governance/GovernorVotesQuorumFractionConfidential.sol";
import {GovernorConfidential} from "../Governance/GovernorConfidential.sol";

/// @dev Test-only governor identical to {MyGovernor} but with a configurable quorum numerator,
/// used to exercise quorum-fraction edge cases (constructor validation, zero/full quorum).
contract ConfigurableGovernor is
    ZamaEthereumConfig,
    GovernorConfidential,
    GovernorCountingSimpleConfidential,
    GovernorVotesConfidential,
    GovernorVotesQuorumFractionConfidential
{
    constructor(
        IVotesConfidential _token,
        uint256 quorumNumeratorValue
    )
        GovernorConfidential("MyGovernor")
        GovernorVotesConfidential(address(_token))
        GovernorVotesQuorumFractionConfidential(quorumNumeratorValue)
    {}

    function votingDelay() public pure override returns (uint256) {
        return 7200;
    }

    function votingPeriod() public pure override returns (uint256) {
        return 50400;
    }
}
