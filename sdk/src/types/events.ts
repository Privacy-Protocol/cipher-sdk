import type { Address, Hex } from "viem";
import type { Bytes32 } from "./common";

export interface RouterActionSubmittedLog {
  type: "router.actionSubmitted";
  actionId: Bytes32;
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  adapter: Address;
  verifierId: Bytes32;
  nullifierKey: Bytes32;
  payloadHash: Bytes32;
  encryptedPayloadRef: Bytes32;
  sender: Address;
  txHash: Hex;
}

export interface VotingStoredLog {
  type: "voting.voteStored";
  actionId: Bytes32;
  contextId: Bytes32;
  root: Bytes32;
  nullifier: Bytes32;
  payloadHash: Bytes32;
  encryptedPayloadRef: Bytes32;
  encryptedPayloadDigest: Bytes32;
  submitter: Address;
  txHash: Hex;
}

export interface MembershipGrantedLog {
  type: "membership.accessGranted";
  actionId: Bytes32;
  contextId: Bytes32;
  root: Bytes32;
  nullifier: Bytes32;
  payloadHash: Bytes32;
  encryptedPayloadRef: Bytes32;
  sender: Address;
  txHash: Hex;
}

export type ParsedCipherLog =
  | RouterActionSubmittedLog
  | VotingStoredLog
  | MembershipGrantedLog;
