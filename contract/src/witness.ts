import type { Ledger } from "./managed/raiseveil/contract/index.js";
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type SchnorrSignature = {
    announcement: { x: bigint; y: bigint };
    response: bigint;
};

export type AttestedTraderData = {
    tradeCount: bigint;
    tradeVolume: bigint;
    averageTradeSize: bigint;
    averageReturn: bigint;
    startDate: bigint;
    lastTradeDate: bigint;
    attestationSignature: SchnorrSignature;
}

export const witnesses = {
  getAttestedTraderDataWitness: ({
    privateState,
  }: WitnessContext<Ledger, AttestedTraderData>): [
    AttestedTraderData,
    [
      {
        tradeCount: bigint;
        tradeVolume: bigint;
        averageTradeSize: bigint;
        averageReturn: bigint;
        startDate: bigint;
        lastTradeDate: bigint;
      },
      SchnorrSignature,
    ],
  ] => [
    privateState,
    [
      {
        tradeCount: privateState.tradeCount,
        tradeVolume: privateState.tradeVolume,
        averageTradeSize: privateState.averageTradeSize,
        averageReturn: privateState.averageReturn,
        startDate: privateState.startDate,
        lastTradeDate: privateState.lastTradeDate,
      },
      privateState.attestationSignature,
    ],
  ],
}