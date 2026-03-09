import { UltraHonkBackend } from "@aztec/bb.js";
import { Noir } from "@noir-lang/noir_js";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import {
  TREE_DEPTH,
  computeMemberLeaf,
  computeMerkleRoot,
  computeNullifier,
  parseBigInt,
} from "./proofUtils";

const circuitPath = path.resolve(
  __dirname,
  "../../circuits/target/credential_gate_circuit.json",
);

const circuit = JSON.parse(fs.readFileSync(circuitPath, "utf8"));

function toBytes32(value: string): string {
  return ethers.zeroPadValue(ethers.toBeHex(BigInt(value)), 32);
}

(async () => {
  try {
    const appId = parseBigInt(process.argv[2] ?? "0x01");
    const actionType = parseBigInt(process.argv[3] ?? "0x11");
    const contextId = parseBigInt(process.argv[4] ?? "0x101");

    const identitySecret = 1001n;
    const membershipSecret = 2002n;
    const nullifierSecret = 3003n;

    const pathElements = new Array<bigint>(TREE_DEPTH).fill(0n);
    const pathIndices = new Array<boolean>(TREE_DEPTH).fill(false);

    const leaf = await computeMemberLeaf(identitySecret, membershipSecret);
    const root = await computeMerkleRoot(leaf, pathElements, pathIndices);
    const nullifierHash = await computeNullifier(
      nullifierSecret,
      appId,
      actionType,
      contextId,
    );

    const input = {
      app_id: appId.toString(),
      action_type: actionType.toString(),
      context_id: contextId.toString(),
      nullifier_hash: nullifierHash.toString(),
      payload_hash: "0",
      root: root.toString(),
      schema_hash: "0",
      threshold: "0",
      enforce_threshold: false,
      identity_secret: identitySecret.toString(),
      membership_secret: membershipSecret.toString(),
      nullifier_secret: nullifierSecret.toString(),
      path_elements: pathElements.map((v) => v.toString()),
      path_indices: pathIndices,
      attribute_value: "999",
      payload_digest: "0",
      payload_salt: "0",
    };

    const noir = new Noir(circuit);
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 1 });

    const { witness } = await noir.execute(input);

    const originalLog = console.log;
    let proof: Uint8Array;
    let publicInputs: string[];
    try {
      console.log = () => {};
      ({ proof, publicInputs } = await honk.generateProof(witness, {
        keccakZK: true,
      }));
    } finally {
      console.log = originalLog;
    }

    const result = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes", "bytes32[]"],
      [proof, publicInputs.map(toBytes32)],
    );

    process.stdout.write(result);
    process.exit(0);
  } catch (error) {
    console.error("generateCredentialGateProof failed", error);
    process.exit(1);
  }
})();
