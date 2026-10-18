import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  getAttestedTraderDataWitness(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, [{ tradeCount: bigint,
                                                                                              tradeVolume: bigint,
                                                                                              averageTradeSize: bigint,
                                                                                              averageReturn: bigint,
                                                                                              startDate: bigint,
                                                                                              lastTradeDate: bigint
                                                                                            },
                                                                                            { announcement: __compactRuntime.JubjubPoint,
                                                                                              response: bigint
                                                                                            }]];
}

export type ImpureCircuits<PS> = {
  verifyData(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type ProvableCircuits<PS> = {
  verifyData(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  verifyData(context: __compactRuntime.CircuitContext<PS>): Promise<__compactRuntime.CircuitResults<PS, []>>;
}

export type Ledger = {
  readonly trustedSignerPk: __compactRuntime.JubjubPoint;
  readonly traderData: { tradeCount: bigint,
                         tradeVolume: bigint,
                         averageTradeSize: bigint,
                         averageReturn: bigint,
                         startDate: bigint,
                         lastTradeDate: bigint
                       };
}

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>,
               pk_0: __compactRuntime.JubjubPoint): Promise<__compactRuntime.ConstructorResult<PS>>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
export declare const expectedVk: Record<string, string>;
export declare const circuitSignatures: __compactRuntime.CircuitSignatures;
export declare const declaredInterfaces: __compactRuntime.DeclaredInterfaces;
