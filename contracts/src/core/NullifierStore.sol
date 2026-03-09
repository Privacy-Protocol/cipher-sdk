// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {INullifierStore} from "../interfaces/INullifierStore.sol";
import {Ownable} from "openzeppelin/access/Ownable.sol";

contract NullifierStore is INullifierStore, Ownable {
    error NullifierAlreadyUsed(bytes32 nullifierKey);
    error UnauthorizedConsumer(address caller);

    mapping(bytes32 => bool) private _usedNullifier;
    mapping(address => bool) public isConsumer;

    event ConsumerSet(address indexed consumer, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setConsumer(address consumer, bool allowed) external onlyOwner {
        isConsumer[consumer] = allowed;
        emit ConsumerSet(consumer, allowed);
    }

    function isNullifierUsed(
        bytes32 nullifierKey
    ) external view returns (bool) {
        return _usedNullifier[nullifierKey];
    }

    function consumeNullifier(bytes32 nullifierKey, bytes32 actionId) external {
        if (!isConsumer[msg.sender]) revert UnauthorizedConsumer(msg.sender);
        if (_usedNullifier[nullifierKey])
            revert NullifierAlreadyUsed(nullifierKey);

        _usedNullifier[nullifierKey] = true;
        emit NullifierConsumed(nullifierKey, actionId);
    }
}
