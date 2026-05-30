import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { ethers, fhevm } from "hardhat";
import { MyGovernor, MyToken } from "../types";

export const VOTE_AGAINST = 0;
export const VOTE_FOR = 1;
export const VOTE_ABSTAIN = 2;

// Governor proposal states (IGovernor.ProposalState).
export const STATE_PENDING = 0n;
export const STATE_ACTIVE = 1n;
export const STATE_DEFEATED = 3n;
export const STATE_SUCCEEDED = 4n;
export const STATE_EXECUTED = 7n;

// Default hardhat mnemonic / derivation path (see hardhat.config.ts).
const MNEMONIC = "test test test test test test test test test test test junk";

export type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

/** Wallet (with private key) for a hardhat signer index, used for low-level EIP-712 signing. */
export function walletFor(index: number) {
  return ethers.HDNodeWallet.fromPhrase(MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`);
}

export async function encryptUint64(contractAddress: string, signerAddress: string, value: bigint) {
  const encrypted = await fhevm.createEncryptedInput(contractAddress, signerAddress).add64(value).encrypt();
  return { handle: encrypted.handles[0], proof: encrypted.inputProof };
}

export async function encryptVote(contractAddress: string, signerAddress: string, support: number) {
  const encrypted = await fhevm.createEncryptedInput(contractAddress, signerAddress).add8(support).encrypt();
  return { handle: encrypted.handles[0], proof: encrypted.inputProof };
}

const DEFAULT_BALANCES: ReadonlyArray<readonly [keyof Omit<Signers, "deployer">, bigint]> = [
  ["alice", 10n],
  ["bob", 20n],
  ["charlie", 5n],
];

/**
 * Deploys MyToken + a governor, mints/delegates per `balances`, and grants the governor FHE handle
 * allowance over each holder's votes and the total supply (mirrors the happy-path test setup).
 *
 * When `quorumNumerator` is given, the test-only {ConfigurableGovernor} is deployed with that numerator
 * instead of {MyGovernor} (which hardcodes 4); the returned `governor` is typed as MyGovernor since the
 * ABIs are identical.
 */
export async function deployFixture(balances = DEFAULT_BALANCES, quorumNumerator?: bigint) {
  const [deployer, alice, bob, charlie] = await ethers.getSigners();
  const signers: Signers = { deployer, alice, bob, charlie };

  const tokenFactory = await ethers.getContractFactory("MyToken");
  const token = (await tokenFactory.deploy(deployer.address, deployer.address)) as unknown as MyToken;
  const tokenAddress = await token.getAddress();

  const governor = (
    quorumNumerator === undefined
      ? await (await ethers.getContractFactory("MyGovernor")).deploy(tokenAddress)
      : await (await ethers.getContractFactory("ConfigurableGovernor")).deploy(tokenAddress, quorumNumerator)
  ) as unknown as MyGovernor;
  const governorAddress = await governor.getAddress();

  const holders: HardhatEthersSigner[] = [];
  for (const [name, amount] of balances) {
    const holder = signers[name];
    holders.push(holder);
    const encryptedAmount = await encryptUint64(tokenAddress, deployer.address, amount);
    await token.connect(deployer).mint(holder.address, encryptedAmount.handle, encryptedAmount.proof);
    await token.connect(holder).delegate(holder.address);
  }

  for (const holder of holders) {
    await token.connect(deployer).getHandleAllowance(await token.getVotes(holder.address), governorAddress, true);
  }
  await token.connect(deployer).getHandleAllowance(await token.confidentialTotalSupply(), governorAddress, true);

  return { signers, token, tokenAddress, governor, governorAddress };
}

export function proposalActions(target: string, description: string) {
  const targets = [target];
  const values = [0n];
  const calldatas = ["0x"];
  const descriptionHash = ethers.id(description);
  return { targets, values, calldatas, description, descriptionHash };
}

/** Creates a proposal (a no-op action) and returns its id. Does not advance time. */
export async function createProposal(governor: MyGovernor, proposer: HardhatEthersSigner, description: string) {
  const { targets, values, calldatas, descriptionHash } = proposalActions(proposer.address, description);
  const proposalId = await governor.hashProposal(targets, values, calldatas, descriptionHash);
  await governor.connect(proposer).propose(targets, values, calldatas, description);
  return proposalId;
}

/** Moves the clock to just after `voteStart` so the proposal becomes Active. */
export async function activate(governor: MyGovernor, proposalId: bigint) {
  await time.increaseTo((await governor.proposalSnapshot(proposalId)) + 1n);
}

export async function createAndActivate(governor: MyGovernor, proposer: HardhatEthersSigner, description: string) {
  const proposalId = await createProposal(governor, proposer, description);
  await activate(governor, proposalId);
  return proposalId;
}

export async function castVote(
  governor: MyGovernor,
  governorAddress: string,
  voter: HardhatEthersSigner,
  proposalId: bigint,
  support: number,
) {
  const encrypted = await encryptVote(governorAddress, voter.address, support);
  return governor.connect(voter).castEncryptedVote(proposalId, encrypted.handle, encrypted.proof);
}

export async function advancePastDeadline(governor: MyGovernor, proposalId: bigint) {
  await time.increaseTo((await governor.proposalDeadline(proposalId)) + 1n);
}

/**
 * Requests result decryption, publicly decrypts the (quorumReached, voteSucceeded) booleans and finalizes.
 * The proposal deadline must already have passed. Returns the decrypted booleans.
 */
export async function finalize(governor: MyGovernor, proposalId: bigint) {
  await governor.requestProposalResultDecryption(proposalId);
  const [encQuorum, encSucceeded] = await governor.encryptedProposalResult(proposalId);
  const decrypted = await fhevm.publicDecrypt([encQuorum, encSucceeded]);
  await governor.finalizeProposalResult(proposalId, decrypted.abiEncodedClearValues, decrypted.decryptionProof);
  return {
    quorumReached: decrypted.clearValues[encQuorum as `0x${string}`] as boolean,
    voteSucceeded: decrypted.clearValues[encSucceeded as `0x${string}`] as boolean,
  };
}

// ---------------------------------------------------------------------------
// EIP-712 signing helpers
// ---------------------------------------------------------------------------

async function governorDomain(governor: MyGovernor, governorAddress: string) {
  return {
    name: await governor.name(),
    version: await governor.version(),
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: governorAddress,
  };
}

function domainSeparator(domain: {
  name: string;
  version: string;
  chainId: bigint;
  verifyingContract: string;
}) {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const typeHash = ethers.keccak256(
    ethers.toUtf8Bytes("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
  );
  return ethers.keccak256(
    coder.encode(
      ["bytes32", "bytes32", "bytes32", "uint256", "address"],
      [
        typeHash,
        ethers.keccak256(ethers.toUtf8Bytes(domain.name)),
        ethers.keccak256(ethers.toUtf8Bytes(domain.version)),
        domain.chainId,
        domain.verifyingContract,
      ],
    ),
  );
}

function signDigest(index: number, separator: string, structHash: string) {
  const digest = ethers.keccak256(ethers.concat(["0x1901", separator, structHash]));
  return walletFor(index).signingKey.sign(digest).serialized;
}

/** Standard (cleartext) Ballot signature — used to reach the cleartext-rejection revert in `castVoteBySig`. */
export async function signBallot(
  governor: MyGovernor,
  governorAddress: string,
  voter: HardhatEthersSigner,
  proposalId: bigint,
  support: number,
) {
  const domain = await governorDomain(governor, governorAddress);
  const types = {
    Ballot: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "voter", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
  };
  const nonce = await governor.nonces(voter.address);
  return voter.signTypedData(domain, types, { proposalId, support, voter: voter.address, nonce });
}

/** Standard (cleartext) ExtendedBallot signature for `castVoteWithReasonAndParamsBySig`. */
export async function signExtendedBallot(
  governor: MyGovernor,
  governorAddress: string,
  voter: HardhatEthersSigner,
  proposalId: bigint,
  support: number,
  reason: string,
  params: string,
) {
  const domain = await governorDomain(governor, governorAddress);
  const types = {
    ExtendedBallot: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "voter", type: "address" },
      { name: "nonce", type: "uint256" },
      { name: "reason", type: "string" },
      { name: "params", type: "bytes" },
    ],
  };
  const nonce = await governor.nonces(voter.address);
  return voter.signTypedData(domain, types, {
    proposalId,
    support,
    voter: voter.address,
    nonce,
    reason,
    params,
  });
}

/**
 * Encrypted Ballot signature. The contract's ENCRYPTED_BALLOT_TYPEHASH uses the custom `externalEuint8`
 * type, which ethers' TypedDataEncoder can't resolve, so we build the EIP-712 digest by hand.
 */
export async function signEncryptedBallot(
  governor: MyGovernor,
  governorAddress: string,
  voterIndex: number,
  voter: string,
  proposalId: bigint,
  handle: string,
  proof: string,
) {
  const separator = domainSeparator(await governorDomain(governor, governorAddress));
  const typeHash = await governor.ENCRYPTED_BALLOT_TYPEHASH();
  const nonce = await governor.nonces(voter);
  const structHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "bytes32", "bytes32", "address", "uint256"],
      [typeHash, proposalId, handle, ethers.keccak256(proof), voter, nonce],
    ),
  );
  return signDigest(voterIndex, separator, structHash);
}

/** Encrypted ExtendedBallot signature (manual EIP-712, see {signEncryptedBallot}). */
export async function signEncryptedExtendedBallot(
  governor: MyGovernor,
  governorAddress: string,
  voterIndex: number,
  voter: string,
  proposalId: bigint,
  handle: string,
  proof: string,
  reason: string,
  params: string,
) {
  const separator = domainSeparator(await governorDomain(governor, governorAddress));
  const typeHash = await governor.ENCRYPTED_EXTENDED_BALLOT_TYPEHASH();
  const nonce = await governor.nonces(voter);
  const structHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "uint256", "bytes32", "bytes32", "address", "uint256", "bytes32", "bytes32"],
      [
        typeHash,
        proposalId,
        handle,
        ethers.keccak256(proof),
        voter,
        nonce,
        ethers.keccak256(ethers.toUtf8Bytes(reason)),
        ethers.keccak256(params),
      ],
    ),
  );
  return signDigest(voterIndex, separator, structHash);
}
