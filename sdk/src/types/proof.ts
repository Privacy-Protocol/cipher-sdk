import type { Hex } from "viem";
import type { Bytes32, CipherWorkflow } from "./common";

export interface CipherProofBundle {
  proof: Hex;
  publicInputs: Bytes32[];
}

export interface MembershipProofInput {
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  payloadHash: Bytes32;
  threshold?: number;
  enforceThreshold?: boolean;
  witness: MembershipWitness;
}

export interface VotingProofInput {
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  optionCount: number;
  voteOption: number;
  witness: MembershipWitness;
  payloadHashOverride?: Bytes32;
  payload: VotingPayloadCommitmentInput;
}

export interface MembershipWitness {
  identitySecret: bigint;
  membershipSecret: bigint;
  nullifierSecret: bigint;
  pathElements: bigint[];
  pathIndices: boolean[];
}

export interface VotingPayloadCommitmentInput {
  schemaHash: bigint;
  voteBlinding: bigint;
  payloadSalt: bigint;
}

export interface CipherProofProvider {
  generateProof(params: {
    workflow: CipherWorkflow;
    input: MembershipProofInput | VotingProofInput;
  }): Promise<CipherProofBundle>;
}
