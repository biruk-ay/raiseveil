import type { AttestationResponse } from "./types.js";
import { readFile, stat } from "node:fs/promises";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireDecimal(value: unknown, field: string): string {
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new Error(`Attestation file contains an invalid ${field}`);
  }
  return value;
}

export function parseAttestation(value: unknown): AttestationResponse {
  if (!isRecord(value) || !isRecord(value.signature) ||
      !isRecord(value.signature.announcement) || !isRecord(value.message) ||
      !isRecord(value.stats)) {
    throw new Error("Attestation file has an invalid shape");
  }

  const message = value.message;
  const stats = value.stats;
  if (typeof stats.tradeCount !== "number" || !Number.isFinite(stats.tradeCount) ||
      typeof stats.tradeVolume !== "number" || !Number.isFinite(stats.tradeVolume) ||
      typeof stats.averageTradeSize !== "number" || !Number.isFinite(stats.averageTradeSize) ||
      typeof stats.averageReturn !== "number" || !Number.isFinite(stats.averageReturn) ||
      typeof stats.startDate !== "string" || Number.isNaN(Date.parse(stats.startDate)) ||
      typeof stats.lastTradeDate !== "string" || Number.isNaN(Date.parse(stats.lastTradeDate)) ||
      typeof value.userPubKeyHash !== "string" || !/^\d+$/.test(value.userPubKeyHash)) {
    throw new Error("Attestation file contains invalid trader statistics or metadata");
  }

  return {
    signature: {
      announcement: {
        x: requireDecimal(value.signature.announcement.x, "signature announcement x coordinate"),
        y: requireDecimal(value.signature.announcement.y, "signature announcement y coordinate"),
      },
      response: requireDecimal(value.signature.response, "signature response"),
    },
    message: {
      tradeCount: requireDecimal(message.tradeCount, "trade count"),
      tradeVolume: requireDecimal(message.tradeVolume, "trade volume"),
      averageTradeSize: requireDecimal(message.averageTradeSize, "average trade size"),
      averageReturn: requireDecimal(message.averageReturn, "average return"),
      startDate: requireDecimal(message.startDate, "start date"),
      lastTradeDate: requireDecimal(message.lastTradeDate, "last trade date"),
    },
    stats: {
      tradeCount: stats.tradeCount,
      tradeVolume: stats.tradeVolume,
      averageTradeSize: stats.averageTradeSize,
      averageReturn: stats.averageReturn,
      startDate: stats.startDate,
      lastTradeDate: stats.lastTradeDate,
    },
    userPubKeyHash: value.userPubKeyHash,
  };
}

export async function readAttestationFile(filePath: string): Promise<AttestationResponse> {
  const fileInfo = await stat(filePath);
  if (!fileInfo.isFile() || fileInfo.size > 1_000_000) {
    throw new Error("Attestation file must be a regular file smaller than 1 MB");
  }

  let contents: string;
  try {
    contents = await readFile(filePath, "utf8");
  } catch {
    throw new Error("Unable to read the attestation file");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("Attestation file must contain valid JSON");
  }
  return parseAttestation(parsed);
}
