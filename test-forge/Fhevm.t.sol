// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {FhevmTest} from "forge-fhevm/FhevmTest.sol";
import {FheType} from "@fhevm/host-contracts/contracts/shared/FheType.sol";
import {FHE} from "@fhevm/solidity/lib/FHE.sol";
import "encrypted-types/EncryptedTypes.sol";

contract MyTest is FhevmTest {
    function test_encryptAndDecrypt() public {
        (externalEuint64 handle, bytes memory proof) = encryptUint64(
            42,
            address(this)
        );

        euint64 verified = euint64.wrap(
            _executor.verifyInput(
                externalEuint64.unwrap(handle),
                address(this),
                proof,
                FheType.Uint64
            )
        );

        assertEq(decrypt(verified), 42);
    }
}
