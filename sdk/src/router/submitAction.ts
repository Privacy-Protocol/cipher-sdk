import type { Account, Chain, Hex, PublicClient, Transport, WalletClient } from "viem";
import { BaseError } from "viem";
import { ROUTER_ABI } from "../abi";
import { CipherError } from "../errors";
import type { CipherActionRequest, CipherTxReceipt } from "../types/common";
import { parseCipherLogs } from "../events";

export async function submitCipherAction(params: {
  routerAddress: `0x${string}`;
  walletClient: WalletClient<Transport, Chain, Account>;
  publicClient: PublicClient;
  request: CipherActionRequest;
}): Promise<CipherTxReceipt> {
  const { routerAddress, walletClient, publicClient, request } = params;
  const account = walletClient.account;
  if (!account) {
    throw new CipherError("TRANSACTION_ERROR", "walletClient.account is required to submit actions");
  }

  try {
    const actionId = await publicClient.readContract({
      address: routerAddress,
      abi: ROUTER_ABI,
      functionName: "computeActionId",
      args: [request, account.address]
    });

    const txHash = await walletClient.writeContract({
      account,
      chain: walletClient.chain,
      address: routerAddress,
      abi: ROUTER_ABI,
      functionName: "submitAction",
      args: [request]
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const logs = parseCipherLogs(receipt.logs);

    return {
      txHash,
      actionId,
      logs,
      receipt
    };
  } catch (error) {
    const msg = error instanceof BaseError ? error.shortMessage : "Failed to submit Cipher action";
    throw new CipherError("TRANSACTION_ERROR", msg, error);
  }
}
