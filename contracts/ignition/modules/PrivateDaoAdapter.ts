import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const PrivateDaoAdapterModule = buildModule("PrivateDaoAdapterModule", (m) => {
  const zkTranscriptLib = m.library("ZKTranscriptLib");
  const verifier = m.contract("HonkVerifier", [], {
    libraries: {
      ZKTranscriptLib: zkTranscriptLib,
    },
  });
  const privateDaoAdapter = m.contract("PrivateDaoAdapter", [verifier]);

  return { zkTranscriptLib, verifier, privateDaoAdapter };
});

export default PrivateDaoAdapterModule;
