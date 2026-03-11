"use client";

import type { CipherClient } from "../../client";
import type { CipherActionRequest } from "../../types";
import { useAsyncTask } from "../internal/useAsyncTask";
import { useResolvedCipherClient } from "../internal/useResolvedCipherClient";
import type { UseCipherHookOptions } from "../types";

type SubmitResult = Awaited<ReturnType<CipherClient["submitAction"]>>;

export function useSubmitCipherAction(options: UseCipherHookOptions = {}) {
  const client = useResolvedCipherClient(options.client);
  const task = useAsyncTask<[CipherActionRequest], SubmitResult>((request) =>
    client.submitAction(request)
  );

  return {
    ...task,
    submitAction: task.run
  };
}

