// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICircuitVerifier {
    function verify(bytes calldata proof, bytes32[] calldata publicInputs) external view returns (bool);
}
