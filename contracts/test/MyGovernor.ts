import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { MyGovernor, MyToken } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
};

const VOTE_AGAINST = 0;
const VOTE_FOR = 1;
const VOTE_ABSTAIN = 2;

async function encryptUint64(contractAddress: string, signerAddress: string, value: bigint) {
  const encrypted = await fhevm.createEncryptedInput(contractAddress, signerAddress).add64(value).encrypt();

  return {
    handle: encrypted.handles[0],
    proof: encrypted.inputProof,
  };
}

async function encryptVote(contractAddress: string, signerAddress: string, support: number) {
  const encrypted = await fhevm.createEncryptedInput(contractAddress, signerAddress).add8(support).encrypt();

  return {
    handle: encrypted.handles[0],
    proof: encrypted.inputProof,
  };
}

async function deployFixture() {
  const [deployer, alice, bob, charlie] = await ethers.getSigners();
  const signers: Signers = { deployer, alice, bob, charlie };

  const tokenFactory = await ethers.getContractFactory("MyToken");
  const token = (await tokenFactory.deploy(deployer.address, deployer.address)) as unknown as MyToken;
  const tokenAddress = await token.getAddress();

  const governorFactory = await ethers.getContractFactory("MyGovernor");
  const governor = (await governorFactory.deploy(tokenAddress)) as unknown as MyGovernor;
  const governorAddress = await governor.getAddress();

  for (const [holder, amount] of [
    [alice, 10n],
    [bob, 20n],
    [charlie, 5n],
  ] as const) {
    const encryptedAmount = await encryptUint64(tokenAddress, deployer.address, amount);
    await token.connect(deployer).mint(holder.address, encryptedAmount.handle, encryptedAmount.proof);
    await token.connect(holder).delegate(holder.address);
  }

  for (const holder of [alice, bob, charlie]) {
    await token.connect(deployer).getHandleAllowance(await token.getVotes(holder.address), governorAddress, true);
  }
  await token.connect(deployer).getHandleAllowance(await token.confidentialTotalSupply(), governorAddress, true);

  return { signers, token, tokenAddress, governor, governorAddress };
}

