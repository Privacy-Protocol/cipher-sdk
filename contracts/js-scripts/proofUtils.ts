import { poseidon2Hash } from "@aztec/foundation/crypto";
import { Fr } from "@aztec/foundation/fields";

export const TREE_DEPTH = 20;

export function parseBigInt(input: string): bigint {
  return input.startsWith("0x") ? BigInt(input) : BigInt(input);
}

function toFr(value: bigint): Fr {
  return new Fr(value);
}

export async function hash2(a: bigint, b: bigint): Promise<bigint> {
  const out = await poseidon2Hash([toFr(a), toFr(b)]);
  return BigInt(out.toString());
}

export async function hash3(a: bigint, b: bigint, c: bigint): Promise<bigint> {
  const out = await poseidon2Hash([toFr(a), toFr(b), toFr(c)]);
  return BigInt(out.toString());
}

export async function hash6(
  a: bigint,
  b: bigint,
  c: bigint,
  d: bigint,
  e: bigint,
  f: bigint,
): Promise<bigint> {
  const out = await poseidon2Hash([
    toFr(a),
    toFr(b),
    toFr(c),
    toFr(d),
    toFr(e),
    toFr(f),
  ]);
  return BigInt(out.toString());
}

export async function computeMemberLeaf(
  identitySecret: bigint,
  membershipSecret: bigint,
): Promise<bigint> {
  return hash2(identitySecret, membershipSecret);
}

export async function computeMerkleRoot(
  leaf: bigint,
  pathElements: bigint[],
  pathIndices: boolean[],
): Promise<bigint> {
  let node = leaf;
  for (let i = 0; i < TREE_DEPTH; i++) {
    node = pathIndices[i]
      ? await hash2(pathElements[i], node)
      : await hash2(node, pathElements[i]);
  }
  return node;
}

export async function computeNullifier(
  nullifierSecret: bigint,
  appId: bigint,
  actionType: bigint,
  contextId: bigint,
): Promise<bigint> {
  const scope = await hash3(appId, actionType, contextId);
  const domain = 1001n;
  const scopedDomain = await hash2(scope, domain);
  return hash2(nullifierSecret, scopedDomain);
}

export async function computePayloadHash(
  appId: bigint,
  actionType: bigint,
  contextId: bigint,
  schemaHash: bigint,
  payloadDigest: bigint,
  payloadSalt: bigint,
): Promise<bigint> {
  const payloadDomain = 2001n;
  const saltTerm = await hash6(payloadSalt, payloadDomain, 0n, 0n, 0n, 0n);
  return hash6(appId, actionType, contextId, schemaHash, payloadDigest, saltTerm);
}
