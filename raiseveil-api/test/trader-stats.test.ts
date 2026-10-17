import { FIELD_MODULUS } from "@midnight-ntwrk/compact-runtime";
import { describe, expect, it } from "vitest";
import { toPublicTraderStats, type RawTraderStats } from "../src/services/trader-stats.js";

function sampleStats(overrides: Partial<RawTraderStats> = {}): RawTraderStats {
  return {
    tradeCount: 4n,
    tradeVolume: 500_000n,
    averageTradeSize: 125_000n,
    averageReturn: 25_000n,
    startDate: 1_704_067_200_000n,
    lastTradeDate: 1_704_153_600_000n,
    ...overrides,
  };
}

describe("public trader stats", () => {
  it("decodes fixed-point values and millisecond dates", () => {
    expect(toPublicTraderStats(sampleStats())).toEqual({
      tradeCount: "4",
      tradeVolume: "5",
      averageTradeSize: "1.25",
      averageReturn: "0.25",
      startDate: "2024-01-01T00:00:00.000Z",
      lastTradeDate: "2024-01-02T00:00:00.000Z",
    });
  });

  it("decodes field-modulus encoded negative returns", () => {
    expect(toPublicTraderStats(sampleStats({
      averageReturn: FIELD_MODULUS - 12_500n,
    })).averageReturn).toBe("-0.125");
  });

  it("rejects a record without verified trades", () => {
    expect(() => toPublicTraderStats(sampleStats({ tradeCount: 0n }))).toThrow(
      "The contract does not contain verified trader data yet",
    );
  });

  it("rejects invalid dates instead of returning a misleading snapshot", () => {
    expect(() => toPublicTraderStats(sampleStats({ startDate: -1n }))).toThrow(
      "On-chain trader data contains an invalid date",
    );
  });
});
