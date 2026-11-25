export interface AttestationRequest {
  token: string;
  /** 32-byte hexadecimal subject identifier, bound into the signed message. */
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
    subjectId: string;
    activityPolicyId: string;
  };
  stats: Omit<TraderData, 'startDate' | 'lastTradeDate'> & {
    startDate: string;
    lastTradeDate: string;
  };
  /** Subject identifier; it is covered by the signature and circuit. */
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