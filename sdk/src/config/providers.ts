import type { CipherProviders } from "../types/common";
import type { CipherEncryptionProvider, CipherPayloadStorageProvider } from "../types/encryption";
import type { CipherProofProvider } from "../types/proof";
import { BrowserCipherProofProvider } from "../proof/browserProofProvider";
import { NoopCipherEncryptionProvider, NoopCipherPayloadStorageProvider } from "../encryption/noopProviders";

let globalProviders: CipherProviders = {
  proofProvider: new BrowserCipherProofProvider(),
  encryptionProvider: new NoopCipherEncryptionProvider(),
  payloadStorageProvider: new NoopCipherPayloadStorageProvider()
};

export function configureCipherGlobalProviders(input: {
  proofProvider?: CipherProofProvider;
  encryptionProvider?: CipherEncryptionProvider;
  payloadStorageProvider?: CipherPayloadStorageProvider;
}): void {
  globalProviders = {
    proofProvider: input.proofProvider ?? globalProviders.proofProvider,
    encryptionProvider: input.encryptionProvider ?? globalProviders.encryptionProvider,
    payloadStorageProvider: input.payloadStorageProvider ?? globalProviders.payloadStorageProvider
  };
}

export function getCipherGlobalProviders(): CipherProviders {
  return globalProviders;
}
