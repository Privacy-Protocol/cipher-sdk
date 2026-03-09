// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {CipherTypes} from "../types/CipherTypes.sol";

interface ICipherRouter {
    event ActionSubmitted(
        bytes32 indexed actionId,
        bytes32 indexed appId,
        bytes32 indexed actionType,
        bytes32 contextId,
        address adapter,
        bytes32 verifierId,
        bytes32 nullifierKey,
        bytes32 payloadHash,
        bytes32 encryptedPayloadRef,
        address sender
    );

    function submitAction(
        CipherTypes.ActionRequest calldata req
    ) external returns (bytes32 actionId);

    function adapterRegistry() external view returns (address);

    function verifierRegistry() external view returns (address);

    function nullifierStore() external view returns (address);

    function computeActionId(
        CipherTypes.ActionRequest calldata req,
        address sender
    ) external view returns (bytes32);

    function computeNullifierKey(
        bytes32 appId,
        bytes32 actionType,
        bytes32 contextId,
        bytes32 nullifier
    ) external view returns (bytes32);
}
