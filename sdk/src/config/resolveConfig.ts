import { createPublicClient, http, isHex, keccak256, stringToHex } from "viem";
import type { PublicClient } from "viem";
import type { CipherClientOptions, CipherResolvedConfig } from "../types/common";
import { CipherError } from "../errors";
import { CIPHER_DEPLOYMENTS } from "./deployments";
import { ZERO_ADDRESS } from "./constants";

function asBytes32AppId(value: string): `0x${string}` {
  if (isHex(value)) {
    if (value.length !== 66) {
      throw new CipherError("INVALID_APP_ID", "Hex appId must be bytes32 (66 chars)");
    }
    return value;
  }

  return keccak256(stringToHex(`CIPHER_APP:${value}`));
}

function assertConfiguredAddresses(config: CipherResolvedConfig): void {
  const addresses = [
    config.routerAddress,
    config.adapterRegistryAddress,
    config.verifierRegistryAddress,
    config.nullifierStoreAddress,
    config.adapters.membership,
    config.adapters.voting
  ];

  if (addresses.some((a) => a.toLowerCase() === ZERO_ADDRESS)) {
    throw new CipherError(
      "UNCONFIGURED_DEPLOYMENT",
      `Cipher SDK deployment for chain ${config.chain.id} is not fully configured yet`
    );
  }
}

export function resolveCipherConfig(options: CipherClientOptions): {
  resolved: CipherResolvedConfig;
  publicClient: PublicClient;
} {
  const deployment = CIPHER_DEPLOYMENTS[options.chain.id];
  if (!deployment) {
    throw new CipherError("UNSUPPORTED_CHAIN", `Unsupported chain id: ${options.chain.id}`);
  }

  const resolved: CipherResolvedConfig = {
    chain: options.chain,
    appId: asBytes32AppId(options.appId),
    routerAddress: deployment.routerAddress,
    adapterRegistryAddress: deployment.adapterRegistryAddress,
    verifierRegistryAddress: deployment.verifierRegistryAddress,
    nullifierStoreAddress: deployment.nullifierStoreAddress,
    adapters: deployment.adapters,
    actionTypes: deployment.actionTypes,
    verifierIds: deployment.verifierIds,
    publicInputsCount: deployment.publicInputsCount
  };

  assertConfiguredAddresses(resolved);

  const publicClient = createPublicClient({
    chain: options.chain,
    transport: http()
  });

  return { resolved, publicClient };
}
