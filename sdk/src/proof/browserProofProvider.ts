import type { CipherProofBundle, CipherProofProvider } from "../types/proof";
import { CipherError } from "../errors";

export interface BrowserCipherProverBridge {
  generateProof(params: Parameters<CipherProofProvider["generateProof"]>[0]): Promise<CipherProofBundle>;
}

// Default proof provider that looks for a browser/global prover bridge.
// This keeps client initialization minimal while allowing pluggable prover engines.
export class BrowserCipherProofProvider implements CipherProofProvider {
  async generateProof(
    params: Parameters<CipherProofProvider["generateProof"]>[0]
  ): Promise<CipherProofBundle> {
    const bridge = (globalThis as { __cipherBrowserProver?: BrowserCipherProverBridge }).__cipherBrowserProver;
    if (!bridge) {
      throw new CipherError(
        "PROOF_PROVIDER_ERROR",
        "No browser proof provider bridge found. Set globalThis.__cipherBrowserProver or configureCipherGlobalProviders({ proofProvider })."
      );
    }

    return bridge.generateProof(params);
  }
}
