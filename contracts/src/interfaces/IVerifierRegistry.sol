// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CipherTypes} from "../types/CipherTypes.sol";

interface IVerifierRegistry {
    event VerifierSet(
        bytes32 indexed verifierId,
        address indexed verifier,
        bytes32 schemaHash,
        uint16 publicInputsCount,
        bool enabled
    );

    event VerifierAllowedForAction(
        bytes32 indexed appId,
        bytes32 indexed actionType,
        bytes32 indexed verifierId,
        bool allowed
    );

    function getVerifier(bytes32 verifierId) external view returns (CipherTypes.VerifierConfig memory);

    function isVerifierAllowed(bytes32 appId, bytes32 actionType, bytes32 verifierId) external view returns (bool);
}
