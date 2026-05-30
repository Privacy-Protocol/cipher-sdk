# Governance Contract Test Edge Cases

Edge cases to add to reach ≥90% coverage on each governance abstract contract. The existing `MyGovernor.ts` happy path
covers: `castEncryptedVote`, `hasVoted`, `proposalVotes`, `requestProposalResultDecryption`, `finalizeProposalResult`,
`quorumReached`, `voteSucceeded`, `state` (Pending/Active/Succeeded), and double-vote prevention. Everything below is
missing.

---

## GovernorConfidential.sol

### Error paths on `requestProposalResultDecryption`✅

1. Reverts with `GovernorNonexistentProposal` when called with a proposal ID that was never created.
2. Reverts with `GovernorConfidential__ProposalStillActive` when called before the proposal deadline has passed.
3. Reverts with `GovernorConfidential__ResultAlreadyRequested` when called a second time on the same proposal.

### Error paths on `finalizeProposalResult`✅

4. Reverts with `GovernorConfidential__ResultDecryptionNotRequested` when decryption was never requested first.
5. Reverts with `GovernorConfidential__ResultAlreadyFinalized` when called a second time after a successful
   finalization.

### Error paths on view functions before finalization✅

6. `quorumReached()` reverts with `GovernorConfidential__ResultNotFinalized` when called before the result is finalized.
7. `voteSucceeded()` reverts with `GovernorConfidential__ResultNotFinalized` when called before the result is finalized.
8. `state()` reverts with `GovernorConfidential__ResultNotFinalized` when called after the voting deadline but before
   finalization (because `_quorumReached`/`_voteSucceeded` are called internally).

### Cleartext vote rejection✅

9. `getVotes()` / `_getVotes()` reverts with `GovernorConfidential__NormalGetVotesNotSupported` (call
   `governor.getVotes(account, timepoint)` directly).
10. `castVoteWithReason()` reverts with `GovernorConfidential__NormalVotesNotSupported`.
11. `castVoteWithReasonAndParams()` reverts with `GovernorConfidential__NormalVotesNotSupported`.
12. `castVoteBySig()` reverts with `GovernorConfidential__NormalVotesNotSupported`.
13. `castVoteWithReasonAndParamsBySig()` reverts with `GovernorConfidential__NormalVotesNotSupported`.

### Casting votes via alternate entry points✅

14. `castEncryptedVoteWithReason()` succeeds and emits `EncryptedVoteCast` with the supplied reason string.
15. `castEncryptedVoteWithReasonAndParams()` with **non-empty** `params` emits `EncryptedVoteCastWithParams` (not
    `EncryptedVoteCast`).
16. `castEncryptedVoteWithReasonAndParams()` with **empty** `params` emits `EncryptedVoteCast` (exercises the
    `params.length == 0` branch).

### Signature-based voting✅

17. `castEncryptedVoteBySig()` with a valid EIP-712 signature casts the vote and emits `EncryptedVoteCast`.
18. `castEncryptedVoteBySig()` with an invalid/wrong-signer signature reverts with `GovernorInvalidSignature`.
19. `castEncryptedVoteWithReasonAndParamsBySig()` with a valid EIP-712 signature casts the vote successfully.
20. `castEncryptedVoteWithReasonAndParamsBySig()` with an invalid signature reverts with `GovernorInvalidSignature`.

### State-machine enforcement on encrypted voting✅

21. `castEncryptedVote()` while the proposal is still `Pending` (before `voteStart`) reverts with
    `GovernorUnexpectedProposalState`.
22. `castEncryptedVote()` after the proposal deadline has passed reverts. NOTE: the predicted
    `GovernorUnexpectedProposalState` is never reached — `_validateStateBitmap` calls `state()`, which past the
    deadline evaluates `_quorumReached()` and reverts `GovernorConfidential__ResultNotFinalized` first. The test
    asserts the actual revert (`ResultNotFinalized`).
23. `castEncryptedVote()` on a non-existent proposal ID reverts (state bitmap check fails). Already covered by the
    existing `MyGovernor.ts` "prevents voting on a non-existent proposal" test (`GovernorNonexistentProposal`).

### Defeated proposal paths✅

24. Finalize a proposal where quorum is **not** reached → `quorumReached()` returns `false` and `state()` returns
    `Defeated`.
25. Finalize a proposal where quorum is reached but FOR votes ≤ AGAINST votes → `voteSucceeded()` returns `false` and
    `state()` returns `Defeated`.

### `encryptedProposalResult` before decryption is requested✅

26. `encryptedProposalResult()` returns zero/uninitialized handles when called before `requestProposalResultDecryption`.

