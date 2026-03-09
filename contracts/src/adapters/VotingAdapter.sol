// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {BaseAdapter} from "./BaseAdapter.sol";
import {CipherTypes} from "../types/CipherTypes.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";

contract VotingAdapter is BaseAdapter, Ownable {
    error ProposalDisabled(bytes32 contextId);
    error ProposalNotActive(
        bytes32 contextId,
        uint64 startTime,
        uint64 endTime,
        uint64 nowTs
    );
    error RootNotAllowed(bytes32 contextId, bytes32 root);
    error PayloadRequired(bytes32 contextId);
    error EncryptedPayloadRequired(bytes32 contextId);
    error VoteAlreadyStored(bytes32 actionId);
    error InvalidPublicInputsForVote();

    struct ProposalConfig {
        bool enabled;
        bool requirePayload;
        bool requireEncryptedPayload;
        uint64 startTime;
        uint64 endTime;
    }

    struct VoteRecord {
        bytes32 proposalId;
        bytes32 root;
        bytes32 nullifier;
        bytes32 payloadHash;
        bytes32 encryptedPayloadRef;
        bytes encryptedPayload;
        address submitter;
        uint64 submittedAt;
    }

    bytes32 public immutable actionType;

    mapping(bytes32 contextId => ProposalConfig config) public proposalConfig;
    mapping(bytes32 contextId => mapping(bytes32 root => bool allowed))
        public allowedRoots;
    mapping(bytes32 actionId => VoteRecord record) private _voteByActionId;
    mapping(bytes32 contextId => uint256 count) public voteCountByProposal;

    event ProposalConfigured(
        bytes32 indexed contextId,
        bool enabled,
        bool requirePayload,
        bool requireEncryptedPayload,
        uint64 startTime,
        uint64 endTime
    );

    event RootConfigured(
        bytes32 indexed contextId,
        bytes32 indexed root,
        bool allowed
    );

    event VoteStored(
        bytes32 indexed actionId,
        bytes32 indexed contextId,
        bytes32 indexed root,
        bytes32 nullifier,
        bytes32 payloadHash,
        bytes32 encryptedPayloadRef,
        bytes32 encryptedPayloadDigest,
        address submitter
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

    function configureProposal(
        bytes32 contextId,
        ProposalConfig calldata config
    ) external onlyOwner {
        proposalConfig[contextId] = config;
        emit ProposalConfigured(
            contextId,
            config.enabled,
            config.requirePayload,
            config.requireEncryptedPayload,
            config.startTime,
            config.endTime
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

    function getVote(
        bytes32 actionId
    ) external view returns (VoteRecord memory) {
        return _voteByActionId[actionId];
    }

    function onVerifiedAction(
        CipherTypes.VerifiedAction calldata action
    ) external override onlyRouter returns (bytes4) {
        if (!supportsActionType(action.actionType))
            revert UnsupportedActionType(action.actionType);

        ProposalConfig memory config = proposalConfig[action.contextId];
        if (!config.enabled) revert ProposalDisabled(action.contextId);

        uint64 nowTs = uint64(block.timestamp);
        if (
            (config.startTime != 0 && nowTs < config.startTime) ||
            (config.endTime != 0 && nowTs > config.endTime)
        ) {
            revert ProposalNotActive(
                action.contextId,
                config.startTime,
                config.endTime,
                nowTs
            );
        }

        if (action.publicInputs.length < 6) revert InvalidPublicInputsForVote();
        bytes32 root = action.publicInputs[5];
        if (!allowedRoots[action.contextId][root])
            revert RootNotAllowed(action.contextId, root);

        if (config.requirePayload && action.payloadHash == bytes32(0))
            revert PayloadRequired(action.contextId);

        bytes memory encryptedPayload = _decodeEncryptedPayload(
            action.adapterData
        );
        bool hasEncryptedPayload = encryptedPayload.length > 0 ||
            action.encryptedPayloadRef != bytes32(0);
        if (config.requireEncryptedPayload && !hasEncryptedPayload)
            revert EncryptedPayloadRequired(action.contextId);

        if (_voteByActionId[action.actionId].submittedAt != 0)
            revert VoteAlreadyStored(action.actionId);

        _voteByActionId[action.actionId] = VoteRecord({
            proposalId: action.contextId,
            root: root,
            nullifier: action.nullifier,
            payloadHash: action.payloadHash,
            encryptedPayloadRef: action.encryptedPayloadRef,
            encryptedPayload: encryptedPayload,
            submitter: action.sender,
            submittedAt: action.timestamp
        });

        unchecked {
            voteCountByProposal[action.contextId] += 1;
        }

        emit VoteStored(
            action.actionId,
            action.contextId,
            root,
            action.nullifier,
            action.payloadHash,
            action.encryptedPayloadRef,
            keccak256(encryptedPayload),
            action.sender
        );

        return ADAPTER_OK;
    }

    function _decodeEncryptedPayload(
        bytes memory adapterData
    ) internal pure returns (bytes memory) {
        if (adapterData.length == 0) return "";

        // Adapter data format v1: abi.encode(bytes encryptedPayload)
        return abi.decode(adapterData, (bytes));
    }
}
