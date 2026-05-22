// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.6.0
pragma solidity ^0.8.27;

import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IVotesConfidential} from "./Governance/interfaces/IVotesConfidential.sol";
import {GovernorCountingSimpleConfidential} from "./Governance/GovernorCountingSimpleConfidential.sol";
import {GovernorVotesConfidential} from "./Governance/GovernorVotesConfidential.sol";
import {GovernorVotesQuorumFractionConfidential} from "./Governance/GovernorVotesQuorumFractionConfidential.sol";
import {GovernorConfidential} from "./Governance/GovernorConfidential.sol";

contract MyGovernor is
    ZamaEthereumConfig,
    GovernorConfidential,
    GovernorCountingSimpleConfidential,
    GovernorVotesConfidential,
    GovernorVotesQuorumFractionConfidential
{
    constructor(
        IVotesConfidential _token
    )
        GovernorConfidential("MyGovernor")
        GovernorVotesConfidential(address(_token))
        GovernorVotesQuorumFractionConfidential(4)
    {}

    function votingDelay() public pure override returns (uint256) {
        return 7200; // 1 day
    }

    function votingPeriod() public pure override returns (uint256) {
        return 50400; // 1 week
    }
}
