# @privacy-protocol/cipher

TypeScript SDK for Cipher confidential action middleware.

Supported workflows:

- membership (confidential gate)
- voting (private voting)

Core principle:

- commitment = validation
- encryption = storage

## Initialization

```ts
import { createCipherClient } from "@privacy-protocol/cipher";

const cipher = createCipherClient({
  chain,
  walletClient,
  appId: "my-app-v1",
});
```

Everything else (router/adapters/verifier IDs/public client/providers) is auto-resolved from SDK defaults.

## React / Next.js

Install React peers:

```bash
npm i react react-dom
```

Use the React entrypoint:

```tsx
"use client";

import {
  CipherProvider,
  useMembership,
  useVoting,
} from "@privacy-protocol/cipher/react";

function VoteButton() {
  const voting = useVoting();

  return (
    <button
      onClick={() =>
        voting.execute({
          contextId: "proposal-42",
          optionCount: 3,
          voteOption: 1,
          witness: {
            identitySecret: 1001n,
            membershipSecret: 2002n,
            nullifierSecret: 3003n,
            pathElements: new Array(20).fill(0n),
            pathIndices: new Array(20).fill(false),
          },
          payload: {
            schemaHash: 5005n,
            voteBlinding: 6006n,
            payloadSalt: 7007n,
          },
        })
      }
      disabled={voting.isLoading}
    >
      {voting.isLoading ? "Submitting..." : "Vote"}
    </button>
  );
}

export function App({
  chain,
  walletClient,
}: {
  chain: any;
  walletClient: any;
}) {
  return (
    <CipherProvider
      chain={chain}
      walletClient={walletClient}
      appId="my-dapp-v1"
    >
      <VoteButton />
    </CipherProvider>
  );
}
```

Available React hooks:

- `useCipherClient`
- `useMembership` / `useConfidentialGate`
- `useVoting` / `usePrivateVote`
- `useGenerateProof`
- `useSubmitCipherAction`
- `useCipherRouter`
- `useVotingState`
- `useMembershipState` / `useCredentialGateState`

## Workflow names

- Membership (confidential gate): `cipher.membership.execute(...)` or `cipher.join(...)`
- Voting (private voting): `cipher.voting.execute(...)` or `cipher.vote(...)`

## Global providers

Proof, encryption, and payload storage providers are shared globally across all client instances:

```ts
import { configureCipherGlobalProviders } from "@privacy-protocol/cipher";

configureCipherGlobalProviders({
  proofProvider,
  encryptionProvider,
  payloadStorageProvider,
});
```

If not configured, SDK defaults are used:

- proof: browser bridge (`globalThis.__cipherBrowserProver`)
- encryption: noop serializer
- payload storage: local ref hash (`keccak256(ciphertext)`)

## Important stubs / TODOs

- Chain deployment addresses in `src/config/deployments.ts` are placeholders and must be replaced with real deployed addresses.
- Default browser proof provider expects an injected prover bridge (`globalThis.__cipherBrowserProver`).
