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
  computePayloadHash,
  hash2,
  parseBigInt,
} from "./proofUtils";

const circuitPath = path.resolve(__dirname, "../../circuits/target/voting_circuit.json");
const circuit = JSON.parse(fs.readFileSync(circuitPath, "utf8"));

function toBytes32(value: string): string {
  return ethers.zeroPadValue(ethers.toBeHex(BigInt(value)), 32);
}

(async () => {
  try {
    const appId = parseBigInt(process.argv[2] ?? "0x01");
    const actionType = parseBigInt(process.argv[3] ?? "0x12");
    const contextId = parseBigInt(process.argv[4] ?? "0x201");

    const optionCount = parseBigInt(process.argv[5] ?? "3");
    const voteOption = parseBigInt(process.argv[6] ?? "1");

    const identitySecret = 4101n;
    const membershipSecret = 4202n;
    const nullifierSecret = 4303n;

    const voteBlinding = 4404n;
    const payloadSalt = 4505n;
    const schemaHash = 5005n;

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

    const voteDigest = await hash2(voteOption, voteBlinding);
    const payloadHash = await computePayloadHash(
      appId,
      actionType,
      contextId,
      schemaHash,
      voteDigest,
      payloadSalt,
    );

    const input = {
      app_id: appId.toString(),
      action_type: actionType.toString(),
      context_id: contextId.toString(),
      nullifier_hash: nullifierHash.toString(),
      payload_hash: payloadHash.toString(),
      root: root.toString(),
      schema_hash: schemaHash.toString(),
      option_count: Number(optionCount),
      identity_secret: identitySecret.toString(),
      membership_secret: membershipSecret.toString(),
      nullifier_secret: nullifierSecret.toString(),
      path_elements: pathElements.map((v) => v.toString()),
      path_indices: pathIndices,
      vote_option: Number(voteOption),
      vote_blinding: voteBlinding.toString(),
      payload_salt: payloadSalt.toString(),
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
    console.error("generateVotingProof failed", error);
    process.exit(1);
  }
})();
