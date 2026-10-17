import { createServer } from './server.js';

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured`);
  }
  return value;
}

const providerSecretKey = BigInt(requiredEnv('RAISEVEIL_PROVIDER_SECRET_KEY'));
const sharedSecret = requiredEnv('RAISEVEIL_ATTESTATION_SHARED_SECRET');
if (sharedSecret.length < 32) {
  throw new Error('RAISEVEIL_ATTESTATION_SHARED_SECRET must contain at least 32 characters');
}

const providerId = Number(process.env.RAISEVEIL_PROVIDER_ID ?? '1');
if (!Number.isSafeInteger(providerId) || providerId < 0) {
  throw new Error('RAISEVEIL_PROVIDER_ID must be a non-negative safe integer');
}

const port = Number(process.env.ATTESTATION_PORT ?? '3100');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('ATTESTATION_PORT must be an integer between 1 and 65535');
}

const server = createServer(providerSecretKey, providerId, sharedSecret);
server.listen(port, () => {
  console.info(`RaiseVeil attestation service listening on port ${port}`);
});
