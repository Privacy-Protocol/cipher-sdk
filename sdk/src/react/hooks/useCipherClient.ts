"use client";

import { useContext, useMemo } from "react";
import { createCipherClient } from "../../client";
import type { CipherClient } from "../../client";
import type { CipherClientOptions } from "../../types";
import { CipherContext } from "../CipherProvider";

export function useCipherClient(options?: CipherClientOptions): CipherClient {
  const contextClient = useContext(CipherContext);
  const chain = options?.chain;
  const walletClient = options?.walletClient;
  const appId = options?.appId;
  const adapter = options?.adapter;

  const localClient = useMemo(() => {
    if (!chain || !walletClient || !appId) return null;
    return createCipherClient({ chain, walletClient, appId, adapter });
  }, [chain, walletClient, appId, adapter]);

  if (localClient) return localClient;
  if (contextClient) return contextClient;

  throw new Error(
    "Cipher client not found. Wrap your component with <CipherProvider> or pass options to useCipherClient(...)."
  );
}
