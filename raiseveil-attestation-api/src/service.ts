import "../config/env.js";
import { createServer } from "./server.js";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

const providerSecretKey = BigInt(requiredEnv("RAISEVEIL_PROVIDER_SECRET_KEY"));
const sharedSecret = requiredEnv("RAISEVEIL_ATTESTATION_SHARED_SECRET");
if (sharedSecret.length < 32) {
  throw new Error("RAISEVEIL_ATTESTATION_SHARED_SECRET must contain at least 32 characters");
}

const providerId = Number(process.env.RAISEVEIL_PROVIDER_ID ?? "1");
if (!Number.isSafeInteger(providerId) || providerId < 0) {
  throw new Error("RAISEVEIL_PROVIDER_ID must be a non-negative safe integer");
}

export const attestationServer = createServer(providerSecretKey, providerId, sharedSecret);
