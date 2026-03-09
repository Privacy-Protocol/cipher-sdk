// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library CipherTypes {
    struct ActionRequest {
        bytes32 appId;
        bytes32 actionType;
        bytes32 contextId;
        bytes32 nullifier;
        bytes32 payloadHash;
        bytes32 encryptedPayloadRef;
        bytes32 verifierId;
        uint64 deadline;
        bytes32[] publicInputs;
        bytes proof;
        bytes adapterData;
    }

    struct VerifiedAction {
        bytes32 actionId;
        address sender;
        uint64 timestamp;
        bytes32 appId;
        bytes32 actionType;
        bytes32 contextId;
        bytes32 nullifier;
        bytes32 payloadHash;
        bytes32 encryptedPayloadRef;
        bytes32 verifierId;
        bytes32[] publicInputs;
        bytes adapterData;
    }

    struct VerifierConfig {
        address verifier;
        bytes32 publicInputSchemaHash;
        uint16 publicInputsCount;
        bool enabled;
    }
}
