// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BaseAdapter} from "./BaseAdapter.sol";
import {CipherTypes} from "../types/CipherTypes.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";

contract CredentialGateAdapter is BaseAdapter, Ownable {
    error ContextDisabled(bytes32 contextId);
    error ContextNotActive(
        bytes32 contextId,
        uint64 validAfter,
        uint64 validUntil,
        uint64 nowTs
    );
    error RootNotAllowed(bytes32 contextId, bytes32 root);
    error PayloadRequired(bytes32 contextId);
    error EncryptedPayloadRefRequired(bytes32 contextId);
    error InvalidPublicInputsForCredentialGate();

    struct GateContextConfig {
        bool enabled;
        bool requirePayload;
        bool requireEncryptedPayloadRef;
        uint64 validAfter;
        uint64 validUntil;
    }

    bytes32 public immutable actionType;

    mapping(bytes32 contextId => GateContextConfig config) public contextConfig;
    mapping(bytes32 contextId => mapping(bytes32 root => bool allowed))
        public allowedRoots;

    event GateContextConfigured(
        bytes32 indexed contextId,
        bool enabled,
        bool requirePayload,
        bool requireEncryptedPayloadRef,
        uint64 validAfter,
        uint64 validUntil
    );

    event RootConfigured(
        bytes32 indexed contextId,
        bytes32 indexed root,
        bool allowed
    );

    event CredentialAccessGranted(
        bytes32 indexed actionId,
        bytes32 indexed contextId,
        bytes32 indexed root,
        bytes32 nullifier,
        bytes32 payloadHash,
        bytes32 encryptedPayloadRef,
        address sender
    );

    constructor(
        address initialOwner,
        address router_,
        bytes32 appId_,
        bytes32 actionType_
    ) BaseAdapter(router_, appId_) Ownable(initialOwner) {
        actionType = actionType_;
    }

    function supportsActionType(
        bytes32 actionType_
    ) public view override returns (bool) {
        return actionType_ == actionType;
    }

    function configureContext(
        bytes32 contextId,
        GateContextConfig calldata config
    ) external onlyOwner {
        contextConfig[contextId] = config;
        emit GateContextConfigured(
            contextId,
            config.enabled,
            config.requirePayload,
            config.requireEncryptedPayloadRef,
            config.validAfter,
            config.validUntil
        );
    }

    function setAllowedRoot(
        bytes32 contextId,
        bytes32 root,
        bool allowed
    ) external onlyOwner {
        allowedRoots[contextId][root] = allowed;
        emit RootConfigured(contextId, root, allowed);
    }

    function onVerifiedAction(
        CipherTypes.VerifiedAction calldata action
    ) external override onlyRouter returns (bytes4) {
        if (!supportsActionType(action.actionType))
            revert UnsupportedActionType(action.actionType);

        GateContextConfig memory config = contextConfig[action.contextId];
        if (!config.enabled) revert ContextDisabled(action.contextId);

        uint64 nowTs = uint64(block.timestamp);
        if (
            (config.validAfter != 0 && nowTs < config.validAfter) ||
            (config.validUntil != 0 && nowTs > config.validUntil)
        ) {
            revert ContextNotActive(
                action.contextId,
                config.validAfter,
                config.validUntil,
                nowTs
            );
        }

        if (action.publicInputs.length < 6)
            revert InvalidPublicInputsForCredentialGate();
        bytes32 root = action.publicInputs[5];
        if (!allowedRoots[action.contextId][root])
            revert RootNotAllowed(action.contextId, root);

        if (config.requirePayload && action.payloadHash == bytes32(0))
            revert PayloadRequired(action.contextId);
        if (
            config.requireEncryptedPayloadRef &&
            action.encryptedPayloadRef == bytes32(0)
        ) {
            revert EncryptedPayloadRefRequired(action.contextId);
        }

        emit CredentialAccessGranted(
            action.actionId,
            action.contextId,
            root,
            action.nullifier,
            action.payloadHash,
            action.encryptedPayloadRef,
            action.sender
        );

        return ADAPTER_OK;
    }
}
