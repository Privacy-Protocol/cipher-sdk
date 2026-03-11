"use client";

import { useState } from "react";
import type { Account, Chain, Transport, WalletClient } from "viem";
import { CipherProvider, useVoting } from "../src/react";

function VotingInner() {
  const voting = useVoting();
  const [txHash, setTxHash] = useState<string>("");

  const handleVote = async () => {
    const result = await voting.execute({
      contextId: "proposal-42",
      optionCount: 3,
      voteOption: 1,
      witness: {
        identitySecret: 1001n,
        membershipSecret: 2002n,
        nullifierSecret: 3003n,
        pathElements: new Array(20).fill(0n),
        pathIndices: new Array(20).fill(false)
      },
      payload: {
        schemaHash: 5005n,
        voteBlinding: 6006n,
        payloadSalt: 7007n
      },
      encryption: {
        payload: { vote: 1, proposal: "proposal-42" },
        inline: true
      }
    });
    setTxHash(result.txHash);
  };

  return (
    <div>
      <button onClick={handleVote} disabled={voting.isLoading}>
        {voting.isLoading ? "Submitting..." : "Vote"}
      </button>
      {voting.error ? <p>{voting.error.message}</p> : null}
      {txHash ? <p>Tx: {txHash}</p> : null}
    </div>
  );
}

export function VotingExample(props: {
  chain: Chain;
  walletClient: WalletClient<Transport, Chain, Account>;
}) {
  return (
    <CipherProvider chain={props.chain} walletClient={props.walletClient} appId="my-dapp-v1">
      <VotingInner />
    </CipherProvider>
  );
}
