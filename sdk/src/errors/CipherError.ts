export type CipherErrorCode =
  | "UNSUPPORTED_CHAIN"
  | "UNCONFIGURED_DEPLOYMENT"
  | "INVALID_APP_ID"
  | "INVALID_BYTES32"
  | "PROOF_PROVIDER_ERROR"
  | "ENCRYPTION_PROVIDER_ERROR"
  | "PAYLOAD_STORAGE_ERROR"
  | "PROOF_OUTPUT_INVALID"
  | "TRANSACTION_ERROR"
  | "ROUTER_REVERT";

export class CipherError extends Error {
  readonly code: CipherErrorCode;
  readonly cause?: unknown;

  constructor(code: CipherErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "CipherError";
    this.code = code;
    this.cause = cause;
  }
}
