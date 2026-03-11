import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, http } from "viem";
import { sepolia } from "viem/chains";
import {
  BrowserCipherProofProvider,
  configureCipherGlobalProviders,
  createCipherClient
} from "../src";

async function main() {
  configureCipherGlobalProviders({
    proofProvider: new BrowserCipherProofProvider()
  });

  const account = privateKeyToAccount("0xYOUR_PRIVATE_KEY");
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http()
  });

  const cipher = createCipherClient({
    chain: sepolia,
    walletClient,
    appId: "my-dapp-v1"
  });

  const result = await cipher.vote({
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

  console.log("vote tx", result.txHash);
  console.log("action id", result.actionId);
}

main().catch(console.error);
