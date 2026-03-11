import type { ReactNode } from "react";
import type { CipherClient } from "../client";
import type { CipherClientOptions } from "../types";

export type AsyncStatus = "idle" | "loading" | "success" | "error";

export interface AsyncOperationState<TData> {
  status: AsyncStatus;
  data: TData | null;
  error: Error | null;
}

export interface AsyncOperationResult<TArgs extends unknown[], TData> extends AsyncOperationState<TData> {
  run: (...args: TArgs) => Promise<TData>;
  reset: () => void;
  isIdle: boolean;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export type WorkflowPhase = "idle" | "preparing" | "prepared" | "submitting" | "success" | "error";

export interface UseCipherHookOptions {
  client?: CipherClient;
}

export type CipherProviderProps =
  | {
      children: ReactNode;
      client: CipherClient;
    }
  | ({
      children: ReactNode;
      client?: undefined;
    } & CipherClientOptions);
