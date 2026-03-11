import { BaseError } from "viem";
import { MEMBERSHIP_ADAPTER_ABI } from "../abi";
import { deriveMembershipLeaf, deriveMerkleRoot, deriveNullifier, derivePayloadHash } from "../crypto";
import { CipherError } from "../errors";
import { buildActionRequestFromProof, assertProofBindings } from "../proof";
import { submitCipherAction } from "../router";
import type { MembershipExecuteResult, MembershipInput, MembershipPrepared } from "../types/membership";
import { asBytes32 } from "../utils/bytes";
import { ZERO_BYTES32 } from "../config";
import type { CipherClientContext } from "../client/types";

export class MembershipModule {
  constructor(private readonly ctx: CipherClientContext) {}

  async buildProofInput(input: MembershipInput): Promise<{
    contextId: `0x${string}`;
    payloadHash: `0x${string}`;
    proofInput: import("../types/proof").MembershipProofInput;
  }> {
    const contextId = asBytes32(input.contextId);

    let payloadHash: `0x${string}` = ZERO_BYTES32;
    if (input.payload) {
      payloadHash = await derivePayloadHash({
        appId: this.ctx.config.appId,
        actionType: this.ctx.config.actionTypes.membership,
        contextId,
        schemaHash: input.payload.schemaHash,
        payloadDigest: input.payload.payloadDigest,
        payloadSalt: input.payload.payloadSalt
      });
    }

    const proofInput: import("../types/proof").MembershipProofInput = {
      appId: this.ctx.config.appId,
      actionType: this.ctx.config.actionTypes.membership,
      contextId,
      payloadHash,
      threshold: input.rangePolicy?.threshold ?? 0,
      enforceThreshold: input.rangePolicy?.enforce ?? false,
      witness: input.witness
    };

    return { contextId, payloadHash, proofInput };
  }

  async prepare(input: MembershipInput): Promise<MembershipPrepared> {
    const { contextId, payloadHash, proofInput } = await this.buildProofInput(input);
    const proofBundle = await this.ctx.providers.proofProvider.generateProof({
      workflow: "membership",
      input: proofInput
    });

    assertProofBindings({
      bundle: proofBundle,
      appId: this.ctx.config.appId,
      actionType: this.ctx.config.actionTypes.membership,
      contextId,
      payloadHash,
      expectedLength: this.ctx.config.publicInputsCount.membership
    });

    let encryptedPayloadRef: `0x${string}` = ZERO_BYTES32;
    if (input.encryption) {
      try {
        const encrypted = await this.ctx.providers.encryptionProvider.encrypt({
          workflow: "membership",
          contextId,
          payload: input.encryption.payload
        });
        const stored = await this.ctx.providers.payloadStorageProvider.put({
          workflow: "membership",
          contextId,
          encrypted
        });
        encryptedPayloadRef = stored.encryptedPayloadRef;
      } catch (error) {
        throw new CipherError("ENCRYPTION_PROVIDER_ERROR", "Failed to encrypt/store membership payload", error);
      }
    }

    const deadlineSeconds = input.deadlineSecondsFromNow ?? 1200;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);

    const request = buildActionRequestFromProof({
      appId: this.ctx.config.appId,
      actionType: this.ctx.config.actionTypes.membership,
      contextId,
      verifierId: this.ctx.config.verifierIds.membership,
      deadline,
      encryptedPayloadRef,
      bundle: proofBundle,
      adapterData: "0x"
    });

    return {
      request,
      proofBundle,
      root: proofBundle.publicInputs[5]
    };
  }

  async execute(input: MembershipInput): Promise<MembershipExecuteResult> {
    const prepared = await this.prepare(input);
    const tx = await submitCipherAction({
      routerAddress: this.ctx.config.routerAddress,
      walletClient: this.ctx.walletClient,
      publicClient: this.ctx.publicClient,
      request: prepared.request
    });

    return {
      ...tx,
      request: prepared.request,
      root: prepared.root
    };
  }

  async computeExpectedRoot(input: {
    identitySecret: bigint;
    membershipSecret: bigint;
    pathElements: bigint[];
    pathIndices: boolean[];
  }): Promise<`0x${string}`> {
    const leaf = await deriveMembershipLeaf(input.identitySecret, input.membershipSecret);
    return deriveMerkleRoot(leaf, input.pathElements, input.pathIndices);
  }

  async computeExpectedNullifier(input: {
    nullifierSecret: bigint;
    contextId: string | `0x${string}`;
  }): Promise<`0x${string}`> {
    return deriveNullifier(
      input.nullifierSecret,
      this.ctx.config.appId,
      this.ctx.config.actionTypes.membership,
      asBytes32(input.contextId)
    );
  }

  async getContextState(contextId: string | `0x${string}`): Promise<{
    enabled: boolean;
    requirePayload: boolean;
    requireEncryptedPayloadRef: boolean;
    validAfter: bigint;
    validUntil: bigint;
  }> {
    const id = asBytes32(contextId);
    try {
      const result = await this.ctx.publicClient.readContract({
        address: this.ctx.config.adapters.membership,
        abi: MEMBERSHIP_ADAPTER_ABI,
        functionName: "contextConfig",
        args: [id]
      });
      const typed = result as unknown as {
        enabled: boolean;
        requirePayload: boolean;
        requireEncryptedPayloadRef: boolean;
        validAfter: bigint;
        validUntil: bigint;
      };

      return {
        enabled: typed.enabled,
        requirePayload: typed.requirePayload,
        requireEncryptedPayloadRef: typed.requireEncryptedPayloadRef,
        validAfter: typed.validAfter,
        validUntil: typed.validUntil
      };
    } catch (error) {
      const msg = error instanceof BaseError ? error.shortMessage : "Failed to read membership context";
      throw new CipherError("TRANSACTION_ERROR", msg, error);
    }
  }

  async isRootAllowed(contextId: string | `0x${string}`, root: string | `0x${string}`): Promise<boolean> {
    return this.ctx.publicClient.readContract({
      address: this.ctx.config.adapters.membership,
      abi: MEMBERSHIP_ADAPTER_ABI,
      functionName: "allowedRoots",
      args: [asBytes32(contextId), asBytes32(root)]
    });
  }
}
