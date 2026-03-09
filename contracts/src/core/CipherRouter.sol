// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICipherRouter} from "../interfaces/ICipherRouter.sol";
import {IAdapterRegistry} from "../interfaces/IAdapterRegistry.sol";
import {IVerifierRegistry} from "../interfaces/IVerifierRegistry.sol";
import {INullifierStore} from "../interfaces/INullifierStore.sol";
import {ICircuitVerifier} from "../interfaces/ICircuitVerifier.sol";
import {IAdapter} from "../interfaces/IAdapter.sol";
import {CipherTypes} from "../types/CipherTypes.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";

contract CipherRouter is ICipherRouter, Ownable {
    error AppNotEnabled(bytes32 appId);
    error AdapterNotRegistered(bytes32 appId, bytes32 actionType);
    error VerifierNotAllowed(
        bytes32 appId,
        bytes32 actionType,
        bytes32 verifierId
    );
    error VerifierDisabled(bytes32 verifierId);
    error ExpiredRequest(uint64 deadline, uint64 currentTimestamp);
    error InvalidPublicInputCount(uint256 expected, uint256 got);
    error PublicInputBindingMismatch(
        uint256 index,
        bytes32 expected,
        bytes32 got
    );
    error InvalidProof(bytes32 verifierId);
    error AdapterExecutionFailed(address adapter);

    bytes4 internal constant ADAPTER_OK =
        bytes4(keccak256("CIPHER_ADAPTER_OK"));

    bytes32 internal constant ACTION_ID_DOMAIN =
        keccak256("CIPHER_ACTION_ID_V1");
    bytes32 internal constant NULLIFIER_DOMAIN =
        keccak256("CIPHER_NULLIFIER_V1");
    bytes32 internal constant PUBLIC_INPUT_SCHEMA_DOMAIN =
        keccak256("CIPHER_PUBLIC_INPUT_SCHEMA_V1");

    address public immutable override adapterRegistry;
    address public immutable override verifierRegistry;
    address public immutable override nullifierStore;

    mapping(bytes32 appId => bool enabled) public appEnabled;

    event AppEnabled(bytes32 indexed appId, bool enabled);

    constructor(
        address initialOwner,
        address adapterRegistry_,
        address verifierRegistry_,
        address nullifierStore_
    ) Ownable(initialOwner) {
        adapterRegistry = adapterRegistry_;
        verifierRegistry = verifierRegistry_;
        nullifierStore = nullifierStore_;
    }

    function setAppEnabled(bytes32 appId, bool enabled) external onlyOwner {
        appEnabled[appId] = enabled;
        emit AppEnabled(appId, enabled);
    }

    function submitAction(
        CipherTypes.ActionRequest calldata req
    ) external returns (bytes32 actionId) {
        if (!appEnabled[req.appId]) revert AppNotEnabled(req.appId);

        if (req.deadline != 0 && block.timestamp > req.deadline) {
            revert ExpiredRequest(req.deadline, uint64(block.timestamp));
        }

        address adapter = IAdapterRegistry(adapterRegistry).getAdapter(
            req.appId,
            req.actionType
        );
        if (adapter == address(0))
            revert AdapterNotRegistered(req.appId, req.actionType);

        if (
            !IVerifierRegistry(verifierRegistry).isVerifierAllowed(
                req.appId,
                req.actionType,
                req.verifierId
            )
        ) {
            revert VerifierNotAllowed(
                req.appId,
                req.actionType,
                req.verifierId
            );
        }

        CipherTypes.VerifierConfig memory config = IVerifierRegistry(
            verifierRegistry
        ).getVerifier(req.verifierId);
        if (!config.enabled || config.verifier == address(0)) {
            revert VerifierDisabled(req.verifierId);
        }

        _validatePublicInputs(
            req,
            config.publicInputsCount,
            config.publicInputSchemaHash
        );

        bool proofOk = ICircuitVerifier(config.verifier).verify(
            req.proof,
            req.publicInputs
        );
        if (!proofOk) revert InvalidProof(req.verifierId);

        actionId = computeActionId(req, msg.sender);

        bytes32 nullifierKey = computeNullifierKey(
            req.appId,
            req.actionType,
            req.contextId,
            req.nullifier
        );
        INullifierStore(nullifierStore).consumeNullifier(
            nullifierKey,
            actionId
        );

        _routeToAdapter(adapter, req, actionId);
        _emitActionSubmitted(req, actionId, adapter, nullifierKey);
    }

    function computeActionId(
        CipherTypes.ActionRequest calldata req,
        address sender
    ) public view returns (bytes32) {
        bytes32 requestHash = keccak256(
            abi.encode(
                req.appId,
                req.actionType,
                req.contextId,
                req.nullifier,
                req.payloadHash,
                req.encryptedPayloadRef,
                req.verifierId,
                req.deadline,
                keccak256(req.proof),
                keccak256(abi.encode(req.publicInputs)),
                keccak256(req.adapterData)
            )
        );

        return
            keccak256(
                abi.encode(
                    ACTION_ID_DOMAIN,
                    block.chainid,
                    address(this),
                    sender,
                    requestHash
                )
            );
    }

    function computeNullifierKey(
        bytes32 appId,
        bytes32 actionType,
        bytes32 contextId,
        bytes32 nullifier
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    NULLIFIER_DOMAIN,
                    block.chainid,
                    address(this),
                    appId,
                    actionType,
                    contextId,
                    nullifier
                )
            );
    }

    function computeSchemaHash(
        uint16 publicInputsCount
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(PUBLIC_INPUT_SCHEMA_DOMAIN, publicInputsCount)
            );
    }

    // Security-critical: these fixed indexes bind proof public signals to Router request metadata.
    function _validatePublicInputs(
        CipherTypes.ActionRequest calldata req,
        uint16 expectedCount,
        bytes32 expectedSchemaHash
    ) internal pure {
        uint256 inputCount = req.publicInputs.length;
        if (inputCount != expectedCount)
            revert InvalidPublicInputCount(expectedCount, inputCount);

        bytes32 schemaHash = computeSchemaHash(expectedCount);
        if (schemaHash != expectedSchemaHash) {
            revert PublicInputBindingMismatch(
                999,
                expectedSchemaHash,
                schemaHash
            );
        }

        if (inputCount < 5) revert InvalidPublicInputCount(5, inputCount);

        _assertPublicInput(0, req.appId, req.publicInputs[0]);
        _assertPublicInput(1, req.actionType, req.publicInputs[1]);
        _assertPublicInput(2, req.contextId, req.publicInputs[2]);
        _assertPublicInput(3, req.nullifier, req.publicInputs[3]);
        _assertPublicInput(4, req.payloadHash, req.publicInputs[4]);
    }

    function _assertPublicInput(
        uint256 index,
        bytes32 expected,
        bytes32 got
    ) internal pure {
        if (expected != got)
            revert PublicInputBindingMismatch(index, expected, got);
    }

    function _routeToAdapter(
        address adapter,
        CipherTypes.ActionRequest calldata req,
        bytes32 actionId
    ) internal {
        CipherTypes.VerifiedAction memory action = CipherTypes.VerifiedAction({
            actionId: actionId,
            sender: msg.sender,
            timestamp: uint64(block.timestamp),
            appId: req.appId,
            actionType: req.actionType,
            contextId: req.contextId,
            nullifier: req.nullifier,
            payloadHash: req.payloadHash,
            encryptedPayloadRef: req.encryptedPayloadRef,
            verifierId: req.verifierId,
            publicInputs: req.publicInputs,
            adapterData: req.adapterData
        });

        bytes4 result = IAdapter(adapter).onVerifiedAction(action);
        if (result != ADAPTER_OK) revert AdapterExecutionFailed(adapter);
    }

    function _emitActionSubmitted(
        CipherTypes.ActionRequest calldata req,
        bytes32 actionId,
        address adapter,
        bytes32 nullifierKey
    ) internal {
        emit ActionSubmitted(
            actionId,
            req.appId,
            req.actionType,
            req.contextId,
            adapter,
            req.verifierId,
            nullifierKey,
            req.payloadHash,
            req.encryptedPayloadRef,
            msg.sender
        );
    }
}
