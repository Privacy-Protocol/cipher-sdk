# Privacy Protocol Cipher SDK - Developer Note (v1)

## What is public onchain
- `appId`, `actionType`, and `contextId` (domain + workflow scope).
- `nullifier` (used once per Router-scoped nullifier key).
- `payloadHash` commitment (if provided).
- `encryptedPayloadRef` (optional ciphertext reference handle, not plaintext).
- Adapter routing metadata and workflow events (e.g., credential access, vote stored).

## What stays hidden
- Identity secret and membership witness path details.
- Private action payload fields (vote choice, attributes, etc.).
- Raw eligibility values and private proofs/witness internals.
- Ciphertext plaintext content (unless offchain decryption is performed by authorized parties).

## What commitments do (validation)
- `payloadHash` is part of proof public inputs and Router binding checks.
- Circuits prove hidden payload-derived values and enforce they match `payloadHash`.
- Contracts use commitment equality + proof verification for integrity.

## What encrypted payloads do (storage/retrieval)
- Encryption is optional persistence for post-proof data recovery.
- Router and adapters do not interpret ciphertext semantics.
- Voting adapter stores either `encryptedPayloadRef` and/or inline encrypted bytes.
- Decryption/tally happens offchain by trusted authorized actors.

## Voting trust assumptions (decryption/tally)
- ZK proof guarantees eligibility, nullifier uniqueness, vote encoding validity, and payload commitment binding.
- If encrypted vote payloads are used for tally, correctness of decryption/tally depends on the tally authority/process.
- The onchain contract does not verify decryption correctness in this v1.
- TODO: add attested tally or ZK tally verification in future versions.

## CredentialGate vs Voting payload handling
- `CredentialGateAdapter`: payload commitment is optional by context policy; encrypted payload reference can be required by policy.
- `VotingAdapter`: payload commitment is expected for private votes; encrypted payload can be inline bytes and/or reference.
- In both flows, commitment is the validation anchor; encryption is storage/access tooling.

## Why this is confidential action middleware, not a mixer/privacy rail
- No deposit/withdraw unlinkability logic.
- No pool accounting or anonymity set for asset movement.
- No arbitrary Router execution path.
- All actions are app/action scoped and routed only to registered adapters.
- Focus is confidential validity for onchain actions, not generic transaction obfuscation.
