import type { Bytes32, CipherActionRequest, CipherTxReceipt } from "./common";
import type { CipherProofBundle, MembershipWitness } from "./proof";

export interface MembershipInput {
  contextId: string | Bytes32;
  witness: MembershipWitness;
  rangePolicy?: {
    threshold: number;
    enforce: boolean;
  };
  payload?: MembershipPayloadCommitmentInput;
  encryption?: MembershipEncryptionInput;
  deadlineSecondsFromNow?: number;
}

export interface MembershipPayloadCommitmentInput {
  schemaHash: bigint;
  payloadDigest: bigint;
  payloadSalt: bigint;
}

export interface MembershipEncryptionInput {
  payload: unknown;
  inline?: boolean;
}

export interface MembershipPrepared {
  request: CipherActionRequest;
  proofBundle: CipherProofBundle;
  root: Bytes32;
}

export interface MembershipExecuteResult extends CipherTxReceipt {
  request: CipherActionRequest;
  root: Bytes32;
}
