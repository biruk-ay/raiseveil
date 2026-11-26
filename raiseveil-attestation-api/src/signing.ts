import {
  CompactTypeField,
  CompactTypeVector,
  FIELD_MODULUS,
  JUBJUB_SCALAR_MODULUS,
  jubjubSchnorrSign,
  jubjubSchnorrVerifyingKey,
  sampleJubjubSchnorrSk,
  type JubjubPoint,
  type JubjubSchnorrSignature,
} from '@midnight-ntwrk/compact-runtime';
import type { TraderData } from './types.js';

export type { JubjubSchnorrSignature };

export function generateKeyPair(): { sk: bigint; pk: JubjubPoint } {
  const sk = sampleJubjubSchnorrSk();
  const pk = jubjubSchnorrVerifyingKey(sk);
  return { sk, pk };
}

function assertValidSigningKey(sk: bigint): void {
  if (sk <= 0n || sk >= JUBJUB_SCALAR_MODULUS) {
    throw new Error("Provider signing key must be a non-zero JubJub scalar");
  }
}

export function getPublicKey(sk: bigint): JubjubPoint {
  assertValidSigningKey(sk);
  return jubjubSchnorrVerifyingKey(sk);
}

const msgDescriptor = new CompactTypeVector(8, CompactTypeField);
// Volume and averages are signed with five decimal places of fixed-point precision.
const DATA_SCALE = 100_000n;
export const ACTIVITY_POLICY_MIN_FILLS = 100;
export const ACTIVITY_POLICY_MIN_DURATION_MS = 180 * 24 * 60 * 60 * 1000;
export const LONG_TERM_ACTIVITY_POLICY_ID = 1n;
export const BASIC_ACTIVITY_POLICY_ID = 2n;

export function getActivityPolicyId(data: TraderData): bigint {
  const durationMs = data.lastTradeDate.getTime() - data.startDate.getTime();
  if (data.tradeCount >= ACTIVITY_POLICY_MIN_FILLS &&
      durationMs >= ACTIVITY_POLICY_MIN_DURATION_MS) {
    return LONG_TERM_ACTIVITY_POLICY_ID;
  }
  return data.tradeCount >= 1 ? BASIC_ACTIVITY_POLICY_ID : 0n;
}

function encodeField(value: number, fieldName: string, allowNegative = false): bigint {
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number`);
  }

  const scaled = Math.round(value * Number(DATA_SCALE));
  if (!Number.isSafeInteger(scaled)) {
    throw new Error(`${fieldName} exceeds the supported precision or range`);
  }
  if (!allowNegative && scaled < 0) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  const integer = BigInt(scaled);
  if (integer < 0n) {
    if (-integer >= FIELD_MODULUS) {
      throw new Error(`${fieldName} exceeds the Compact field range`);
    }
    return FIELD_MODULUS + integer;
  }
  if (integer >= FIELD_MODULUS) {
    throw new Error(`${fieldName} exceeds the Compact field range`);
  }
  return integer;
}

function encodeInteger(value: number, fieldName: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative safe integer`);
  }
  return BigInt(value);
}

export function encodeSubjectId(subjectId: string): bigint {
  if (!/^[a-fA-F0-9]{64}$/.test(subjectId)) {
    throw new Error("subjectId must be a 32-byte hexadecimal value");
  }
  const encoded = BigInt(`0x${subjectId}`);
  if (encoded >= FIELD_MODULUS) {
    return encoded % FIELD_MODULUS;
  }
  return encoded;
}

export function encodeTraderData(data: TraderData): {
  tradeCount: bigint;
  tradeVolume: bigint;
  averageTradeSize: bigint;
  averageReturn: bigint;
  startDate: bigint;
  lastTradeDate: bigint;
} {
  const startDate = data.startDate.getTime();
  const lastTradeDate = data.lastTradeDate.getTime();
  if (!Number.isSafeInteger(startDate) || startDate < 0 ||
      !Number.isSafeInteger(lastTradeDate) || lastTradeDate < 0) {
    throw new Error('Trader dates must be valid non-negative timestamps');
  }

  return {
    tradeCount: encodeInteger(data.tradeCount, 'tradeCount'),
    tradeVolume: encodeField(data.tradeVolume, 'tradeVolume'),
    averageTradeSize: encodeField(data.averageTradeSize, 'averageTradeSize'),
    averageReturn: encodeField(data.averageReturn, 'averageReturn', true),
    startDate: BigInt(startDate),
    lastTradeDate: BigInt(lastTradeDate),
  };
}

export function sign(sk: bigint, msg: bigint[]): JubjubSchnorrSignature {
  assertValidSigningKey(sk);
  const invalidMessageIndex = msg.findIndex((value) => value < 0n || value >= FIELD_MODULUS);
  if (invalidMessageIndex !== -1) {
    throw new Error(`Attestation message field ${invalidMessageIndex} is outside the Compact field range`);
  }
  // jubjubSchnorrSign takes a CompactType descriptor and the typed message value.
  // For a vector of Field elements we pass the array directly with an appropriate descriptor.
  return jubjubSchnorrSign(msgDescriptor, msg, sk);
}

export function signTraderData(
  sk: bigint,
  data: TraderData,
  subjectId: string,
): JubjubSchnorrSignature {
  const encoded = encodeTraderData(data);
  const msg = [
    encoded.tradeCount,
    encoded.tradeVolume,
    encoded.averageTradeSize,
    encoded.averageReturn,
    encoded.startDate,
    encoded.lastTradeDate,
    encodeSubjectId(subjectId),
    getActivityPolicyId(data),
  ];
  return sign(sk, msg);
}