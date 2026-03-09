// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {CipherTypes} from "../types/CipherTypes.sol";

interface IAdapter {
    error OnlyRouter();
    error UnsupportedActionType(bytes32 actionType);
    error InvalidAction();

    function router() external view returns (address);

    function appId() external view returns (bytes32);

    function supportsActionType(bytes32 actionType) external view returns (bool);

    function onVerifiedAction(CipherTypes.VerifiedAction calldata action) external returns (bytes4);
}
