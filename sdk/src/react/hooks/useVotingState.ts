"use client";

import { useCallback, useEffect, useMemo } from "react";
import type { Bytes32 } from "../../types";
import { useAsyncTask } from "../internal/useAsyncTask";
import { useResolvedCipherClient } from "../internal/useResolvedCipherClient";
import type { UseCipherHookOptions } from "../types";

export interface UseVotingStateOptions extends UseCipherHookOptions {
  contextId?: string | Bytes32;
  autoLoad?: boolean;
}

export function useVotingState(options: UseVotingStateOptions = {}) {
  const client = useResolvedCipherClient(options.client);

  const proposalTask = useAsyncTask<[string | Bytes32], Awaited<ReturnType<typeof client.voting.getProposalState>>>(
    (contextId) => client.voting.getProposalState(contextId)
  );
  const rootAllowedTask = useAsyncTask<
    [{ contextId: string | Bytes32; root: string | Bytes32 }],
    boolean
  >((params) => client.voting.isRootAllowed(params.contextId, params.root));
  const voteTask = useAsyncTask<[string | Bytes32], Awaited<ReturnType<typeof client.voting.getVote>>>(
    (actionId) => client.voting.getVote(actionId)
  );

  const refreshProposalState = useCallback(
    (contextId?: string | Bytes32) => {
      const target = contextId ?? options.contextId;
      if (!target) {
        throw new Error("contextId is required to load voting proposal state");
      }
      return proposalTask.run(target);
    },
    [options.contextId, proposalTask.run]
  );

  const checkRootAllowed = useCallback(
    (params: { contextId?: string | Bytes32; root: string | Bytes32 }) => {
      const target = params.contextId ?? options.contextId;
      if (!target) {
        throw new Error("contextId is required to check voting root access");
      }
      return rootAllowedTask.run({ contextId: target, root: params.root });
    },
    [options.contextId, rootAllowedTask.run]
  );

  const getVote = useCallback((actionId: string | Bytes32) => voteTask.run(actionId), [voteTask.run]);

  useEffect(() => {
    if (!options.autoLoad || !options.contextId) return;
    void refreshProposalState(options.contextId);
  }, [options.autoLoad, options.contextId, refreshProposalState]);

  return useMemo(
    () => ({
      refreshProposalState,
      proposalState: proposalTask.data,
      proposalStatus: proposalTask.status,
      proposalError: proposalTask.error,

      checkRootAllowed,
      rootAllowed: rootAllowedTask.data,
      rootAllowedStatus: rootAllowedTask.status,
      rootAllowedError: rootAllowedTask.error,

      getVote,
      voteRecord: voteTask.data,
      voteStatus: voteTask.status,
      voteError: voteTask.error
    }),
    [
      refreshProposalState,
      proposalTask.data,
      proposalTask.status,
      proposalTask.error,
      checkRootAllowed,
      rootAllowedTask.data,
      rootAllowedTask.status,
      rootAllowedTask.error,
      getVote,
      voteTask.data,
      voteTask.status,
      voteTask.error
    ]
  );
}
