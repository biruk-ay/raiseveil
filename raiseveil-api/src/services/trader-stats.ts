import { FIELD_MODULUS } from "@midnight-ntwrk/compact-runtime";

const DATA_SCALE = 100_000n;

export interface RawTraderStats {
  tradeCount: bigint;
  tradeVolume: bigint;
  averageTradeSize: bigint;
  averageReturn: bigint;
  startDate: bigint;
  lastTradeDate: bigint;
}

function decodeSignedField(value: bigint): bigint {
  return value > FIELD_MODULUS / 2n ? value - FIELD_MODULUS : value;
}

function formatFixed(value: bigint): string {
  const signedValue = decodeSignedField(value);
  const sign = signedValue < 0n ? "-" : "";
  const absoluteValue = signedValue < 0n ? -signedValue : signedValue;
  const whole = absoluteValue / DATA_SCALE;
  const fractional = (absoluteValue % DATA_SCALE).toString().padStart(5, "0");
  const trimmedFractional = fractional.replace(/0+$/, "");
  return trimmedFractional
    ? `${sign}${whole}.${trimmedFractional}`
    : `${sign}${whole}`;
}

function formatDate(value: bigint): string {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("On-chain trader data contains an invalid date");
  }

  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) {
    throw new Error("On-chain trader data contains an invalid date");
  }
  return date.toISOString();
}

export function toPublicTraderStats(stats: RawTraderStats) {
  if (stats.tradeCount <= 0n) {
    throw new Error("The contract does not contain verified trader data yet");
  }

  return {
    tradeCount: stats.tradeCount.toString(),
    tradeVolume: formatFixed(stats.tradeVolume),
    averageTradeSize: formatFixed(stats.averageTradeSize),
    averageReturn: formatFixed(stats.averageReturn),
    startDate: formatDate(stats.startDate),
    lastTradeDate: formatDate(stats.lastTradeDate),
  };
}
