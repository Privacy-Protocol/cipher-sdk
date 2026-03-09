// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {IAdapterRegistry} from "../interfaces/IAdapterRegistry.sol";
import {IAdapter} from "../interfaces/IAdapter.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";

contract AdapterRegistry is IAdapterRegistry, Ownable {
    error ZeroAddressAdapter();
    error AdapterAppIdMismatch(bytes32 expectedAppId, bytes32 adapterAppId);
    error AdapterActionNotSupported(bytes32 actionType);

    mapping(bytes32 appId => mapping(bytes32 actionType => address adapter))
        private _adapterOf;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setAdapter(
        bytes32 appId,
        bytes32 actionType,
        address adapter
    ) external onlyOwner {
        if (adapter == address(0)) revert ZeroAddressAdapter();

        bytes32 adapterAppId = IAdapter(adapter).appId();
        if (adapterAppId != appId)
            revert AdapterAppIdMismatch(appId, adapterAppId);
        if (!IAdapter(adapter).supportsActionType(actionType))
            revert AdapterActionNotSupported(actionType);

        _adapterOf[appId][actionType] = adapter;
        emit AdapterSet(appId, actionType, adapter);
    }

    function removeAdapter(
        bytes32 appId,
        bytes32 actionType
    ) external onlyOwner {
        delete _adapterOf[appId][actionType];
        emit AdapterRemoved(appId, actionType);
    }

    function getAdapter(
        bytes32 appId,
        bytes32 actionType
    ) external view returns (address) {
        return _adapterOf[appId][actionType];
    }

    function isAdapterRegistered(
        bytes32 appId,
        bytes32 actionType
    ) external view returns (bool) {
        return _adapterOf[appId][actionType] != address(0);
    }
}
