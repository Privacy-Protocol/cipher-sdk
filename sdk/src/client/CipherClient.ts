import type { Account, Chain, PublicClient, Transport, WalletClient } from "viem";
import { MembershipModule, VotingModule } from "../adapters";
import { parseCipherLogs } from "../events";
import { isNullifierUsed, readAdapterAddress, readRouterComputedNullifierKey, readRouterPointers, readVerifierConfig, submitCipherAction } from "../router";
import type {
  CipherActionRequest,
  CipherProviders,
  CipherResolvedConfig,
  CipherTxReceipt,
  CipherWorkflow
} from "../types/common";
import type { MembershipInput } from "../types/membership";
import type { VotingInput } from "../types/voting";
import type { CipherProofBundle, MembershipProofInput, VotingProofInput } from "../types/proof";
import type { CipherClientContext } from "./types";
import { CipherError } from "../errors";

export class CipherClient {
  readonly config: CipherResolvedConfig;
  readonly walletClient: WalletClient<Transport, Chain, Account>;
  readonly publicClient: PublicClient;
  readonly providers: CipherProviders;
  readonly defaultAdapter?: CipherWorkflow;

  readonly membership: MembershipModule;
  readonly voting: VotingModule;

  constructor(params: {
    config: CipherResolvedConfig;
    walletClient: WalletClient<Transport, Chain, Account>;
    publicClient: PublicClient;
    providers: CipherProviders;
    defaultAdapter?: CipherWorkflow;
  }) {
    this.config = params.config;
    this.walletClient = params.walletClient;
    this.publicClient = params.publicClient;
    this.providers = params.providers;
    this.defaultAdapter = params.defaultAdapter;

    const ctx: CipherClientContext = {
      config: params.config,
      walletClient: params.walletClient,
      publicClient: params.publicClient,
      providers: params.providers
    };

    this.membership = new MembershipModule(ctx);
    this.voting = new VotingModule(ctx);
  }

  // ergonomic one-shot alias for voting flow
  async vote(input: VotingInput) {
    return this.voting.execute(input);
  }

  // ergonomic one-shot alias for membership flow
  async join(input: MembershipInput) {
    return this.membership.execute(input);
  }

  async execute(input: MembershipInput | VotingInput) {
    if (!this.defaultAdapter) {
      throw new CipherError(
        "TRANSACTION_ERROR",
        "No default adapter configured. Use cipher.join(...) or cipher.vote(...), or pass adapter in createCipherClient."
      );
    }

    if (this.defaultAdapter === "membership") {
      return this.membership.execute(input as MembershipInput);
    }

    return this.voting.execute(input as VotingInput);
  }

  async generateProof(params: {
    workflow: CipherWorkflow;
    input: MembershipProofInput | VotingProofInput;
  }): Promise<CipherProofBundle> {
    return this.providers.proofProvider.generateProof(params);
  }

  async submitAction(request: CipherActionRequest): Promise<CipherTxReceipt> {
    return submitCipherAction({
      routerAddress: this.config.routerAddress,
      walletClient: this.walletClient,
      publicClient: this.publicClient,
      request
    });
  }

  async computeNullifierKey(params: {
    actionType: `0x${string}`;
    contextId: `0x${string}`;
    nullifier: `0x${string}`;
  }): Promise<`0x${string}`> {
    return readRouterComputedNullifierKey({
      publicClient: this.publicClient,
      routerAddress: this.config.routerAddress,
      appId: this.config.appId,
      actionType: params.actionType,
      contextId: params.contextId,
      nullifier: params.nullifier
    });
  }

  async isNullifierUsed(nullifierKey: `0x${string}`): Promise<boolean> {
    return isNullifierUsed({
      publicClient: this.publicClient,
      nullifierStoreAddress: this.config.nullifierStoreAddress,
      nullifierKey
    });
  }

  async routerState() {
    return readRouterPointers({
      publicClient: this.publicClient,
      routerAddress: this.config.routerAddress
    });
  }

  async getAdapter(workflow: CipherWorkflow): Promise<`0x${string}`> {
    return readAdapterAddress({
      publicClient: this.publicClient,
      adapterRegistryAddress: this.config.adapterRegistryAddress,
      appId: this.config.appId,
      actionType: this.config.actionTypes[workflow]
    });
  }

  async getVerifier(workflow: CipherWorkflow) {
    return readVerifierConfig({
      publicClient: this.publicClient,
      verifierRegistryAddress: this.config.verifierRegistryAddress,
      verifierId: this.config.verifierIds[workflow]
    });
  }

  parseReceiptLogs(receipt: { logs: Parameters<typeof parseCipherLogs>[0] }) {
    return parseCipherLogs(receipt.logs);
  }
}
