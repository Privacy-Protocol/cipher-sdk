// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

interface INullifierStore {
    event NullifierConsumed(
        bytes32 indexed nullifierKey,
        bytes32 indexed actionId
    );

    function isNullifierUsed(bytes32 nullifierKey) external view returns (bool);

    function consumeNullifier(bytes32 nullifierKey, bytes32 actionId) external;
}
