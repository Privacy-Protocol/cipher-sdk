// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAdapterRegistry {
    event AdapterSet(bytes32 indexed appId, bytes32 indexed actionType, address indexed adapter);
    event AdapterRemoved(bytes32 indexed appId, bytes32 indexed actionType);

    function getAdapter(bytes32 appId, bytes32 actionType) external view returns (address);

    function isAdapterRegistered(bytes32 appId, bytes32 actionType) external view returns (bool);
}
