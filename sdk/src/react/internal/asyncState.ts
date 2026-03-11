import type { AsyncOperationState } from "../types";

export function createIdleAsyncState<TData>(): AsyncOperationState<TData> {
  return {
    status: "idle",
    data: null,
    error: null
  };
}

