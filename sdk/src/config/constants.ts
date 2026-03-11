import { keccak256, stringToHex } from "viem";
import type { Address } from "viem";

export const CIPHER_ACTION_TYPES = {
  membership: keccak256(stringToHex("CIPHER_ACTION:CREDENTIAL_GATE:v1")),
  voting: keccak256(stringToHex("CIPHER_ACTION:PRIVATE_VOTE:v1"))
} as const;

export const CIPHER_VERIFIER_IDS = {
  membership: keccak256(stringToHex("CIPHER_VERIFIER:CREDENTIAL_GATE_HONK:v1")),
  voting: keccak256(stringToHex("CIPHER_VERIFIER:VOTING_HONK:v1"))
} as const;

export const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";
export const ZERO_BYTES32: `0x${string}` =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