describe("MyGovernor", function () {
  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn("This hardhat test suite requires the mock FHEVM engine");
      this.skip();
    }
  });

  it("creates a proposal, accepts encrypted votes, decrypts tallies, and finalizes the result", async function () {
    const { signers, governor, governorAddress } = await deployFixture();

    const targets = [signers.deployer.address];
    const values = [0n];
    const calldatas = ["0x"];
    const description = "Fund the tiny quorum initiative";
    const descriptionHash = ethers.id(description);

    const proposalId = await governor.hashProposal(targets, values, calldatas, descriptionHash);

    await expect(governor.connect(signers.alice).propose(targets, values, calldatas, description)).to.emit(
      governor,
      "ProposalCreated",
    );

    expect(await governor.state(proposalId)).to.eq(0n);

    const voteStart = await governor.proposalSnapshot(proposalId);
    await time.increaseTo(voteStart + 1n);
    expect(await governor.state(proposalId)).to.eq(1n);

    const aliceSupport = await encryptVote(governorAddress, signers.alice.address, VOTE_FOR);
    await expect(
      governor.connect(signers.alice).castEncryptedVote(proposalId, aliceSupport.handle, aliceSupport.proof),
    ).to.emit(governor, "EncryptedVoteCast");

    const bobSupport = await encryptVote(governorAddress, signers.bob.address, VOTE_FOR);
    await governor.connect(signers.bob).castEncryptedVote(proposalId, bobSupport.handle, bobSupport.proof);

    const charlieSupport = await encryptVote(governorAddress, signers.charlie.address, VOTE_AGAINST);
    await governor.connect(signers.charlie).castEncryptedVote(proposalId, charlieSupport.handle, charlieSupport.proof);

    expect(await governor.hasVoted(proposalId, signers.alice.address)).to.eq(true);
    expect(await governor.hasVoted(proposalId, signers.bob.address)).to.eq(true);
    expect(await governor.hasVoted(proposalId, signers.charlie.address)).to.eq(true);

    const [encryptedAgainstVotes, encryptedForVotes, encryptedAbstainVotes] = await governor.proposalVotes(proposalId);

    expect(await fhevm.debugger.decryptEuint(FhevmType.euint64, encryptedAgainstVotes)).to.eq(5n);
    expect(await fhevm.debugger.decryptEuint(FhevmType.euint64, encryptedForVotes)).to.eq(30n);
    expect(await fhevm.debugger.decryptEuint(FhevmType.euint64, encryptedAbstainVotes)).to.eq(0n);

    await expect(governor.requestProposalResultDecryption(proposalId)).to.be.revertedWithCustomError(
      governor,
      "GovernorConfidential__ProposalStillActive",
    );

    const voteEnd = await governor.proposalDeadline(proposalId);
    await time.increaseTo(voteEnd + 1n);

    await expect(governor.finalizeProposalResult(proposalId, "0x", "0x")).to.be.revertedWithCustomError(
      governor,
      "GovernorConfidential__ResultDecryptionNotRequested",
    );

    await expect(governor.requestProposalResultDecryption(proposalId)).to.emit(
      governor,
      "ProposalResultDecryptionRequested",
    );

    const [encryptedQuorumReached, encryptedVoteSucceeded] = await governor.encryptedProposalResult(proposalId);
    const decryptedResult = await fhevm.publicDecrypt([encryptedQuorumReached, encryptedVoteSucceeded]);

    expect(decryptedResult.clearValues[encryptedQuorumReached as `0x${string}`]).to.eq(true);
    expect(decryptedResult.clearValues[encryptedVoteSucceeded as `0x${string}`]).to.eq(true);

    await expect(
      governor.finalizeProposalResult(
        proposalId,
        decryptedResult.abiEncodedClearValues,
        decryptedResult.decryptionProof,
      ),
    )
      .to.emit(governor, "ProposalResultFinalized")
      .withArgs(proposalId, true, true);

    expect(await governor.quorumReached(proposalId)).to.eq(true);
    expect(await governor.voteSucceeded(proposalId)).to.eq(true);
    expect(await governor.state(proposalId)).to.eq(4n);

    await expect(governor.requestProposalResultDecryption(proposalId)).to.be.revertedWithCustomError(
      governor,
      "GovernorConfidential__ResultAlreadyRequested",
    );

    await expect(
      governor.finalizeProposalResult(
        proposalId,
        decryptedResult.abiEncodedClearValues,
        decryptedResult.decryptionProof,
      ),
    ).to.be.revertedWithCustomError(governor, "GovernorConfidential__ResultAlreadyFinalized");
  });

  it("rejects regular cleartext voting", async function () {
    const { signers, governor } = await deployFixture();

    const targets = [signers.deployer.address];
    const values = [0n];
    const calldatas = ["0x"];
    const description = "Clear votes are not supported";
    const proposalId = await governor.hashProposal(targets, values, calldatas, ethers.id(description));

    await governor.connect(signers.alice).propose(targets, values, calldatas, description);
    await time.increaseTo((await governor.proposalSnapshot(proposalId)) + 1n);

    await expect(governor.connect(signers.alice).castVote(proposalId, VOTE_FOR)).to.be.revertedWithCustomError(
      governor,
      "GovernorConfidential__NormalVotesNotSupported",
    );
  });

  it("prevents a voter from casting two encrypted votes on the same proposal", async function () {
    const { signers, governor, governorAddress } = await deployFixture();

    const targets = [signers.deployer.address];
    const values = [0n];
    const calldatas = ["0x"];
    const description = "Only one encrypted vote per voter";
    const proposalId = await governor.hashProposal(targets, values, calldatas, ethers.id(description));

    await governor.connect(signers.alice).propose(targets, values, calldatas, description);
    await time.increaseTo((await governor.proposalSnapshot(proposalId)) + 1n);

    const firstSupport = await encryptVote(governorAddress, signers.alice.address, VOTE_FOR);
    await governor.connect(signers.alice).castEncryptedVote(proposalId, firstSupport.handle, firstSupport.proof);

    const secondSupport = await encryptVote(governorAddress, signers.alice.address, VOTE_ABSTAIN);
    await expect(
      governor.connect(signers.alice).castEncryptedVote(proposalId, secondSupport.handle, secondSupport.proof),
    ).to.be.revertedWithCustomError(governor, "GovernorAlreadyCastVote");
  });

  it("prevents voting on a non-existent proposal", async function () {
    const { signers, governorAddress, governor } = await deployFixture();

    const nonExistentProposalId = 123n;
    const support = await encryptVote(governorAddress, signers.alice.address, VOTE_AGAINST);

    await expect(
      governor.connect(signers.alice).castEncryptedVote(nonExistentProposalId, support.handle, support.proof),
    ).to.be.revertedWithCustomError(governor, "GovernorNonexistentProposal");
  });
});
