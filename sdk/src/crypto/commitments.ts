import type { Bytes32 } from "../types/common";
import { asBytes32, bytes32ToBigInt } from "../utils/bytes";
import { hash2, hash3, hash6 } from "./poseidon";

export async function deriveMembershipLeaf(identitySecret: bigint, membershipSecret: bigint): Promise<Bytes32> {
  return asBytes32(await hash2(identitySecret, membershipSecret));
}

export async function deriveMerkleRoot(
  leaf: Bytes32,
  pathElements: bigint[],
  pathIndices: boolean[]
): Promise<Bytes32> {
  let node = bytes32ToBigInt(leaf);
  for (let i = 0; i < pathElements.length; i++) {
    node = pathIndices[i] ? await hash2(pathElements[i], node) : await hash2(node, pathElements[i]);
  }

  return asBytes32(node);
}

export async function deriveNullifier(
  nullifierSecret: bigint,
  appId: Bytes32,
  actionType: Bytes32,
  contextId: Bytes32
): Promise<Bytes32> {
  const scope = await hash3(bytes32ToBigInt(appId), bytes32ToBigInt(actionType), bytes32ToBigInt(contextId));
  const domain = 1001n;
  const scoped = await hash2(scope, domain);
  return asBytes32(await hash2(nullifierSecret, scoped));
}

export async function derivePayloadHash(params: {
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  schemaHash: bigint;
  payloadDigest: bigint;
  payloadSalt: bigint;
}): Promise<Bytes32> {
  const saltTerm = await hash6(params.payloadSalt, 2001n, 0n, 0n, 0n, 0n);
  const commitment = await hash6(
    bytes32ToBigInt(params.appId),
    bytes32ToBigInt(params.actionType),
    bytes32ToBigInt(params.contextId),
    params.schemaHash,
    params.payloadDigest,
    saltTerm
  );

  return asBytes32(commitment);
}

export async function deriveVotingPayloadDigest(voteOption: number, voteBlinding: bigint): Promise<bigint> {
  return hash2(BigInt(voteOption), voteBlinding);
}
