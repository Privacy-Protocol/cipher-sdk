export const NULLIFIER_STORE_ABI = [
  {
    type: "function",
    name: "isNullifierUsed",
    stateMutability: "view",
    inputs: [{ name: "nullifierKey", type: "bytes32" }],
    outputs: [{ type: "bool" }]
  }
] as const;