---

## GovernorCountingSimpleConfidential.sol

### `COUNTING_MODE`✅

1. `COUNTING_MODE()` returns `"support=bravo&quorum=for,abstain"`.

### `proposalVotes` before any votes✅

2. `proposalVotes()` called on a proposal before anyone has voted returns uninitialized (`euint64`) handles. NOTE: the
   test asserts the handles equal `bytes32(0)` (uninitialized) rather than decrypting them — decrypting an
   uninitialized handle is not supported by the mock and the zero handle is the meaningful signal.

### Abstain vote type✅

3. A voter casting `VOTE_ABSTAIN` increments only the encrypted `abstainVotes` counter (verify via FHE decrypt that
   abstainVotes == voter's weight, forVotes == 0, againstVotes == 0).

### Quorum counting: for + abstain✅

4. Verify that `_encryptedQuorumReached` counts FOR + ABSTAIN toward quorum — i.e., a proposal where only abstain votes
   are cast still reaches quorum if the total abstain weight meets the threshold.

### Vote failure: against wins✅

5. A proposal where AGAINST weight > FOR weight finalizes with `voteSucceeded == false`.

### Quorum not reached✅

6. A proposal with total FOR + ABSTAIN weight below the quorum threshold finalizes with `quorumReached == false`.

### Tie (For == Against)✅

7. A proposal where FOR weight == AGAINST weight finalizes with `voteSucceeded == false` (FHE.gt is strict).

### FHE initialization on first vote✅

8. The first vote on a proposal (which triggers the `!FHE.isInitialized` branch) correctly initializes all three
   counters and the contract retains access via `FHE.allowThis`. Subsequent voters accumulate onto initialized handles
   without re-initializing.

---

## GovernorVotesConfidential.sol

### `token()`✅

1. `token()` returns the exact address the contract was deployed with.

### `clock()` and `CLOCK_MODE()` — normal path✅

2. `clock()` delegates to the token's `clock()` and returns the same value.
3. `CLOCK_MODE()` delegates to the token's `CLOCK_MODE()` and returns the same string.

### `clock()` and `CLOCK_MODE()` — fallback path✅

4. When the token does **not** implement `clock()` (try-catch reverts), `clock()` falls back to `Time.blockNumber()` and
   returns the current block number.
5. When the token does **not** implement `CLOCK_MODE()`, `CLOCK_MODE()` falls back to `"mode=blocknumber&from=default"`.

### `_getConfidentialVotes` snapshot accuracy✅

6. Voting power is read at `proposalSnapshot`, not at the current block — a delegation that happens **after** the
   snapshot is created must not change the vote weight counted for that proposal.

---

## GovernorVotesQuorumFractionConfidential.sol

### Constructor validation✅

1. Deploying with `quorumNumeratorValue > quorumDenominator()` (i.e., > 100) reverts with
   `GovernorInvalidQuorumFraction`.

### View accessors✅

2. `quorumDenominator()` always returns `100`.
3. `quorumNumerator()` (no args) returns the most recently set numerator.
4. `quorum(timepoint)` reverts with `GovernorConfidentialQuorumIsEncrypted` for any input.

### `confidentialQuorum`✅

5. `confidentialQuorum(timepoint)` returns an encrypted value that, when decrypted, equals
   `floor(totalSupply * quorumNumerator / 100)` at that timepoint.
6. `confidentialQuorum` with zero total supply returns an encrypted zero.

### `updateQuorumNumerator` — governance-gated✅

7. `updateQuorumNumerator()` called by a non-governance address reverts with `GovernorOnlyExecutor`.
8. `updateQuorumNumerator()` called through governance with a valid value emits
   `QuorumNumeratorUpdated(oldValue, newValue)`.
9. `updateQuorumNumerator()` called with a value greater than `quorumDenominator()` reverts with
   `GovernorInvalidQuorumFraction`.
10. Setting quorum numerator to `0` (zero quorum) is accepted — subsequent proposals always reach quorum regardless of
    vote weight.
11. Setting quorum numerator to `100` (full supply required) is accepted — `quorumNumerator()` updates to 100.

### Historical numerator lookup (`quorumNumerator(timepoint)`)✅

12. `quorumNumerator(timepoint)` with a timepoint **after** the latest update returns the latest numerator (optimistic
    path — no binary search).
13. `quorumNumerator(timepoint)` with a timepoint **before** the latest update returns the older numerator (historical
    binary-search path via `upperLookupRecent`).
14. A proposal created with quorum numerator X, after the numerator is updated to Y, still evaluates quorum using X (the
    value at snapshot time), not Y.
