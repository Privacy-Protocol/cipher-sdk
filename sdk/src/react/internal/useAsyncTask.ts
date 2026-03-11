import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AsyncOperationResult } from "../types";
import { createIdleAsyncState } from "./asyncState";
import { toError } from "./toError";

export function useAsyncTask<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<TData>
): AsyncOperationResult<TArgs, TData> {
  const [state, setState] = useState(() => createIdleAsyncState<TData>());
  const mountedRef = useRef(true);
  const fnRef = useRef(fn);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  const run = useCallback(
    async (...args: TArgs): Promise<TData> => {
      setState((previous) => ({
        ...previous,
        status: "loading",
        error: null
      }));

      try {
        const data = await fnRef.current(...args);
        if (mountedRef.current) {
          setState({
            status: "success",
            data,
            error: null
          });
        }
        return data;
      } catch (error) {
        const normalizedError = toError(error);
        if (mountedRef.current) {
          setState({
            status: "error",
            data: null,
            error: normalizedError
          });
        }
        throw normalizedError;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState(createIdleAsyncState<TData>());
  }, []);

  return useMemo(
    () => ({
      ...state,
      run,
      reset,
      isIdle: state.status === "idle",
      isLoading: state.status === "loading",
      isSuccess: state.status === "success",
      isError: state.status === "error"
    }),
    [state, run, reset]
  );
}
