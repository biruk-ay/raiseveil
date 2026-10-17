export interface AttestationRequest {
  token: string;
  /** Request metadata only; the current contract does not include this in its verified message. */
  userPubKeyHash: string;
}

export interface AttestationResponse {
  signature: {
    announcement: { x: string; y: string };
    response: string;
  };
  /** Six contract fields in verification order; volume and averages use 1e-5 fixed point. Negative returns use field-modulus encoding. */
  message: {
    tradeCount: string;
    tradeVolume: string;
    averageTradeSize: string;
    averageReturn: string;
    startDate: string;
    lastTradeDate: string;
  };
  stats: Omit<TraderData, 'startDate' | 'lastTradeDate'> & {
    startDate: string;
    lastTradeDate: string;
  };
  /** Not covered by the signature or the contract's current verification circuit. */
  userPubKeyHash: string;
}

export interface ProviderInfoResponse {
  providerId: number;
  publicKey: { x: string; y: string };
}

export interface HealthResponse {
  status: string;
  providerId: number;
}

export interface TraderData {
  tradeCount: number;
  tradeVolume: number;
  averageTradeSize: number;
  averageReturn: number;
  startDate: Date;
  lastTradeDate: Date;
}