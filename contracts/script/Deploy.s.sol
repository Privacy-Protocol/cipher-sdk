// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

import {CipherTypes} from "../src/types/CipherTypes.sol";
import {CipherRouter} from "../src/core/CipherRouter.sol";
import {AdapterRegistry} from "../src/core/AdapterRegistry.sol";
import {VerifierRegistry} from "../src/core/VerifierRegistry.sol";
import {NullifierStore} from "../src/core/NullifierStore.sol";
import {CredentialGateAdapter} from "../src/adapters/CredentialGateAdapter.sol";
import {VotingAdapter} from "../src/adapters/VotingAdapter.sol";
import {HonkVerifier as CredentialGateHonkVerifier} from "../src/verifiers/CredentialGateVerifier.sol";
import {HonkVerifier as VotingHonkVerifier} from "../src/verifiers/VotingVerifier.sol";

contract DeployScript is Script {
    bytes32 internal constant APP_ID = bytes32(uint256(1001));
    bytes32 internal constant ACTION_CREDENTIAL_GATE = bytes32(uint256(2001));
    bytes32 internal constant ACTION_PRIVATE_VOTE = bytes32(uint256(2002));
    
    bytes32 internal constant CREDENTIAL_VERIFIER_ID = keccak256("CIPHER_VERIFIER:CREDENTIAL_GATE_HONK:v1");
    bytes32 internal constant VOTING_VERIFIER_ID = keccak256("CIPHER_VERIFIER:VOTING_HONK:v1");

    function run() public {
        address deployer = msg.sender;

        console.log("Deploying contracts with the account:", deployer);

        vm.startBroadcast();

        // 1. Core Contracts
        AdapterRegistry adapterRegistry = new AdapterRegistry(deployer);
        console.log("AdapterRegistry deployed at:", address(adapterRegistry));

        VerifierRegistry verifierRegistry = new VerifierRegistry(deployer);
        console.log("VerifierRegistry deployed at:", address(verifierRegistry));

        NullifierStore nullifierStore = new NullifierStore(deployer);
        console.log("NullifierStore deployed at:", address(nullifierStore));

        CipherRouter router = new CipherRouter(
            deployer,
            address(adapterRegistry),
            address(verifierRegistry),
            address(nullifierStore)
        );
        console.log("CipherRouter deployed at:", address(router));

        nullifierStore.setConsumer(address(router), true);
        console.log("CipherRouter set as consumer in NullifierStore");

        // 2. Adapters
        CredentialGateAdapter credentialAdapter = new CredentialGateAdapter(
            deployer,
            address(router),
            APP_ID,
            ACTION_CREDENTIAL_GATE
        );
        console.log("CredentialGateAdapter deployed at:", address(credentialAdapter));

        VotingAdapter votingAdapter = new VotingAdapter(
            deployer,
            address(router),
            APP_ID,
            ACTION_PRIVATE_VOTE
        );
        console.log("VotingAdapter deployed at:", address(votingAdapter));

        adapterRegistry.setAdapter(
            APP_ID,
            ACTION_CREDENTIAL_GATE,
            address(credentialAdapter)
        );
        adapterRegistry.setAdapter(
            APP_ID,
            ACTION_PRIVATE_VOTE,
            address(votingAdapter)
        );
        console.log("Adapters registered in AdapterRegistry");

        // 3. Verifiers
        CredentialGateHonkVerifier credentialVerifier = new CredentialGateHonkVerifier();
        console.log("CredentialGateHonkVerifier deployed at:", address(credentialVerifier));

        VotingHonkVerifier votingVerifier = new VotingHonkVerifier();
        console.log("VotingHonkVerifier deployed at:", address(votingVerifier));

        verifierRegistry.setVerifier(
            CREDENTIAL_VERIFIER_ID,
            address(credentialVerifier),
            router.computeSchemaHash(9),
            9,
            true
        );
        verifierRegistry.setVerifier(
            VOTING_VERIFIER_ID,
            address(votingVerifier),
            router.computeSchemaHash(8),
            8,
            true
        );
        console.log("Verifiers registered in VerifierRegistry");

        // 4. Set verifiers allowed for actions
        verifierRegistry.setVerifierAllowedForAction(
            APP_ID,
            ACTION_CREDENTIAL_GATE,
            CREDENTIAL_VERIFIER_ID,
            true
        );
        verifierRegistry.setVerifierAllowedForAction(
            APP_ID,
            ACTION_PRIVATE_VOTE,
            VOTING_VERIFIER_ID,
            true
        );
        console.log("Verifiers allowed for actions in VerifierRegistry");

        // 5. Enable App
        router.setAppEnabled(APP_ID, true);
        console.log("App enabled in CipherRouter");

        vm.stopBroadcast();
    }
}
