import { keccak256, toHex } from "viem";
import type {
  CipherEncryptionProvider,
  CipherPayloadStorageProvider,
  EncryptedPayloadArtifact
} from "../types/encryption";

export class NoopCipherEncryptionProvider implements CipherEncryptionProvider {
  async encrypt(params: {
    workflow: "membership" | "voting";
    contextId: `0x${string}`;
    payload: unknown;
  }): Promise<EncryptedPayloadArtifact> {
    const json = JSON.stringify({ workflow: params.workflow, payload: params.payload });
    const bytes = new TextEncoder().encode(json);
    return { ciphertext: toHex(bytes) };
  }
}

export class NoopCipherPayloadStorageProvider implements CipherPayloadStorageProvider {
  async put(params: {
    workflow: "membership" | "voting";
    contextId: `0x${string}`;
    encrypted: EncryptedPayloadArtifact;
  }): Promise<{ encryptedPayloadRef: `0x${string}`; uri?: string }> {
    const ref = keccak256(params.encrypted.ciphertext);
    return { encryptedPayloadRef: ref, uri: undefined };
  }
}
