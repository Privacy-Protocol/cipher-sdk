export const MEMBERSHIP_ADAPTER_ABI = [
  {
    type: "function",
    name: "contextConfig",
    stateMutability: "view",
    inputs: [{ name: "contextId", type: "bytes32" }],
    outputs: [
      { type: "bool", name: "enabled" },
      { type: "bool", name: "requirePayload" },
      { type: "bool", name: "requireEncryptedPayloadRef" },
      { type: "uint64", name: "validAfter" },
      { type: "uint64", name: "validUntil" }
    ]
  },
  {
    type: "function",
    name: "allowedRoots",
    stateMutability: "view",
    inputs: [
      { name: "contextId", type: "bytes32" },
      { name: "root", type: "bytes32" }
    ],
    outputs: [{ type: "bool" }]
  },
  {
    type: "event",
    name: "CredentialAccessGranted",
    inputs: [
      { name: "actionId", type: "bytes32", indexed: true },
      { name: "contextId", type: "bytes32", indexed: true },
      { name: "root", type: "bytes32", indexed: true },
      { name: "nullifier", type: "bytes32", indexed: false },
      { name: "payloadHash", type: "bytes32", indexed: false },
      { name: "encryptedPayloadRef", type: "bytes32", indexed: false },
      { name: "sender", type: "address", indexed: false }
    ]
  }
] as const;
