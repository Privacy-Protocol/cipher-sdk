// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IVerifierRegistry} from "../interfaces/IVerifierRegistry.sol";
import {CipherTypes} from "../types/CipherTypes.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";

contract VerifierRegistry is IVerifierRegistry, Ownable {
    error ZeroAddressVerifier();

    mapping(bytes32 verifierId => CipherTypes.VerifierConfig config)
        private _verifierConfig;
    mapping(bytes32 appId => mapping(bytes32 actionType => mapping(bytes32 verifierId => bool allowed)))
        private _verifierAllowedForAction;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setVerifier(
        bytes32 verifierId,
        address verifier,
        bytes32 schemaHash,
        uint16 publicInputsCount,
        bool enabled
    ) external onlyOwner {
        if (verifier == address(0)) revert ZeroAddressVerifier();

        _verifierConfig[verifierId] = CipherTypes.VerifierConfig({
            verifier: verifier,
            publicInputSchemaHash: schemaHash,
            publicInputsCount: publicInputsCount,
            enabled: enabled
        });

        emit VerifierSet(
            verifierId,
            verifier,
            schemaHash,
            publicInputsCount,
            enabled
        );
    }

    function setVerifierAllowedForAction(
        bytes32 appId,
        bytes32 actionType,
        bytes32 verifierId,
        bool allowed
    ) external onlyOwner {
        _verifierAllowedForAction[appId][actionType][verifierId] = allowed;
        emit VerifierAllowedForAction(appId, actionType, verifierId, allowed);
    }

    function getVerifier(
        bytes32 verifierId
    ) external view returns (CipherTypes.VerifierConfig memory) {
        return _verifierConfig[verifierId];
    }

    function isVerifierAllowed(
        bytes32 appId,
        bytes32 actionType,
        bytes32 verifierId
    ) external view returns (bool) {
        return _verifierAllowedForAction[appId][actionType][verifierId];
    }
}
