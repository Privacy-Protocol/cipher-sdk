// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ICircuitVerifier} from "../interfaces/ICircuitVerifier.sol";

contract MockVerifier is ICircuitVerifier {
    bool public result = true;
    bytes32 public expectedProofHash;

    function setResult(bool result_) external {
        result = result_;
    }

    function setExpectedProofHash(bytes32 proofHash) external {
        expectedProofHash = proofHash;
    }

    function verify(bytes calldata proof, bytes32[] calldata) external view returns (bool) {
        if (expectedProofHash != bytes32(0) && expectedProofHash != keccak256(proof)) {
            return false;
        }

        return result;
    }
}
