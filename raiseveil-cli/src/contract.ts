import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { deployContract, findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { RaiseVeil, witnesses } from "raiseveil-contract";
import { contractConfig } from "./config.js";
import type { Providers } from "./providers.js";
import type { AppContract, RaiseVeilPrivateState } from "./types.js";

const CONTRACT_NAME = "RaiseVeil";

export async function loadCompiledContract() {
  return CompiledContract.make<AppContract, RaiseVeilPrivateState>(
    CONTRACT_NAME,
    RaiseVeil.Contract,
  ).pipe(
    CompiledContract.withWitnesses(witnesses),
    CompiledContract.withCompiledFileAssets(contractConfig.zkConfigPath),
  );
}

export async function joinContract(
  providers: Providers,
  contractAddress: string,
  initialPrivateState: RaiseVeilPrivateState,
) {
  return findDeployedContract(providers, {
    contractAddress,
    compiledContract: await loadCompiledContract(),
    privateStateId: contractConfig.privateStateStoreName,
    initialPrivateState,
  });
}

export async function deployRaiseVeilContract(
  providers: Providers,
  trustedSignerPk: { x: bigint; y: bigint },
  initialPrivateState: RaiseVeilPrivateState,
) {
  return deployContract(providers, {
    compiledContract: await loadCompiledContract(),
    privateStateId: contractConfig.privateStateStoreName,
    initialPrivateState,
    args: [trustedSignerPk],
  });
}
