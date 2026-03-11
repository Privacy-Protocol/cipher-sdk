import { encodePacked, hexToBigInt, isHex, keccak256, pad, stringToHex } from "viem";
import { CipherError } from "../errors";
import type { Bytes32 } from "../types/common";

export function asBytes32(value: string | bigint): Bytes32 {
  if (typeof value === "bigint") {
    return pad(`0x${value.toString(16)}`, { size: 32 });
  }

  if (isHex(value)) {
    if (value.length !== 66) {
      throw new CipherError("INVALID_BYTES32", `Expected bytes32 hex, got length ${value.length}`);
    }
    return value;
  }

  return keccak256(stringToHex(value));
}

export function bytes32ToBigInt(value: Bytes32): bigint {
  return hexToBigInt(value);
}

export function deriveSchemaHash(tag: string): Bytes32 {
  return keccak256(stringToHex(`CIPHER_SCHEMA:${tag}`));
}

export function derivePayloadDigest(payload: unknown): Bytes32 {
  const json = JSON.stringify(payload);
  return keccak256(stringToHex(json));
}

export function deriveEncryptedPayloadRef(ciphertext: `0x${string}`, contextId: Bytes32): Bytes32 {
  return keccak256(encodePacked(["bytes32", "bytes"], [contextId, ciphertext]));
}
