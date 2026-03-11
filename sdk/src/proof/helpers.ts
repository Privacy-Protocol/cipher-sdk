import { encodeAbiParameters } from "viem";
import { CipherError } from "../errors";
import type { Bytes32, CipherActionRequest } from "../types/common";
import type { CipherProofBundle } from "../types/proof";

export function assertProofBindings(params: {
  bundle: CipherProofBundle;
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  payloadHash: Bytes32;
  expectedLength: number;
}): void {
  const { bundle, appId, actionType, contextId, payloadHash, expectedLength } = params;

  if (bundle.publicInputs.length !== expectedLength) {
    throw new CipherError(
      "PROOF_OUTPUT_INVALID",
      `Expected ${expectedLength} public inputs, got ${bundle.publicInputs.length}`
    );
  }

  if (bundle.publicInputs[0] !== appId) {
    throw new CipherError("PROOF_OUTPUT_INVALID", "Proof appId mismatch");
  }
  if (bundle.publicInputs[1] !== actionType) {
    throw new CipherError("PROOF_OUTPUT_INVALID", "Proof actionType mismatch");
  }
  if (bundle.publicInputs[2] !== contextId) {
    throw new CipherError("PROOF_OUTPUT_INVALID", "Proof contextId mismatch");
  }
  if (bundle.publicInputs[4] !== payloadHash) {
    throw new CipherError("PROOF_OUTPUT_INVALID", "Proof payloadHash mismatch");
  }
}

export function buildActionRequestFromProof(params: {
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  verifierId: Bytes32;
  deadline: bigint;
  encryptedPayloadRef: Bytes32;
  bundle: CipherProofBundle;
  adapterData: `0x${string}`;
}): CipherActionRequest {
  const { appId, actionType, contextId, verifierId, deadline, encryptedPayloadRef, bundle, adapterData } = params;

  return {
    appId,
    actionType,
    contextId,
    nullifier: bundle.publicInputs[3],
    payloadHash: bundle.publicInputs[4],
    encryptedPayloadRef,
    verifierId,
    deadline,
    publicInputs: bundle.publicInputs,
    proof: bundle.proof,
    adapterData
  };
}

export function encodeVoteAdapterData(ciphertext?: `0x${string}`): `0x${string}` {
  if (!ciphertext || ciphertext === "0x") return "0x";
  return encodeAbiParameters([{ type: "bytes" }], [ciphertext]);
}
