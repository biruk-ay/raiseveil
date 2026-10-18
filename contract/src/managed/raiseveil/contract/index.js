import * as __compactRuntime from '@midnight-ntwrk/compact-runtime';
__compactRuntime.checkRuntimeVersion('0.20.0');

const _descriptor_0 = __compactRuntime.CompactTypeJubjubPoint;

const _descriptor_1 = __compactRuntime.CompactTypeField;

class _Trader_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment())))));
  }
  fromValue(value_0) {
    return {
      tradeCount: _descriptor_1.fromValue(value_0),
      tradeVolume: _descriptor_1.fromValue(value_0),
      averageTradeSize: _descriptor_1.fromValue(value_0),
      averageReturn: _descriptor_1.fromValue(value_0),
      startDate: _descriptor_1.fromValue(value_0),
      lastTradeDate: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.tradeCount).concat(_descriptor_1.toValue(value_0.tradeVolume).concat(_descriptor_1.toValue(value_0.averageTradeSize).concat(_descriptor_1.toValue(value_0.averageReturn).concat(_descriptor_1.toValue(value_0.startDate).concat(_descriptor_1.toValue(value_0.lastTradeDate))))));
  }
}

const _descriptor_2 = new _Trader_0();

const _descriptor_3 = __compactRuntime.CompactTypeJubjubScalar;

class _JubjubSchnorrSignature_0 {
  alignment() {
    return _descriptor_0.alignment().concat(_descriptor_1.alignment());
  }
  fromValue(value_0) {
    return {
      announcement: _descriptor_0.fromValue(value_0),
      response: _descriptor_1.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_0.toValue(value_0.announcement).concat(_descriptor_1.toValue(value_0.response));
  }
}

const _descriptor_4 = new _JubjubSchnorrSignature_0();

class _tuple_0 {
  alignment() {
    return _descriptor_2.alignment().concat(_descriptor_4.alignment());
  }
  fromValue(value_0) {
    return [
      _descriptor_2.fromValue(value_0),
      _descriptor_4.fromValue(value_0)
    ]
  }
  toValue(value_0) {
    return _descriptor_2.toValue(value_0[0]).concat(_descriptor_4.toValue(value_0[1]));
  }
}

const _descriptor_5 = new _tuple_0();

const _descriptor_6 = new __compactRuntime.CompactTypeVector(6, _descriptor_1);

const _descriptor_7 = __compactRuntime.CompactTypeBoolean;

class _JubjubSchnorrHashInput_0 {
  alignment() {
    return _descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_1.alignment().concat(_descriptor_6.alignment()))));
  }
  fromValue(value_0) {
    return {
      annX: _descriptor_1.fromValue(value_0),
      annY: _descriptor_1.fromValue(value_0),
      pkX: _descriptor_1.fromValue(value_0),
      pkY: _descriptor_1.fromValue(value_0),
      msg: _descriptor_6.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_1.toValue(value_0.annX).concat(_descriptor_1.toValue(value_0.annY).concat(_descriptor_1.toValue(value_0.pkX).concat(_descriptor_1.toValue(value_0.pkY).concat(_descriptor_6.toValue(value_0.msg)))));
  }
}

const _descriptor_8 = new _JubjubSchnorrHashInput_0();

const _descriptor_9 = new __compactRuntime.CompactTypeUnsignedInteger(18446744073709551615n, 8);

const _descriptor_10 = new __compactRuntime.CompactTypeBytes(32);

class _Either_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_10.alignment().concat(_descriptor_10.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_10.fromValue(value_0),
      right: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_10.toValue(value_0.left).concat(_descriptor_10.toValue(value_0.right)));
  }
}

const _descriptor_11 = new _Either_0();

const _descriptor_12 = new __compactRuntime.CompactTypeUnsignedInteger(340282366920938463463374607431768211455n, 16);

class _ContractAddress_0 {
  alignment() {
    return _descriptor_10.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.bytes);
  }
}

const _descriptor_13 = new _ContractAddress_0();

class _UserAddress_0 {
  alignment() {
    return _descriptor_10.alignment();
  }
  fromValue(value_0) {
    return {
      bytes: _descriptor_10.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_10.toValue(value_0.bytes);
  }
}

const _descriptor_14 = new _UserAddress_0();

class _Either_1 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_13.alignment().concat(_descriptor_14.alignment()));
  }
  fromValue(value_0) {
    return {
      is_left: _descriptor_7.fromValue(value_0),
      left: _descriptor_13.fromValue(value_0),
      right: _descriptor_14.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_left).concat(_descriptor_13.toValue(value_0.left).concat(_descriptor_14.toValue(value_0.right)));
  }
}

const _descriptor_15 = new _Either_1();

