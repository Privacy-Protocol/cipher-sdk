import type { CipherClientOptions } from "../types/common";
import { getCipherGlobalProviders, resolveCipherConfig } from "../config";
import { CipherClient } from "./CipherClient";

export function createCipherClient(options: CipherClientOptions): CipherClient {
  const { resolved, publicClient } = resolveCipherConfig(options);

  return new CipherClient({
    config: resolved,
    walletClient: options.walletClient,
    publicClient,
    providers: getCipherGlobalProviders(),
    defaultAdapter: options.adapter
  });
}
