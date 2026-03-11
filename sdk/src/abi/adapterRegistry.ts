export const ADAPTER_REGISTRY_ABI = [
  {
    type: "function",
    name: "getAdapter",
    stateMutability: "view",
    inputs: [
      { name: "appId", type: "bytes32" },
      { name: "actionType", type: "bytes32" }
    ],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "isAdapterRegistered",
    stateMutability: "view",
    inputs: [
      { name: "appId", type: "bytes32" },
      { name: "actionType", type: "bytes32" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;
