"use client";

import { useCallback, useMemo, useState } from "react";
import type { MembershipExecuteResult, MembershipInput, MembershipPrepared } from "../../types";
import type { Bytes32 } from "../../types";
import { useResolvedCipherClient } from "../internal/useResolvedCipherClient";
import { toError } from "../internal/toError";
import type { AsyncStatus, UseCipherHookOptions, WorkflowPhase } from "../types";

function phaseToStatus(phase: WorkflowPhase): AsyncStatus {
  if (phase === "error") return "error";
  if (phase === "success" || phase === "prepared") return "success";
  if (phase === "preparing" || phase === "submitting") return "loading";
  return "idle";
}

export function useMembership(options: UseCipherHookOptions = {}) {
  const client = useResolvedCipherClient(options.client);

  const [phase, setPhase] = useState<WorkflowPhase>("idle");
  const [prepared, setPrepared] = useState<MembershipPrepared | null>(null);
  const [result, setResult] = useState<MembershipExecuteResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reset = useCallback(() => {
    setPhase("idle");
    setPrepared(null);
    setResult(null);
    setError(null);
  }, []);

  const buildProofInput = useCallback(
    (input: MembershipInput) => client.membership.buildProofInput(input),
    [client]
  );

  const prepare = useCallback(
    async (input: MembershipInput): Promise<MembershipPrepared> => {
      setPhase("preparing");
      setError(null);

      try {
        const nextPrepared = await client.membership.prepare(input);
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
    async (nextPrepared: MembershipPrepared): Promise<MembershipExecuteResult> => {
      setPhase("submitting");
      setError(null);
      setPrepared(nextPrepared);

      try {
        const tx = await client.submitAction(nextPrepared.request);
        const nextResult: MembershipExecuteResult = {
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
    async (input: MembershipInput): Promise<MembershipExecuteResult> => {
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
    }) => client.membership.computeExpectedRoot(input),
    [client]
  );

  const computeExpectedNullifier = useCallback(
    (input: { nullifierSecret: bigint; contextId: string | Bytes32 }) =>
      client.membership.computeExpectedNullifier(input),
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

export const useConfidentialGate = useMembership;

