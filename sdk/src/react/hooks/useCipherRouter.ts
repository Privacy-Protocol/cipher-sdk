"use client";

import { useCallback, useMemo } from "react";
import type { CipherClient } from "../../client";
import type { Bytes32, CipherWorkflow } from "../../types";
import { useAsyncTask } from "../internal/useAsyncTask";
import { useResolvedCipherClient } from "../internal/useResolvedCipherClient";
import type { UseCipherHookOptions } from "../types";

type RouterPointers = Awaited<ReturnType<CipherClient["routerState"]>>;
type VerifierConfig = Awaited<ReturnType<CipherClient["getVerifier"]>>;

export function useCipherRouter(options: UseCipherHookOptions = {}) {
  const client = useResolvedCipherClient(options.client);

  const pointersTask = useAsyncTask<[], RouterPointers>(() => client.routerState());
  const adapterTask = useAsyncTask<[CipherWorkflow], `0x${string}`>((workflow) => client.getAdapter(workflow));
  const verifierTask = useAsyncTask<[CipherWorkflow], VerifierConfig>((workflow) =>
    client.getVerifier(workflow)
  );
  const nullifierCheckTask = useAsyncTask<[Bytes32], boolean>((nullifierKey) =>
    client.isNullifierUsed(nullifierKey)
  );
  const nullifierKeyTask = useAsyncTask<
    [{ actionType: Bytes32; contextId: Bytes32; nullifier: Bytes32 }],
    Bytes32
  >((params) => client.computeNullifierKey(params));

  const refreshPointers = useCallback(() => pointersTask.run(), [pointersTask.run]);

  return useMemo(
    () => ({
      refreshPointers,
      pointers: pointersTask.data,
      pointersStatus: pointersTask.status,
      pointersError: pointersTask.error,

      resolveAdapter: adapterTask.run,
      adapterAddress: adapterTask.data,
      adapterStatus: adapterTask.status,
      adapterError: adapterTask.error,

      resolveVerifier: verifierTask.run,
      verifierConfig: verifierTask.data,
      verifierStatus: verifierTask.status,
      verifierError: verifierTask.error,

      checkNullifierUsed: nullifierCheckTask.run,
      nullifierUsed: nullifierCheckTask.data,
      nullifierCheckStatus: nullifierCheckTask.status,
      nullifierCheckError: nullifierCheckTask.error,

      computeNullifierKey: nullifierKeyTask.run,
      computedNullifierKey: nullifierKeyTask.data,
      nullifierKeyStatus: nullifierKeyTask.status,
      nullifierKeyError: nullifierKeyTask.error
    }),
    [
      refreshPointers,
      pointersTask.data,
      pointersTask.status,
      pointersTask.error,
      adapterTask.run,
      adapterTask.data,
      adapterTask.status,
      adapterTask.error,
      verifierTask.run,
      verifierTask.data,
      verifierTask.status,
      verifierTask.error,
      nullifierCheckTask.run,
      nullifierCheckTask.data,
      nullifierCheckTask.status,
      nullifierCheckTask.error,
      nullifierKeyTask.run,
      nullifierKeyTask.data,
      nullifierKeyTask.status,
      nullifierKeyTask.error
    ]
  );
}
