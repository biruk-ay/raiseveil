import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/v9/compact-js";
import { RaiseVeil, witnesses, type AttestedTraderData } from "raiseveil-contract";

export type RaiseVeilPrivateState = AttestedTraderData;
export type AppContract = RaiseVeil.Contract<RaiseVeilPrivateState>;

export const compiledContract = CompiledContract.make<AppContract, RaiseVeilPrivateState>(
  "RaiseVeil",
  RaiseVeil.Contract,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets("raiseveil-contract"),
);