class _Maybe_0 {
  alignment() {
    return _descriptor_7.alignment().concat(_descriptor_15.alignment());
  }
  fromValue(value_0) {
    return {
      is_some: _descriptor_7.fromValue(value_0),
      value: _descriptor_15.fromValue(value_0)
    }
  }
  toValue(value_0) {
    return _descriptor_7.toValue(value_0.is_some).concat(_descriptor_15.toValue(value_0.value));
  }
}

const _descriptor_16 = new _Maybe_0();

const _descriptor_17 = new __compactRuntime.CompactTypeUnsignedInteger(255n, 1);

const _descriptor_18 = new __compactRuntime.CompactTypeUnsignedInteger(4294967295n, 4);

export class Contract {
  witnesses;
  constructor(...args_0) {
    if (args_0.length !== 1) {
      throw new __compactRuntime.CompactError(`Contract constructor: expected 1 argument, received ${args_0.length}`);
    }
    const witnesses_0 = args_0[0];
    if (typeof(witnesses_0) !== 'object') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor is not an object');
    }
    if (typeof(witnesses_0.getAttestedTraderDataWitness) !== 'function') {
      throw new __compactRuntime.CompactError('first (witnesses) argument to Contract constructor does not contain a function-valued field named getAttestedTraderDataWitness');
    }
    this.witnesses = witnesses_0;
    this.circuits = {
      verifyData: async (...args_1) => {
        if (args_1.length !== 1) {
          throw new __compactRuntime.CompactError(`verifyData: expected 1 argument (as invoked from Typescript), received ${args_1.length}`);
        }
        const contextOrig_0 = args_1[0];
        if (!(typeof(contextOrig_0) === 'object' && contextOrig_0.callContext.currentQueryContext != undefined)) {
          __compactRuntime.typeError('verifyData',
                                     'argument 1 (as invoked from Typescript)',
                                     'raiseveil.compact line 24 char 1',
                                     'CircuitContext',
                                     contextOrig_0)
        }
        const context = __compactRuntime.copyCircuitContext(contextOrig_0);
        const partialProofData = {
          input: { value: [], alignment: [] },
          output: undefined,
          publicTranscript: [],
          privateTranscriptOutputs: []
        };
        const result_0 = await this._verifyData_0(context, partialProofData);
        partialProofData.output = { value: [], alignment: [] };
        __compactRuntime.finalizeCallProofData(context, partialProofData);
        return { result: result_0, context: context, gasCost: context.callContext.currentGasCost };
      }
    };
    this.impureCircuits = { verifyData: this.circuits.verifyData };
    this.provableCircuits = { verifyData: this.circuits.verifyData };
  }
  async initialState(...args_0) {
    if (args_0.length !== 2) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 2 arguments (as invoked from Typescript), received ${args_0.length}`);
    }
    const constructorContext_0 = args_0[0];
    const pk_0 = args_0[1];
    if (typeof(constructorContext_0) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'constructorContext' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!('initialPrivateState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialPrivateState' in argument 1 (as invoked from Typescript)`);
    }
    if (!('initialZswapLocalState' in constructorContext_0)) {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript)`);
    }
    if (typeof(constructorContext_0.initialZswapLocalState) !== 'object') {
      throw new __compactRuntime.CompactError(`Contract state constructor: expected 'initialZswapLocalState' in argument 1 (as invoked from Typescript) to be an object`);
    }
    if (!(typeof(pk_0.x) === 'bigint' && pk_0.x >= 0n && pk_0.x <= __compactRuntime.MAX_FIELD && typeof(pk_0.y) === 'bigint' && pk_0.y >= 0n && pk_0.y <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('Contract state constructor',
                                 'argument 1 (argument 2 as invoked from Typescript)',
                                 'raiseveil.compact line 20 char 1',
                                 'JubjubPoint',
                                 pk_0)
    }
    const state_0 = new __compactRuntime.ContractState();
    let stateValue_0 = __compactRuntime.StateValue.newArray();
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    stateValue_0 = stateValue_0.arrayPush(__compactRuntime.StateValue.newNull());
    state_0.data = new __compactRuntime.ChargedState(stateValue_0);
    state_0.setOperation('verifyData', new __compactRuntime.ContractOperation());
    const context = __compactRuntime.createCircuitContext({circuitId: 'constructor', contractAddress: __compactRuntime.dummyContractAddress(), coinPublicKeyOrZswapState: constructorContext_0.initialZswapLocalState.coinPublicKey, contractState: state_0.data, privateState: constructorContext_0.initialPrivateState});
    const partialProofData = {
      input: { value: [], alignment: [] },
      output: undefined,
      publicTranscript: [],
      privateTranscriptOutputs: []
    };
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(({x: 0n, y: 1n})),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(1n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue({ tradeCount: 0n, tradeVolume: 0n, averageTradeSize: 0n, averageReturn: 0n, startDate: 0n, lastTradeDate: 0n }),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(0n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_0.toValue(pk_0),
                                                                                              alignment: _descriptor_0.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    state_0.data = new __compactRuntime.ChargedState(context.callContext.currentQueryContext.state.state);
    return {
      currentContractState: state_0,
      currentPrivateState: context.callContext.currentPrivateState,
      currentZswapLocalState: context.callContext.currentZswapLocalState
    }
  }
  _jubjubSchnorrVerify_0(msg_0, signature_0, pk_0) {
    __compactRuntime.assert(!this._equal_0(pk_0, ({x: 0n, y: 1n})),
                            'JubjubPoint identity is not a permitted jubjubSchnorrVerify verification key');
    const __compact_pattern_tmp1_0 = signature_0;
    const announcement_0 = __compact_pattern_tmp1_0.announcement;
    const response_0 = __compact_pattern_tmp1_0.response;
    const cNative_0 = this._transientHash_0({ annX:
                                                this._jubjubPointX_0(announcement_0),
                                              annY:
                                                this._jubjubPointY_0(announcement_0),
                                              pkX: this._jubjubPointX_0(pk_0),
                                              pkY: this._jubjubPointY_0(pk_0),
                                              msg: msg_0 });
    const c_0 = cNative_0;
    const lhs_0 = this._ecMulGenerator_0(response_0);
    const rhs_0 = this._ecAdd_0(announcement_0, this._ecMul_0(pk_0, c_0));
    return this._equal_1(lhs_0, rhs_0);
  }
  _transientHash_0(value_0) {
    const result_0 = __compactRuntime.transientHash(_descriptor_8, value_0);
    return result_0;
  }
  _jubjubPointX_0(pt_0) {
    const result_0 = __compactRuntime.jubjubPointX(pt_0);
    return result_0;
  }
  _jubjubPointY_0(pt_0) {
    const result_0 = __compactRuntime.jubjubPointY(pt_0);
    return result_0;
  }
  _ecAdd_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecAdd(a_0, b_0);
    return result_0;
  }
  _ecMul_0(a_0, b_0) {
    const result_0 = __compactRuntime.ecMul(a_0, b_0);
    return result_0;
  }
  _ecMulGenerator_0(b_0) {
    const result_0 = __compactRuntime.ecMulGenerator(b_0);
    return result_0;
  }
  _getAttestedTraderDataWitness_0(context, partialProofData) {
    const witnessContext_0 = __compactRuntime.createWitnessContext(ledger(context.callContext.currentQueryContext.state), context.callContext.currentPrivateState, context.callContext.currentQueryContext.address);
    const [nextPrivateState_0, result_0] = this.witnesses.getAttestedTraderDataWitness(witnessContext_0);
    context.callContext.currentPrivateState = nextPrivateState_0;
    if (!(Array.isArray(result_0) && result_0.length === 2  && typeof(result_0[0]) === 'object' && typeof(result_0[0].tradeCount) === 'bigint' && result_0[0].tradeCount >= 0 && result_0[0].tradeCount <= __compactRuntime.MAX_FIELD && typeof(result_0[0].tradeVolume) === 'bigint' && result_0[0].tradeVolume >= 0 && result_0[0].tradeVolume <= __compactRuntime.MAX_FIELD && typeof(result_0[0].averageTradeSize) === 'bigint' && result_0[0].averageTradeSize >= 0 && result_0[0].averageTradeSize <= __compactRuntime.MAX_FIELD && typeof(result_0[0].averageReturn) === 'bigint' && result_0[0].averageReturn >= 0 && result_0[0].averageReturn <= __compactRuntime.MAX_FIELD && typeof(result_0[0].startDate) === 'bigint' && result_0[0].startDate >= 0 && result_0[0].startDate <= __compactRuntime.MAX_FIELD && typeof(result_0[0].lastTradeDate) === 'bigint' && result_0[0].lastTradeDate >= 0 && result_0[0].lastTradeDate <= __compactRuntime.MAX_FIELD && typeof(result_0[1]) === 'object' && typeof(result_0[1].announcement.x) === 'bigint' && result_0[1].announcement.x >= 0n && result_0[1].announcement.x <= __compactRuntime.MAX_FIELD && typeof(result_0[1].announcement.y) === 'bigint' && result_0[1].announcement.y >= 0n && result_0[1].announcement.y <= __compactRuntime.MAX_FIELD && typeof(result_0[1].response) === 'bigint' && result_0[1].response >= 0 && result_0[1].response <= __compactRuntime.MAX_FIELD)) {
      __compactRuntime.typeError('getAttestedTraderDataWitness',
                                 'return value',
                                 'raiseveil.compact line 18 char 1',
                                 '[struct Trader<tradeCount: Field, tradeVolume: Field, averageTradeSize: Field, averageReturn: Field, startDate: Field, lastTradeDate: Field>, struct JubjubSchnorrSignature<announcement: JubjubPoint, response: Field>]',
                                 result_0)
    }
    partialProofData.privateTranscriptOutputs.push({
      value: _descriptor_5.toValue(result_0),
      alignment: _descriptor_5.alignment()
    });
    return result_0;
  }
  async _verifyData_0(context, partialProofData) {
    const __compact_pattern_tmp1_0 = this._getAttestedTraderDataWitness_0(context,
                                                                          partialProofData);
    const data_0 = __compact_pattern_tmp1_0[0];
    const signature_0 = __compact_pattern_tmp1_0[1];
    const msg_0 = [data_0.tradeCount,
                   data_0.tradeVolume,
                   data_0.averageTradeSize,
                   data_0.averageReturn,
                   data_0.startDate,
                   data_0.lastTradeDate];
    __compactRuntime.assert(this._jubjubSchnorrVerify_0(msg_0,
                                                        signature_0,
                                                        _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                                                                  partialProofData,
                                                                                                                  [
                                                                                                                   { dup: { n: 0 } },
                                                                                                                   { idx: { cached: false,
                                                                                                                            pushPath: false,
                                                                                                                            path: [
                                                                                                                                   { tag: 'value',
                                                                                                                                     value: { value: _descriptor_17.toValue(0n),
                                                                                                                                              alignment: _descriptor_17.alignment() } }] } },
                                                                                                                   { popeq: { cached: false,
                                                                                                                              result: undefined } }]).value)),
                            'Attestation Failed');
    __compactRuntime.queryLedgerState(context,
                                      partialProofData,
                                      [
                                       { push: { storage: false,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_17.toValue(1n),
                                                                                              alignment: _descriptor_17.alignment() }).encode() } },
                                       { push: { storage: true,
                                                 value: __compactRuntime.StateValue.newCell({ value: _descriptor_2.toValue(data_0),
                                                                                              alignment: _descriptor_2.alignment() }).encode() } },
                                       { ins: { cached: false, n: 1 } }]);
    return [];
  }
  _equal_0(x0, y0) {
    if (x0.x != y0.x || x0.y != y0.y) {
      return false;
    }
    return true;
  }
  _equal_1(x0, y0) {
    if (x0.x != y0.x || x0.y != y0.y) {
      return false;
    }
    return true;
  }
}
export function ledger(stateOrChargedState) {
  const state = stateOrChargedState instanceof __compactRuntime.StateValue ? stateOrChargedState : stateOrChargedState.state;
  const chargedState = stateOrChargedState instanceof __compactRuntime.StateValue ? new __compactRuntime.ChargedState(stateOrChargedState) : stateOrChargedState;
  const context = {
    callContext: { currentQueryContext: new __compactRuntime.QueryContext(chargedState, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() },
    costModel: __compactRuntime.CostModel.initialCostModel()
  };
  const partialProofData = {
    input: { value: [], alignment: [] },
    output: undefined,
    publicTranscript: [],
    privateTranscriptOutputs: []
  };
  return {
    get trustedSignerPk() {
      return _descriptor_0.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(0n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    },
    get traderData() {
      return _descriptor_2.fromValue(__compactRuntime.queryLedgerState(context,
                                                                       partialProofData,
                                                                       [
                                                                        { dup: { n: 0 } },
                                                                        { idx: { cached: false,
                                                                                 pushPath: false,
                                                                                 path: [
                                                                                        { tag: 'value',
                                                                                          value: { value: _descriptor_17.toValue(1n),
                                                                                                   alignment: _descriptor_17.alignment() } }] } },
                                                                        { popeq: { cached: false,
                                                                                   result: undefined } }]).value);
    }
  };
}
const _emptyContext = {
  callContext: { currentQueryContext: new __compactRuntime.QueryContext(new __compactRuntime.ContractState().data, __compactRuntime.dummyContractAddress()), currentGasCost: __compactRuntime.emptyRunningCost() }
};
const _dummyContract = new Contract({
  getAttestedTraderDataWitness: (...args) => undefined
});
export const pureCircuits = {};
export const expectedVk = {
  'verifyData': 'f8d52c8e115dad7a6bd04b28d5ebb0da27bd835fa755d4545d609bf49dd1da11',
};

export const circuitSignatures = {
  'verifyData': {pure: false, provable: true, argumentTypes: [], resultType: {tag: 'Tuple', types: []}},
};

export const declaredInterfaces = {};

//# sourceMappingURL=index.js.map
