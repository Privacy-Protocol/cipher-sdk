"use client";

import { useState } from "react";
import type { Account, Chain, Transport, WalletClient } from "viem";
import { CipherProvider, useMembership } from "../src/react";

function MembershipInner() {
  const membership = useMembership();
  const [txHash, setTxHash] = useState<string>("");

  const handleJoin = async () => {
    const result = await membership.execute({
      contextId: "membership-campaign-1",
      witness: {
        identitySecret: 1001n,
        membershipSecret: 2002n,
        nullifierSecret: 3003n,
        pathElements: new Array(20).fill(0n),
        pathIndices: new Array(20).fill(false)
      }
    });
    setTxHash(result.txHash);
  };

  return (
    <div>
      <button onClick={handleJoin} disabled={membership.isLoading}>
        {membership.isLoading ? "Submitting..." : "Join"}
      </button>
      {membership.error ? <p>{membership.error.message}</p> : null}
      {txHash ? <p>Tx: {txHash}</p> : null}
    </div>
  );
}

export function MembershipExample(props: {
  chain: Chain;
  walletClient: WalletClient<Transport, Chain, Account>;
}) {
  return (
    <CipherProvider chain={props.chain} walletClient={props.walletClient} appId="my-dapp-v1">
      <MembershipInner />
    </CipherProvider>
  );
}
