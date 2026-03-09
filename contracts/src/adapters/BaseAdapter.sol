// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IAdapter} from "../interfaces/IAdapter.sol";
import {CipherTypes} from "../types/CipherTypes.sol";

abstract contract BaseAdapter is IAdapter {
    bytes4 internal constant ADAPTER_OK =
        bytes4(keccak256("CIPHER_ADAPTER_OK"));

    address public immutable override router;
    bytes32 public immutable override appId;

    constructor(address router_, bytes32 appId_) {
        router = router_;
        appId = appId_;
    }

    modifier onlyRouter() {
        if (msg.sender != router) revert OnlyRouter();
        _;
    }

    function supportsActionType(
        bytes32 actionType
    ) public view virtual returns (bool);

    function onVerifiedAction(
        CipherTypes.VerifiedAction calldata action
    ) external virtual returns (bytes4);
}
