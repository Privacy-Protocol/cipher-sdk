import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { ethers, network } = hre;

  const deployedVerifier = await deploy("HonkVerifier", {
    from: deployer,
    log: true,
    waitConfirmations: network.name === "sepolia" ? 2 : 1,
  });

  const deployedAdapter = await deploy("PrivateDaoAdapter", {
    from: deployer,
    args: [deployedVerifier.address],
    log: true,
    waitConfirmations: network.name === "sepolia" ? 2 : 1,
  });

  console.log(`HonkVerifier contract: ${deployedVerifier.address}`);
  console.log(`PrivateDaoAdapter contract: ${deployedAdapter.address}`);

  if (deployedAdapter.newlyDeployed) {
    const adapter = await ethers.getContractAt("PrivateDaoAdapter", deployedAdapter.address);
    const verifierAddress = await adapter.voteSubmissionVerifier();
    console.log(`PrivateDaoAdapter.voteSubmissionVerifier: ${verifierAddress}`);
  }
};

export default func;
func.id = "deploy_private_dao_adapter";
func.tags = ["PrivateDaoAdapter", "HonkVerifier"];
