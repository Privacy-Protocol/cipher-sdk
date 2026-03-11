export const ROUTER_ABI = [
  {
    type: "function",
    name: "submitAction",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "appId", type: "bytes32" },
          { name: "actionType", type: "bytes32" },
          { name: "contextId", type: "bytes32" },
          { name: "nullifier", type: "bytes32" },
          { name: "payloadHash", type: "bytes32" },
          { name: "encryptedPayloadRef", type: "bytes32" },
          { name: "verifierId", type: "bytes32" },
          { name: "deadline", type: "uint64" },
          { name: "publicInputs", type: "bytes32[]" },
          { name: "proof", type: "bytes" },
          { name: "adapterData", type: "bytes" }
        ]
      }
    ],
    outputs: [{ name: "actionId", type: "bytes32" }]
  },
  {
    type: "function",
    name: "computeActionId",
    stateMutability: "view",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "appId", type: "bytes32" },
          { name: "actionType", type: "bytes32" },
          { name: "contextId", type: "bytes32" },
          { name: "nullifier", type: "bytes32" },
          { name: "payloadHash", type: "bytes32" },
          { name: "encryptedPayloadRef", type: "bytes32" },
          { name: "verifierId", type: "bytes32" },
          { name: "deadline", type: "uint64" },
          { name: "publicInputs", type: "bytes32[]" },
          { name: "proof", type: "bytes" },
          { name: "adapterData", type: "bytes" }
        ]
      },
      { name: "sender", type: "address" }
    ],
    outputs: [{ name: "actionId", type: "bytes32" }]
  },
  {
    type: "function",
    name: "computeNullifierKey",
    stateMutability: "view",
    inputs: [
      { name: "appId", type: "bytes32" },
      { name: "actionType", type: "bytes32" },
      { name: "contextId", type: "bytes32" },
      { name: "nullifier", type: "bytes32" }
    ],
    outputs: [{ name: "nullifierKey", type: "bytes32" }]
  },
  {
    type: "function",
    name: "adapterRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "verifierRegistry",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "nullifierStore",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    type: "event",
    name: "ActionSubmitted",
    inputs: [
      { name: "actionId", type: "bytes32", indexed: true },
      { name: "appId", type: "bytes32", indexed: true },
      { name: "actionType", type: "bytes32", indexed: true },
      { name: "contextId", type: "bytes32", indexed: false },
      { name: "adapter", type: "address", indexed: false },
      { name: "verifierId", type: "bytes32", indexed: false },
      { name: "nullifierKey", type: "bytes32", indexed: false },
      { name: "payloadHash", type: "bytes32", indexed: false },
      { name: "encryptedPayloadRef", type: "bytes32", indexed: false },
      { name: "sender", type: "address", indexed: false }
    ]
  }
] as const;
