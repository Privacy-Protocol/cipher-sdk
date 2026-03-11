import type { Account, Chain, PublicClient, Transport, WalletClient } from "viem";
import type { CipherProviders, CipherResolvedConfig } from "../types/common";

export interface CipherClientContext {
  walletClient: WalletClient<Transport, Chain, Account>;
  publicClient: PublicClient;
  config: CipherResolvedConfig;
  providers: CipherProviders;
}
