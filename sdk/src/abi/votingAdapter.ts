export const VOTING_ADAPTER_ABI = [
  {
    type: "function",
    name: "getVote",
    stateMutability: "view",
    inputs: [{ name: "actionId", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "proposalId", type: "bytes32" },
          { name: "root", type: "bytes32" },
          { name: "nullifier", type: "bytes32" },
          { name: "payloadHash", type: "bytes32" },
          { name: "encryptedPayloadRef", type: "bytes32" },
          { name: "encryptedPayload", type: "bytes" },
          { name: "submitter", type: "address" },
          { name: "submittedAt", type: "uint64" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "voteCountByProposal",
    stateMutability: "view",
    inputs: [{ name: "contextId", type: "bytes32" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "proposalConfig",
    stateMutability: "view",
    inputs: [{ name: "contextId", type: "bytes32" }],
    outputs: [
      { type: "bool", name: "enabled" },
      { type: "bool", name: "requirePayload" },
      { type: "bool", name: "requireEncryptedPayload" },
      { type: "uint64", name: "startTime" },
      { type: "uint64", name: "endTime" }
    ]
  },
  {
    type: "function",
    name: "allowedRoots",
    stateMutability: "view",
    inputs: [
      { type: "bytes32", name: "contextId" },
      { type: "bytes32", name: "root" }
    ],
    outputs: [{ type: "bool" }]
  },
  {
    type: "event",
    name: "VoteStored",
    inputs: [
      { name: "actionId", type: "bytes32", indexed: true },
      { name: "contextId", type: "bytes32", indexed: true },
      { name: "root", type: "bytes32", indexed: true },
      { name: "nullifier", type: "bytes32", indexed: false },
      { name: "payloadHash", type: "bytes32", indexed: false },
      { name: "encryptedPayloadRef", type: "bytes32", indexed: false },
      { name: "encryptedPayloadDigest", type: "bytes32", indexed: false },
      { name: "submitter", type: "address", indexed: false }
    ]
  }
] as const;
