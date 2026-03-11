"use client";

import { createContext, useContext, useMemo } from "react";
import { createCipherClient } from "../client";
import type { CipherClient } from "../client";
import { CipherError } from "../errors";
import type { CipherProviderProps } from "./types";

export const CipherContext = createContext<CipherClient | null>(null);

export function CipherProvider(props: CipherProviderProps) {
  const providedClient = props.client;
  const chain = "chain" in props ? props.chain : undefined;
  const walletClient = "walletClient" in props ? props.walletClient : undefined;
  const appId = "appId" in props ? props.appId : undefined;
  const adapter = "adapter" in props ? props.adapter : undefined;

  const value = useMemo(() => {
    if (providedClient) return providedClient;

    if (!chain || !walletClient || !appId) {
      throw new CipherError(
        "TRANSACTION_ERROR",
        "CipherProvider requires either a prebuilt client or chain + walletClient + appId"
      );
    }

    return createCipherClient({
      chain,
      walletClient,
      appId,
      adapter
    });
  }, [providedClient, chain, walletClient, appId, adapter]);

  return <CipherContext.Provider value={value}>{props.children}</CipherContext.Provider>;
}

export function useCipherContextClient(): CipherClient {
  const client = useContext(CipherContext);
  if (!client) {
    throw new CipherError(
      "TRANSACTION_ERROR",
      "CipherProvider is missing. Wrap your app with <CipherProvider> or pass a client directly to the hook."
    );
  }
  return client;
}
