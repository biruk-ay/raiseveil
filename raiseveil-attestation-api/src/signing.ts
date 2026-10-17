import {
  CompactTypeField,
  CompactTypeVector,
  FIELD_MODULUS,
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

export function getPublicKey(sk: bigint): JubjubPoint {
  return jubjubSchnorrVerifyingKey(sk);
}

const msgDescriptor = new CompactTypeVector(6, CompactTypeField);
// Volume and averages are signed with five decimal places of fixed-point precision.
const DATA_SCALE = 100_000n;

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
  // jubjubSchnorrSign takes a CompactType descriptor and the typed message value.
  // For a vector of Field elements we pass the array directly with an appropriate descriptor.
  return jubjubSchnorrSign(msgDescriptor, msg, sk);
}

export function signTraderData(sk: bigint, data: TraderData): JubjubSchnorrSignature {
  const encoded = encodeTraderData(data);
  const msg = [
    encoded.tradeCount,
    encoded.tradeVolume,
    encoded.averageTradeSize,
    encoded.averageReturn,
    encoded.startDate,
    encoded.lastTradeDate,
  ];
  return sign(sk, msg);
}