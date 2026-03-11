"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Bytes32 } from "../../types";
import { useAsyncTask } from "../internal/useAsyncTask";
import { useResolvedCipherClient } from "../internal/useResolvedCipherClient";
import type { UseCipherHookOptions } from "../types";

export interface UseMembershipStateOptions extends UseCipherHookOptions {
  contextId?: string | Bytes32;
  autoLoad?: boolean;
}

export function useMembershipState(options: UseMembershipStateOptions = {}) {
  const client = useResolvedCipherClient(options.client);

  const contextTask = useAsyncTask<[string | Bytes32], Awaited<ReturnType<typeof client.membership.getContextState>>>(
    (contextId) => client.membership.getContextState(contextId)
  );
  const rootAllowedTask = useAsyncTask<
    [{ contextId: string | Bytes32; root: string | Bytes32 }],
    boolean
  >((params) => client.membership.isRootAllowed(params.contextId, params.root));

  const refreshContextState = useCallback(
    (contextId?: string | Bytes32) => {
      const target = contextId ?? options.contextId;
      if (!target) {
        throw new Error("contextId is required to load membership context state");
      }
      return contextTask.run(target);
    },
    [options.contextId, contextTask.run]
  );

  const checkRootAllowed = useCallback(
    (params: { contextId?: string | Bytes32; root: string | Bytes32 }) => {
      const target = params.contextId ?? options.contextId;
      if (!target) {
        throw new Error("contextId is required to check membership root access");
      }
      return rootAllowedTask.run({ contextId: target, root: params.root });
    },
    [options.contextId, rootAllowedTask.run]
  );

  useEffect(() => {
    if (!options.autoLoad || !options.contextId) return;
    void refreshContextState(options.contextId);
  }, [options.autoLoad, options.contextId, refreshContextState]);

  return useMemo(
    () => ({
      refreshContextState,
      contextState: contextTask.data,
      contextStatus: contextTask.status,
      contextError: contextTask.error,

      checkRootAllowed,
      rootAllowed: rootAllowedTask.data,
      rootAllowedStatus: rootAllowedTask.status,
      rootAllowedError: rootAllowedTask.error
    }),
    [
      refreshContextState,
      contextTask.data,
      contextTask.status,
      contextTask.error,
      checkRootAllowed,
      rootAllowedTask.data,
      rootAllowedTask.status,
      rootAllowedTask.error
    ]
  );
}

export const useCredentialGateState = useMembershipState;
