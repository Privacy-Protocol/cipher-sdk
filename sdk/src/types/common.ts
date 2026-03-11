import type {
  Account,
  Address,
  Chain,
  Hex,
  PublicClient,
  Transport,
  WalletClient
} from "viem";

export type CipherWorkflow = "membership" | "voting";

export type Bytes32 = Hex;

export interface CipherClientOptions {
  chain: Chain;
  walletClient: WalletClient<Transport, Chain, Account>;
  appId: string | Bytes32;
  adapter?: CipherWorkflow;
}

export interface CipherResolvedConfig {
  chain: Chain;
  appId: Bytes32;
  routerAddress: Address;
  adapterRegistryAddress: Address;
  verifierRegistryAddress: Address;
  nullifierStoreAddress: Address;
  adapters: {
    membership: Address;
    voting: Address;
  };
  actionTypes: {
    membership: Bytes32;
    voting: Bytes32;
  };
  verifierIds: {
    membership: Bytes32;
    voting: Bytes32;
  };
  publicInputsCount: {
    membership: number;
    voting: number;
  };
}

export interface CipherProviders {
  proofProvider: import("./proof").CipherProofProvider;
  encryptionProvider: import("./encryption").CipherEncryptionProvider;
  payloadStorageProvider: import("./encryption").CipherPayloadStorageProvider;
}

export interface CipherTxReceipt {
  txHash: Hex;
  actionId?: Bytes32;
  logs: import("./events").ParsedCipherLog[];
  receipt: Awaited<ReturnType<PublicClient["waitForTransactionReceipt"]>>;
}

export interface CipherActionRequest {
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  nullifier: Bytes32;
  payloadHash: Bytes32;
  encryptedPayloadRef: Bytes32;
  verifierId: Bytes32;
  deadline: bigint;
  publicInputs: Bytes32[];
  proof: Hex;
  adapterData: Hex;
}
