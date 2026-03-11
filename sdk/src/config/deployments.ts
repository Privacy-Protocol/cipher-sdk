import type { Address, Hex } from "viem";
import type { CipherResolvedConfig } from "../types/common";
import { CIPHER_ACTION_TYPES, CIPHER_VERIFIER_IDS } from "./constants";

export interface CipherDeploymentRecord {
  routerAddress: Address;
  adapterRegistryAddress: Address;
  verifierRegistryAddress: Address;
  nullifierStoreAddress: Address;
  adapters: {
    membership: Address;
    voting: Address;
  };
  actionTypes: {
    membership: Hex;
    voting: Hex;
  };
  verifierIds: {
    membership: Hex;
    voting: Hex;
  };
  publicInputsCount: {
    membership: number;
    voting: number;
  };
}

export const CIPHER_DEPLOYMENTS: Record<number, CipherDeploymentRecord> = {
  11155111: {
    routerAddress: "0xF74f1Cd485079ffe1F23A21cbC1872307431ABd6",
    adapterRegistryAddress: "0xC958131B94014aB57602F285e757a8722115180c",
    verifierRegistryAddress: "0xD8950adB2A51CBc23Ed852E2b8e65C452C2e0e00",
    nullifierStoreAddress: "0xa88207901032D58f6DCe2715b4Bf8920f365f74E",
    adapters: {
      membership: "0x92d490D3020A266981BBDcaD66D0c18D21EF9810",
      voting: "0x015620e5c9cC67d8546b240ddFE05c0362994253"
    },
    actionTypes: CIPHER_ACTION_TYPES,
    verifierIds: CIPHER_VERIFIER_IDS,
    publicInputsCount: { membership: 9, voting: 8 }
  }
};

export type CipherDeploymentResolved = Omit<CipherResolvedConfig, "chain" | "appId">;
