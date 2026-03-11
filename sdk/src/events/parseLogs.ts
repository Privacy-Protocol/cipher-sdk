import { decodeEventLog } from "viem";
import type { Abi } from "viem";
import type { Log } from "viem";
import type { ParsedCipherLog } from "../types/events";
import { MEMBERSHIP_ADAPTER_ABI, ROUTER_ABI, VOTING_ADAPTER_ABI } from "../abi";

function isNamedArgs(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeWith(abi: Abi, log: Log): { eventName: string; args: Record<string, unknown> } | null {
  try {
    const decoded = decodeEventLog({ abi, data: log.data, topics: log.topics });
    if (!decoded.eventName || !isNamedArgs(decoded.args)) {
      return null;
    }
    return { eventName: decoded.eventName, args: decoded.args };
  } catch {
    return null;
  }
}

export function parseCipherLogs(logs: Log[]): ParsedCipherLog[] {
  const parsed: ParsedCipherLog[] = [];

  for (const log of logs) {
    const router = decodeWith(ROUTER_ABI, log);
    if (router?.eventName === "ActionSubmitted") {
      parsed.push({
        type: "router.actionSubmitted",
        actionId: router.args.actionId as `0x${string}`,
        appId: router.args.appId as `0x${string}`,
        actionType: router.args.actionType as `0x${string}`,
        contextId: router.args.contextId as `0x${string}`,
        adapter: router.args.adapter as `0x${string}`,
        verifierId: router.args.verifierId as `0x${string}`,
        nullifierKey: router.args.nullifierKey as `0x${string}`,
        payloadHash: router.args.payloadHash as `0x${string}`,
        encryptedPayloadRef: router.args.encryptedPayloadRef as `0x${string}`,
        sender: router.args.sender as `0x${string}`,
        txHash: log.transactionHash ?? "0x"
      });
      continue;
    }

    const voting = decodeWith(VOTING_ADAPTER_ABI, log);
    if (voting?.eventName === "VoteStored") {
      parsed.push({
        type: "voting.voteStored",
        actionId: voting.args.actionId as `0x${string}`,
        contextId: voting.args.contextId as `0x${string}`,
        root: voting.args.root as `0x${string}`,
        nullifier: voting.args.nullifier as `0x${string}`,
        payloadHash: voting.args.payloadHash as `0x${string}`,
        encryptedPayloadRef: voting.args.encryptedPayloadRef as `0x${string}`,
        encryptedPayloadDigest: voting.args.encryptedPayloadDigest as `0x${string}`,
        submitter: voting.args.submitter as `0x${string}`,
        txHash: log.transactionHash ?? "0x"
      });
      continue;
    }

    const membership = decodeWith(MEMBERSHIP_ADAPTER_ABI, log);
    if (membership?.eventName === "CredentialAccessGranted") {
      parsed.push({
        type: "membership.accessGranted",
        actionId: membership.args.actionId as `0x${string}`,
        contextId: membership.args.contextId as `0x${string}`,
        root: membership.args.root as `0x${string}`,
        nullifier: membership.args.nullifier as `0x${string}`,
        payloadHash: membership.args.payloadHash as `0x${string}`,
        encryptedPayloadRef: membership.args.encryptedPayloadRef as `0x${string}`,
        sender: membership.args.sender as `0x${string}`,
        txHash: log.transactionHash ?? "0x"
      });
    }
  }

  return parsed;
}
