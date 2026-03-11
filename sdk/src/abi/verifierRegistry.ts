export const VERIFIER_REGISTRY_ABI = [
  {
    type: "function",
    name: "getVerifier",
    stateMutability: "view",
    inputs: [{ name: "verifierId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "verifier", type: "address" },
          { name: "publicInputSchemaHash", type: "bytes32" },
          { name: "publicInputsCount", type: "uint16" },
          { name: "enabled", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "isVerifierAllowed",
    stateMutability: "view",
    inputs: [
      { name: "appId", type: "bytes32" },
      { name: "actionType", type: "bytes32" },
      { name: "verifierId", type: "bytes32" }
    ],
    outputs: [{ type: "bool" }]
  }
] as const;
