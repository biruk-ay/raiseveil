import {
  FIELD_MODULUS,
  JUBJUB_SCALAR_MODULUS,
} from '@midnight-ntwrk/compact-runtime';
import { describe, expect, it } from 'vitest';
import {
  BASIC_ACTIVITY_POLICY_ID,
  encodeSubjectId,
  encodeTraderData,
  getActivityPolicyId,
  getPublicKey,
  LONG_TERM_ACTIVITY_POLICY_ID,
  signTraderData,
} from '../src/signing.js';

describe('encodeTraderData', () => {
  it('encodes exactly the six fields verified by the Compact contract', () => {
    const encoded = encodeTraderData({
      tradeCount: 3,
      tradeVolume: 20,
      averageTradeSize: 20 / 3,
      averageReturn: 0.66667,
      startDate: new Date('2026-01-01T00:00:00Z'),
      lastTradeDate: new Date('2026-01-03T00:00:00Z'),
    });

    expect(encoded).toEqual({
      tradeCount: 3n,
      tradeVolume: 2_000_000n,
      averageTradeSize: 666_667n,
      averageReturn: 66_667n,
      startDate: BigInt(new Date('2026-01-01T00:00:00Z').getTime()),
      lastTradeDate: BigInt(new Date('2026-01-03T00:00:00Z').getTime()),
    });
    expect(Object.keys(encoded)).toHaveLength(6);
  });

  it('encodes negative returns as their Compact field representation', () => {
    const encoded = encodeTraderData({
      tradeCount: 1,
      tradeVolume: 2,
      averageTradeSize: 2,
      averageReturn: -1.25,
      startDate: new Date('2026-01-01T00:00:00Z'),
      lastTradeDate: new Date('2026-01-01T00:00:00Z'),
    });

    expect(encoded.averageReturn).toBe(FIELD_MODULUS - 125_000n);
  });

  it('rejects non-finite and negative unsigned statistics', () => {
    const data = {
      tradeCount: 1,
      tradeVolume: -1,
      averageTradeSize: 1,
      averageReturn: 0,
      startDate: new Date('2026-01-01T00:00:00Z'),
      lastTradeDate: new Date('2026-01-01T00:00:00Z'),
    };

    expect(() => encodeTraderData(data)).toThrow('tradeVolume cannot be negative');
    expect(() => encodeTraderData({ ...data, tradeVolume: Number.NaN })).toThrow(
      'tradeVolume must be a finite number',
    );
  });

  it('assigns policy 1 only to at least 100 fills spanning at least 180 days', () => {
    const base = {
      tradeVolume: 20,
      averageTradeSize: 20,
      averageReturn: 0,
      startDate: new Date('2026-01-01T00:00:00Z'),
      lastTradeDate: new Date('2026-06-30T00:00:00Z'),
    };
    expect(getActivityPolicyId({ ...base, tradeCount: 100 })).toBe(LONG_TERM_ACTIVITY_POLICY_ID);
    expect(getActivityPolicyId({
      ...base,
      tradeCount: 99,
    })).toBe(BASIC_ACTIVITY_POLICY_ID);
    expect(getActivityPolicyId({
      ...base,
      tradeCount: 100,
      lastTradeDate: new Date('2026-06-29T23:59:59Z'),
    })).toBe(BASIC_ACTIVITY_POLICY_ID);
  });

  it('assigns policy 2 to one executed fill with no minimum date span', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    expect(getActivityPolicyId({
      tradeCount: 1,
      tradeVolume: 1,
      averageTradeSize: 1,
      averageReturn: 0,
      startDate: date,
      lastTradeDate: date,
    })).toBe(BASIC_ACTIVITY_POLICY_ID);
  });

  it('does not assign a policy when there are no executed fills', () => {
    expect(getActivityPolicyId({
      tradeCount: 0,
      tradeVolume: 0,
      averageTradeSize: 0,
      averageReturn: 0,
      startDate: new Date('2026-01-01T00:00:00Z'),
      lastTradeDate: new Date('2026-01-01T00:00:00Z'),
    })).toBe(0n);
  });

  it('encodes a 32-byte subject identifier deterministically', () => {
    const subject = '01'.repeat(32);
    expect(encodeSubjectId(subject)).toBe(BigInt(`0x${subject}`));
  });

  it('signs the encoded attestation using a valid JubJub scalar', () => {
    const data = {
      tradeCount: 100,
      tradeVolume: 500,
      averageTradeSize: 5,
      averageReturn: -1.25,
      startDate: new Date('2026-01-01T00:00:00Z'),
      lastTradeDate: new Date('2026-06-30T00:00:00Z'),
    };

    expect(() => signTraderData(1n, data, '01'.repeat(32))).not.toThrow();
  });

  it('rejects a provider signing key outside the JubJub scalar range', () => {
    expect(() => getPublicKey(JUBJUB_SCALAR_MODULUS)).toThrow(
      'Provider signing key must be a non-zero JubJub scalar',
    );
  });
});
