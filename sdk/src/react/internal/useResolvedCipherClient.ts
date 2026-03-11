import type { CipherClient } from "../../client";
import { useContext } from "react";
import { CipherContext } from "../CipherProvider";

export function useResolvedCipherClient(client?: CipherClient): CipherClient {
  const contextClient = useContext(CipherContext);
  if (client) return client;
  if (contextClient) return contextClient;
  throw new Error(
    "Cipher client not found. Wrap with <CipherProvider> or pass { client } to the hook."
  );
}
