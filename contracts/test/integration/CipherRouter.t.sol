// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

import {CipherTypes} from "../../src/types/CipherTypes.sol";
import {CipherRouter} from "../../src/core/CipherRouter.sol";
import {AdapterRegistry} from "../../src/core/AdapterRegistry.sol";
import {VerifierRegistry} from "../../src/core/VerifierRegistry.sol";
import {NullifierStore} from "../../src/core/NullifierStore.sol";
import {
    CredentialGateAdapter
} from "../../src/adapters/CredentialGateAdapter.sol";
import {VotingAdapter} from "../../src/adapters/VotingAdapter.sol";
import {MockVerifier} from "../../src/mocks/MockVerifier.sol";

contract CipherRouterTest is Test {
    // STUB: verifier is mocked for this phase.
    // Noir proof generation/integration can be plugged into this test suite later via FFI scripts.
    event ActionSubmitted(
        bytes32 indexed actionId,
        bytes32 indexed appId,
        bytes32 indexed actionType,
        bytes32 contextId,
        address adapter,
        bytes32 verifierId,
        bytes32 nullifierKey,
        bytes32 payloadHash,
        bytes32 encryptedPayloadRef,
        address sender
    );

    bytes32 internal constant APP_ID = keccak256("CIPHER_APP:TEST_APP:v1");
    bytes32 internal constant OTHER_APP_ID =
        keccak256("CIPHER_APP:OTHER_APP:v1");

    bytes32 internal constant ACTION_CREDENTIAL_GATE =
        keccak256("CIPHER_ACTION:CREDENTIAL_GATE:v1");
    bytes32 internal constant ACTION_PRIVATE_VOTE =
        keccak256("CIPHER_ACTION:PRIVATE_VOTE:v1");
    bytes32 internal constant ACTION_UNKNOWN =
        keccak256("CIPHER_ACTION:UNKNOWN:v1");

    bytes32 internal constant VERIFIER_ID =
        keccak256("CIPHER_VERIFIER:MOCK:v1");

    bytes32 internal constant GATE_CONTEXT =
        keccak256("CIPHER_CTX:GATE_RESOURCE_1");
    bytes32 internal constant PROPOSAL_CONTEXT =
        keccak256("CIPHER_CTX:PROPOSAL_1");

    bytes32 internal constant ROOT_A = bytes32(uint256(0xA11CE));
    bytes32 internal constant ROOT_B = bytes32(uint256(0xB0B));

    AdapterRegistry internal adapterRegistry;
    VerifierRegistry internal verifierRegistry;
    NullifierStore internal nullifierStore;
    CipherRouter internal router;
    MockVerifier internal verifier;

    CredentialGateAdapter internal credentialAdapter;
    VotingAdapter internal votingAdapter;

    function setUp() public {
        adapterRegistry = new AdapterRegistry(address(this));
        verifierRegistry = new VerifierRegistry(address(this));
        nullifierStore = new NullifierStore(address(this));

        router = new CipherRouter(
            address(this),
            address(adapterRegistry),
            address(verifierRegistry),
            address(nullifierStore)
        );
        nullifierStore.setConsumer(address(router), true);

        credentialAdapter = new CredentialGateAdapter(
            address(this),
            address(router),
            APP_ID,
            ACTION_CREDENTIAL_GATE
        );
        votingAdapter = new VotingAdapter(
            address(this),
            address(router),
            APP_ID,
            ACTION_PRIVATE_VOTE
        );

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

        verifier = new MockVerifier();
        bytes32 schemaHash = router.computeSchemaHash(6);
        verifierRegistry.setVerifier(
            VERIFIER_ID,
            address(verifier),
            schemaHash,
            6,
            true
        );
        verifierRegistry.setVerifierAllowedForAction(
            APP_ID,
            ACTION_CREDENTIAL_GATE,
            VERIFIER_ID,
            true
        );
        verifierRegistry.setVerifierAllowedForAction(
            APP_ID,
            ACTION_PRIVATE_VOTE,
            VERIFIER_ID,
            true
        );

        router.setAppEnabled(APP_ID, true);
    }

    function testCredentialGate_SuccessfulRoutingAndEvent() public {
        credentialAdapter.configureContext(
            GATE_CONTEXT,
            CredentialGateAdapter.GateContextConfig({
                enabled: true,
                requirePayload: false,
                requireEncryptedPayloadRef: false,
                validAfter: 0,
                validUntil: 0
            })
        );
        credentialAdapter.setAllowedRoot(GATE_CONTEXT, ROOT_A, true);

        bytes32 nullifier = keccak256("nullifier-1");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_CREDENTIAL_GATE,
            contextId: GATE_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        bytes32 expectedActionId = router.computeActionId(req, address(this));
        bytes32 expectedNullifierKey = router.computeNullifierKey(
            APP_ID,
            ACTION_CREDENTIAL_GATE,
            GATE_CONTEXT,
            nullifier
        );

        vm.expectEmit(address(router));
        emit ActionSubmitted(
            expectedActionId,
            APP_ID,
            ACTION_CREDENTIAL_GATE,
            GATE_CONTEXT,
            address(credentialAdapter),
            VERIFIER_ID,
            expectedNullifierKey,
            bytes32(0),
            bytes32(0),
            address(this)
        );

        bytes32 actionId = router.submitAction(req);

        assertEq(actionId, expectedActionId);
        assertTrue(nullifierStore.isNullifierUsed(expectedNullifierKey));
    }

    function testReplayPrevention_RevertsOnSecondUse() public {
        credentialAdapter.configureContext(
            GATE_CONTEXT,
            CredentialGateAdapter.GateContextConfig({
                enabled: true,
                requirePayload: false,
                requireEncryptedPayloadRef: false,
                validAfter: 0,
                validUntil: 0
            })
        );
        credentialAdapter.setAllowedRoot(GATE_CONTEXT, ROOT_A, true);

        bytes32 nullifier = keccak256("same-nullifier");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_CREDENTIAL_GATE,
            contextId: GATE_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        router.submitAction(req);

        bytes32 nullifierKey = router.computeNullifierKey(
            APP_ID,
            ACTION_CREDENTIAL_GATE,
            GATE_CONTEXT,
            nullifier
        );
        vm.expectRevert(
            abi.encodeWithSelector(
                NullifierStore.NullifierAlreadyUsed.selector,
                nullifierKey
            )
        );
        router.submitAction(req);
    }

    function testInvalidAdapter_RevertsWhenActionIsNotRegistered() public {
        bytes32 nullifier = keccak256("nullifier-no-adapter");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_UNKNOWN,
            contextId: GATE_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CipherRouter.AdapterNotRegistered.selector,
                APP_ID,
                ACTION_UNKNOWN
            )
        );
        router.submitAction(req);
    }

    function testWrongAppId_RevertsWhenAppNotEnabled() public {
        bytes32 nullifier = keccak256("disabled-app");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: OTHER_APP_ID,
            actionType: ACTION_CREDENTIAL_GATE,
            contextId: GATE_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CipherRouter.AppNotEnabled.selector,
                OTHER_APP_ID
            )
        );
        router.submitAction(req);
    }

    function testWrongActionBinding_RevertsWhenPublicInputMismatches() public {
        credentialAdapter.configureContext(
            GATE_CONTEXT,
            CredentialGateAdapter.GateContextConfig({
                enabled: true,
                requirePayload: false,
                requireEncryptedPayloadRef: false,
                validAfter: 0,
                validUntil: 0
            })
        );
        credentialAdapter.setAllowedRoot(GATE_CONTEXT, ROOT_A, true);

        bytes32 nullifier = keccak256("mismatch-action");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_CREDENTIAL_GATE,
            contextId: GATE_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        req.publicInputs[1] = ACTION_PRIVATE_VOTE;

        vm.expectRevert(
            abi.encodeWithSelector(
                CipherRouter.PublicInputBindingMismatch.selector,
                uint256(1),
                ACTION_CREDENTIAL_GATE,
                ACTION_PRIVATE_VOTE
            )
        );
        router.submitAction(req);
    }

    function testCredentialAdapterValidation_RevertsForUnknownRoot() public {
        credentialAdapter.configureContext(
            GATE_CONTEXT,
            CredentialGateAdapter.GateContextConfig({
                enabled: true,
                requirePayload: false,
                requireEncryptedPayloadRef: false,
                validAfter: 0,
                validUntil: 0
            })
        );

        bytes32 nullifier = keccak256("unknown-root");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_CREDENTIAL_GATE,
            contextId: GATE_CONTEXT,
            root: ROOT_B,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialGateAdapter.RootNotAllowed.selector,
                GATE_CONTEXT,
                ROOT_B
            )
        );
        router.submitAction(req);
    }

    function testCredentialGate_FailsWhenPayloadRequiredButMissing() public {
        credentialAdapter.configureContext(
            GATE_CONTEXT,
            CredentialGateAdapter.GateContextConfig({
                enabled: true,
                requirePayload: true,
                requireEncryptedPayloadRef: false,
                validAfter: 0,
                validUntil: 0
            })
        );
        credentialAdapter.setAllowedRoot(GATE_CONTEXT, ROOT_A, true);

        bytes32 nullifier = keccak256("no-payload");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_CREDENTIAL_GATE,
            contextId: GATE_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CredentialGateAdapter.PayloadRequired.selector,
                GATE_CONTEXT
            )
        );
        router.submitAction(req);
    }

    function testVoting_StoresCommitmentAndInlineEncryptedPayload() public {
        votingAdapter.configureProposal(
            PROPOSAL_CONTEXT,
            VotingAdapter.ProposalConfig({
                enabled: true,
                requirePayload: true,
                requireEncryptedPayload: true,
                startTime: uint64(block.timestamp - 1),
                endTime: uint64(block.timestamp + 1 days)
            })
        );
        votingAdapter.setAllowedRoot(PROPOSAL_CONTEXT, ROOT_A, true);

        bytes32 nullifier = keccak256("vote-nullifier");
        bytes32 payloadHash = keccak256("vote-payload-commitment");
        bytes memory inlineEncryptedVote = hex"112233445566";

        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_PRIVATE_VOTE,
            contextId: PROPOSAL_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: payloadHash,
            encryptedPayloadRef: bytes32(0),
            adapterData: abi.encode(inlineEncryptedVote)
        });

        bytes32 actionId = router.submitAction(req);

        VotingAdapter.VoteRecord memory voteRecord = votingAdapter.getVote(
            actionId
        );
        assertEq(voteRecord.proposalId, PROPOSAL_CONTEXT);
        assertEq(voteRecord.root, ROOT_A);
        assertEq(voteRecord.nullifier, nullifier);
        assertEq(voteRecord.payloadHash, payloadHash);
        assertEq(voteRecord.encryptedPayloadRef, bytes32(0));
        assertEq(voteRecord.encryptedPayload, inlineEncryptedVote);
        assertEq(voteRecord.submitter, address(this));
        assertEq(votingAdapter.voteCountByProposal(PROPOSAL_CONTEXT), 1);
    }

    function testVoting_FailsWhenProposalValidationFails() public {
        votingAdapter.configureProposal(
            PROPOSAL_CONTEXT,
            VotingAdapter.ProposalConfig({
                enabled: true,
                requirePayload: true,
                requireEncryptedPayload: false,
                startTime: uint64(block.timestamp + 1 days),
                endTime: uint64(block.timestamp + 2 days)
            })
        );
        votingAdapter.setAllowedRoot(PROPOSAL_CONTEXT, ROOT_A, true);

        bytes32 nullifier = keccak256("vote-inactive-window");
        bytes32 payloadHash = keccak256("vote-payload-2");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_PRIVATE_VOTE,
            contextId: PROPOSAL_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: payloadHash,
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                VotingAdapter.ProposalNotActive.selector,
                PROPOSAL_CONTEXT,
                uint64(block.timestamp + 1 days),
                uint64(block.timestamp + 2 days),
                uint64(block.timestamp)
            )
        );
        router.submitAction(req);
    }

    function testInvalidProof_RevertsWhenVerifierReturnsFalse() public {
        credentialAdapter.configureContext(
            GATE_CONTEXT,
            CredentialGateAdapter.GateContextConfig({
                enabled: true,
                requirePayload: false,
                requireEncryptedPayloadRef: false,
                validAfter: 0,
                validUntil: 0
            })
        );
        credentialAdapter.setAllowedRoot(GATE_CONTEXT, ROOT_A, true);

        verifier.setResult(false);

        bytes32 nullifier = keccak256("bad-proof");
        CipherTypes.ActionRequest memory req = _buildRequest({
            appId: APP_ID,
            actionType: ACTION_CREDENTIAL_GATE,
            contextId: GATE_CONTEXT,
            root: ROOT_A,
            nullifier: nullifier,
            payloadHash: bytes32(0),
            encryptedPayloadRef: bytes32(0),
            adapterData: ""
        });

        vm.expectRevert(
            abi.encodeWithSelector(
                CipherRouter.InvalidProof.selector,
                VERIFIER_ID
            )
        );
        router.submitAction(req);
    }

    function _buildRequest(
        bytes32 appId,
        bytes32 actionType,
        bytes32 contextId,
        bytes32 root,
        bytes32 nullifier,
        bytes32 payloadHash,
        bytes32 encryptedPayloadRef,
        bytes memory adapterData
    ) internal view returns (CipherTypes.ActionRequest memory req) {
        bytes32[] memory publicInputs = new bytes32[](6);
        publicInputs[0] = appId;
        publicInputs[1] = actionType;
        publicInputs[2] = contextId;
        publicInputs[3] = nullifier;
        publicInputs[4] = payloadHash;
        publicInputs[5] = root;

        req = CipherTypes.ActionRequest({
            appId: appId,
            actionType: actionType,
            contextId: contextId,
            nullifier: nullifier,
            payloadHash: payloadHash,
            encryptedPayloadRef: encryptedPayloadRef,
            verifierId: VERIFIER_ID,
            deadline: uint64(block.timestamp + 1 days),
            publicInputs: publicInputs,
            proof: hex"01020304",
            adapterData: adapterData
        });
    }
}
