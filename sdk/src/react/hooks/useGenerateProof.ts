"use client";

import type { CipherClient } from "../../client";
import { useAsyncTask } from "../internal/useAsyncTask";
import { useResolvedCipherClient } from "../internal/useResolvedCipherClient";
import type { UseCipherHookOptions } from "../types";

type GenerateProofInput = Parameters<CipherClient["generateProof"]>[0];
type GenerateProofOutput = Awaited<ReturnType<CipherClient["generateProof"]>>;

export function useGenerateProof(options: UseCipherHookOptions = {}) {
  const client = useResolvedCipherClient(options.client);
  const task = useAsyncTask<[GenerateProofInput], GenerateProofOutput>((input) =>
    client.generateProof(input)
  );

  return {
    ...task,
    generateProof: task.run
  };
}

