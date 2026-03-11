import type { PublicClient } from "viem";
import {
  ADAPTER_REGISTRY_ABI,
  NULLIFIER_STORE_ABI,
  ROUTER_ABI,
  VERIFIER_REGISTRY_ABI
} from "../abi";
import type { Bytes32 } from "../types/common";

export async function readRouterPointers(params: {
  publicClient: PublicClient;
  routerAddress: `0x${string}`;
}): Promise<{
  adapterRegistry: `0x${string}`;
  verifierRegistry: `0x${string}`;
  nullifierStore: `0x${string}`;
}> {
  const [adapterRegistry, verifierRegistry, nullifierStore] = await Promise.all([
    params.publicClient.readContract({
      address: params.routerAddress,
      abi: ROUTER_ABI,
      functionName: "adapterRegistry"
    }),
    params.publicClient.readContract({
      address: params.routerAddress,
      abi: ROUTER_ABI,
      functionName: "verifierRegistry"
    }),
    params.publicClient.readContract({
      address: params.routerAddress,
      abi: ROUTER_ABI,
      functionName: "nullifierStore"
    })
  ]);

  return { adapterRegistry, verifierRegistry, nullifierStore };
}

export async function readRouterComputedNullifierKey(params: {
  publicClient: PublicClient;
  routerAddress: `0x${string}`;
  appId: Bytes32;
  actionType: Bytes32;
  contextId: Bytes32;
  nullifier: Bytes32;
}): Promise<Bytes32> {
  return params.publicClient.readContract({
    address: params.routerAddress,
    abi: ROUTER_ABI,
    functionName: "computeNullifierKey",
    args: [params.appId, params.actionType, params.contextId, params.nullifier]
  });
}

export async function readAdapterAddress(params: {
  publicClient: PublicClient;
  adapterRegistryAddress: `0x${string}`;
  appId: Bytes32;
  actionType: Bytes32;
}): Promise<`0x${string}`> {
  return params.publicClient.readContract({
    address: params.adapterRegistryAddress,
    abi: ADAPTER_REGISTRY_ABI,
    functionName: "getAdapter",
    args: [params.appId, params.actionType]
  });
}

export async function isNullifierUsed(params: {
  publicClient: PublicClient;
  nullifierStoreAddress: `0x${string}`;
  nullifierKey: Bytes32;
}): Promise<boolean> {
  return params.publicClient.readContract({
    address: params.nullifierStoreAddress,
    abi: NULLIFIER_STORE_ABI,
    functionName: "isNullifierUsed",
    args: [params.nullifierKey]
  });
}

export async function readVerifierConfig(params: {
  publicClient: PublicClient;
  verifierRegistryAddress: `0x${string}`;
  verifierId: Bytes32;
}): Promise<{
  verifier: `0x${string}`;
  publicInputSchemaHash: Bytes32;
  publicInputsCount: number;
  enabled: boolean;
}> {
  const result = await params.publicClient.readContract({
    address: params.verifierRegistryAddress,
    abi: VERIFIER_REGISTRY_ABI,
    functionName: "getVerifier",
    args: [params.verifierId]
  });
  const typed = result as {
    verifier: `0x${string}`;
    publicInputSchemaHash: Bytes32;
    publicInputsCount: number | bigint;
    enabled: boolean;
  };

  return {
    verifier: typed.verifier,
    publicInputSchemaHash: typed.publicInputSchemaHash,
    publicInputsCount: Number(typed.publicInputsCount),
    enabled: typed.enabled
  };
}
