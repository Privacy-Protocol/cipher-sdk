import type { Hex } from "viem";
import type { Bytes32, CipherWorkflow } from "./common";

export interface EncryptedPayloadArtifact {
  ciphertext: Hex;
  metadata?: Record<string, unknown>;
}

export interface CipherEncryptionProvider {
  encrypt(params: {
    workflow: CipherWorkflow;
    contextId: Bytes32;
    payload: unknown;
  }): Promise<EncryptedPayloadArtifact>;
}

export interface CipherPayloadStorageProvider {
  put(params: {
    workflow: CipherWorkflow;
    contextId: Bytes32;
    encrypted: EncryptedPayloadArtifact;
  }): Promise<{ encryptedPayloadRef: Bytes32; uri?: string }>;
}
