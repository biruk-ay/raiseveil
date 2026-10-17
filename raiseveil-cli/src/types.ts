import type { RaiseVeil } from "raiseveil-contract";
import type { AttestedTraderData } from "raiseveil-contract";

export interface AttestationResponse {
  signature: {
    announcement: {
      x: string;
      y: string;
    };
    response: string;
  };
  message: {
    tradeCount: string;
    tradeVolume: string;
    averageTradeSize: string;
    averageReturn: string;
    startDate: string;
    lastTradeDate: string;
  };
  stats: {
    tradeCount: number;
    tradeVolume: number;
    averageTradeSize: number;
    averageReturn: number;
    startDate: string;
    lastTradeDate: string;
  };
  userPubKeyHash: string;
}

export interface ProviderInfoResponse {
  providerId: number;
  publicKey: {
    x: string;
    y: string;
  };
}

export type RaiseVeilPrivateState = AttestedTraderData;
export type AppContract = RaiseVeil.Contract<RaiseVeilPrivateState>;
