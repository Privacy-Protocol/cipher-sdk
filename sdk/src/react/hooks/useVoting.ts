"use client";

import { useCallback, useMemo, useState } from "react";
import type { Bytes32, VotingExecuteResult, VotingInput, VotingPrepared } from "../../types";
import { useResolvedCipherClient } from "../internal/useResolvedCipherClient";
import { toError } from "../internal/toError";
import type { AsyncStatus, UseCipherHookOptions, WorkflowPhase } from "../types";

function phaseToStatus(phase: WorkflowPhase): AsyncStatus {
  if (phase === "error") return "error";
  if (phase === "success" || phase === "prepared") return "success";
  if (phase === "preparing" || phase === "submitting") return "loading";
  return "idle";
}

export function useVoting(options: UseCipherHookOptions = {}) {
  const client = useResolvedCipherClient(options.client);

  const [phase, setPhase] = useState<WorkflowPhase>("idle");
  const [prepared, setPrepared] = useState<VotingPrepared | null>(null);
  const [result, setResult] = useState<VotingExecuteResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setPrepared(null);
    setResult(null);
    setError(null);
  }, []);

  const buildProofInput = useCallback((input: VotingInput) => client.voting.buildProofInput(input), [client]);

  const prepare = useCallback(
    async (input: VotingInput): Promise<VotingPrepared> => {
      setPhase("preparing");
      setError(null);

      try {
        const nextPrepared = await client.voting.prepare(input);
        setPrepared(nextPrepared);
        setPhase("prepared");
        return nextPrepared;
      } catch (caught) {
        const normalized = toError(caught);
        setError(normalized);
        setPhase("error");
        throw normalized;
      }
    },
    [client]
  );

  const submitPrepared = useCallback(
    async (nextPrepared: VotingPrepared): Promise<VotingExecuteResult> => {
      setPhase("submitting");
      setError(null);
      setPrepared(nextPrepared);

      try {
        const tx = await client.submitAction(nextPrepared.request);
        const nextResult: VotingExecuteResult = {
          ...tx,
          request: nextPrepared.request,
          root: nextPrepared.root
        };
        setResult(nextResult);
        setPhase("success");
        return nextResult;
      } catch (caught) {
        const normalized = toError(caught);
        setError(normalized);
        setPhase("error");
        throw normalized;
      }
    },
    [client]
  );

  const execute = useCallback(
    async (input: VotingInput): Promise<VotingExecuteResult> => {
      const nextPrepared = await prepare(input);
      return submitPrepared(nextPrepared);
    },
    [prepare, submitPrepared]
  );

  const computeExpectedRoot = useCallback(
    (input: {
      identitySecret: bigint;
      membershipSecret: bigint;
      pathElements: bigint[];
      pathIndices: boolean[];
    }) => client.voting.computeExpectedRoot(input),
    [client]
  );

  const computeExpectedNullifier = useCallback(
    (input: { nullifierSecret: bigint; contextId: string | Bytes32 }) =>
      client.voting.computeExpectedNullifier(input),
    [client]
  );

  const status = phaseToStatus(phase);

  return useMemo(
    () => ({
      buildProofInput,
      prepare,
      submitPrepared,
      execute,
      computeExpectedRoot,
      computeExpectedNullifier,
      phase,
      status,
      isLoading: status === "loading",
      isPreparing: phase === "preparing",
      isSubmitting: phase === "submitting",
      isPrepared: phase === "prepared",
      isSuccess: status === "success",
      isError: status === "error",
      error,
      prepared,
      result,
      reset
    }),
    [
      buildProofInput,
      prepare,
      submitPrepared,
      execute,
      computeExpectedRoot,
      computeExpectedNullifier,
      phase,
      status,
      error,
      prepared,
      result,
      reset
    ]
  );
}

export const usePrivateVote = useVoting;

