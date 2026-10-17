import { FIELD_MODULUS } from '@midnight-ntwrk/compact-runtime';
import { describe, expect, it } from 'vitest';
import { encodeTraderData } from '../src/signing.js';

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
});
