import { poseidon2Hash } from "@aztec/foundation/crypto";
import { Fr } from "@aztec/foundation/fields";

function toFr(value: bigint): Fr {
  return new Fr(value);
}

async function hash(values: bigint[]): Promise<bigint> {
  const out = await poseidon2Hash(values.map(toFr));
  return BigInt(out.toString());
}

export async function hash2(a: bigint, b: bigint): Promise<bigint> {
  return hash([a, b]);
}

export async function hash3(a: bigint, b: bigint, c: bigint): Promise<bigint> {
  return hash([a, b, c]);
}

export async function hash6(
  a: bigint,
  b: bigint,
  c: bigint,
  d: bigint,
  e: bigint,
  f: bigint
): Promise<bigint> {
  return hash([a, b, c, d, e, f]);
}
